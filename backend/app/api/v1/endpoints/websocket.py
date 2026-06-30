from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import manager
from app.services.redis_service import redis_service

router = APIRouter()

@router.websocket("/ws/order/{order_id}")
async def websocket_endpoint(websocket: WebSocket, order_id: str):
    await manager.connect(order_id, websocket)
    
    # Send initial location if exists
    initial_location = await redis_service.get_location(order_id)
    if initial_location:
        await websocket.send_text(json.dumps({
            "type": "location_update",
            "data": initial_location
        }))
    
    try:
        while True:
            # Keep connection alive, receive any messages (pings)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(order_id, websocket)