import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { deliveryAPI } from '../../services/api'
import { useAuthStore } from '../../context/store'
import { LogOut, Package, IndianRupee, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DeliveryDashboard() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [otpInputs, setOtpInputs] = useState({})

  const { data: available } = useQuery({ queryKey: ['available-deliveries'], queryFn: () => deliveryAPI.available().then(r => r.data), refetchInterval: 20000 })
  const { data: earnings } = useQuery({ queryKey: ['earnings'], queryFn: () => deliveryAPI.earnings().then(r => r.data) })

  const acceptMut = useMutation({
    mutationFn: (id) => deliveryAPI.accept(id),
    onSuccess: (res) => { qc.invalidateQueries(['available-deliveries']); toast.success(`Accepted! OTP: ${res.data.otp}`) }
  })
  const deliverMut = useMutation({
    mutationFn: ({ id, otp }) => deliveryAPI.deliver(id, otp),
    onSuccess: () => { qc.invalidateQueries(); toast.success('Delivered! ₹30 credited 🎉') }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-gray-800">🚴 Delivery Dashboard</h1>
          <button onClick={() => { logout(); navigate('/login') }} className="p-2 hover:bg-gray-100 rounded-lg"><LogOut size={20} /></button>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <IndianRupee size={24} className="mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold text-green-600">₹{earnings?.total_earnings || 0}</p>
            <p className="text-xs text-gray-500">Total Earnings</p>
          </div>
          <div className="card text-center">
            <CheckCircle size={24} className="mx-auto text-blue-600 mb-1" />
            <p className="text-2xl font-bold text-blue-600">{earnings?.total_deliveries || 0}</p>
            <p className="text-xs text-gray-500">Deliveries Done</p>
          </div>
        </div>

        <h2 className="font-bold text-gray-800">Available Orders ({available?.length || 0})</h2>
        {available?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Package size={40} className="mx-auto mb-2 opacity-30" />
            <p>Abhi koi order nahi available</p>
          </div>
        )}
        {available?.map(d => (
          <div key={d.id} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold">Delivery #{d.id}</span>
              <span className="badge-green">+₹30</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Order #{d.order_id}</p>
            {d.partner_id ? (
              <div className="space-y-2">
                <input
                  placeholder="Enter OTP"
                  value={otpInputs[d.id] || ''}
                  onChange={e => setOtpInputs({...otpInputs, [d.id]: e.target.value})}
                  className="input-field"
                />
                <button onClick={() => deliverMut.mutate({ id: d.id, otp: otpInputs[d.id] })} className="btn-primary w-full py-2 text-sm">
                  Mark Delivered
                </button>
              </div>
            ) : (
              <button onClick={() => acceptMut.mutate(d.id)} className="btn-primary w-full py-2 text-sm">
                Accept Delivery
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
