@router.post("/location")
async def update_location(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Delivery partner updates their location"""
    order_id = data.get("order_id")
    lat = data.get("lat")
    lng = data.get("lng")
    
    # Save to Redis
    await redis_service.set_location(order_id, lat, lng)
    
    # Broadcast to all customers tracking this order
    await manager.broadcast_location(order_id, {"lat": lat, "lng": lng})
    
    return {"status": "success"}