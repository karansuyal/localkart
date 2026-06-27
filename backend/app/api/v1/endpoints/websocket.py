"""
WebSocket for real-time order status tracking
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room: str):
        await websocket.accept()
        if room not in self.active:
            self.active[room] = []
        self.active[room].append(websocket)

    def disconnect(self, websocket: WebSocket, room: str):
        if room in self.active:
            self.active[room].remove(websocket)

    async def broadcast(self, room: str, message: dict):
        if room in self.active:
            dead = []
            for ws in self.active[room]:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active[room].remove(ws)

manager = ConnectionManager()

@router.websocket("/ws/order/{order_id}")
async def order_tracking(websocket: WebSocket, order_id: int):
    """Customer connects here to get live order status updates."""
    room = f"order_{order_id}"
    await manager.connect(websocket, room)
    try:
        await websocket.send_text(json.dumps({"type": "connected", "order_id": order_id}))
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)

@router.websocket("/ws/shop/{shop_id}/orders")
async def shop_orders_live(websocket: WebSocket, shop_id: int):
    """Shopkeeper connects to get new order notifications."""
    room = f"shop_{shop_id}"
    await manager.connect(websocket, room)
    try:
        await websocket.send_text(json.dumps({"type": "connected", "shop_id": shop_id}))
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)

# Call this from orders endpoint to notify
async def notify_order_update(order_id: int, shop_id: int, status: str):
    payload = {"type": "order_update", "order_id": order_id, "status": status}
    await manager.broadcast(f"order_{order_id}", payload)
    await manager.broadcast(f"shop_{shop_id}", {**payload, "type": "new_order_update"})
    
@router.websocket("/ws/delivery/available")
async def delivery_available_ws(websocket: WebSocket, token: str = None):
    """Delivery partner connects to get new delivery notifications."""
    # Token check
    if not token:
        # Query param se lo
        token = websocket.query_params.get("token")
    
    if not token:
        await websocket.close(code=4001)
        return
    
    try:
        from app.core.security import decode_token
        payload = decode_token(token)
        role = payload.get("role")
        if role != "delivery":
            await websocket.close(code=4003)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    room = "delivery_available"
    await manager.connect(websocket, room)
    try:
        await websocket.send_text(json.dumps({"type": "connected"}))
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)


async def notify_new_delivery(order_id: int):
    """Saare delivery partners ko new delivery notification"""
    payload = {"type": "new_delivery", "order_id": order_id}
    await manager.broadcast("delivery_available", payload)
