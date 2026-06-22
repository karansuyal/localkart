from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Review, Shop, UserRole
from app.schemas.schemas import ReviewCreate, ReviewOut
import httpx
from app.core.config import settings

router = APIRouter()

@router.post("/", response_model=ReviewOut, status_code=201)
async def create_review(data: ReviewCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    review = Review(user_id=current_user.id, **data.model_dump())
    # Get sentiment from AI service
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{settings.AI_SERVICE_URL}/sentiment/analyze", json={"text": data.comment or ""}, timeout=5)
            if res.status_code == 200:
                sentiment_data = res.json()
                review.sentiment = sentiment_data.get("sentiment")
                review.sentiment_score = sentiment_data.get("score")
    except Exception:
        pass

    db.add(review)
    # Update shop rating
    await db.flush()
    rating_result = await db.execute(select(func.avg(Review.rating)).where(Review.shop_id == data.shop_id))
    avg_rating = rating_result.scalar() or 0.0
    count_result = await db.execute(select(func.count(Review.id)).where(Review.shop_id == data.shop_id))
    total = count_result.scalar() or 0
    shop_result = await db.execute(select(Shop).where(Shop.id == data.shop_id))
    shop = shop_result.scalar_one_or_none()
    if shop:
        shop.rating = round(avg_rating, 2)
        shop.total_reviews = total

    await db.commit()
    await db.refresh(review)
    return review

@router.get("/shop/{shop_id}", response_model=List[ReviewOut])
async def shop_reviews(shop_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Review).where(Review.shop_id == shop_id).order_by(Review.created_at.desc()))
    return result.scalars().all()
