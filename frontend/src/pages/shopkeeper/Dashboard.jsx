import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { shopAPI, orderAPI, productAPI, aiAPI } from '../../services/api'
import { useAuthStore } from '../../context/store'
import { useShopNotifications } from '../../hooks/useShopNotifications'
import {
  Package, ShoppingBag, TrendingUp, TrendingDown, Bot, LogOut, BarChart2, Lightbulb,
  MapPin, CheckCircle, AlertCircle, AlertTriangle, Power, Clock, Flame,
  ArrowRight, X, Check, RefreshCw
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import SetupShopCard from './SetupShopCard'

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  picked_up: 'bg-indigo-100 text-indigo-700',
  delivering: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const NEXT_STATUS = { pending: 'confirmed', confirmed: 'preparing', preparing: 'picked_up', picked_up: 'delivered' }

export default function ShopkeeperDashboard() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Location update state
  const [locStatus, setLocStatus] = useState('idle') // idle | loading | success | error
  const [currentLocation, setCurrentLocation] = useState(null)

  const { data: shops, isLoading: shopsLoading, error: shopsError } = useQuery({ queryKey: ['my-shops'], queryFn: () => shopAPI.myShops().then(r => r.data) })
  const shop = shops?.[0]

  // Live order updates -- new orders + status changes push in over
  // WebSocket so the dashboard doesn't feel stale between visits.
  useShopNotifications(shop?.id)

  const { data: orders, isFetching: ordersFetching } = useQuery({
    queryKey: ['shop-orders', shop?.id],
    queryFn: () => orderAPI.shopOrders(shop.id).then(r => r.data),
    enabled: !!shop?.id,
    refetchInterval: 30000
  })

  const { data: products } = useQuery({
    queryKey: ['products', shop?.id],
    queryFn: () => productAPI.byShop(shop.id).then(r => r.data),
    enabled: !!shop?.id
  })

  const pendingOrders = orders?.filter(o => o.status === 'pending') || []
  const activeOrders = orders?.filter(o => !['delivered', 'cancelled'].includes(o.status)) || []
  const todayOrders = orders?.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()) || []
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total_amount, 0)

  // ── Yesterday comparison for the little up/down trend badge ──
  const yesterdayOrders = orders?.filter(o => {
    const d = new Date(); d.setDate(d.getDate() - 1)
    return new Date(o.created_at).toDateString() === d.toDateString()
  }) || []
  const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + o.total_amount, 0)
  const revenueChangePct = yesterdayRevenue > 0
    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    : (todayRevenue > 0 ? 100 : 0)

  // ── Last 7 days revenue trend, for the sparkline ──
  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('hi-IN', { weekday: 'short' })
    const dayOrders = orders?.filter(o => new Date(o.created_at).toDateString() === d.toDateString()) || []
    return { day: label, revenue: dayOrders.reduce((s, o) => s + o.total_amount, 0) }
  }), [orders])

  // ── Stock health ──
  const lowStockProducts = products?.filter(p => p.quantity > 0 && p.quantity <= 5) || []
  const outOfStockProducts = products?.filter(p => p.quantity === 0) || []

  // ── Top selling products, computed from order items + product catalog ──
  const topProducts = useMemo(() => {
    if (!orders || !products) return []
    const soldQty = {}
    orders.forEach(o => {
      if (o.status === 'cancelled') return
      o.items?.forEach(it => { soldQty[it.product_id] = (soldQty[it.product_id] || 0) + it.quantity })
    })
    return Object.entries(soldQty)
      .map(([productId, qty]) => ({ product: products.find(p => p.id === Number(productId)), qty }))
      .filter(x => x.product)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4)
  }, [orders, products])

  // Check karo ki shop ka location pehle se hai ya nahi
  useEffect(() => {
    if (shop?.latitude && shop?.longitude) {
      setCurrentLocation({ lat: shop.latitude, lng: shop.longitude })
      setLocStatus('saved')
    }
  }, [shop])

  // Location update mutation
  const updateLocationMutation = useMutation({
    mutationFn: ({ lat, lng }) => shopAPI.update(shop.id, { latitude: lat, longitude: lng }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-shops'])
      setLocStatus('saved')
      toast.success('Shop location save ho gayi! Ab customers aapki shop map pe dekh sakte hain. 🗺️')
    },
    onError: () => {
      setLocStatus('error')
      toast.error('Location save nahi hui, dobara try karo')
    }
  })

  const detectAndSaveLocation = () => {
    if (!shop) return toast.error('Shop load nahi hui')
    if (!navigator.geolocation) return toast.error('Browser location support nahi karta')

    setLocStatus('loading')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCurrentLocation({ lat, lng })
        updateLocationMutation.mutate({ lat, lng })
      },
      err => {
        setLocStatus('error')
        toast.error('Location permission do ya manually set karo')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Shop open/closed toggle
  const toggleOpenMutation = useMutation({
    mutationFn: (isOpen) => shopAPI.update(shop.id, { is_open: isOpen }),
    onSuccess: (_, isOpen) => {
      queryClient.invalidateQueries(['my-shops'])
      toast.success(isOpen ? 'Shop khol di! Customers ab order kar sakte hain 🟢' : 'Shop band kar di 🔴')
    },
    onError: () => toast.error('Status update nahi hua, dobara try karo')
  })

  // Quick order status update (accept / advance / cancel) right from the dashboard
  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }) => orderAPI.updateStatus(orderId, status),
    onSuccess: () => { queryClient.invalidateQueries(['shop-orders']); toast.success('Order status update ho gaya!') },
    onError: () => toast.error('Status update nahi hua')
  })

  const askAI = async () => {
    if (!aiQuestion.trim()) return
    setAiLoading(true)
    try {
      const res = await aiAPI.chat(aiQuestion, [], shop ? [`Shop: ${shop.name}, Category: ${shop.category}`] : [])
      setAiAnswer(res.data.answer)
    } catch {
      toast.error('AI service unavailable')
    } finally {
      setAiLoading(false)
    }
  }

  const STATS = [
    { label: "Today's Orders", value: todayOrders.length, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: "Pending", value: pendingOrders.length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: "Today Revenue", value: `₹${todayRevenue}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: "Total Orders", value: orders?.length || 0, icon: BarChart2, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: "Products", value: products?.length || 0, icon: Package, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: "Low Stock", value: lowStockProducts.length + outOfStockProducts.length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  const locationSaved = locStatus === 'saved' || (shop?.latitude && shop?.longitude)

  // Account is pending admin approval (or was disabled) -- every API call
  // 403s as "Account disabled" in that case. Show a clear explanation
  // instead of letting it fall through to the "setup your shop" screen,
  // which would be confusing (looks like a missing shop, not a blocked account).
  if (shopsError?.response?.status === 403) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-sm text-center py-8">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Clock size={26} className="text-amber-600" />
          </div>
          <h2 className="font-bold text-gray-800 mb-1">Account Pending Approval</h2>
          <p className="text-sm text-gray-500">
            {shopsError?.response?.data?.detail || 'Aapka shopkeeper account abhi admin approval ke liye pending hai. Approval hote hi aap login karke shop setup kar sakenge.'}
          </p>
          <button onClick={() => { logout(); navigate('/login') }} className="btn-secondary mt-5 text-sm py-2 px-4">
            Login page pe jaayein
          </button>
        </div>
      </div>
    )
  }

  // Still checking if this shopkeeper has a shop yet -- show a light
  // loading state instead of flashing the "no shop" UI for a moment.
  if (shopsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // No shop yet for this shopkeeper -- this is the actual reason "Location
  // Update Karo" used to fail with "Shop load nahi hui": there was nothing
  // to update because no shop had ever been created. Show the setup form
  // instead of the full dashboard (orders/inventory/analytics need a shop
  // to exist anyway).
  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-gray-800">Shopkeeper Dashboard</h1>
              <p className="text-xs text-gray-500">Setup your shop</p>
            </div>
            <button onClick={() => { logout(); navigate('/login') }} className="p-2 hover:bg-gray-100 rounded-lg"><LogOut size={20} /></button>
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-4">
          <SetupShopCard />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-gray-800 truncate">{shop.name}</h1>
              {ordersFetching && <RefreshCw size={12} className="text-gray-300 animate-spin flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${shop.is_open ? 'bg-green-500' : 'bg-red-500'}`} />
              <p className="text-xs text-gray-500">{shop.is_open ? 'Live — orders aa rahe hain' : 'Band hai — orders nahi aa rahe'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => toggleOpenMutation.mutate(!shop.is_open)}
              disabled={toggleOpenMutation.isPending}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors disabled:opacity-60 ${
                shop.is_open ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              <Power size={13} />{shop.is_open ? 'Open' : 'Closed'}
            </button>
            <button onClick={() => { logout(); navigate('/login') }} className="p-2 hover:bg-gray-100 rounded-lg"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* ─── URGENT: PENDING ORDERS NEED ACTION ─── */}
        {pendingOrders.length > 0 && (
          <div className="card border-2 border-orange-200 bg-orange-50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm">{pendingOrders.length} order{pendingOrders.length > 1 ? 's' : ''} accept karne baaki hain</h3>
                <p className="text-xs text-orange-700">Jaldi respond karo, customer wait kar raha hai</p>
              </div>
            </div>
            <div className="space-y-2">
              {pendingOrders.slice(0, 3).map(order => (
                <div key={order.id} className="bg-white rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">Order #{order.id} · ₹{order.total_amount}</p>
                    <p className="text-xs text-gray-500">{order.items?.length} items</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => statusMutation.mutate({ orderId: order.id, status: 'cancelled' })}
                      className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      title="Reject"
                    >
                      <X size={15} />
                    </button>
                    <button
                      onClick={() => statusMutation.mutate({ orderId: order.id, status: 'confirmed' })}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700"
                    >
                      <Check size={13} /> Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── LOCATION CARD ─── */}
        <div className={`card border-2 ${locationSaved ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${locationSaved ? 'bg-green-100' : 'bg-amber-100'}`}>
              <MapPin size={20} className={locationSaved ? 'text-green-600' : 'text-amber-600'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-sm">Shop Location</h3>
                {locationSaved
                  ? <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle size={12} /> Saved</span>
                  : <span className="flex items-center gap-1 text-xs text-amber-600 font-medium"><AlertCircle size={12} /> Set nahi hua</span>
                }
              </div>

              {locationSaved && currentLocation ? (
                <p className="text-xs text-gray-500 mt-0.5">
                  {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                </p>
              ) : locationSaved && shop?.latitude ? (
                <p className="text-xs text-gray-500 mt-0.5">
                  {shop.latitude.toFixed(5)}, {shop.longitude.toFixed(5)}
                </p>
              ) : (
                <p className="text-xs text-amber-700 mt-0.5">
                  Location set karo — customers map pe aapki shop dhundh sakein
                </p>
              )}

              <button
                onClick={detectAndSaveLocation}
                disabled={locStatus === 'loading'}
                className={`mt-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  locationSaved
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                } disabled:opacity-60 flex items-center gap-1.5`}
              >
                {locStatus === 'loading'
                  ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Detect ho raha hai...</>
                  : locationSaved
                    ? <><MapPin size={12} /> Location Update Karo</>
                    : <><MapPin size={12} /> Current Location Save Karo</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          {STATS.map(s => (
            <div key={s.label} className="card !p-3">
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-1.5`}>
                <s.icon size={16} className={s.color} />
              </div>
              <p className="text-lg font-bold text-gray-800 leading-tight">{s.value}</p>
              <p className="text-[10px] text-gray-500 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ─── REVENUE TREND ─── */}
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-gray-800 text-sm">Revenue Trend (7 din)</h3>
            <span className={`flex items-center gap-1 text-xs font-bold ${revenueChangePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueChangePct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {Math.abs(revenueChangePct)}% vs kal
            </span>
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={last7Days} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4caf50" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4caf50" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => [`₹${v}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#4caf50" strokeWidth={2} fill="url(#revGradient)" />
            </AreaChart>
          </ResponsiveContainer>
          <Link to="/shopkeeper/analytics" className="flex items-center justify-center gap-1 text-xs font-medium text-primary-600 mt-1 hover:underline">
            Poora analytics dekho <ArrowRight size={12} />
          </Link>
        </div>

        {/* ─── STOCK ALERTS ─── */}
        {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
          <div className="card border-2 border-red-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <h3 className="font-bold text-gray-800 text-sm">Stock Alerts</h3>
              </div>
              <Link to="/shopkeeper/inventory" className="text-xs font-medium text-primary-600 hover:underline">Manage</Link>
            </div>
            <div className="space-y-1.5">
              {outOfStockProducts.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between bg-red-50 rounded-lg px-2.5 py-1.5">
                  <span className="text-xs font-medium text-gray-700 truncate">{p.name}</span>
                  <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full flex-shrink-0">Out of stock</span>
                </div>
              ))}
              {lowStockProducts.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between bg-amber-50 rounded-lg px-2.5 py-1.5">
                  <span className="text-xs font-medium text-gray-700 truncate">{p.name}</span>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">{p.quantity} left</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TOP SELLING PRODUCTS ─── */}
        {topProducts.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-2.5">
              <Flame size={16} className="text-orange-500" />
              <h3 className="font-bold text-gray-800 text-sm">Top Selling Products</h3>
            </div>
            <div className="space-y-2">
              {topProducts.map((tp, i) => (
                <div key={tp.product.id} className="flex items-center gap-2.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{tp.product.name}</p>
                    <div className="w-full h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, (tp.qty / topProducts[0].qty) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-600 flex-shrink-0">{tp.qty} sold</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Nav */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { to: '/shopkeeper/inventory', emoji: '📦', label: 'Inventory' },
            { to: '/shopkeeper/orders', emoji: '🛍️', label: 'Orders' },
            { to: '/shopkeeper/analytics', emoji: '📊', label: 'Analytics' },
          ].map(nav => (
            <Link key={nav.to} to={nav.to} className="card text-center hover:shadow-md transition-shadow">
              <div className="text-3xl mb-1">{nav.emoji}</div>
              <p className="text-sm font-medium text-gray-700">{nav.label}</p>
            </Link>
          ))}
        </div>

        {/* AI Business Advisor */}
        <div className="card border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center"><Bot size={16} className="text-white" /></div>
            <div>
              <h3 className="font-bold text-gray-800">AI Business Advisor</h3>
              <p className="text-xs text-gray-500">Apna business sawaal poochein</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              value={aiQuestion}
              onChange={e => setAiQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && askAI()}
              placeholder="Kaunsa product stock karu?"
              className="input-field text-sm flex-1"
            />
            <button onClick={askAI} disabled={aiLoading} className="btn-primary px-3 disabled:opacity-50 text-sm">
              {aiLoading ? '...' : 'Ask'}
            </button>
          </div>
          {aiAnswer && (
            <div className="mt-3 p-3 bg-white rounded-xl border border-primary-100">
              <div className="flex items-start gap-2">
                <Lightbulb size={16} className="text-primary-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">{aiAnswer}</p>
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-2 overflow-x-auto">
            {['Kaunsa stock karu?', 'Sales tips', 'Price advice'].map(q => (
              <button key={q} onClick={() => setAiQuestion(q)} className="whitespace-nowrap text-xs bg-primary-100 text-primary-700 px-3 py-1 rounded-full">
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        {orders && orders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-800">Recent Orders</h3>
              <Link to="/shopkeeper/orders" className="text-primary-600 text-sm">View all</Link>
            </div>
            <div className="space-y-2">
              {orders.slice(0, 5).map(order => (
                <div key={order.id} className="card flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 text-sm">Order #{order.id}</p>
                    <p className="text-xs text-gray-500">{order.items?.length} items • ₹{order.total_amount}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {order.status}
                    </span>
                    {NEXT_STATUS[order.status] && (
                      <button
                        onClick={() => statusMutation.mutate({ orderId: order.id, status: NEXT_STATUS[order.status] })}
                        className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg hover:bg-primary-100"
                      >
                        Next →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
