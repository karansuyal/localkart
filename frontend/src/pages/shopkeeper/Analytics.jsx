import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { shopAPI, orderAPI } from '../../services/api'
import { ArrowLeft } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

export default function AnalyticsPage() {
  const { data: shops } = useQuery({ queryKey: ['my-shops'], queryFn: () => shopAPI.myShops().then(r => r.data) })
  const shop = shops?.[0]

  const { data: orders } = useQuery({
    queryKey: ['shop-orders', shop?.id],
    queryFn: () => orderAPI.shopOrders(shop.id).then(r => r.data),
    enabled: !!shop?.id
  })

  // Process data for charts
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('hi-IN', { weekday: 'short' })
    const dayOrders = orders?.filter(o => new Date(o.created_at).toDateString() === d.toDateString()) || []
    return { day: label, orders: dayOrders.length, revenue: dayOrders.reduce((s, o) => s + o.total_amount, 0) }
  })

  const statusData = ['pending','confirmed','delivering','delivered','cancelled'].map(s => ({
    name: s, value: orders?.filter(o => o.status === s).length || 0
  })).filter(d => d.value > 0)

  const COLORS = ['#f59e0b','#3b82f6','#8b5cf6','#22c55e','#ef4444']

  const totalRevenue = orders?.reduce((s, o) => s + o.total_amount, 0) || 0
  const avgOrder = orders?.length ? (totalRevenue / orders.length).toFixed(0) : 0

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/shopkeeper"><ArrowLeft size={20} /></Link>
          <h1 className="font-bold text-gray-800">Analytics Dashboard</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(0)}`, color: 'text-green-600' },
            { label: 'Total Orders', value: orders?.length || 0, color: 'text-blue-600' },
            { label: 'Avg Order', value: `₹${avgOrder}`, color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="card text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-800 mb-3">Last 7 Days Revenue</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last7Days}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [`₹${v}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#4caf50" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-800 mb-3">Orders Per Day</h3>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={last7Days}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {statusData.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-3">Order Status Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
