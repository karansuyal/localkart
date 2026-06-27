from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class UserRole(str, enum.Enum):
    customer = "customer"
    shopkeeper = "shopkeeper"
    delivery = "delivery"
    admin = "admin"

class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    preparing = "preparing"
    picked_up = "picked_up"
    delivered = "delivered"
    cancelled = "cancelled"

class StoreType(str, enum.Enum):
    shop = "shop"               # regular shopkeeper-run store, normal delivery time
    dark_store = "dark_store"   # fast-delivery store, 10-15 min SLA, may be company-run or shopkeeper-converted

class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), nullable=False)
    phone         = Column(String(15), unique=True, index=True, nullable=False)
    email         = Column(String(150), unique=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role          = Column(Enum(UserRole), default=UserRole.customer, nullable=False)
    is_active     = Column(Boolean, default=True)
    avatar_url    = Column(String, nullable=True)
    latitude      = Column(Float, nullable=True)
    longitude     = Column(Float, nullable=True)
    address       = Column(Text, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    shops         = relationship("Shop", back_populates="owner")
    orders        = relationship("Order", back_populates="customer")
    reviews       = relationship("Review", back_populates="user")
    deliveries    = relationship("Delivery", back_populates="partner")

class Shop(Base):
    __tablename__ = "shops"
    id            = Column(Integer, primary_key=True, index=True)
    owner_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    name          = Column(String(200), nullable=False)
    description   = Column(Text, nullable=True)
    category      = Column(String(100), nullable=True)
    image_url     = Column(String, nullable=True)
    latitude      = Column(Float, nullable=False)
    longitude     = Column(Float, nullable=False)
    address       = Column(Text, nullable=False)
    phone         = Column(String(15), nullable=True)
    is_open       = Column(Boolean, default=True)
    is_verified   = Column(Boolean, default=False)
    rating        = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    # ─── Dark store fields ───────────────────────────────────────────────
    # store_type: 'shop' (normal) or 'dark_store' (fast 10-15 min delivery).
    # A shopkeeper can convert their own shop into a dark_store, or admin
    # can create a dark_store directly (owner_id = an admin/company user).
    store_type        = Column(Enum(StoreType), default=StoreType.shop, nullable=False)
    service_radius_km = Column(Float, default=5.0, nullable=False)   # how far this store delivers
    avg_prep_minutes  = Column(Integer, default=15, nullable=False)  # pick+pack time, used in ETA calc

    owner         = relationship("User", back_populates="shops")
    products      = relationship("Product", back_populates="shop")
    orders        = relationship("Order", back_populates="shop")
    reviews       = relationship("Review", back_populates="shop")

class Product(Base):
    __tablename__ = "products"
    id            = Column(Integer, primary_key=True, index=True)
    shop_id       = Column(Integer, ForeignKey("shops.id"), nullable=False)
    name          = Column(String(200), nullable=False)
    description   = Column(Text, nullable=True)
    category      = Column(String(100), nullable=True)
    price         = Column(Float, nullable=False)
    mrp           = Column(Float, nullable=True)
    quantity      = Column(Integer, default=0)
    unit          = Column(String(50), default="piece")
    image_url     = Column(String, nullable=True)
    # Unsplash attribution -- required by Unsplash API Guidelines whenever
    # an image sourced from Unsplash is displayed. Null for shopkeeper-
    # uploaded photos (Cloudinary), populated only when the image came
    # from the /unsplash/search picker.
    image_source       = Column(String(20), default="upload")  # 'upload' | 'unsplash'
    unsplash_photo_id  = Column(String(50), nullable=True)
    unsplash_photographer      = Column(String(150), nullable=True)
    unsplash_photographer_url  = Column(String, nullable=True)
    is_available  = Column(Boolean, default=True)
    tags          = Column(JSON, default=list)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    shop          = relationship("Shop", back_populates="products")
    order_items   = relationship("OrderItem", back_populates="product")

class Order(Base):
    __tablename__ = "orders"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    shop_id       = Column(Integer, ForeignKey("shops.id"), nullable=False)
    status        = Column(Enum(OrderStatus), default=OrderStatus.pending)
    total_amount  = Column(Float, nullable=False)
    delivery_fee  = Column(Float, default=0.0)
    delivery_address = Column(Text, nullable=False)
    delivery_lat  = Column(Float, nullable=True)
    delivery_lng  = Column(Float, nullable=True)
    notes         = Column(Text, nullable=True)
    payment_mode  = Column(String(50), default="cod")
    eta_minutes   = Column(Integer, nullable=True)   # promised ETA at order time (dark-store orders)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    customer      = relationship("User", back_populates="orders")
    shop          = relationship("Shop", back_populates="orders")
    items         = relationship("OrderItem", back_populates="order")
    delivery      = relationship("Delivery", back_populates="order", uselist=False)

class OrderItem(Base):
    __tablename__ = "order_items"
    id            = Column(Integer, primary_key=True, index=True)
    order_id      = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id    = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity      = Column(Integer, nullable=False)
    unit_price    = Column(Float, nullable=False)
    total_price   = Column(Float, nullable=False)

    order         = relationship("Order", back_populates="items")
    product       = relationship("Product", back_populates="order_items")

class Review(Base):
    __tablename__ = "reviews"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    shop_id       = Column(Integer, ForeignKey("shops.id"), nullable=False)
    order_id      = Column(Integer, ForeignKey("orders.id"), nullable=True)
    rating        = Column(Float, nullable=False)
    comment       = Column(Text, nullable=True)
    sentiment     = Column(String(20), nullable=True)   # positive/negative/neutral
    sentiment_score = Column(Float, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    user          = relationship("User", back_populates="reviews")
    shop          = relationship("Shop", back_populates="reviews")

class Delivery(Base):
    __tablename__ = "deliveries"
    id            = Column(Integer, primary_key=True, index=True)
    order_id      = Column(Integer, ForeignKey("orders.id"), nullable=False)
    partner_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    status        = Column(String(50), default="pending")
    pickup_lat    = Column(Float, nullable=True)
    pickup_lng    = Column(Float, nullable=True)
    current_lat   = Column(Float, nullable=True)
    current_lng   = Column(Float, nullable=True)
    otp           = Column(String(6), nullable=True)
    earnings      = Column(Float, default=0.0)
    picked_at     = Column(DateTime(timezone=True), nullable=True)
    delivered_at  = Column(DateTime(timezone=True), nullable=True)

    order         = relationship("Order", back_populates="delivery")
    partner       = relationship("User", back_populates="deliveries")