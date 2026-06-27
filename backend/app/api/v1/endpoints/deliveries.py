from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Delivery, Order, OrderStatus, UserRole
from datetime import datetime
import random, string

router = APIRouter()

def gen_otp():
    return ''.join(random.choices(string.digits, k=6))

# ─── Available deliveries — ab Order ka poora detail bhi aayega ──────────────
@router.get("/available")
async def available_deliveries(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.delivery:
        raise HTTPException(status_code=403, detail="Delivery partners only")

    result = await db.execute(
        select(Delivery)
        .options(selectinload(Delivery.order))
        .where(Delivery.partner_id == None, Delivery.status == "pending")
    )
    deliveries = result.scalars().all()

    # Order ka address + amount bhi include karo
    out = []
    for d in deliveries:
        order = d.order
        out.append({
            "id": d.id,
            "order_id": d.order_id,
            "status": d.status,
            "partner_id": d.partner_id,
            # Customer delivery address
            "delivery_address": order.delivery_address if order else "N/A",
            "delivery_lat": order.delivery_lat if order else None,
            "delivery_lng": order.delivery_lng if order else None,
            # Order amount
            "total_amount": order.total_amount if order else 0,
            "delivery_fee": order.delivery_fee if order else 20,
            # ETA
            "eta_minutes": order.eta_minutes if order else None,
            # Payment mode
            "payment_mode": order.payment_mode if order else "cod",
            # Earnings
            "earnings": 30.0,
        })
    return out

# ─── My active delivery (jo maine accept ki hai) ────────────────────────────
@router.get("/my/active")
async def my_active_delivery(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.delivery:
        raise HTTPException(status_code=403, detail="Delivery partners only")

    result = await db.execute(
        select(Delivery)
        .options(selectinload(Delivery.order))
        .where(Delivery.partner_id == current_user.id, Delivery.status.in_(["assigned", "picked_up"]))
        .order_by(Delivery.id.desc())
    )
    deliveries = result.scalars().all()
    out = []
    for d in deliveries:
        order = d.order
        out.append({
            "id": d.id,
            "order_id": d.order_id,
            "status": d.status,
            "otp": d.otp,
            "delivery_address": order.delivery_address if order else "N/A",
            "delivery_lat": order.delivery_lat if order else None,
            "delivery_lng": order.delivery_lng if order else None,
            "total_amount": order.total_amount if order else 0,
            "eta_minutes": order.eta_minutes if order else None,
            "payment_mode": order.payment_mode if order else "cod",
            "earnings": 30.0,
            "picked_at": d.picked_at,
        })
    return out

# ─── Accept delivery — race condition safe ───────────────────────────────────
@router.post("/{delivery_id}/accept")
async def accept_delivery(
    delivery_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.delivery:
        raise HTTPException(status_code=403, detail="Delivery partners only")

    # SELECT FOR UPDATE — race condition handle karo
    result = await db.execute(
        select(Delivery)
        .options(selectinload(Delivery.order))
        .where(Delivery.id == delivery_id)
        .with_for_update()  # DB-level lock
    )
    delivery = result.scalar_one_or_none()

    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if delivery.partner_id is not None:
        raise HTTPException(status_code=409, detail="Ye delivery already kisi aur ne le li hai!")

    otp = gen_otp()
    delivery.partner_id = current_user.id
    delivery.status = "assigned"
    delivery.otp = otp

    # Order status update karo
    order_res = await db.execute(select(Order).where(Order.id == delivery.order_id))
    order = order_res.scalar_one_or_none()
    if order:
        order.status = OrderStatus.confirmed

    await db.commit()

    # WebSocket se customer ko notify karo
    try:
        from app.api.v1.endpoints.websocket import manager
        await manager.broadcast(f"order_{delivery.order_id}", {
            "type": "order_update",
            "order_id": delivery.order_id,
            "status": "confirmed",
            "message": "Delivery partner ne aapka order accept kar liya!",
            "eta_minutes": order.eta_minutes if order else None,
            "delivery_partner_id": current_user.id,
            "delivery_partner_name": current_user.name,
        })
    except Exception:
        pass  # WebSocket fail ho to order pe asar na pade

    return {
        "message": "Delivery accepted!",
        "otp": otp,  # Ye OTP delivery partner ko dikhao — customer ko SMS/WebSocket se jayega
        "order_id": delivery.order_id,
        "delivery_address": order.delivery_address if order else "",
        "total_amount": order.total_amount if order else 0,
        "eta_minutes": order.eta_minutes if order else None,
    }

# ─── Pickup ─────────────────────────────────────────────────────────────────
@router.post("/{delivery_id}/pickup")
async def mark_pickup(delivery_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Delivery).where(Delivery.id == delivery_id, Delivery.partner_id == current_user.id)
    )
    delivery = result.scalar_one_or_none()
    if not delivery:
        raise HTTPException(status_code=404, detail="Not found")

    delivery.status = "picked_up"
    delivery.picked_at = datetime.utcnow()

    order_res = await db.execute(select(Order).where(Order.id == delivery.order_id))
    order = order_res.scalar_one_or_none()
    if order:
        order.status = OrderStatus.picked_up

    await db.commit()

    # Customer ko notify karo
    try:
        from app.api.v1.endpoints.websocket import manager
        await manager.broadcast(f"order_{delivery.order_id}", {
            "type": "order_update",
            "order_id": delivery.order_id,
            "status": "picked_up",
            "message": "Delivery partner ne aapka order pick up kar liya! Abhi aa raha hai 🛵",
        })
    except Exception:
        pass

    return {"message": "Marked as picked up"}

# ─── Deliver — OTP verify karke complete karo ───────────────────────────────
@router.post("/{delivery_id}/deliver")
async def mark_delivered(
    delivery_id: int, otp: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Delivery).where(Delivery.id == delivery_id, Delivery.partner_id == current_user.id)
    )
    delivery = result.scalar_one_or_none()
    if not delivery:
        raise HTTPException(status_code=404, detail="Not found")
    if delivery.otp != otp:
        raise HTTPException(status_code=400, detail="Galat OTP — customer se dobara poochein")

    delivery.status = "delivered"
    delivery.delivered_at = datetime.utcnow()
    delivery.earnings = 30.0

    order_res = await db.execute(select(Order).where(Order.id == delivery.order_id))
    order = order_res.scalar_one_or_none()
    if order:
        order.status = OrderStatus.delivered

    await db.commit()

    # Customer ko delivery complete notification
    try:
        from app.api.v1.endpoints.websocket import manager
        await manager.broadcast(f"order_{delivery.order_id}", {
            "type": "order_update",
            "order_id": delivery.order_id,
            "status": "delivered",
            "message": "Order deliver ho gaya! ✅ Enjoy karein 😊",
        })
    except Exception:
        pass

    return {"message": "Delivered successfully! ₹30 credited 🎉"}

# ─── Earnings ────────────────────────────────────────────────────────────────
@router.get("/my/earnings")
async def my_earnings(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Delivery).where(Delivery.partner_id == current_user.id, Delivery.status == "delivered")
    )
    deliveries = result.scalars().all()
    total = sum(d.earnings for d in deliveries)
    return {"total_earnings": total, "total_deliveries": len(deliveries)}
