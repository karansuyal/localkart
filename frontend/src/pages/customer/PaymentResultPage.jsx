import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { paymentAPI } from '../../services/api'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

// PhonePe redirects the browser back here (redirect_url set at initiate
// time) after the customer finishes on the PhonePe checkout page. The
// redirect itself is NOT proof of payment -- the webhook is the source of
// truth -- so this page just polls our backend until the order's
// payment_status stops being 'pending'.
const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 24 // ~1 minute

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')
  const navigate = useNavigate()
  const [status, setStatus] = useState('pending') // pending | paid | failed | error
  const pollCount = useRef(0)

  useEffect(() => {
    if (!orderId) { setStatus('error'); return }
    let cancelled = false

    const poll = async () => {
      try {
        const res = await paymentAPI.status(orderId)
        const paymentStatus = res.data.payment_status
        if (cancelled) return

        if (paymentStatus === 'paid') { setStatus('paid'); return }
        if (paymentStatus === 'failed') { setStatus('failed'); return }

        pollCount.current += 1
        if (pollCount.current >= MAX_POLLS) { setStatus('pending'); return }
        setTimeout(poll, POLL_INTERVAL_MS)
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    poll()

    return () => { cancelled = true }
  }, [orderId])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
      {status === 'pending' && (
        <>
          <Loader2 size={56} className="text-primary-600 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Payment check ho raha hai...</h2>
          <p className="text-gray-500">Thoda ruko, PhonePe se confirmation aane wala hai.</p>
        </>
      )}

      {status === 'paid' && (
        <>
          <CheckCircle2 size={64} className="text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Successful! 🎉</h2>
          <p className="text-gray-500 mb-6">Tumhara order confirm ho gaya hai.</p>
          <button onClick={() => navigate('/orders')} className="btn-primary">Order Dekho</button>
        </>
      )}

      {status === 'failed' && (
        <>
          <XCircle size={64} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Fail Ho Gaya</h2>
          <p className="text-gray-500 mb-6">Paise nahi kate honge. Order page se dobara try kar sakte ho.</p>
          <button onClick={() => navigate('/orders')} className="btn-primary">Orders Dekho</button>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle size={64} className="text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Status Check Nahi Ho Paya</h2>
          <p className="text-gray-500 mb-6">Apne Orders page pe jaake status check karo.</p>
          <Link to="/orders" className="btn-primary">Orders Dekho</Link>
        </>
      )}
    </div>
  )
}
