from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Order, OrderItem, Product, Shop, Delivery, UserRole, OrderStatus, PaymentStatus
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

async def notify_new_order(db: AsyncSession, order: Order, shop: Shop, total: float, delivery_address: str):
    """Shopkeeper + delivery partners ko naye order ka alert -- COD orders ke
    liye order place hote hi call hota hai. PhonePe orders ke liye ye tabhi
    call hota hai jab payment webhook 'paid' confirm karta hai (payments.py),
    taaki shopkeeper sirf paid orders hi dekhe, abandoned checkouts nahi."""
    owner_res = await db.execute(select(User).where(User.id == shop.owner_id))
    owner = owner_res.scalar_one_or_none()
    if owner and owner.fcm_token:
        await notify_shopkeeper(
            owner.fcm_token,
            title="🛍️ Naya Order Aaya!",
            body=f"₹{total} ka order {shop.name} pe — jaldi confirm karo!",
            order_id=order.id
        )

    await notify_delivery_partners(
        title="📦 Naya Delivery Order!",
        body=f"₹{total} ka order available — {delivery_address[:40]}...",
        order_id=order.id
    )

    try:
        from app.api.v1.endpoints.websocket import manager
        await manager.broadcast(f"shop_{shop.id}", {
            "type": "new_order", "order_id": order.id,
            "total_amount": total, "message": f"Naya order! ₹{total}"
        })
        await manager.broadcast("delivery_available", {
            "type": "new_delivery", "order_id": order.id
        })
    except Exception:
        pass

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

    # Online payment (PhonePe) orders start out unpaid -- the shopkeeper/
    # delivery alerts are deferred until the payment webhook confirms it,
    # so no one gets pinged about an order the customer never actually paid
    # for. COD needs no such wait, there's nothing to confirm upfront.
    is_online_payment = data.payment_mode == "phonepe"
    payment_status = PaymentStatus.pending if is_online_payment else PaymentStatus.not_required

    order = Order(
        user_id=current_user.id, shop_id=data.shop_id,
        total_amount=total, delivery_fee=20.0,
        delivery_address=data.delivery_address,
        delivery_lat=data.delivery_lat, delivery_lng=data.delivery_lng,
        notes=data.notes, payment_mode=data.payment_mode,
        payment_status=payment_status,
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

    if not is_online_payment:
        await notify_new_order(db, order, shop, total, data.delivery_address)

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