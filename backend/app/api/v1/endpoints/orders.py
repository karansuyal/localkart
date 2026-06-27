from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Order, OrderItem, Product, Shop, Delivery, UserRole, OrderStatus
from app.schemas.schemas import OrderCreate, OrderOut
from app.services.notifications import notify_shopkeeper, notify_delivery_partners
import math

router = APIRouter()

def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

@router.post("/", response_model=OrderOut, status_code=201)
async def place_order(data: OrderCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    shop_res = await db.execute(select(Shop).where(Shop.id == data.shop_id))
    shop = shop_res.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    if not shop.is_open:
        raise HTTPException(status_code=400, detail="Shop is currently closed")

    total = 0.0
    items_to_create = []
    for item in data.items:
        res = await db.execute(select(Product).where(Product.id == item.product_id, Product.shop_id == data.shop_id))
        product = res.scalar_one_or_none()
        if not product or not product.is_available:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not available")
        if product.quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")
        total += product.price * item.quantity
        items_to_create.append((product, item.quantity))

    eta_minutes = None
    if data.delivery_lat is not None and data.delivery_lng is not None:
        distance_km = haversine(data.delivery_lat, data.delivery_lng, shop.latitude, shop.longitude)
        travel_minutes = math.ceil((distance_km / 20) * 60)
        eta_minutes = shop.avg_prep_minutes + travel_minutes

    order = Order(
        user_id=current_user.id, shop_id=data.shop_id,
        total_amount=total, delivery_fee=20.0,
        delivery_address=data.delivery_address,
        delivery_lat=data.delivery_lat, delivery_lng=data.delivery_lng,
        notes=data.notes, payment_mode=data.payment_mode,
        eta_minutes=eta_minutes
    )
    db.add(order)
    await db.flush()

    for product, qty in items_to_create:
        oi = OrderItem(order_id=order.id, product_id=product.id, quantity=qty,
                       unit_price=product.price, total_price=product.price * qty)
        db.add(oi)
        product.quantity -= qty

    delivery = Delivery(order_id=order.id)
    db.add(delivery)
    await db.commit()

    # Shopkeeper ko FCM notification
    owner_res = await db.execute(select(User).where(User.id == shop.owner_id))
    owner = owner_res.scalar_one_or_none()
    if owner and owner.fcm_token:
        await notify_shopkeeper(
            owner.fcm_token,
            title="🛍️ Naya Order Aaya!",
            body=f"₹{total} ka order {shop.name} pe — jaldi confirm karo!",
            order_id=order.id
        )

    # Delivery partners ko FCM notification (topic)
    await notify_delivery_partners(
        title="📦 Naya Delivery Order!",
        body=f"₹{total} ka order available — {data.delivery_address[:40]}...",
        order_id=order.id
    )

    # WebSocket se shopkeeper ko bhi notify
    try:
        from app.api.v1.endpoints.websocket import manager
        await manager.broadcast(f"shop_{data.shop_id}", {
            "type": "new_order", "order_id": order.id,
            "total_amount": total, "message": f"Naya order! ₹{total}"
        })
    except Exception:
        pass

    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order.id)
    )
    order = result.scalar_one()
    return order

@router.get("/my", response_model=List[OrderOut])
async def my_orders(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Order).options(selectinload(Order.items))
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    for order in orders:
        d_res = await db.execute(select(Delivery).where(Delivery.order_id == order.id))
        delivery = d_res.scalar_one_or_none()
        order.__dict__['otp'] = delivery.otp if delivery and delivery.otp else None
    return orders

@router.get("/shop/{shop_id}", response_model=List[OrderOut])
async def shop_orders(shop_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Order).options(selectinload(Order.items))
        .where(Order.shop_id == shop_id)
        .order_by(Order.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.patch("/{order_id}/status")
async def update_order_status(order_id: int, status: OrderStatus, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status
    await db.commit()
    try:
        from app.api.v1.endpoints.websocket import manager
        await manager.broadcast(f"order_{order_id}", {
            "type": "order_update", "order_id": order_id, "status": status.value
        })
    except Exception:
        pass
    return {"message": "Status updated", "status": status}
