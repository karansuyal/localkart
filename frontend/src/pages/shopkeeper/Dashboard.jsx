import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { shopAPI, orderAPI, aiAPI } from '../../services/api'
import { useAuthStore } from '../../context/store'
import { Package, ShoppingBag, TrendingUp, Bot, LogOut, BarChart2, Lightbulb, MapPin, CheckCircle, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import SetupShopCard from './SetupShopCard'

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

  const { data: shops, isLoading: shopsLoading } = useQuery({ queryKey: ['my-shops'], queryFn: () => shopAPI.myShops().then(r => r.data) })
  const shop = shops?.[0]

  const { data: orders } = useQuery({
    queryKey: ['shop-orders', shop?.id],
    queryFn: () => orderAPI.shopOrders(shop.id).then(r => r.data),
    enabled: !!shop?.id
  })

  const pendingOrders = orders?.filter(o => o.status === 'pending') || []
  const todayOrders = orders?.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()) || []
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total_amount, 0)

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
    { label: "Pending", value: pendingOrders.length, icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: "Today Revenue", value: `₹${todayRevenue}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: "Total Orders", value: orders?.length || 0, icon: BarChart2, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  const locationSaved = locStatus === 'saved' || (shop?.latitude && shop?.longitude)

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-800">Shopkeeper Dashboard</h1>
            <p className="text-xs text-gray-500">{shop?.name || 'Setup your shop'}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login') }} className="p-2 hover:bg-gray-100 rounded-lg"><LogOut size={20} /></button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

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
              {orders.slice(0, 3).map(order => (
                <div key={order.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">Order #{order.id}</p>
                    <p className="text-xs text-gray-500">{order.items?.length} items • ₹{order.total_amount}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
