from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Shop, Order, UserRole
from app.schemas.schemas import UserOut, ShopOut

router = APIRouter()

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admins only")
    return current_user

@router.get("/stats")
async def platform_stats(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    users = await db.execute(select(func.count(User.id)))
    shops = await db.execute(select(func.count(Shop.id)))
    orders = await db.execute(select(func.count(Order.id)))
    revenue = await db.execute(select(func.sum(Order.total_amount)))
    return {
        "total_users": users.scalar(),
        "total_shops": shops.scalar(),
        "total_orders": orders.scalar(),
        "total_revenue": revenue.scalar() or 0
    }

@router.get("/users", response_model=List[UserOut])
async def list_users(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()

@router.get("/shops", response_model=List[ShopOut])
async def list_shops(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    """
    Full shop list for the admin panel, newest first. Used to drive the
    shop-verification UI -- unverified shops are highlighted there so an
    admin can review and approve them.
    """
    result = await db.execute(select(Shop).order_by(Shop.created_at.desc()))
    return result.scalars().all()

@router.patch("/users/{user_id}/toggle")
async def toggle_user(user_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    await db.commit()
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}"}

@router.patch("/shops/{shop_id}/verify")
async def verify_shop(shop_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    shop.is_verified = True
    await db.commit()
    return {"message": "Shop verified"}