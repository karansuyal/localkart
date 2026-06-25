from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.endpoints import auth, users, shops, products, orders, reviews, deliveries, admin, websocket,unsplash

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
    allow_origins=settings.cors_origins_list,
    # Vercel gives every deployment (and every preview branch) its own
    # unique subdomain like localkart-<hash>-<team>.vercel.app, which
    # changes on every deploy. Rather than chasing that with an env var
    # update each time, allow any subdomain of vercel.app via regex, in
    # addition to the explicit origins above for local dev / custom domains.
    allow_origin_regex=r"https://.*\.vercel\.app",
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
app.include_router(unsplash.router,    prefix="/api/v1/unsplash",   tags=["Unsplash"])

@app.get("/")
async def root():
    return {"message": "LocalKart AI API is running 🚀", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy"}