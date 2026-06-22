import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { shopAPI, productAPI, reviewAPI, aiAPI } from '../../services/api'
import { useCartStore } from '../../context/store'
import { ArrowLeft, Plus, Minus, Star, ShoppingCart, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { iconForCategory } from '../../data/commonProducts'

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

  if (!shop) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/home" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
          <div className="text-center">
            <h1 className="font-bold text-gray-800">{shop.name}</h1>
            <div className="flex items-center justify-center gap-1 text-xs text-yellow-600">
              <Star size={11} fill="currentColor" />{shop.rating.toFixed(1)} ({shop.total_reviews} reviews)
            </div>
          </div>
          <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-lg">
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{cartCount}</span>}
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Shop Info */}
        <div className="card mb-4">
          <p className="text-sm text-gray-600">{shop.description || 'Quality products at best prices'}</p>
          <div className="flex gap-2 mt-2">
            <span className={`badge-${shop.is_open ? 'green' : 'red'}`}>{shop.is_open ? '🟢 Open' : '🔴 Closed'}</span>
            {shop.is_verified && <span className="badge-green">✓ Verified</span>}
            {shop.category && <span className="badge-yellow">{shop.category}</span>}
          </div>
        </div>

        {/* AI Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="card mb-4 border-primary-200 bg-primary-50">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-primary-600" />
              <span className="text-sm font-semibold text-primary-700">AI Suggestions for You</span>
            </div>
            <p className="text-xs text-primary-600">Is product ke saath log yeh bhi khareedte hain:</p>
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {products?.filter(p => recommendations.includes(p.id)).map(p => (
                <div key={p.id} className="bg-white rounded-lg p-2 min-w-max border border-primary-100">
                  <p className="text-xs font-medium text-gray-700">{p.name}</p>
                  <p className="text-xs text-primary-600 font-bold">₹{p.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        <h2 className="font-bold text-gray-800 mb-3">Products ({products?.length || 0})</h2>
        <div className="space-y-3">
          {products?.map(product => {
            const qty = getQty(product.id)
            return (
              <div key={product.id} className="card flex items-center gap-3">
                <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <iconify-icon icon={iconForCategory(product.category)} width="32" height="32"></iconify-icon>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.category} · {product.unit}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-primary-600 font-bold">₹{product.price}</span>
                    {product.mrp && product.mrp > product.price && (
                      <span className="text-xs text-gray-400 line-through">₹{product.mrp}</span>
                    )}
                  </div>
                </div>
                <div>
                  {qty === 0 ? (
                    <button onClick={() => handleAdd(product)} className="btn-primary py-1.5 px-3 text-sm">Add</button>
                  ) : (
                    <div className="flex items-center gap-2 bg-primary-600 rounded-lg px-2 py-1">
                      <button onClick={() => updateQty(product.id, qty - 1)} className="text-white"><Minus size={14} /></button>
                      <span className="text-white font-bold text-sm w-4 text-center">{qty}</span>
                      <button onClick={() => handleAdd(product)} className="text-white"><Plus size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <div className="mt-6">
            <h2 className="font-bold text-gray-800 mb-3">Reviews & Ratings</h2>
            <div className="space-y-2">
              {reviews.slice(0, 5).map(r => (
                <div key={r.id} className="card">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => <Star key={s} size={12} fill={s <= r.rating ? 'gold' : 'none'} stroke={s <= r.rating ? 'gold' : 'gray'} />)}
                    </div>
                    {r.sentiment && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.sentiment === 'positive' ? 'bg-green-100 text-green-700' : r.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {r.sentiment === 'positive' ? '😊' : r.sentiment === 'negative' ? '😞' : '😐'} {r.sentiment}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Cart Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
          <Link to="/cart" className="flex items-center justify-between bg-primary-600 text-white px-5 py-3.5 rounded-2xl shadow-lg">
            <span className="bg-primary-700 px-2 py-0.5 rounded-lg text-sm">{cartCount} items</span>
            <span className="font-bold">View Cart</span>
            <ShoppingCart size={20} />
          </Link>
        </div>
      )}
    </div>
  )
}
