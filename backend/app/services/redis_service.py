import redis.asyncio as redis
from app.core.config import settings

class RedisService:
    def __init__(self):
        self.client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    async def set_location(self, order_id: str, lat: float, lng: float):
        """Store latest location of delivery partner"""
        key = f"location:{order_id}"
        await self.client.setex(key, 300, f"{lat},{lng}")  # 5 min expiry
    
    async def get_location(self, order_id: str):
        """Get latest location of delivery partner"""
        key = f"location:{order_id}"
        location = await self.client.get(key)
        if location:
            lat, lng = location.split(',')
            return {"lat": float(lat), "lng": float(lng)}
        return None

redis_service = RedisService()