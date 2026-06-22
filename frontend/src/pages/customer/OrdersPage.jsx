import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { orderAPI } from '../../services/api'
import { ArrowLeft, Package } from 'lucide-react'

const STATUS_COLORS = {
  pending: 'badge-yellow', confirmed: 'badge-green', preparing: 'badge-yellow',
  picked_up: 'badge-yellow', delivered: 'badge-green', cancelled: 'badge-red'
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useQuery({ queryKey: ['my-orders'], queryFn: () => orderAPI.mine().then(r => r.data) })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/home"><ArrowLeft size={20} /></Link>
          <h1 className="font-bold text-gray-800">My Orders</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)
        ) : orders?.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Koi order nahi abhi tak</p>
            <Link to="/home" className="btn-primary mt-4 inline-block">Shopping Karein</Link>
          </div>
        ) : orders?.map(order => (
          <div key={order.id} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-800">Order #{order.id}</span>
              <span className={STATUS_COLORS[order.status] || 'badge-yellow'}>{order.status}</span>
            </div>
            <p className="text-sm text-gray-600">{order.items?.length} items • ₹{order.total_amount}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleString('hi-IN')}</p>
            <p className="text-xs text-gray-500 mt-1 truncate">📍 {order.delivery_address}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
