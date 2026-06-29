from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Delivery, UserRole
from app.schemas.schemas import UserOut, UserUpdate

# ─── Users ───────────────────────────────────────────────────────────────────
router = APIRouter()

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserOut)
async def update_me(data: UserUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    incoming = data.model_dump(exclude_none=True)
    for k, v in incoming.items():
        setattr(current_user, k, v)
    await db.commit()
    await db.refresh(current_user)

    # A delivery partner's FCM token only does something for
    # notify_delivery_partners() (topic-based broadcast) once that token is
    # actually subscribed to the "delivery_partners" topic. Without this,
    # the topic has zero subscribers and every broadcast silently no-ops.
    if "fcm_token" in incoming and current_user.role == UserRole.delivery and current_user.fcm_token:
        from app.services.notifications import subscribe_delivery_partner
        await subscribe_delivery_partner(current_user.fcm_token)

    return current_user
