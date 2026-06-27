import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { orderAPI } from '../../services/api'
import { useOrderTracking } from '../../hooks/useOrderTracking'
import { ArrowLeft, Package, Clock, MapPin, IndianRupee, CheckCircle, Bike } from 'lucide-react'
import { useState } from 'react'

const STATUS_CONFIG = {
  pending:   { label: 'Order Received',     color: 'bg-yellow-100 text-yellow-700', icon: '🕐', step: 1 },
  confirmed: { label: 'Partner On Way',     color: 'bg-blue-100 text-blue-700',    icon: '🛵', step: 2 },
  preparing: { label: 'Preparing',          color: 'bg-orange-100 text-orange-700',icon: '🏪', step: 2 },
  picked_up: { label: 'Out for Delivery',   color: 'bg-purple-100 text-purple-700',icon: '🚀', step: 3 },
  delivered: { label: 'Delivered ✅',       color: 'bg-green-100 text-green-700',  icon: '✅', step: 4 },
  cancelled: { label: 'Cancelled',          color: 'bg-red-100 text-red-700',      icon: '❌', step: 0 },
}

function LiveOrderCard({ order }) {
  const { status: liveStatus, message, eta } = useOrderTracking(order.id)
  const currentStatus = liveStatus || order.status
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.pending
  const [showOtp, setShowOtp] = useState(false)

  const isActive = !['delivered', 'cancelled'].includes(currentStatus)

  return (
    <div className={`card mb-3 ${isActive ? 'border-2 border-primary-200' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-gray-800">Order #{order.id}</span>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${config.color}`}>
          {config.icon} {config.label}
        </span>
      </div>

      {/* Live notification banner */}
      {liveStatus && message && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl px-3 py-2 mb-2 text-sm text-primary-700 font-medium animate-pulse">
          🔔 {message}
        </div>
      )}

      {/* Progress bar */}
      {currentStatus !== 'cancelled' && (
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4].map(step => (
            <div key={step} className={`h-1.5 flex-1 rounded-full ${step <= config.step ? 'bg-primary-500' : 'bg-gray-200'}`} />
          ))}
        </div>
      )}

      {/* Order info */}
      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
        <IndianRupee size={13} />
        <span className="font-semibold">₹{order.total_amount}</span>
        <span className="text-gray-400">• {order.items?.length} items</span>
        {(order.eta_minutes || eta) && (
          <span className="ml-auto flex items-center gap-1 text-primary-600 font-medium">
            <Clock size={13} /> {eta || order.eta_minutes} min
          </span>
        )}
      </div>

      <div className="flex items-start gap-1 text-xs text-gray-500 mb-2">
        <MapPin size={12} className="mt-0.5 flex-shrink-0" />
        <span>{order.delivery_address}</span>
      </div>

      {/* OTP — sirf active orders pe dikhao */}
      {isActive && order.otp && (
        <div className="mt-2">
          <button
            onClick={() => setShowOtp(!showOtp)}
            className="text-xs text-primary-600 underline"
          >
            {showOtp ? 'OTP chhupao' : 'Delivery OTP dekhein'}
          </button>
          {showOtp && (
            <div className="mt-1 bg-gray-900 text-white rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Delivery Partner ko ye OTP dein</p>
              <p className="text-3xl font-bold tracking-widest">{order.otp}</p>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-2">{new Date(order.created_at).toLocaleString('hi-IN')}</p>
    </div>
  )
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => orderAPI.mine().then(r => r.data),
    refetchInterval: 30000,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/home"><ArrowLeft size={20} /></Link>
          <h1 className="font-bold text-gray-800">My Orders</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="card h-28 animate-pulse bg-gray-100 mb-3" />)
        ) : orders?.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Koi order nahi abhi tak</p>
            <Link to="/home" className="btn-primary mt-4 inline-block">Shopping Karein</Link>
          </div>
        ) : orders?.map(order => (
          <LiveOrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}
