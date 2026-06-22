import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export function useShopNotifications(shopId) {
  const [newOrder, setNewOrder] = useState(null)

  useEffect(() => {
    if (!shopId) return
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/shop/${shopId}/orders`
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'new_order_update') {
        setNewOrder(data)
        toast.success(`New order update! Order #${data.order_id}: ${data.status}`, { duration: 5000 })
      }
    }
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
    }, 30000)
    return () => { clearInterval(ping); ws.close() }
  }, [shopId])

  return { newOrder }
}
