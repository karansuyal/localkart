import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { shopAPI, orderAPI } from '../../services/api'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const ORDER_STATUSES = ['pending','confirmed','preparing','picked_up','delivered','cancelled']

export default function ShopOrdersPage() {
  const qc = useQueryClient()
  const { data: shops } = useQuery({ queryKey: ['my-shops'], queryFn: () => shopAPI.myShops().then(r => r.data) })
  const shop = shops?.[0]

  const { data: orders } = useQuery({
    queryKey: ['shop-orders', shop?.id],
    queryFn: () => orderAPI.shopOrders(shop.id).then(r => r.data),
    enabled: !!shop?.id,
    refetchInterval: 30000
  })

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }) => orderAPI.updateStatus(orderId, status),
    onSuccess: () => { qc.invalidateQueries(['shop-orders']); toast.success('Status updated!') }
  })

  const nextStatus = { pending: 'confirmed', confirmed: 'preparing', preparing: 'picked_up' }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/shopkeeper"><ArrowLeft size={20} /></Link>
          <h1 className="font-bold text-gray-800">Orders Management</h1>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {orders?.map(order => (
          <div key={order.id} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-800">Order #{order.id}</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {order.status}
              </span>
            </div>
            <p className="text-sm text-gray-600">{order.items?.length} items • ₹{order.total_amount}</p>
            <p className="text-xs text-gray-400">📍 {order.delivery_address}</p>
            <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString('hi-IN')}</p>
            {nextStatus[order.status] && (
              <button
                onClick={() => statusMutation.mutate({ orderId: order.id, status: nextStatus[order.status] })}
                className="btn-primary mt-2 py-1.5 text-sm w-full"
              >
                Mark as {nextStatus[order.status]}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
