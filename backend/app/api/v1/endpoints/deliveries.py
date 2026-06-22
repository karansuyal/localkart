from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Delivery, Order, OrderStatus, UserRole
from datetime import datetime
import random, string

router = APIRouter()

def gen_otp():
    return ''.join(random.choices(string.digits, k=6))

@router.get("/available")
async def available_deliveries(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.delivery:
        raise HTTPException(status_code=403, detail="Delivery partners only")
    result = await db.execute(select(Delivery).where(Delivery.partner_id == None, Delivery.status == "pending"))
    return result.scalars().all()

@router.post("/{delivery_id}/accept")
async def accept_delivery(delivery_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Delivery).where(Delivery.id == delivery_id))
    delivery = result.scalar_one_or_none()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if delivery.partner_id:
        raise HTTPException(status_code=400, detail="Already assigned")
    delivery.partner_id = current_user.id
    delivery.status = "assigned"
    delivery.otp = gen_otp()
    await db.commit()
    return {"message": "Delivery accepted", "otp": delivery.otp}

@router.post("/{delivery_id}/pickup")
async def mark_pickup(delivery_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Delivery).where(Delivery.id == delivery_id, Delivery.partner_id == current_user.id))
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
    return {"message": "Marked as picked up"}

@router.post("/{delivery_id}/deliver")
async def mark_delivered(delivery_id: int, otp: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Delivery).where(Delivery.id == delivery_id, Delivery.partner_id == current_user.id))
    delivery = result.scalar_one_or_none()
    if not delivery:
        raise HTTPException(status_code=404, detail="Not found")
    if delivery.otp != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    delivery.status = "delivered"
    delivery.delivered_at = datetime.utcnow()
    delivery.earnings = 30.0
    order_res = await db.execute(select(Order).where(Order.id == delivery.order_id))
    order = order_res.scalar_one_or_none()
    if order:
        order.status = OrderStatus.delivered
    await db.commit()
    return {"message": "Delivered successfully"}

@router.get("/my/earnings")
async def my_earnings(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Delivery).where(Delivery.partner_id == current_user.id, Delivery.status == "delivered"))
    deliveries = result.scalars().all()
    total = sum(d.earnings for d in deliveries)
    return {"total_earnings": total, "total_deliveries": len(deliveries)}
