import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import { useAuthStore } from '../../context/store'
import { Users, Store, ShoppingBag, IndianRupee, LogOut, CheckCircle, UserX, ShieldCheck, MapPin, Star } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [shopFilter, setShopFilter] = useState('unverified') // 'unverified' | 'all'

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => adminAPI.stats().then(r => r.data) })
  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminAPI.users().then(r => r.data) })
  const { data: shops } = useQuery({ queryKey: ['admin-shops'], queryFn: () => adminAPI.shops().then(r => r.data) })

  const toggleMut = useMutation({
    mutationFn: (id) => adminAPI.toggleUser(id),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('User status updated') }
  })

  const verifyMut = useMutation({
    mutationFn: (id) => adminAPI.verifyShop(id),
    onSuccess: () => { qc.invalidateQueries(['admin-shops']); toast.success('Shop verify ho gayi ✓') },
    onError: () => toast.error('Verify nahi hua, dobara try karo')
  })

  const STATS = [
    { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Shops', value: stats?.total_shops || 0, icon: Store, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Orders', value: stats?.total_orders || 0, icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Revenue', value: `₹${(stats?.total_revenue || 0).toFixed(0)}`, icon: IndianRupee, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  const unverifiedShops = shops?.filter(s => !s.is_verified) || []
  const visibleShops = shopFilter === 'unverified' ? unverifiedShops : (shops || [])

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-gray-800">🛡️ Admin Dashboard</h1>
          <button onClick={() => { logout(); navigate('/login') }} className="p-2 hover:bg-gray-100 rounded-lg"><LogOut size={20} /></button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {STATS.map(s => (
            <div key={s.label} className="card">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-2`}>
                <s.icon size={20} className={s.color} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Shop Verification */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-800 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-primary-600" />
              Shop Verification
              {unverifiedShops.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unverifiedShops.length} pending
                </span>
              )}
            </h2>
            <div className="flex bg-white border border-gray-200 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setShopFilter('unverified')}
                className={`px-2 py-1 rounded-md font-medium ${shopFilter === 'unverified' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setShopFilter('all')}
                className={`px-2 py-1 rounded-md font-medium ${shopFilter === 'all' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}
              >
                All Shops
              </button>
            </div>
          </div>

          {visibleShops.length === 0 ? (
            <div className="card text-center text-sm text-gray-400 py-6">
              {shopFilter === 'unverified' ? '✅ Sab shops verify ho gayi hain!' : 'Koi shop nahi hai'}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleShops.map(shop => (
                <div key={shop.id} className="card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-gray-800 text-sm truncate">{shop.name}</p>
                        {shop.is_verified && <span className="badge-green flex-shrink-0">✓ Verified</span>}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} />{shop.address}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>{shop.category || 'No category'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5"><Star size={10} fill="currentColor" className="text-amber-500" />{shop.rating?.toFixed(1) || '0.0'}</span>
                        <span>•</span>
                        <span className="capitalize">{shop.store_type?.replace('_', ' ')}</span>
                      </div>
                    </div>
                    {!shop.is_verified && (
                      <button
                        onClick={() => verifyMut.mutate(shop.id)}
                        disabled={verifyMut.isPending}
                        className="btn-primary text-xs py-1.5 px-3 flex-shrink-0 disabled:opacity-60"
                      >
                        {verifyMut.isPending ? '...' : 'Verify'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Management */}
        <div>
          <h2 className="font-bold text-gray-800 mb-2">User Management</h2>
          <div className="space-y-2">
            {users?.slice(0, 20).map(user => (
              <div key={user.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email} · <span className="capitalize">{user.role}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.is_active ? 'Active' : 'Banned'}
                  </span>
                  <button
                    onClick={() => toggleMut.mutate(user.id)}
                    className={`p-1.5 rounded-lg ${user.is_active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                  >
                    {user.is_active ? <UserX size={16} /> : <CheckCircle size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
