from fastapi import APIRouter
from app.api.v1.endpoints import auth, shops, products, orders, unsplash

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(shops.router, prefix="/shops", tags=["Shops"])
router.include_router(products.router, prefix="/products", tags=["Products"])
router.include_router(orders.router, prefix="/orders", tags=["Orders"])
router.include_router(unsplash.router, prefix="/unsplash", tags=["Unsplash"])  # <-- Add this