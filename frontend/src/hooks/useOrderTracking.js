import { useEffect, useState, useRef } from 'react'

export function useOrderTracking(orderId) {
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState(null)
  const [eta, setEta] = useState(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    if (!orderId) return

    const wsBase = import.meta.env.VITE_WS_URL || 'wss://localkart-i5wm.onrender.com'
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

          // Browser notification bhi dikhao (agar permission hai)
          if (Notification.permission === 'granted' && data.message) {
            new Notification('LocalKart Order Update', {
              body: data.message,
              icon: '/favicon-32.png',
            })
          }
        }
      } catch (e) {}
    }

    // Ping to keep connection alive
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

  // Browser notification permission maango
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return { status, message, eta, connected }
}
