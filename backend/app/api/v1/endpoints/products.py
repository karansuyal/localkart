from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Product, Shop, OrderItem, UserRole
from app.schemas.schemas import (
    ProductCreate, ProductOut, ProductUpdate,
    ProductSearchOut, ShopMiniOut, SearchSuggestionOut,
)
from app.api.v1.endpoints.shops import haversine

router = APIRouter()

@router.post("/", response_model=ProductOut, status_code=201)
async def create_product(data: ProductCreate, shop_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    shop = result.scalar_one_or_none()
    if not shop or shop.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    product = Product(**data.model_dump(), shop_id=shop_id)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product

@router.get("/shop/{shop_id}", response_model=List[ProductOut])
async def get_shop_products(shop_id: int, category: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(Product).where(Product.shop_id == shop_id, Product.is_available == True)
    if category:
        query = query.where(Product.category == category)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/search", response_model=List[ProductSearchOut])
async def search_products(
    q: str = Query(..., min_length=1),
    lat: Optional[float] = Query(None, description="Customer latitude -- enables distance sort & distance_km in results"),
    lng: Optional[float] = Query(None, description="Customer longitude"),
    category: Optional[str] = Query(None),
    sort: str = Query("relevance", pattern="^(relevance|price_low|price_high|distance|rating)$"),
    limit: int = Query(40, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Advanced product search -- like a local Zomato/Blinkit search.
    Matches on product name, category, tags AND shop name (so "sharma"
    finds Sharma Kirana Store too), and returns each match together with
    its shop's info (name, rating, open/closed, distance) since the same
    item can be sold by several shops nearby.
    """
    from sqlalchemy import or_, func, cast, String

    q_norm = q.strip().lower()
    if not q_norm:
        return []

    query = (
        select(Product, Shop)
        .join(Shop, Shop.id == Product.shop_id)
        .where(
            Product.is_available == True,
            or_(
                func.lower(Product.name).contains(q_norm),
                func.lower(Product.category).contains(q_norm),
                func.lower(cast(Product.tags, String)).contains(q_norm),
                func.lower(Shop.name).contains(q_norm),
            ),
        )
    )
    if category:
        query = query.where(Product.category == category)

    # Pull a generous pool and rank/sort in Python -- keeps the relevance
    # + distance scoring logic simple and DB-agnostic.
    result = await db.execute(query.limit(300))
    rows = result.all()

    def relevance_rank(product: Product, shop: Shop) -> int:
        name = product.name.lower()
        if name == q_norm:
            return 0
        if name.startswith(q_norm):
            return 1
        if q_norm in name:
            return 2
        if product.category and q_norm in product.category.lower():
            return 3
        if q_norm in shop.name.lower():
            return 4
        return 5

    scored = []
    for product, shop in rows:
        distance = haversine(lat, lng, shop.latitude, shop.longitude) if (lat is not None and lng is not None) else None
        scored.append((product, shop, distance, relevance_rank(product, shop)))

    if sort == "price_low":
        scored.sort(key=lambda x: x[0].price)
    elif sort == "price_high":
        scored.sort(key=lambda x: -x[0].price)
    elif sort == "distance":
        scored.sort(key=lambda x: x[2] if x[2] is not None else float("inf"))
    elif sort == "rating":
        scored.sort(key=lambda x: -(x[1].rating or 0))
    else:  # relevance -- best text match first, then prefer open + nearby + well-rated shops
        scored.sort(key=lambda x: (
            x[3],
            0 if x[1].is_open else 1,
            x[2] if x[2] is not None else float("inf"),
            -(x[1].rating or 0),
        ))

    out: List[ProductSearchOut] = []
    for product, shop, distance, _ in scored[:limit]:
        item = ProductSearchOut.model_validate(product)
        item.shop = ShopMiniOut.model_validate(shop)
        item.distance_km = round(distance, 2) if distance is not None else None
        out.append(item)
    return out


@router.get("/search/suggestions", response_model=List[SearchSuggestionOut])
async def search_suggestions(
    q: str = Query(..., min_length=1),
    limit: int = Query(8, ge=1, le=15),
    db: AsyncSession = Depends(get_db),
):
    """Lightweight autocomplete: matching product names + categories, for the search-as-you-type dropdown."""
    from sqlalchemy import func

    q_norm = q.strip().lower()
    if not q_norm:
        return []

    name_result = await db.execute(
        select(Product.name).where(
            Product.is_available == True,
            func.lower(Product.name).contains(q_norm),
        ).distinct().limit(limit * 3)
    )
    cat_result = await db.execute(
        select(Product.category).where(
            Product.is_available == True,
            Product.category.isnot(None),
            func.lower(Product.category).contains(q_norm),
        ).distinct().limit(limit)
    )

    seen = set()
    starts, contains = [], []
    for name in name_result.scalars().all():
        key = name.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        bucket = starts if key.startswith(q_norm) else contains
        bucket.append(SearchSuggestionOut(text=name, type="product"))

    for cat in cat_result.scalars().all():
        key = f"cat::{cat.strip().lower()}"
        if not cat or key in seen:
            continue
        seen.add(key)
        contains.append(SearchSuggestionOut(text=cat, type="category"))

    return (starts + contains)[:limit]


@router.get("/search/trending", response_model=List[str])
async def trending_searches(db: AsyncSession = Depends(get_db)):
    """Popular searches based on most-ordered products, for the empty-state 'Trending' chips."""
    from sqlalchemy import func, desc

    result = await db.execute(
        select(Product.name, func.count(OrderItem.id).label("cnt"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .group_by(Product.name)
        .order_by(desc("cnt"))
        .limit(8)
    )
    trending = [row[0] for row in result.all()]

    if len(trending) < 6:
        # Fresh deployment with little/no order history yet -- fall back to
        # generic everyday items so the UI never looks empty.
        fallback = ["Maggi", "Milk", "Bread", "Chips", "Cold Drink", "Eggs", "Atta", "Rice"]
        for item in fallback:
            if item not in trending:
                trending.append(item)
            if len(trending) >= 8:
                break
    return trending

@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(product_id: int, data: ProductUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    shop_result = await db.execute(select(Shop).where(Shop.id == product.shop_id))
    shop = shop_result.scalar_one_or_none()
    if shop.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(product, k, v)
    await db.commit()
    await db.refresh(product)
    return product

@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
    await db.commit()

@router.post("/{product_id}/image")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.upload import upload_image
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    url = await upload_image(file, folder="localkart/products")
    product.image_url = url
    # A manual upload always replaces whatever was there before -- if the
    # product previously used an Unsplash photo, that attribution no longer
    # applies to the new image, so clear it.
    product.image_source = "upload"
    product.unsplash_photo_id = None
    product.unsplash_photographer = None
    product.unsplash_photographer_url = None
    await db.commit()
    return {"image_url": url}

@router.post("/shops/{shop_id}/image")
async def upload_shop_image(
    shop_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.upload import upload_image
    from app.models.user import Shop
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    url = await upload_image(file, folder="localkart/shops")
    shop.image_url = url
    await db.commit()
    return {"image_url": url}