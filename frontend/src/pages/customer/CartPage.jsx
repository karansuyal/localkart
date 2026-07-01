import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useCartStore, useAuthStore } from '../../context/store'
import { orderAPI, shopAPI, paymentAPI } from '../../services/api'
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Wallet, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'

// Strips spaces/dashes/+ and ensures an Indian country code prefix so
// wa.me links work. wa.me requires digits only, no '+', e.g. 91XXXXXXXXXX.
function toWhatsAppNumber(rawPhone) {
  if (!rawPhone) return null
  const digits = rawPhone.replace(/[^\d]/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 13 && digits.startsWith('091')) return `91${digits.slice(3)}`
  return digits.length >= 10 ? digits : null
}

function buildOrderMessage({ order, items, customerName, address, total, shopName }) {
  const lines = [
    `🛒 *Naya Order – LocalKart*`,
    ``,
    `*Order #${order.id}*`,
    `Customer: ${customerName}`,
    ``,
    `*Items:*`,
    ...items.map(i => `• ${i.name} x${i.qty} — ₹${i.price * i.qty}`),
    ``,
    `*Total: ₹${total}*`,
    `Payment: Cash on Delivery`,
    ``,
    `*Delivery Address:*`,
    address,
    ``,
    `Shop: ${shopName}`,
  ]
  return lines.join('\n')
}

export default function CartPage() {
  const { items, updateQty, removeItem, clearCart, shopId } = useCartStore()
  const { user } = useAuthStore()
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [paymentMode, setPaymentMode] = useState('cod') // 'cod' | 'phonepe'
  const navigate = useNavigate()

  const { data: shop } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopAPI.get(shopId).then(r => r.data),
    enabled: !!shopId
  })

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const deliveryFee = 20
  const total = subtotal + deliveryFee

  // Shopkeeper ko WhatsApp pe order details bhejna -- sirf COD flow mein,
  // kyunki online payment orders ka WhatsApp shopkeeper ko payment confirm
  // hone ke baad hi bhejna sahi hoga (abhi sirf order create hone ka).
  const notifyShopkeeperOnWhatsApp = (order) => {
    const waNumber = toWhatsAppNumber(shop?.phone)
    if (!waNumber) {
      toast.success('Order place ho gaya! 🎉')
      toast('Shopkeeper ka phone number nahi mila, WhatsApp nahi bheja gaya', { icon: '⚠️' })
      return
    }
    const message = buildOrderMessage({
      order, items, customerName: user?.name || 'Customer',
      address, total, shopName: shop?.name || 'Shop'
    })
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
    const opened = window.open(waUrl, '_blank')

    if (opened) {
      toast.success('Order place ho gaya! WhatsApp pe shopkeeper ko bhejo 📲')
    } else {
      toast.success('Order place ho gaya! 🎉')
      toast(
        (t) => (
          <span>
            Popup block hua.{' '}
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline font-medium">
              Yahan tap karo
            </a>{' '}
            shopkeeper ko WhatsApp bhejne ke liye
          </span>
        ),
        { duration: 8000 }
      )
    }
  }

  const placeOrder = async () => {
    if (!address.trim()) { toast.error('Delivery address daalna zaroori hai!'); return }
    setLoading(true)
    try {
      const res = await orderAPI.place({
        shop_id: shopId,
        items: items.map(i => ({ product_id: i.id, quantity: i.qty })),
        delivery_address: address,
        payment_mode: paymentMode
      })
      const order = res.data

      if (paymentMode === 'phonepe') {
        // Order ban chuka hai (unpaid) -- ab PhonePe checkout shuru karo.
        // Cart ko yahin clear kar dete hain kyunki order already ban chuka
        // hai; agar payment fail hui to bhi order 'failed' status mein
        // dikhega, dobara pay karne ka option Orders page se milega.
        const payRes = await paymentAPI.initiatePhonePe(order.id)
        clearCart()
        window.location.href = payRes.data.redirect_url
        return
      }

      notifyShopkeeperOnWhatsApp(order)
      clearCart()
      navigate('/orders')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Order failed')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <ShoppingBag size={64} className="text-gray-300 mb-4" />
      <h2 className="text-xl font-bold text-gray-600 mb-2">Cart Khali Hai</h2>
      <p className="text-gray-500 mb-6">Kuch products add karein!</p>
      <Link to="/home" className="btn-primary">Shops Dekhein</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-36">
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/home"><ArrowLeft size={20} /></Link>
          <h1 className="font-bold text-gray-800">My Cart ({items.length} items)</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {items.map(item => (
          <div key={item.id} className="card flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🛍️</div>
            <div className="flex-1">
              <p className="font-medium text-gray-800 text-sm">{item.name}</p>
              <p className="text-primary-600 font-bold">₹{item.price}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center"><Minus size={14} /></button>
              <span className="font-bold w-4 text-center">{item.qty}</span>
              <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white"><Plus size={14} /></button>
              <button onClick={() => removeItem(item.id)} className="w-7 h-7 bg-red-50 rounded-full flex items-center justify-center text-red-500"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}

        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            rows={3}
            className="input-field resize-none"
            placeholder="Ghar ka address likhein..."
          />
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-800 mb-3">Payment Method</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMode('cod')}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-colors ${
                paymentMode === 'cod' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <Wallet size={22} className={paymentMode === 'cod' ? 'text-primary-600' : 'text-gray-400'} />
              <span className={`text-sm font-medium ${paymentMode === 'cod' ? 'text-primary-700' : 'text-gray-600'}`}>
                Cash on Delivery
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('phonepe')}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-colors ${
                paymentMode === 'phonepe' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <Smartphone size={22} className={paymentMode === 'phonepe' ? 'text-primary-600' : 'text-gray-400'} />
              <span className={`text-sm font-medium ${paymentMode === 'phonepe' ? 'text-primary-700' : 'text-gray-600'}`}>
                Pay Online (PhonePe)
              </span>
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-800 mb-3">Bill Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal}</span></div>
            <div className="flex justify-between text-gray-600"><span>Delivery Fee</span><span>₹{deliveryFee}</span></div>
            <div className="border-t pt-2 flex justify-between font-bold text-gray-800 text-base"><span>Total</span><span>₹{total}</span></div>
          </div>
          {paymentMode === 'cod' ? (
            <>
              <p className="text-xs text-gray-500 mt-2">💳 Cash on Delivery</p>
              <p className="text-xs text-gray-400 mt-1">📲 Order place karne ke baad WhatsApp khulega shopkeeper ko bhejne ke liye</p>
            </>
          ) : (
            <p className="text-xs text-gray-500 mt-2">📲 Order place karne ke baad PhonePe checkout khulega — UPI, card ya netbanking se pay kar sakte ho</p>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 py-4 bg-white border-t">
        <button onClick={placeOrder} disabled={loading} className="btn-primary w-full py-4 text-base font-bold disabled:opacity-50">
          {loading
            ? (paymentMode === 'phonepe' ? 'PhonePe pe le ja rahe hain...' : 'Placing Order...')
            : paymentMode === 'phonepe' ? `Pay ₹${total} with PhonePe` : `Place Order • ₹${total}`}
        </button>
      </div>
    </div>
  )
}
