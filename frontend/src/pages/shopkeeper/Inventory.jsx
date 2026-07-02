import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shopAPI, productAPI, aiAPI } from '../../services/api'
import { unsplashService } from '../../services/unsplash'
import { ArrowLeft, Plus, TrendingUp, Camera, Loader2, Search, Upload, X, Pencil, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { guessProductMeta, iconForCategory, UNITS, unitShortLabel } from '../../data/commonProducts'

export default function InventoryPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [imageTab, setImageTab] = useState('none') // 'none' | 'upload' | 'unsplash'
  const [form, setForm] = useState({ name: '', price: '', quantity: '', category: '', unit: 'piece' })
  const [unitAuto, setUnitAuto] = useState(true) // true while the unit was auto-guessed, not hand-picked
  const [pendingFile, setPendingFile] = useState(null)
  const [pendingUnsplash, setPendingUnsplash] = useState(null) // { url, id, photographer, photographer_url, download_url }
  const [unsplashQuery, setUnsplashQuery] = useState('')
  const [unsplashResults, setUnsplashResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [forecast, setForecast] = useState({})
  const [forecasting, setForecasting] = useState(null)
  const [uploadingFor, setUploadingFor] = useState(null)
  const [editingId, setEditingId] = useState(null) // product currently being edited inline (price/qty/unit)
  const [editForm, setEditForm] = useState({ price: '', quantity: '', unit: 'piece' })
  const fileInputs = useRef({})
  const newProductFileInput = useRef(null)

  const { data: shops } = useQuery({ queryKey: ['my-shops'], queryFn: () => shopAPI.myShops().then(r => r.data) })
  const shop = shops?.[0]

  const { data: products } = useQuery({
    queryKey: ['products', shop?.id],
    queryFn: () => productAPI.byShop(shop.id).then(r => r.data),
    enabled: !!shop?.id
  })

  const addMutation = useMutation({
    mutationFn: async (data) => {
      const res = await productAPI.create(shop.id, data)
      // If the shopkeeper picked their own photo file (rather than an
      // Unsplash image), upload it right after creation -- the create
      // endpoint only accepts a URL, not a file.
      if (pendingFile) {
        await productAPI.uploadImage(res.data.id, pendingFile)
      }
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries(['products'])
      resetAddForm()
      toast.success('Product add hua!')
    },
    onError: () => toast.error('Product add nahi hua, dobara try karo')
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, available }) => productAPI.update(id, { is_available: available }),
    onSuccess: () => qc.invalidateQueries(['products'])
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => productAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['products'])
      setEditingId(null)
      toast.success('Product update ho gaya!')
    },
    onError: () => toast.error('Update nahi hua, dobara try karo')
  })

  const imageMutation = useMutation({
    mutationFn: ({ id, file }) => productAPI.uploadImage(id, file),
    onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Photo lag gayi!') },
    onError: () => toast.error('Photo upload nahi hui, dobara try karo'),
    onSettled: () => setUploadingFor(null)
  })

  const resetAddForm = () => {
    setShowAdd(false)
    setForm({ name: '', price: '', quantity: '', category: '', unit: 'piece' })
    setUnitAuto(true)
    setImageTab('none')
    setPendingFile(null)
    setPendingUnsplash(null)
    setUnsplashResults([])
    setUnsplashQuery('')
  }

  // As the shopkeeper types a product name, auto-suggest a category and a
  // sensible selling unit (kg/litre/dozen/piece...) -- only if they
  // haven't already picked their own, so the form feels smart without
  // forcing anything.
  const handleNameChange = (value) => {
    const guess = guessProductMeta(value)
    setForm(f => ({
      ...f,
      name: value,
      category: f.category || guess?.category || f.category,
      unit: unitAuto && guess?.unit ? guess.unit : f.unit,
    }))
  }

  const handleUnitChange = (value) => {
    setUnitAuto(false) // shopkeeper took over -- stop auto-guessing from here on
    setForm(f => ({ ...f, unit: value }))
  }

  const startEdit = (product) => {
    setEditingId(product.id)
    setEditForm({ price: String(product.price), quantity: String(product.quantity), unit: product.unit || 'piece' })
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = (productId) => {
    if (!editForm.price || Number(editForm.price) <= 0) return toast.error('Sahi price daalo')
    if (editForm.quantity === '' || Number(editForm.quantity) < 0) return toast.error('Sahi quantity daalo')
    editMutation.mutate({
      id: productId,
      data: {
        price: parseFloat(editForm.price),
        quantity: parseInt(editForm.quantity),
        unit: editForm.unit,
      }
    })
  }

  const handleImagePick = (productId, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFor(productId)
    imageMutation.mutate({ id: productId, file })
    e.target.value = ''
  }

  const handleNewProductFilePick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setPendingUnsplash(null) // a manual upload always wins over a previously picked Unsplash photo
    e.target.value = ''
  }

  const searchUnsplash = async () => {
    if (!unsplashQuery.trim()) {
      toast.error('Pehle kuch search karo, jaise "maggi noodles"')
      return
    }
    setSearching(true)
    try {
      const result = await unsplashService.searchProductImages(unsplashQuery.trim(), 12)
      setUnsplashResults(result.results || [])
      if (!result.results?.length) toast('Koi image nahi mili, dusra keyword try karo', { icon: '🔍' })
    } catch {
      toast.error('Unsplash search fail hui')
    } finally {
      setSearching(false)
    }
  }

  const pickUnsplashPhoto = async (photo) => {
    // Unsplash API Guidelines: every time a photo is "used" (selected here,
    // not just searched), we must ping their download-tracking endpoint.
    unsplashService.trackDownload(photo.download_url).catch(() => {})
    setPendingUnsplash(photo)
    setPendingFile(null) // an Unsplash pick always wins over a previously chosen upload file
    toast.success('Image select ho gayi')
  }

  const handleAddProduct = () => {
    if (!form.name.trim()) return toast.error('Product ka naam daalo')
    if (!form.price || Number(form.price) <= 0) return toast.error('Sahi price daalo')
    if (form.quantity === '' || Number(form.quantity) < 0) return toast.error('Sahi quantity daalo')

    const payload = {
      ...form,
      price: parseFloat(form.price),
      quantity: parseInt(form.quantity),
    }

    // Wire up Unsplash attribution if that's the image source -- these
    // fields get stored on the product so ShopPage can show photographer
    // credit, per Unsplash's API guidelines.
    if (pendingUnsplash) {
      payload.image_url = pendingUnsplash.url
      payload.image_source = 'unsplash'
      payload.unsplash_photo_id = pendingUnsplash.id
      payload.unsplash_photographer = pendingUnsplash.photographer
      payload.unsplash_photographer_url = pendingUnsplash.photographer_url
    }

    addMutation.mutate(payload)
  }

  const getForecast = async (product) => {
    setForecasting(product.id)
    try {
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

  // "Low stock" means something different depending on the unit -- 3 kg of
  // rice is fine, but 3 packets of biscuits or 3 loose pieces is worth a
  // nudge. Keep it simple with per-unit-kind thresholds.
  const LOW_STOCK_THRESHOLD = { kg: 2, litre: 2, gram: 200, ml: 200 }
  const isLowStock = (product) => product.quantity < (LOW_STOCK_THRESHOLD[product.unit] ?? 5)

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
              <div>
                <label className="text-xs font-medium text-gray-600">Price (₹)</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="input-field mt-0.5" placeholder="0" />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    className="input-field mt-0.5"
                    placeholder={form.unit === 'kg' ? 'jaise: 5' : form.unit === 'gram' ? 'jaise: 500' : '0'}
                  />
                </div>
                <div className="w-32">
                  <label className="text-xs font-medium text-gray-600">Unit</label>
                  <select value={form.unit} onChange={e => handleUnitChange(e.target.value)} className="input-field mt-0.5">
                    {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 -mt-2">
                Stock kitni hai batao — kg, gram, litre, dozen ya piece mein. Naam type karte hi hum sahi unit khud select kar dete hain, tum chaho to badal sakte ho.
              </p>

              <div>
                <label className="text-xs font-medium text-gray-600">Category</label>
                <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field mt-0.5" />
              </div>

              {/* ─── Image source picker ─────────────────────────────── */}
              <div>
                <label className="text-xs font-medium text-gray-600">Product Photo (optional)</label>
                <div className="flex bg-gray-100 rounded-lg p-0.5 mt-1 mb-2">
                  <button type="button" onClick={() => setImageTab('upload')}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md flex items-center justify-center gap-1 ${imageTab === 'upload' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
                    <Upload size={12} />Apni Photo
                  </button>
                  <button type="button" onClick={() => setImageTab('unsplash')}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md flex items-center justify-center gap-1 ${imageTab === 'unsplash' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
                    <Search size={12} />Free Images
                  </button>
                </div>

                {imageTab === 'upload' && (
                  <div>
                    <button type="button" onClick={() => newProductFileInput.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-primary-400 transition text-xs text-gray-500">
                      {pendingFile ? `📎 ${pendingFile.name}` : 'Tap karke photo chuno'}
                    </button>
                    <input ref={newProductFileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleNewProductFilePick} />
                  </div>
                )}

                {imageTab === 'unsplash' && (
                  <div>
                    <div className="flex gap-2">
                      <input
                        value={unsplashQuery}
                        onChange={e => setUnsplashQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && searchUnsplash()}
                        placeholder="jaise: maggi noodles"
                        className="input-field text-sm flex-1"
                      />
                      <button type="button" onClick={searchUnsplash} disabled={searching} className="btn-secondary px-3 disabled:opacity-50">
                        {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      </button>
                    </div>

                    {unsplashResults.length > 0 && (
                      <>
                        <div className="grid grid-cols-3 gap-1.5 mt-2 max-h-48 overflow-y-auto">
                          {unsplashResults.map(photo => (
                            <button
                              type="button"
                              key={photo.id}
                              onClick={() => pickUnsplashPhoto(photo)}
                              className={`relative rounded-lg overflow-hidden border-2 transition ${pendingUnsplash?.id === photo.id ? 'border-primary-500' : 'border-transparent hover:border-gray-300'}`}
                            >
                              <img src={photo.thumb} alt={photo.description || 'Product'} className="w-full h-16 object-cover" />
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5">
                          Photos by <a href="https://unsplash.com/?utm_source=localkart&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a>
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Preview of whichever image is currently selected */}
                {(pendingFile || pendingUnsplash) && (
                  <div className="flex items-center gap-2 mt-2 bg-gray-50 rounded-lg p-2">
                    <img
                      src={pendingUnsplash ? pendingUnsplash.thumb : URL.createObjectURL(pendingFile)}
                      alt="Selected"
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div className="flex-1 text-xs text-gray-600">
                      {pendingUnsplash ? (
                        <>Unsplash photo · <a href={pendingUnsplash.unsplash_url} target="_blank" rel="noopener noreferrer" className="underline">📸 {pendingUnsplash.photographer}</a></>
                      ) : 'Apni photo'}
                    </div>
                    <button type="button" onClick={() => { setPendingFile(null); setPendingUnsplash(null) }} className="text-gray-400 hover:text-red-500">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {!pendingFile && !pendingUnsplash && form.category && (
                  <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-2">
                    <iconify-icon icon={iconForCategory(form.category)} width="20" height="20"></iconify-icon>
                    Photo nahi chuni to yeh icon dikhega list mein
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={handleAddProduct} disabled={addMutation.isPending} className="btn-primary flex-1 py-2 disabled:opacity-60">
                  {addMutation.isPending ? 'Add ho raha hai...' : 'Add'}
                </button>
                <button onClick={resetAddForm} className="btn-secondary flex-1 py-2">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {products?.map(product => (
            <div key={product.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* Product photo: real upload/Unsplash if present, else a
                      category icon placeholder so the card never looks
                      empty. Tapping the thumbnail lets the shopkeeper
                      upload/replace the photo (this always overrides any
                      previously-picked Unsplash photo, see the endpoint). */}
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

                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{product.name}</p>

                    {editingId === product.id ? (
                      <div className="mt-1 space-y-1.5 bg-gray-50 rounded-lg p-2">
                        <div className="flex gap-1.5">
                          <div className="flex-1">
                            <label className="text-[10px] text-gray-500">Price (₹)</label>
                            <input
                              type="number"
                              value={editForm.price}
                              onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                              className="input-field text-sm py-1 mt-0.5"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-gray-500">Quantity</label>
                            <input
                              type="number"
                              min="0"
                              value={editForm.quantity}
                              onChange={e => setEditForm({ ...editForm, quantity: e.target.value })}
                              className="input-field text-sm py-1 mt-0.5"
                            />
                          </div>
                          <div className="w-24">
                            <label className="text-[10px] text-gray-500">Unit</label>
                            <select
                              value={editForm.unit}
                              onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                              className="input-field text-sm py-1 mt-0.5"
                            >
                              {UNITS.map(u => <option key={u.value} value={u.value}>{u.short}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => saveEdit(product.id)}
                            disabled={editMutation.isPending}
                            className="btn-primary text-xs py-1 px-2 flex items-center gap-1 disabled:opacity-60"
                          >
                            <Check size={12} />{editMutation.isPending ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={cancelEdit} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                            <X size={12} />Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500">{product.category} · Stock: {product.quantity} {unitShortLabel(product.unit)}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-primary-600 font-bold">₹{product.price}</p>
                          <button onClick={() => startEdit(product)} className="text-gray-400 hover:text-primary-600" title="Price/quantity edit karein">
                            <Pencil size={12} />
                          </button>
                        </div>
                      </>
                    )}

                    {product.image_source === 'unsplash' && product.unsplash_photographer && (
                      <p className="text-[10px] text-gray-400">
                        📸 <a href={product.unsplash_photographer_url} target="_blank" rel="noopener noreferrer" className="underline">{product.unsplash_photographer}</a> on Unsplash
                      </p>
                    )}
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
              {isLowStock(product) && <p className="text-xs text-red-500 mt-1">⚠️ Low stock! Restock karein.</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
