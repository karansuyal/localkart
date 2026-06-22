"""
Demo data seed script
Run: python seed.py
Creates admin, shopkeeper, customer, delivery partner + sample shop + products
"""

from dotenv import load_dotenv
load_dotenv()

import asyncio
import os

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker
)
from sqlalchemy.pool import NullPool

from app.models.user import User, Shop, Product, UserRole, Base
from app.core.security import hash_password

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:password@localhost:5432/localkart"
)

# PgBouncer / Render compatible engine
engine = create_async_engine(
    DATABASE_URL,
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0
    }
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:

        users = [
            User(
                name="Admin User",
                email="admin@localkart.com",
                hashed_password=hash_password("admin123"),
                role=UserRole.admin
            ),
            User(
                name="Ramesh Sharma",
                email="shop@localkart.com",
                hashed_password=hash_password("shop123"),
                role=UserRole.shopkeeper
            ),
            User(
                name="Priya Customer",
                email="customer@localkart.com",
                hashed_password=hash_password("cust123"),
                role=UserRole.customer
            ),
            User(
                name="Delivery Rahul",
                email="delivery@localkart.com",
                hashed_password=hash_password("delivery123"),
                role=UserRole.delivery
            ),
        ]

        for user in users:
            db.add(user)

        await db.flush()

        shopkeeper = users[1]

        shop = Shop(
            owner_id=shopkeeper.id,
            name="Sharma General Store",
            description="Aapki sabse kareeb dukaan — fresh groceries & daily needs",
            category="Grocery",
            latitude=27.1767,
            longitude=78.0081,
            address="Near Civil Lines, Agra, UP",
            phone="9876543210",
            is_open=True,
            is_verified=True,
            rating=4.3,
            total_reviews=12,
        )

        db.add(shop)
        await db.flush()

        products = [
            Product(shop_id=shop.id, name="Maggi Noodles", category="Snacks", price=14, mrp=15, quantity=100, unit="pack", tags=["instant", "noodles"]),
            Product(shop_id=shop.id, name="Amul Butter 100g", category="Dairy", price=55, mrp=58, quantity=50, unit="pack", tags=["dairy", "butter"]),
            Product(shop_id=shop.id, name="Coca Cola 250ml", category="Beverages", price=20, mrp=20, quantity=80, unit="bottle", tags=["cold drink", "soda"]),
            Product(shop_id=shop.id, name="Parle-G Biscuits", category="Snacks", price=10, mrp=10, quantity=200, unit="pack", tags=["biscuit", "snack"]),
            Product(shop_id=shop.id, name="Tata Salt 1kg", category="Grocery", price=22, mrp=24, quantity=60, unit="kg", tags=["salt", "grocery"]),
            Product(shop_id=shop.id, name="Lays Chips Classic", category="Snacks", price=20, mrp=20, quantity=120, unit="pack", tags=["chips", "snack"]),
            Product(shop_id=shop.id, name="Amul Milk 500ml", category="Dairy", price=28, mrp=28, quantity=40, unit="pouch", tags=["milk", "dairy"]),
            Product(shop_id=shop.id, name="Britannia Bread", category="Bakery", price=40, mrp=42, quantity=25, unit="loaf", tags=["bread", "bakery"]),
        ]

        for product in products:
            db.add(product)

        await db.commit()

        print("✅ Seed data inserted!")
        print("\n📋 Login credentials:")
        print("Admin: admin@localkart.com / admin123")
        print("Shopkeeper: shop@localkart.com / shop123")
        print("Customer: customer@localkart.com / cust123")
        print("Delivery: delivery@localkart.com / delivery123")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed())