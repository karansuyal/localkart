import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { shopAPI } from '../../services/api'
import { useAuthStore, useCartStore } from '../../context/store'
import { ShoppingCart, MapPin, Star, Bot, LogOut, Store, Map, List, Zap, ChevronRight, Sparkles, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import NearbyShopsMap from '../../components/NearbyShopsMap'
import SearchBar from '../../components/SearchBar'
import SearchResults from '../../components/SearchResults'
import { CATEGORIES } from '../../data/categories'
import { useUserLocation } from '../../hooks/useUserLocation'
import { useSmartSearch } from '../../hooks/useSmartSearch'

// Rough ETA model: base pick/pack time + 2 min per km, capped for display sanity
function estimateEta(distanceKm) {
  if (distanceKm == null) return null
  const mins = Math.round(6 + distanceKm * 2)
  return Math.min(mins, 45)
}

const PROMOS = [
  { title: 'Pehla order pe FREE delivery', sub: '10-15 min mein ghar tak', icon: Zap },
  { title: 'Local dukaanon ka full support', sub: 'Apne mohalle se seedha khareedo', icon: ShieldCheck },
  { title: 'Naye offers har hafte', sub: 'Verified shops, fresh deals', icon: Sparkles },
]

export default function CustomerHome() {
  const [category, setCategory] = useState('All')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'map'
  const [scrolled, setScrolled] = useState(false)
  const [promoIndex, setPromoIndex] = useState(0)

  // GPS -> cached last location -> IP-based location -> city fallback -> default.
  // Ye sab useUserLocation hook ke andar handle hota hai.
  const { location: userLocation, isDetecting, permissionDenied } = useUserLocation()
  const { logout } = useAuthStore()
  const { count } = useCartStore()
  const navigate = useNavigate()
  const search = useSmartSearch(userLocation)

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

  // Sticky header gets a glassy elevated look once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Auto-rotate the promo strip every 4s.
  useEffect(() => {
    const t = setInterval(() => setPromoIndex(i => (i + 1) % PROMOS.length), 4000)
    return () => clearInterval(t)
  }, [])

  const { data: shops, isLoading } = useQuery({
    queryKey: ['nearby-shops', userLocation],
    queryFn: () => shopAPI.nearby(userLocation.lat, userLocation.lng, 10).then(r => r.data)
  })

  const filteredShops = shops?.filter(s => category === 'All' || s.category === category) || []
  const fastestEta = shops?.length ? estimateEta(0.8) : null
  const activePromo = PROMOS[promoIndex]

  return (
    <div className="min-h-screen bg-ink-50">
      <style>{`
        @keyframes lk-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lk-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes lk-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .lk-animate-in { animation: lk-fade-up .45s ease both; }
        .lk-float { animation: lk-float 3s ease-in-out infinite; }
        .lk-shimmer {
          background: linear-gradient(90deg, #F4F4F8 0px, #ECECF4 40px, #F4F4F8 80px);
          background-size: 800px 100%;
          animation: lk-shimmer 1.6s linear infinite;
        }
      `}</style>

      {/* Header */}
      <header className={`bg-ink-900 text-white sticky top-0 z-20 transition-shadow duration-300 ${scrolled ? 'shadow-lg shadow-black/20' : ''}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800 pointer-events-none" />
        <div className="max-w-lg mx-auto px-4 py-3 relative">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-400"></span>
                </span>
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
              <Link to="/chatbot" className="relative p-2 bg-ink-800/80 backdrop-blur rounded-xl hover:bg-ink-600 transition-colors">
                <Bot size={20} className="text-primary-400" />
              </Link>
              <Link to="/cart" className="relative p-2 bg-ink-800/80 backdrop-blur rounded-xl hover:bg-ink-600 transition-colors">
                <ShoppingCart size={20} className="text-primary-400" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-urgent-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold animate-pulse-fast">
                    {count}
                  </span>
                )}
              </Link>
              <button onClick={() => { logout(); navigate('/login') }} className="p-2 bg-ink-800/80 backdrop-blur rounded-xl hover:bg-ink-600 transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          </div>
          <SearchBar s={search} />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">

        <SearchResults s={search} />

        {!search.showResults && (
        <>
        {/* Promo strip -- auto-rotating carousel */}
        <div className="mb-5 relative bg-gradient-to-r from-primary-400 to-primary-300 rounded-2xl px-4 py-3.5 flex items-center justify-between overflow-hidden shadow-sm">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
          <div key={promoIndex} className="lk-animate-in relative z-10">
            <p className="font-display font-extrabold text-ink-900 text-sm">{activePromo.title}</p>
            <p className="text-ink-800/70 text-xs mt-0.5">{activePromo.sub}</p>
          </div>
          <activePromo.icon size={34} className="text-ink-900/25 flex-shrink-0 relative z-10 lk-float" fill="currentColor" />
          <div className="absolute bottom-2 right-3 flex gap-1 z-10">
            {PROMOS.map((_, i) => (
              <button
                key={i}
                onClick={() => setPromoIndex(i)}
                aria-label={`Show promo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === promoIndex ? 'w-4 bg-ink-900/70' : 'w-1.5 bg-ink-900/25'}`}
              />
            ))}
          </div>
        </div>

        {/* Category Grid */}
        <div className="mb-6">
          <div className="grid grid-cols-4 gap-3">
            {CATEGORIES.map((cat, i) => (
              <button
                key={cat.key}
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => setCategory(category === cat.key ? 'All' : cat.key)}
                className={`lk-animate-in flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${
                  category === cat.key ? 'ring-2 ring-ink-900 ' + cat.bg + ' shadow-md -translate-y-0.5' : cat.bg
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
            <h2 className="font-display font-bold text-ink-900 flex items-center gap-2">
              Nearby Stores
              {!isLoading && (
                <span className="text-[11px] font-semibold text-ink-400 bg-ink-100 px-2 py-0.5 rounded-full font-body">
                  {filteredShops.length}
                </span>
              )}
            </h2>
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
            <Link to="/orders" className="text-ink-900 text-sm font-semibold hover:text-primary-700 transition-colors">My Orders</Link>
          </div>
        </div>

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="mb-4 lk-animate-in">
            <NearbyShopsMap shops={filteredShops} userLocation={userLocation} />
            <p className="text-xs text-ink-400 text-center mt-2">
              {filteredShops.length} shops nearby • Pin pe click karo details ke liye
            </p>
          </div>
        )}

        {/* List View */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl lk-shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/3 rounded lk-shimmer" />
                  <div className="h-2.5 w-1/2 rounded lk-shimmer" />
                  <div className="h-2.5 w-1/3 rounded lk-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-14 text-ink-400 lk-animate-in">
            <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-ink-100 flex items-center justify-center">
              <Store size={32} className="opacity-40" />
            </div>
            <p className="font-medium">Koi shop nahi mili aas-paas</p>
            {category !== 'All' && (
              <button onClick={() => setCategory('All')} className="mt-3 text-primary-700 text-sm font-semibold underline underline-offset-2">
                Sabhi categories dikhao
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredShops.map((shop, i) => {
              const eta = estimateEta(0.5 + (shop.id % 5) * 0.6)
              return (
                <Link
                  key={shop.id}
                  to={`/shop/${shop.id}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                  className="lk-animate-in card flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="relative w-16 h-16 rounded-xl flex-shrink-0 p-[2px] bg-gradient-to-br from-primary-300 to-primary-400">
                    <div className="w-full h-full bg-primary-50 rounded-[10px] flex items-center justify-center">
                      <Store size={26} className="text-ink-800" />
                    </div>
                    {shop.is_open && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-fresh-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-ink-800 truncate">{shop.name}</h3>
                      <span className="eta-badge flex-shrink-0">
                        <Zap size={10} fill="currentColor" />{eta} min
                      </span>
                    </div>
                    <p className="text-xs text-ink-400 truncate mt-0.5">{shop.address}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded-md">
                        <Star size={11} fill="currentColor" />{shop.rating?.toFixed(1)}
                      </span>
                      <span className={`text-xs font-medium ${shop.is_open ? 'text-fresh-600' : 'text-urgent-500'}`}>
                        {shop.is_open ? 'Open' : 'Closed'}
                      </span>
                      {shop.category && (
                        <><span className="text-xs text-ink-100">•</span>
                        <span className="text-xs text-ink-400 truncate">{shop.category}</span></>
                      )}
                      {shop.is_verified && <span className="badge-green ml-auto">✓ Verified</span>}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-ink-100 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
        </>
        )}
      </div>

      {/* Floating cart shortcut when items are in cart */}
      {count > 0 && (
        <Link
          to="/cart"
          className="fixed bottom-5 right-1/2 translate-x-[calc(50%+0px)] sm:right-[calc(50%-16rem)] z-30 lk-animate-in"
          style={{ maxWidth: '32rem' }}
        >
          <span className="flex items-center gap-2 bg-ink-900 text-white pl-4 pr-5 py-3 rounded-2xl shadow-xl shadow-black/20 hover:bg-ink-800 transition-colors">
            <ShoppingCart size={18} className="text-primary-400" />
            <span className="font-semibold text-sm">View Cart</span>
            <span className="bg-primary-400 text-ink-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{count}</span>
          </span>
        </Link>
      )}
    </div>
  )
}
