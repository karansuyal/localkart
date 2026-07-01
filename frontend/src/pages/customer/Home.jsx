import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { shopAPI, productAPI } from '../../services/api'
import { useAuthStore, useCartStore } from '../../context/store'
import { Search, ShoppingCart, MapPin, Star, Bot, LogOut, Store, Map, List, Zap, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import NearbyShopsMap from '../../components/NearbyShopsMap'
import { CATEGORIES } from '../../data/categories'
import { useUserLocation } from '../../hooks/useUserLocation'

// Rough ETA model: base pick/pack time + 2 min per km, capped for display sanity
function estimateEta(distanceKm) {
  if (distanceKm == null) return null
  const mins = Math.round(6 + distanceKm * 2)
  return Math.min(mins, 45)
}

export default function CustomerHome() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'map'
  // GPS -> cached last location -> IP-based location -> city fallback -> default.
  // Ye sab useUserLocation hook ke andar handle hota hai.
  const { location: userLocation, isDetecting, permissionDenied } = useUserLocation()
  const { logout } = useAuthStore()
  const { count } = useCartStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isDetecting) return
    if (userLocation.source === 'gps') return // silent -- best case, koi toast nahi
    if (userLocation.source === 'ip') {
      toast(`Approx location: ${userLocation.label || 'IP se detect hui'}`, { icon: '📍' })
    } else if (permissionDenied) {
      toast('Location permission nahi mili, approximate area use ho raha hai', { icon: '📍' })
    } else if (userLocation.source === 'default') {
      toast('Location detect nahi ho payi, default area use ho raha hai', { icon: '📍' })
    }
  }, [isDetecting, userLocation, permissionDenied])

  const { data: shops, isLoading } = useQuery({
    queryKey: ['nearby-shops', userLocation],
    queryFn: () => shopAPI.nearby(userLocation.lat, userLocation.lng, 10).then(r => r.data)
  })

  const { data: searchResults } = useQuery({
    queryKey: ['search', search],
    queryFn: () => productAPI.search(search).then(r => r.data),
    enabled: search.length > 2
  })

  const filteredShops = shops?.filter(s => category === 'All' || s.category === category) || []
  const fastestEta = shops?.length ? estimateEta(0.8) : null

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <header className="bg-ink-900 text-white sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Zap size={16} className="text-primary-400" fill="currentColor" />
                <h1 className="font-display font-extrabold text-lg tracking-tight">
                  {fastestEta ? `${fastestEta} minutes` : 'LocalKart'}
                </h1>
              </div>
              <p className="text-ink-100/70 text-xs flex items-center gap-1 mt-0.5">
                <MapPin size={11} />Delivering to {userLocation.label ? userLocation.label : 'your area'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/chatbot" className="relative p-2 bg-ink-800 rounded-xl hover:bg-ink-600">
                <Bot size={20} className="text-primary-400" />
              </Link>
              <Link to="/cart" className="relative p-2 bg-ink-800 rounded-xl hover:bg-ink-600">
                <ShoppingCart size={20} className="text-primary-400" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-urgent-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {count}
                  </span>
                )}
              </Link>
              <button onClick={() => { logout(); navigate('/login') }} className="p-2 bg-ink-800 rounded-xl hover:bg-ink-600">
                <LogOut size={20} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Maggi, chips, cold drink khojo..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
            />
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">

        {/* Search Results */}
        {search.length > 2 && searchResults && (
          <div className="mb-4">
            <h2 className="font-display font-bold text-ink-800 mb-2 text-sm">Search Results ({searchResults.length})</h2>
            <div className="space-y-2">
              {searchResults.slice(0, 5).map(p => (
                <div key={p.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink-800">{p.name}</p>
                    <p className="text-xs text-ink-400">{p.category}</p>
                  </div>
                  <span className="text-ink-900 font-display font-bold">₹{p.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Promo strip */}
        <div className="mb-4 bg-gradient-to-r from-primary-400 to-primary-300 rounded-2xl px-4 py-3 flex items-center justify-between overflow-hidden relative">
          <div>
            <p className="font-display font-extrabold text-ink-900 text-sm">Pehla order pe FREE delivery</p>
            <p className="text-ink-800/70 text-xs mt-0.5">10-15 min mein ghar tak 🏠</p>
          </div>
          <Zap size={36} className="text-ink-900/20 flex-shrink-0" fill="currentColor" />
        </div>

        {/* Category Grid */}
        <div className="mb-5">
          <div className="grid grid-cols-4 gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategory(category === cat.key ? 'All' : cat.key)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${
                  category === cat.key ? 'ring-2 ring-ink-900 ' + cat.bg : cat.bg
                }`}
              >
                <iconify-icon icon={cat.icon} width="28" height="28"></iconify-icon>
                <span className="text-[10px] leading-tight font-medium text-ink-700 text-center whitespace-pre-line">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Nearby Shops Header with toggle */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display font-bold text-ink-900">Nearby Stores</h2>
            {category !== 'All' && (
              <button onClick={() => setCategory('All')} className="text-xs text-primary-700 font-medium flex items-center gap-0.5 mt-0.5">
                {category} <ChevronRight size={12} className="rotate-90" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-ink-900 text-primary-400' : 'text-ink-400'}`}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'map' ? 'bg-ink-900 text-primary-400' : 'text-ink-400'}`}
              >
                <Map size={16} />
              </button>
            </div>
            <Link to="/orders" className="text-ink-900 text-sm font-semibold">My Orders</Link>
          </div>
        </div>

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="mb-4">
            <NearbyShopsMap shops={filteredShops} userLocation={userLocation} />
            <p className="text-xs text-ink-400 text-center mt-2">
              {filteredShops.length} shops nearby • Pin pe click karo details ke liye
            </p>
          </div>
        )}

        {/* List View */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-12 text-ink-400">
            <Store size={48} className="mx-auto mb-3 opacity-30" />
            <p>Koi shop nahi mili aas-paas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredShops.map(shop => {
              const eta = estimateEta(0.5 + (shop.id % 5) * 0.6)
              return (
                <Link key={shop.id} to={`/shop/${shop.id}`} className="card flex items-center gap-3 hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Store size={28} className="text-ink-800" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-ink-800 truncate">{shop.name}</h3>
                      <span className="eta-badge flex-shrink-0">
                        <Zap size={10} fill="currentColor" />{eta} min
                      </span>
                    </div>
                    <p className="text-xs text-ink-400 truncate mt-0.5">{shop.address}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <Star size={11} fill="currentColor" />{shop.rating?.toFixed(1)}
                      </span>
                      <span className="text-xs text-ink-100">•</span>
                      <span className={`text-xs font-medium ${shop.is_open ? 'text-fresh-600' : 'text-urgent-500'}`}>
                        {shop.is_open ? 'Open' : 'Closed'}
                      </span>
                      {shop.category && (
                        <><span className="text-xs text-ink-100">•</span>
                        <span className="text-xs text-ink-400">{shop.category}</span></>
                      )}
                      {shop.is_verified && <span className="badge-green ml-1">✓ Verified</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
