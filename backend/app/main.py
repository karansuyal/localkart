from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.endpoints import auth, users, shops, products, orders, reviews, deliveries, admin, websocket

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(
    title="LocalKart AI API",
    description="Hyperlocal Marketplace for Small Businesses",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/api/v1/auth",       tags=["Auth"])
app.include_router(users.router,       prefix="/api/v1/users",      tags=["Users"])
app.include_router(shops.router,       prefix="/api/v1/shops",      tags=["Shops"])
app.include_router(products.router,    prefix="/api/v1/products",   tags=["Products"])
app.include_router(orders.router,      prefix="/api/v1/orders",     tags=["Orders"])
app.include_router(reviews.router,     prefix="/api/v1/reviews",    tags=["Reviews"])
app.include_router(deliveries.router,  prefix="/api/v1/deliveries", tags=["Deliveries"])
app.include_router(admin.router,       prefix="/api/v1/admin",      tags=["Admin"])
app.include_router(websocket.router,   tags=["WebSocket"])

@app.get("/")
async def root():
    return {"message": "LocalKart AI API is running 🚀", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
