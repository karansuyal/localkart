from fastapi import WebSocket
from typing import Dict, Set
import json

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, order_id: str, websocket: WebSocket):
        await websocket.accept()
        if order_id not in self.active_connections:
            self.active_connections[order_id] = set()
        self.active_connections[order_id].add(websocket)
    
    def disconnect(self, order_id: str, websocket: WebSocket):
        if order_id in self.active_connections:
            self.active_connections[order_id].discard(websocket)
            if not self.active_connections[order_id]:
                del self.active_connections[order_id]
    
    async def broadcast_location(self, order_id: str, location: dict):
        if order_id in self.active_connections:
            message = json.dumps({
                "type": "location_update",
                "data": location
            })
            for connection in self.active_connections[order_id]:
                try:
                    await connection.send_text(message)
                except:
                    pass

manager = WebSocketManager()