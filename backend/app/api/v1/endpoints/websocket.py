"""
WebSocket for real-time order tracking + delivery location
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
            try:
                self.active[room].remove(websocket)
            except ValueError:
                pass

    async def broadcast(self, room: str, message: dict):
        if room in self.active:
            dead = []
            for ws in self.active[room]:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    dead.append(ws)
            for ws in dead:
                try:
                    self.active[room].remove(ws)
                except ValueError:
                    pass

manager = ConnectionManager()

# ─── Customer: Order tracking ─────────────────────────────────────────────────
@router.websocket("/ws/order/{order_id}")
async def order_tracking(websocket: WebSocket, order_id: int):
    room = f"order_{order_id}"
    await manager.connect(websocket, room)
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "order_id": order_id,
            "message": "Order tracking connected!"
        }))
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)

# ─── Delivery Partner: Location update karta rahe ────────────────────────────
@router.websocket("/ws/delivery/{order_id}/location")
async def delivery_location(websocket: WebSocket, order_id: int):
    """
    Delivery partner apni lat/lng bhejta rahe.
    Customer ke order room mein broadcast hoti hai.
    """
    room = f"delivery_loc_{order_id}"
    await manager.connect(websocket, room)
    order_room = f"order_{order_id}"
    try:
        await websocket.send_text(json.dumps({"type": "location_connected"}))
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "location":
                # Customer ko delivery partner ki location bhejo
                await manager.broadcast(order_room, {
                    "type": "delivery_location",
                    "lat": msg.get("lat"),
                    "lng": msg.get("lng"),
                    "order_id": order_id,
                })
            elif msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)

# ─── Shopkeeper: New orders ───────────────────────────────────────────────────
@router.websocket("/ws/shop/{shop_id}/orders")
async def shop_orders_live(websocket: WebSocket, shop_id: int):
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

# ─── Delivery partners: New deliveries ───────────────────────────────────────
@router.websocket("/ws/delivery/available")
async def delivery_available_ws(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return
    try:
        from app.core.security import decode_token
        payload = decode_token(token)
        if payload.get("role") != "delivery":
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

# ─── Helper functions ─────────────────────────────────────────────────────────
async def notify_order_update(order_id: int, shop_id: int, status: str, message: str = None, eta_minutes: int = None, delivery_name: str = None):
    payload = {
        "type": "order_update",
        "order_id": order_id,
        "status": status,
        "message": message,
        "eta_minutes": eta_minutes,
        "delivery_partner_name": delivery_name,
    }
    await manager.broadcast(f"order_{order_id}", payload)
    await manager.broadcast(f"shop_{shop_id}", payload)

async def notify_new_delivery(order_id: int):
    payload = {"type": "new_delivery", "order_id": order_id}
    await manager.broadcast("delivery_available", payload)
