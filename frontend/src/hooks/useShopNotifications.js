import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

// Live order updates for the shopkeeper Orders page. Backend broadcasts on
// the "shop_{shop_id}" channel with type "new_order" (place_order) or
// "order_update" (status changes) -- see orders.py. This both shows a toast
// AND invalidates the shop-orders query so the list refreshes immediately,
// instead of waiting for the 30s polling fallback.
export function useShopNotifications(shopId) {
  const [newOrder, setNewOrder] = useState(null)
  const qc = useQueryClient()

  useEffect(() => {
    if (!shopId) return
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/shop/${shopId}/orders`
    let ws
    let reconnectTimer

    const connect = () => {
      ws = new WebSocket(wsUrl)
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'new_order') {
          setNewOrder(data)
          toast.success(`🛍️ Naya order aaya! Order #${data.order_id} — ₹${data.total_amount}`, { duration: 6000 })
          qc.invalidateQueries({ queryKey: ['shop-orders'] })
        } else if (data.type === 'order_update') {
          qc.invalidateQueries({ queryKey: ['shop-orders'] })
        }
      }
      // If the connection drops (network blip, server restart on Render's
      // free tier, etc.), retry rather than silently going quiet until the
      // next page load -- this is what made the dashboard feel like it
      // "needed a refresh" even though polling was still running underneath.
      ws.onclose = () => { reconnectTimer = setTimeout(connect, 5000) }
      ws.onerror = () => ws.close()
    }
    connect()

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
    }, 30000)

    return () => {
      clearInterval(ping)
      clearTimeout(reconnectTimer)
      ws.close()
    }
  }, [shopId, qc])

  return { newOrder }
}