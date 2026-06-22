import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuthStore } from '../context/store'
import { auth } from '../firebase'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { ShoppingBag, ArrowRight, RefreshCw, Phone } from 'lucide-react'

const ROLES = [
  { value: 'customer', label: '🛍️ Customer', desc: 'Shop from local stores' },
  { value: 'shopkeeper', label: '🏪 Shopkeeper', desc: 'Sell your products' },
  { value: 'delivery', label: '🚴 Delivery', desc: 'Deliver and earn' },
]

export default function Register() {
  const [step, setStep] = useState('details') // details | otp
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('customer')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [confirmResult, setConfirmResult] = useState(null)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-reg', {
        size: 'invisible',
        callback: () => {},
      })
    }
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear()
        window.recaptchaVerifier = null
      }
    }
  }, [])

  const startCountdown = () => {
    setCountdown(60)
    const t = setInterval(() => setCountdown(p => { if (p <= 1) { clearInterval(t); return 0 } return p - 1 }), 1000)
  }

  const handleSendOTP = async () => {
    if (!name.trim()) return toast.error('Naam daalein')
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) return toast.error('Sahi phone number daalein')
    const formatted = `+91${digits.slice(-10)}`

    setLoading(true)
    try {
      const verifier = window.recaptchaVerifier
      const result = await signInWithPhoneNumber(auth, formatted, verifier)
      setConfirmResult(result)
      setPhone(formatted)
      setStep('otp')
      startCountdown()
      toast.success('OTP bhej diya! SMS check karein 📱')
    } catch (err) {
      console.error(err)
      toast.error('OTP nahi gaya — dobara try karo')
      window.recaptchaVerifier?.clear()
      window.recaptchaVerifier = null
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return toast.error('6 digit OTP daalein')
    setLoading(true)
    try {
      const result = await confirmResult.confirm(otp)
      const firebaseToken = await result.user.getIdToken()
      const res = await authAPI.firebaseLogin({ firebase_token: firebaseToken, name: name.trim(), role })
      const { access_token, user_id, role: userRole } = res.data
      login({ id: user_id, role: userRole }, access_token)
      toast.success('Welcome to LocalKart! 🎉')
      if (userRole === 'shopkeeper') navigate('/shopkeeper')
      else if (userRole === 'delivery') navigate('/delivery')
      else navigate('/home')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Galat OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center p-4">
      <div id="recaptcha-container-reg" />

      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-3">
            <ShoppingBag className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join LocalKart AI</h1>
          <p className="text-sm text-gray-500">Phone OTP se register — no password needed! 🔥</p>
        </div>

        {step === 'details' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aapka Naam</label>
              <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Rahul Kumar" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📱 Mobile Number</label>
              <div className="flex gap-2">
                <span className="input-field w-16 text-center text-gray-600 font-medium bg-gray-50">+91</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="input-field flex-1"
                  placeholder="9876543210"
                  maxLength={10}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Aap kya hain?</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)}
                    className={`border-2 rounded-xl p-3 text-center transition-all ${role === r.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                    <div className="text-2xl mb-1">{r.label.split(' ')[0]}</div>
                    <div className="text-xs font-medium text-gray-700">{r.label.split(' ').slice(1).join(' ')}</div>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleSendOTP} disabled={loading || !name.trim() || phone.length < 10}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Bhej raha hai...</>
                : <><span>OTP Bhejein</span><ArrowRight size={18} /></>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700">
              <Phone size={16} />
              <span>OTP bheja: <strong>{phone}</strong></span>
              <button onClick={() => { setStep('details'); setOtp(''); setConfirmResult(null) }} className="ml-auto text-xs underline">Badlein</button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">6-digit OTP</label>
              <input type="tel" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                className="input-field text-center text-2xl tracking-[0.5em] font-bold"
                placeholder="000000" maxLength={6} autoFocus />
            </div>
            <button onClick={handleVerifyOTP} disabled={loading || otp.length !== 6} className="btn-primary w-full py-3 disabled:opacity-50">
              {loading ? 'Verify ho raha hai...' : 'Account Banayein ✓'}
            </button>
            <button onClick={() => { if (countdown > 0) return; setStep('details'); setOtp('') }}
              disabled={countdown > 0} className="w-full text-sm text-gray-500 flex items-center justify-center gap-1 py-1 disabled:opacity-40">
              <RefreshCw size={14} />
              {countdown > 0 ? `Resend (${countdown}s)` : 'OTP nahi aaya? Dobara bhejein'}
            </button>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          Already account hai?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">Login karein</Link>
        </p>
      </div>
    </div>
  )
}
