from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Product, Shop, UserRole
from app.schemas.schemas import ProductCreate, ProductOut, ProductUpdate

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

@router.get("/search", response_model=List[ProductOut])
async def search_products(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import or_, func
    result = await db.execute(
        select(Product).where(
            Product.is_available == True,
            or_(
                func.lower(Product.name).contains(q.lower()),
                func.lower(Product.category).contains(q.lower())
            )
        ).limit(50)
    )
    return result.scalars().all()

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