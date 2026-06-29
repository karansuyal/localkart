import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { deliveryAPI } from '../../services/api'
import { useAuthStore } from '../../context/store'
import {
  LogOut, Package, IndianRupee, CheckCircle, MapPin,
  Clock, Bike, ShoppingBag, AlertCircle, Navigation
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_LABELS = {
  assigned: { label: 'Pickup karo', color: 'bg-yellow-100 text-yellow-700', icon: '📦' },
  picked_up: { label: 'Deliver karo', color: 'bg-blue-100 text-blue-700', icon: '🛵' },
}

export default function DeliveryDashboard() {
  const { logout, user, token } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [otpInputs, setOtpInputs] = useState({})

  // WebSocket for real-time new order notifications
  const wsRef = useRef(null)
  useEffect(() => {
    if (!token) return
    const wsBase = import.meta.env.VITE_WS_URL || 'wss://localkart-i5wm.onrender.com'
    let ws
    let reconnectTimer

    const connect = () => {
      // The backend's /ws/delivery/available route requires a ?token= query
      // param to verify the connecting user is actually a delivery partner
      // -- without it, the connection is rejected outright (this was the
      // "403 Forbidden" / connection-rejected behavior seen in the logs).
      ws = new WebSocket(`${wsBase}/ws/delivery/available?token=${token}`)
      wsRef.current = ws
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data)
        // Backend broadcasts type "new_delivery" for new orders becoming
        // available (see websocket.py notify_new_delivery).
        if (data.type === 'new_delivery') {
          qc.invalidateQueries(['available-deliveries'])
          toast('Naya order available hai! 🛵', { icon: '📦' })
        }
      }
      ws.onclose = () => { reconnectTimer = setTimeout(connect, 5000) }
      ws.onerror = () => ws.close()
    }
    connect()

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
    }, 30000)
    return () => { clearInterval(ping); clearTimeout(reconnectTimer); ws.close() }
  }, [token])

  const { data: available = [], isLoading: loadingAvailable } = useQuery({
    queryKey: ['available-deliveries'],
    queryFn: () => deliveryAPI.available().then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: active = [] } = useQuery({
    queryKey: ['active-deliveries'],
    queryFn: () => deliveryAPI.myActive().then(r => r.data),
    refetchInterval: 10000,
  })

  const { data: earnings } = useQuery({
    queryKey: ['earnings'],
    queryFn: () => deliveryAPI.earnings().then(r => r.data),
  })

  const acceptMut = useMutation({
    mutationFn: (id) => deliveryAPI.accept(id),
    onSuccess: (res) => {
      qc.invalidateQueries(['available-deliveries'])
      qc.invalidateQueries(['active-deliveries'])
      const d = res.data
      toast.success(
        `✅ Order accepted!\n📍 ${d.delivery_address}\n💰 ₹${d.total_amount}`,
        { duration: 5000 }
      )
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Error'
      if (msg.includes('already')) {
        toast.error('😔 Ye order already kisi aur ne le liya!', { duration: 4000 })
        qc.invalidateQueries(['available-deliveries'])
      } else {
        toast.error(msg)
      }
    }
  })

  const pickupMut = useMutation({
    mutationFn: (id) => deliveryAPI.pickup(id),
    onSuccess: () => {
      qc.invalidateQueries(['active-deliveries'])
      toast.success('📦 Order pickup ho gaya! Customer ke paas jao.')
    }
  })

  const deliverMut = useMutation({
    mutationFn: ({ id, otp }) => deliveryAPI.deliver(id, otp),
    onSuccess: () => {
      qc.invalidateQueries(['active-deliveries'])
      qc.invalidateQueries(['earnings'])
      setOtpInputs({})
      toast.success('🎉 Delivered! ₹30 credited')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Galat OTP')
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike size={22} className="text-primary-600" />
            <div>
              <h1 className="font-bold text-gray-800">Delivery Dashboard</h1>
              <p className="text-xs text-gray-500">{user?.name || 'Partner'}</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login') }} className="p-2 hover:bg-gray-100 rounded-lg">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <IndianRupee size={22} className="mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold text-green-600">₹{earnings?.total_earnings || 0}</p>
            <p className="text-xs text-gray-500">Total Earnings</p>
          </div>
          <div className="card text-center">
            <CheckCircle size={22} className="mx-auto text-blue-600 mb-1" />
            <p className="text-2xl font-bold text-blue-600">{earnings?.total_deliveries || 0}</p>
            <p className="text-xs text-gray-500">Deliveries Done</p>
          </div>
        </div>

        {/* ─── Active Deliveries (jo accept kar chuka hai) ─── */}
        {active.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Bike size={16} className="text-primary-600" /> Meri Active Deliveries ({active.length})
            </h2>
            {active.map(d => {
              const statusInfo = STATUS_LABELS[d.status] || {}
              return (
                <div key={d.id} className="card border-2 border-primary-200 bg-primary-50 mb-3">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-gray-800">Order #{d.order_id}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>
                      {statusInfo.icon} {statusInfo.label}
                    </span>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2 mb-2">
                    <MapPin size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{d.delivery_address}</p>
                  </div>

                  {/* Amount + ETA */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1 text-sm">
                      <IndianRupee size={14} className="text-green-600" />
                      <span className="font-semibold text-green-700">₹{d.total_amount}</span>
                      <span className="text-gray-400 text-xs">({d.payment_mode?.toUpperCase()})</span>
                    </div>
                    {d.eta_minutes && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock size={14} />
                        <span>{d.eta_minutes} min ETA</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <IndianRupee size={14} />
                      <span>+₹30 earning</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {d.status === 'assigned' ? (
                    <div className="space-y-2">
                      {/* Navigate button */}
                      {d.delivery_lat && d.delivery_lng && (
                        <a
                          href={`https://maps.google.com/?q=${d.delivery_lat},${d.delivery_lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-xl text-sm font-medium"
                        >
                          <Navigation size={14} /> Maps pe kholein
                        </a>
                      )}
                      <button
                        onClick={() => pickupMut.mutate(d.id)}
                        disabled={pickupMut.isPending}
                        className="btn-primary w-full py-2 text-sm"
                      >
                        📦 Shop se pickup kar liya
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">Customer ka OTP enter karo:</p>
                      <input
                        placeholder="6-digit OTP"
                        value={otpInputs[d.id] || ''}
                        onChange={e => setOtpInputs({ ...otpInputs, [d.id]: e.target.value })}
                        className="input-field text-center text-xl tracking-widest font-bold"
                        maxLength={6}
                        type="tel"
                      />
                      <button
                        onClick={() => deliverMut.mutate({ id: d.id, otp: otpInputs[d.id] })}
                        disabled={deliverMut.isPending || !otpInputs[d.id]?.length}
                        className="btn-primary w-full py-2 text-sm disabled:opacity-50"
                      >
                        ✅ Deliver Complete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ─── Available Orders ─── */}
        <div>
          <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <ShoppingBag size={16} />
            Available Orders ({available.length})
          </h2>

          {loadingAvailable ? (
            [1, 2].map(i => <div key={i} className="card h-28 animate-pulse bg-gray-100 mb-3" />)
          ) : available.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Abhi koi order nahi available</p>
              <p className="text-xs mt-1">Auto-refresh ho raha hai har 15 sec</p>
            </div>
          ) : available.map(d => (
            <div key={d.id} className="card mb-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-800">Order #{d.order_id}</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  +₹30 earning
                </span>
              </div>

              {/* Customer Address */}
              <div className="flex items-start gap-2 mb-2">
                <MapPin size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">{d.delivery_address}</p>
              </div>

              {/* Amount + ETA + Payment */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                  <IndianRupee size={14} className="text-green-600" />
                  ₹{d.total_amount}
                </div>
                <span className="text-xs text-gray-400">{d.payment_mode?.toUpperCase()}</span>
                {d.eta_minutes && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={12} />
                    {d.eta_minutes} min ETA
                  </div>
                )}
              </div>

              <button
                onClick={() => acceptMut.mutate(d.id)}
                disabled={acceptMut.isPending}
                className="btn-primary w-full py-2 text-sm"
              >
                {acceptMut.isPending ? 'Accept ho raha hai...' : '🛵 Accept Delivery'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
