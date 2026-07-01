from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Shop, UserRole, StoreType
from app.schemas.schemas import ShopCreate, ShopOut, ShopUpdate, DarkStoreConvert, NearestStoreOut
import math

router = APIRouter()


def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def compute_eta(distance_km: float, avg_prep_minutes: int) -> int:
    """
    ETA model: prep/pack time (store-specific) + travel time.
    Travel assumed at ~20 km/h effective speed for a 2-wheeler in local
    traffic, rounded up to the nearest minute. This is intentionally simple
    -- swap with a real routing/traffic API later if needed.
    """
    travel_minutes = math.ceil((distance_km / 20) * 60)
    return avg_prep_minutes + travel_minutes


@router.post("/", response_model=ShopOut, status_code=201)
async def create_shop(data: ShopCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.shopkeeper, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Only shopkeepers can create shops")
    shop = Shop(**data.model_dump(), owner_id=current_user.id)
    db.add(shop)
    await db.commit()
    await db.refresh(shop)
    return shop


@router.get("/nearby", response_model=List[ShopOut])
async def nearby_shops(
    lat: float = Query(...), lng: float = Query(...),
    radius_km: float = Query(5.0), category: Optional[str] = None,
    store_type: Optional[StoreType] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Shop).where(Shop.is_open == True, Shop.is_verified == True)
    if category:
        query = query.where(Shop.category == category)
    if store_type:
        query = query.where(Shop.store_type == store_type)
    result = await db.execute(query)
    shops = result.scalars().all()
    return [s for s in shops if haversine(lat, lng, s.latitude, s.longitude) <= radius_km]


@router.get("/nearest-dark-store", response_model=NearestStoreOut)
async def nearest_dark_store(
    lat: float = Query(...), lng: float = Query(...),
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Finds the closest open dark_store that can actually service this
    location (i.e. the customer is within that store's service_radius_km),
    and returns it along with a computed ETA. This is the core of the
    '10-15 min delivery' promise -- frontend should call this before
    showing checkout ETA / before letting the customer order from a
    dark-store catalog.
    """
    query = select(Shop).where(Shop.is_open == True, Shop.is_verified == True, Shop.store_type == StoreType.dark_store)
    if category:
        query = query.where(Shop.category == category)
    result = await db.execute(query)
    stores = result.scalars().all()

    candidates = []
    for s in stores:
        distance = haversine(lat, lng, s.latitude, s.longitude)
        if distance <= s.service_radius_km:
            candidates.append((s, distance))

    if not candidates:
        raise HTTPException(status_code=404, detail="Aapke area mein abhi koi dark store service available nahi hai")

    nearest_shop, distance = min(candidates, key=lambda c: c[1])
    eta = compute_eta(distance, nearest_shop.avg_prep_minutes)
    return NearestStoreOut(shop=nearest_shop, distance_km=round(distance, 2), eta_minutes=eta)


# IMPORTANT: /my/shops must be BEFORE /{shop_id} to avoid route conflict
@router.get("/my/shops", response_model=List[ShopOut])
async def my_shops(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Shop).where(Shop.owner_id == current_user.id))
    return result.scalars().all()


@router.get("/{shop_id}", response_model=ShopOut)
async def get_shop(shop_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return shop


@router.patch("/{shop_id}", response_model=ShopOut)
async def update_shop(shop_id: int, data: ShopUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    if shop.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(shop, k, v)
    await db.commit()
    await db.refresh(shop)
    return shop


@router.patch("/{shop_id}/convert-to-dark-store", response_model=ShopOut)
async def convert_to_dark_store(
    shop_id: int, data: DarkStoreConvert,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Lets a shopkeeper opt their existing shop into dark-store mode (fast
    10-15 min delivery SLA). Admin can also call this on any shop.
    Converting back to a normal shop is just a normal PATCH /{shop_id}
    with store_type='shop'.
    """
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    if shop.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    shop.store_type = StoreType.dark_store
    shop.service_radius_km = data.service_radius_km
    shop.avg_prep_minutes = data.avg_prep_minutes
    await db.commit()
    await db.refresh(shop)
    return shop