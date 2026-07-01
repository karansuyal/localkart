import { useEffect, useState, useRef } from 'react'

// Web Audio API se ek chhota "ding" beep generate karte hain -- koi external
// mp3/CDN file nahi chahiye, isliye offline/CORS issues bhi nahi aayenge.
function playNotificationBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const now = ctx.currentTime
    ;[880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = now + i * 0.12
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.2)
    })
    setTimeout(() => ctx.close(), 500)
  } catch {
    // AudioContext blocked (autoplay policy) ya unsupported -- silently ignore
  }
}

export function useOrderTracking(orderId) {
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState(null)
  const [eta, setEta] = useState(null)
  const [deliveryLocation, setDeliveryLocation] = useState(null) // { lat, lng }
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null) // Date.now() -- offline/stale detect karne ke liye
  const [deliveryName, setDeliveryName] = useState(null)
  const [deliveryPhone, setDeliveryPhone] = useState(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    if (!orderId) return

    const wsBase = import.meta.env.VITE_WS_URL || 'wss://localkart-gj6g.onrender.com'
    const ws = new WebSocket(`${wsBase}/ws/order/${orderId}`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'order_update') {
          setStatus(data.status)
          if (data.message) setMessage(data.message)
          if (data.eta_minutes) setEta(data.eta_minutes)
          if (data.delivery_partner_name) setDeliveryName(data.delivery_partner_name)
          if (data.delivery_partner_phone) setDeliveryPhone(data.delivery_partner_phone)

          // Browser notification + sound -- Zomato-style "ding" jab bhi status badle
          playNotificationBeep()
          if (Notification.permission === 'granted' && data.message) {
            new Notification('LocalKart 🛵', {
              body: data.message,
              icon: '/favicon-32.png',
            })
          }
        }

        // Delivery partner ki real-time location
        if (data.type === 'delivery_location') {
          setDeliveryLocation({ lat: data.lat, lng: data.lng })
          setLastLocationUpdate(Date.now())
        }
      } catch (e) {}
    }

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)

    return () => {
      clearInterval(ping)
      ws.close()
    }
  }, [orderId])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return { status, message, eta, deliveryLocation, lastLocationUpdate, deliveryName, deliveryPhone, connected }
}