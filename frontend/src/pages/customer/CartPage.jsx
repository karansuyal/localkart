import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useCartStore, useAuthStore } from '../../context/store'
import { orderAPI, shopAPI, paymentAPI } from '../../services/api'
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Wallet, Smartphone, MapPin, Check, Store, ShieldCheck } from 'lucide-react'
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
  const savings = items.reduce((s, i) => s + (i.mrp && i.mrp > i.price ? (i.mrp - i.price) * i.qty : 0), 0)
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
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center p-4">
      <style>{`@keyframes lk-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } } .lk-float { animation: lk-float 3s ease-in-out infinite; }`}</style>
      <div className="w-24 h-24 rounded-full bg-ink-100 flex items-center justify-center mb-4 lk-float">
        <ShoppingBag size={40} className="text-ink-300" />
      </div>
      <h2 className="text-xl font-display font-bold text-ink-800 mb-1">Cart Khali Hai</h2>
      <p className="text-ink-400 mb-6 text-center text-sm">Kuch products add karein aur yahan dikhne lagenge!</p>
      <Link to="/home" className="btn-accent px-6 py-2.5">Shops Dekhein</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-ink-50 pb-40">
      <style>{`
        @keyframes lk-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .lk-animate-in { animation: lk-fade-up .4s ease both; }
      `}</style>

      <div className="bg-ink-900 text-white sticky top-0 z-20 shadow-lg shadow-black/10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/home" className="p-2 bg-ink-800/80 rounded-xl hover:bg-ink-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-display font-bold">My Cart</h1>
            <p className="text-xs text-ink-100/60">{items.length} item{items.length > 1 ? 's' : ''}{shop?.name ? ` from ${shop.name}` : ''}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {shop && (
          <div className="flex items-center gap-2 text-sm text-ink-500 lk-animate-in">
            <Store size={14} className="text-ink-400" />
            Ordering from <span className="font-semibold text-ink-800">{shop.name}</span>
          </div>
        )}

        <div className="space-y-2.5">
          {items.map((item, i) => (
            <div
              key={item.id}
              style={{ animationDelay: `${i * 40}ms` }}
              className="lk-animate-in card flex items-center gap-3"
            >
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : '🛍️'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink-800 text-sm truncate">{item.name}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-primary-700 font-bold text-sm">₹{item.price}</p>
                  {item.mrp && item.mrp > item.price && (
                    <p className="text-xs text-ink-100 line-through">₹{item.mrp}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 bg-ink-100 hover:bg-ink-100/70 rounded-full flex items-center justify-center transition-colors"><Minus size={14} /></button>
                <span className="font-bold w-4 text-center text-ink-900">{item.qty}</span>
                <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 bg-ink-900 rounded-full flex items-center justify-center text-primary-400 hover:bg-ink-800 transition-colors"><Plus size={14} /></button>
                <button onClick={() => removeItem(item.id)} className="w-7 h-7 bg-urgent-50 rounded-full flex items-center justify-center text-urgent-500 hover:bg-urgent-100 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="card lk-animate-in">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-800 mb-2">
            <MapPin size={14} className="text-primary-600" />Delivery Address *
          </label>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            rows={3}
            className="input-field resize-none"
            placeholder="Ghar ka address likhein... (ghar/gali/landmark)"
          />
        </div>

        <div className="card lk-animate-in">
          <h3 className="font-display font-bold text-ink-900 mb-3">Payment Method</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMode('cod')}
              className={`relative flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3.5 transition-all ${
                paymentMode === 'cod' ? 'border-ink-900 bg-ink-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {paymentMode === 'cod' && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-ink-900 rounded-full flex items-center justify-center">
                  <Check size={10} className="text-primary-400" />
                </span>
              )}
              <Wallet size={22} className={paymentMode === 'cod' ? 'text-ink-900' : 'text-ink-300'} />
              <span className={`text-sm font-medium ${paymentMode === 'cod' ? 'text-ink-900' : 'text-ink-400'}`}>
                Cash on Delivery
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('phonepe')}
              className={`relative flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3.5 transition-all ${
                paymentMode === 'phonepe' ? 'border-ink-900 bg-ink-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {paymentMode === 'phonepe' && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-ink-900 rounded-full flex items-center justify-center">
                  <Check size={10} className="text-primary-400" />
                </span>
              )}
              <Smartphone size={22} className={paymentMode === 'phonepe' ? 'text-ink-900' : 'text-ink-300'} />
              <span className={`text-sm font-medium ${paymentMode === 'phonepe' ? 'text-ink-900' : 'text-ink-400'}`}>
                Pay Online (PhonePe)
              </span>
            </button>
          </div>
        </div>

        <div className="card lk-animate-in">
          <h3 className="font-display font-bold text-ink-900 mb-3">Bill Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-ink-500"><span>Subtotal</span><span>₹{subtotal}</span></div>
            {savings > 0 && (
              <div className="flex justify-between text-fresh-600 font-medium"><span>You're saving</span><span>−₹{savings}</span></div>
            )}
            <div className="flex justify-between text-ink-500"><span>Delivery Fee</span><span>₹{deliveryFee}</span></div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-ink-900 text-base"><span>Total</span><span>₹{total}</span></div>
          </div>
          {paymentMode === 'cod' ? (
            <>
              <p className="text-xs text-ink-400 mt-2.5 flex items-center gap-1"><Wallet size={11} />Cash on Delivery</p>
              <p className="text-xs text-ink-300 mt-1">📲 Order place karne ke baad WhatsApp khulega shopkeeper ko bhejne ke liye</p>
            </>
          ) : (
            <p className="text-xs text-ink-300 mt-2.5">📲 Order place karne ke baad PhonePe checkout khulega — UPI, card ya netbanking se pay kar sakte ho</p>
          )}
          <p className="flex items-center gap-1 text-[11px] text-ink-300 mt-3 pt-2.5 border-t border-gray-50">
            <ShieldCheck size={12} className="text-fresh-500" />Aapki details safe hain, sirf shopkeeper ko order details share hoti hain
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 py-4 bg-white/95 backdrop-blur border-t border-gray-100 z-30">
        <button onClick={placeOrder} disabled={loading} className="btn-accent w-full py-4 text-base font-bold disabled:opacity-50 shadow-lg shadow-primary-400/20 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-ink-900/30 border-t-ink-900 rounded-full animate-spin" />
              {paymentMode === 'phonepe' ? 'PhonePe pe le ja rahe hain...' : 'Placing Order...'}
            </>
          ) : (
            paymentMode === 'phonepe' ? `Pay ₹${total} with PhonePe` : `Place Order • ₹${total}`
          )}
        </button>
      </div>
    </div>
  )
}
