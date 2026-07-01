import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { shopAPI, productAPI, reviewAPI, aiAPI } from '../../services/api'
import { useCartStore } from '../../context/store'
import { ArrowLeft, Plus, Minus, Star, ShoppingCart, Sparkles, MapPin, ShieldCheck, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { iconForCategory } from '../../data/commonProducts'

function ratingBreakdown(reviews) {
  const counts = [0, 0, 0, 0, 0]
  reviews?.forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++ })
  const max = Math.max(1, ...counts)
  return { counts, max }
}

export default function ShopPage() {
  const { id } = useParams()
  const { addItem, items, updateQty } = useCartStore()
  const [selectedProduct, setSelectedProduct] = useState(null)

  const { data: shop } = useQuery({ queryKey: ['shop', id], queryFn: () => shopAPI.get(id).then(r => r.data) })
  const { data: products } = useQuery({ queryKey: ['products', id], queryFn: () => productAPI.byShop(id).then(r => r.data) })
  const { data: reviews } = useQuery({ queryKey: ['reviews', id], queryFn: () => reviewAPI.byShop(id).then(r => r.data) })
  const { data: recommendations } = useQuery({
    queryKey: ['recommendations', selectedProduct],
    queryFn: () => aiAPI.recommend(selectedProduct).then(r => r.data),
    enabled: !!selectedProduct
  })

  const getQty = (productId) => items.find(i => i.id === productId)?.qty || 0

  const handleAdd = (product) => {
    addItem(product, parseInt(id))
    setSelectedProduct(product.id)
    toast.success(`${product.name} cart mein add hua!`)
  }

  const cartCount = items.reduce((s, i) => s + i.qty, 0)
  const cartTotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const { counts: ratingCounts, max: ratingMax } = ratingBreakdown(reviews)

  if (!shop) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-ink-50">
      <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary-400 border-r-2 border-r-transparent" />
      <p className="text-ink-400 text-sm">Shop load ho raha hai...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-ink-50 pb-28">
      <style>{`
        @keyframes lk-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lk-pop { 0% { transform: scale(.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .lk-animate-in { animation: lk-fade-up .4s ease both; }
        .lk-pop-in { animation: lk-pop .25s ease both; }
        .lk-scrollbar-none::-webkit-scrollbar { display: none; }
        .lk-scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <div className="bg-ink-900 text-white sticky top-0 z-20 shadow-lg shadow-black/10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Link to="/home" className="p-2 bg-ink-800/80 rounded-xl hover:bg-ink-600 transition-colors flex-shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div className="text-center min-w-0">
            <h1 className="font-display font-bold truncate">{shop.name}</h1>
            <div className="flex items-center justify-center gap-1 text-xs text-primary-300">
              <Star size={11} fill="currentColor" />{shop.rating.toFixed(1)} ({shop.total_reviews} reviews)
            </div>
          </div>
          <Link to="/cart" className="relative p-2 bg-ink-800/80 rounded-xl hover:bg-ink-600 transition-colors flex-shrink-0">
            <ShoppingCart size={20} className="text-primary-400" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-urgent-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Shop hero card */}
        <div className="relative mb-4 rounded-2xl overflow-hidden bg-gradient-to-br from-ink-900 to-ink-800 text-white p-4 lk-animate-in">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-primary-400/10 rounded-full" />
          <div className="absolute -right-2 bottom-0 w-16 h-16 bg-primary-400/10 rounded-full" />
          <div className="relative flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary-400/15 border border-primary-400/20 flex items-center justify-center flex-shrink-0">
              <ShoppingCart size={26} className="text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink-100/80">{shop.description || 'Quality products at best prices'}</p>
              {shop.address && (
                <p className="flex items-center gap-1 text-xs text-ink-100/60 mt-1.5">
                  <MapPin size={11} />{shop.address}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${shop.is_open ? 'bg-fresh-500/15 text-fresh-500' : 'bg-urgent-500/15 text-urgent-500'}`}>
                  {shop.is_open ? '🟢 Open Now' : '🔴 Closed'}
                </span>
                {shop.is_verified && (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-primary-400/15 text-primary-300">
                    <ShieldCheck size={11} />Verified
                  </span>
                )}
                {shop.category && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/10 text-ink-100/80">{shop.category}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="mb-4 rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-white p-3.5 lk-animate-in">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-primary-600" />
              <span className="text-sm font-display font-semibold text-ink-900">AI Suggestions for You</span>
            </div>
            <p className="text-xs text-ink-400">Is product ke saath log yeh bhi khareedte hain</p>
            <div className="flex gap-2 mt-2.5 overflow-x-auto lk-scrollbar-none -mx-3.5 px-3.5 pb-0.5">
              {products?.filter(p => recommendations.includes(p.id)).map(p => {
                const qty = getQty(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => handleAdd(p)}
                    className="bg-white rounded-xl p-2.5 min-w-[110px] flex-shrink-0 border border-primary-100 text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <p className="text-xs font-medium text-ink-700 truncate">{p.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-primary-700 font-bold">₹{p.price}</p>
                      {qty > 0 && <span className="text-[10px] bg-primary-400 text-ink-900 font-bold px-1.5 rounded-full">{qty}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Products */}
        <h2 className="font-display font-bold text-ink-900 mb-3 flex items-center gap-2">
          Products
          <span className="text-[11px] font-semibold text-ink-400 bg-ink-100 px-2 py-0.5 rounded-full font-body">
            {products?.length || 0}
          </span>
        </h2>
        <div className="space-y-3">
          {products?.map((product, i) => {
            const qty = getQty(product.id)
            const hasDiscount = product.mrp && product.mrp > product.price
            const discountPct = hasDiscount ? Math.round(100 - (product.price / product.mrp) * 100) : 0
            return (
              <div
                key={product.id}
                style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
                className="lk-animate-in card flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <div className="relative w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <iconify-icon icon={iconForCategory(product.category)} width="30" height="30"></iconify-icon>
                  )}
                  {hasDiscount && (
                    <span className="absolute top-0 left-0 bg-urgent-500 text-white text-[9px] font-bold px-1 rounded-br-lg">
                      {discountPct}% OFF
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink-800 truncate">{product.name}</p>
                  <p className="text-xs text-ink-400">{product.category} · {product.unit}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-primary-700 font-bold">₹{product.price}</span>
                    {hasDiscount && (
                      <span className="text-xs text-ink-100 line-through">₹{product.mrp}</span>
                    )}
                  </div>
                  {/* Unsplash API Guidelines require photographer + Unsplash
                      attribution wherever the photo is displayed. */}
                  {product.image_source === 'unsplash' && product.unsplash_photographer && (
                    <p className="text-[10px] text-ink-300 mt-0.5">
                      📸{' '}
                      <a href={product.unsplash_photographer_url ? `${product.unsplash_photographer_url}?utm_source=localkart&utm_medium=referral` : '#'} target="_blank" rel="noopener noreferrer" className="underline">
                        {product.unsplash_photographer}
                      </a>{' '}
                      on{' '}
                      <a href="https://unsplash.com/?utm_source=localkart&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline">
                        Unsplash
                      </a>
                    </p>
                  )}
                </div>
                <div>
                  {qty === 0 ? (
                    <button onClick={() => handleAdd(product)} className="btn-accent py-1.5 px-3.5 text-sm">Add</button>
                  ) : (
                    <div className="flex items-center gap-2.5 bg-ink-900 rounded-xl px-2.5 py-1.5 lk-pop-in">
                      <button onClick={() => updateQty(product.id, qty - 1)} className="text-primary-400 hover:text-primary-300"><Minus size={14} /></button>
                      <span className="text-white font-bold text-sm w-4 text-center">{qty}</span>
                      <button onClick={() => handleAdd(product)} className="text-primary-400 hover:text-primary-300"><Plus size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <div className="mt-6 lk-animate-in">
            <h2 className="font-display font-bold text-ink-900 mb-3">Reviews & Ratings</h2>

            {/* Rating summary */}
            <div className="card flex items-center gap-4 mb-3">
              <div className="text-center flex-shrink-0">
                <p className="font-display font-extrabold text-3xl text-ink-900">{shop.rating.toFixed(1)}</p>
                <div className="flex justify-center text-amber-500 my-0.5">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} fill={s <= Math.round(shop.rating) ? 'currentColor' : 'none'} className={s <= Math.round(shop.rating) ? '' : 'text-ink-100'} />)}
                </div>
                <p className="text-[11px] text-ink-400">{shop.total_reviews} reviews</p>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map(star => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-[10px] text-ink-400 w-2.5">{star}</span>
                    <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${(ratingCounts[star - 1] / ratingMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {reviews.slice(0, 5).map(r => (
                <div key={r.id} className="card">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex text-amber-500">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} fill={s <= r.rating ? 'currentColor' : 'none'} className={s <= r.rating ? '' : 'text-ink-100'} />)}
                    </div>
                    {r.sentiment && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.sentiment === 'positive' ? 'bg-fresh-50 text-fresh-600' : r.sentiment === 'negative' ? 'bg-urgent-50 text-urgent-600' : 'bg-ink-100 text-ink-600'}`}>
                        {r.sentiment === 'positive' ? '😊' : r.sentiment === 'negative' ? '😞' : '😐'} {r.sentiment}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-700">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Cart Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 inset-x-0 z-30 flex justify-center px-4 lk-animate-in">
          <Link to="/cart" className="flex items-center justify-center gap-3 bg-ink-900 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-black/20 hover:bg-ink-800 transition-colors w-full max-w-lg">
            <span className="flex items-center gap-2">
              <span className="bg-primary-400 text-ink-900 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center">{cartCount}</span>
              <span className="text-sm text-ink-100/70">₹{cartTotal}</span>
            </span>
            <span className="font-bold flex items-center gap-1">View Cart <ChevronRight size={16} /></span>
          </Link>
        </div>
      )}
    </div>
  )
}
