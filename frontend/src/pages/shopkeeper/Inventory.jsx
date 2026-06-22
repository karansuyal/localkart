import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shopAPI, productAPI, aiAPI } from '../../services/api'
import { ArrowLeft, Plus, TrendingUp, Camera, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { guessProductMeta, iconForCategory } from '../../data/commonProducts'

export default function InventoryPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', quantity: '', category: '', unit: 'piece' })
  const [forecast, setForecast] = useState({})
  const [forecasting, setForecasting] = useState(null)
  const [uploadingFor, setUploadingFor] = useState(null)
  const fileInputs = useRef({})

  const { data: shops } = useQuery({ queryKey: ['my-shops'], queryFn: () => shopAPI.myShops().then(r => r.data) })
  const shop = shops?.[0]

  const { data: products } = useQuery({
    queryKey: ['products', shop?.id],
    queryFn: () => productAPI.byShop(shop.id).then(r => r.data),
    enabled: !!shop?.id
  })

  const addMutation = useMutation({
    mutationFn: (data) => productAPI.create(shop.id, data),
    onSuccess: () => {
      qc.invalidateQueries(['products'])
      setShowAdd(false)
      setForm({ name: '', price: '', quantity: '', category: '', unit: 'piece' })
      toast.success('Product add hua!')
    }
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, available }) => productAPI.update(id, { is_available: available }),
    onSuccess: () => qc.invalidateQueries(['products'])
  })

  const imageMutation = useMutation({
    mutationFn: ({ id, file }) => productAPI.uploadImage(id, file),
    onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Photo lag gayi!') },
    onError: () => toast.error('Photo upload nahi hui, dobara try karo'),
    onSettled: () => setUploadingFor(null)
  })

  // As the shopkeeper types a product name, auto-suggest a category (only
  // if they haven't already picked one) so the form feels smart without
  // forcing anything.
  const handleNameChange = (value) => {
    const guess = guessProductMeta(value)
    setForm(f => ({ ...f, name: value, category: f.category || guess?.category || f.category }))
  }

  const handleImagePick = (productId, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFor(productId)
    imageMutation.mutate({ id: productId, file })
    e.target.value = '' // allow re-selecting the same file later
  }

  const getForecast = async (product) => {
    setForecasting(product.id)
    try {
      // Mock historical data for demo
      const today = new Date()
      const sales = Array.from({ length: 30 }, (_, i) => ({
        ds: new Date(today.getTime() - (29 - i) * 86400000).toISOString().split('T')[0],
        y: Math.floor(Math.random() * 20) + 5
      }))
      const res = await aiAPI.forecast({ product_id: product.id, product_name: product.name, sales_history: sales, periods: 7, method: 'xgboost' })
      setForecast(prev => ({ ...prev, [product.id]: res.data }))
    } catch {
      toast.error('Forecast failed')
    } finally {
      setForecasting(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/shopkeeper"><ArrowLeft size={20} /></Link>
            <h1 className="font-bold text-gray-800">Inventory</h1>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary py-1.5 px-3 text-sm flex items-center gap-1">
            <Plus size={16} />Add Product
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {showAdd && (
          <div className="card mb-4 border-2 border-primary-200">
            <h3 className="font-bold text-gray-800 mb-3">New Product Add Karein</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Product Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  className="input-field mt-0.5"
                  placeholder="jaise: Maggi 2-Min Noodles"
                />
              </div>
              {[['price','Price (₹)','number'],['quantity','Quantity','number'],['category','Category','text']].map(([key, label, type]) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-600">{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} className="input-field mt-0.5" />
                </div>
              ))}
              {form.category && (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <iconify-icon icon={iconForCategory(form.category)} width="20" height="20"></iconify-icon>
                  Photo nahi hai to yeh icon dikhega list mein — baad mein real photo upload kar sakte ho
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={() => addMutation.mutate({...form, price: parseFloat(form.price), quantity: parseInt(form.quantity)})} className="btn-primary flex-1 py-2">Add</button>
                <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 py-2">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {products?.map(product => (
            <div key={product.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* Product photo: real upload if present, else a category emoji
                      placeholder so the card never looks empty. Tapping the
                      thumbnail lets the shopkeeper upload/replace the photo. */}
                  <button
                    onClick={() => fileInputs.current[product.id]?.click()}
                    className="relative w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden group"
                    title="Photo upload/badlo"
                  >
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <iconify-icon icon={iconForCategory(product.category)} width="32" height="32"></iconify-icon>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      {uploadingFor === product.id
                        ? <Loader2 size={16} className="text-white animate-spin" />
                        : <Camera size={14} className="text-white opacity-0 group-hover:opacity-100" />}
                    </div>
                  </button>
                  <input
                    ref={el => fileInputs.current[product.id] = el}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => handleImagePick(product.id, e)}
                  />

                  <div>
                    <p className="font-medium text-gray-800">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.category} · Stock: {product.quantity}</p>
                    <p className="text-primary-600 font-bold">₹{product.price}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => getForecast(product)}
                    className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg flex items-center gap-1"
                    disabled={forecasting === product.id}
                  >
                    <TrendingUp size={12} />
                    {forecasting === product.id ? '...' : 'Forecast'}
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={product.is_available} onChange={e => toggleMutation.mutate({ id: product.id, available: e.target.checked })} className="sr-only" />
                    <div className={`w-10 h-5 rounded-full transition-colors ${product.is_available ? 'bg-primary-600' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow m-0.5 transition-transform ${product.is_available ? 'translate-x-5' : ''}`} />
                    </div>
                  </label>
                </div>
              </div>
              {forecast[product.id] && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs">
                  <p className="font-medium text-blue-800">📊 AI Forecast Insight:</p>
                  <p className="text-blue-700 mt-1">{forecast[product.id].insight}</p>
                  <p className="text-blue-600 mt-1">Trend: {forecast[product.id].trend === 'up' ? '📈 Increasing' : forecast[product.id].trend === 'down' ? '📉 Decreasing' : '➡️ Stable'}</p>
                </div>
              )}
              {product.quantity < 5 && <p className="text-xs text-red-500 mt-1">⚠️ Low stock! Restock karein.</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
