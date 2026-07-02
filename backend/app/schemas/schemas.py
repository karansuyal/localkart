from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole, OrderStatus, StoreType, PaymentStatus

# ─── Auth ────────────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.customer

class UserLogin(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    role: str
    is_active: bool = True

# ─── User ────────────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str]
    role: UserRole
    is_active: bool
    avatar_url: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    address: Optional[str]
    created_at: datetime
    class Config: from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    fcm_token: Optional[str] = None  # Firebase push token

# ─── Shop ────────────────────────────────────────────────────────────────────
class ShopCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    latitude: float
    longitude: float
    address: str
    phone: Optional[str] = None
    store_type: StoreType = StoreType.shop
    service_radius_km: float = Field(5.0, gt=0, le=25)
    avg_prep_minutes: int = Field(15, ge=1, le=120)

class ShopOut(BaseModel):
    id: int
    owner_id: int
    name: str
    description: Optional[str]
    category: Optional[str]
    image_url: Optional[str]
    latitude: float
    longitude: float
    address: str
    phone: Optional[str]
    is_open: bool
    is_verified: bool
    rating: float
    total_reviews: int
    store_type: StoreType
    service_radius_km: float
    avg_prep_minutes: int
    created_at: datetime
    class Config: from_attributes = True

class ShopUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    phone: Optional[str] = None
    is_open: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    store_type: Optional[StoreType] = None
    service_radius_km: Optional[float] = Field(None, gt=0, le=25)
    avg_prep_minutes: Optional[int] = Field(None, ge=1, le=120)

# Lightweight payload for the "convert my shop to dark store" action
class DarkStoreConvert(BaseModel):
    service_radius_km: float = Field(3.0, gt=0, le=15)
    avg_prep_minutes: int = Field(10, ge=1, le=30)

# Result of the nearest-dark-store lookup, includes computed ETA
class NearestStoreOut(BaseModel):
    shop: ShopOut
    distance_km: float
    eta_minutes: int

# ─── Product ─────────────────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    price: float = Field(..., gt=0)
    mrp: Optional[float] = None
    quantity: int = Field(..., ge=0)
    unit: str = "piece"
    tags: List[str] = []
    # Optional: set these together when the shopkeeper picks an image from
    # the Unsplash search picker instead of uploading their own photo.
    image_url: Optional[str] = None
    image_source: Optional[str] = "upload"
    unsplash_photo_id: Optional[str] = None
    unsplash_photographer: Optional[str] = None
    unsplash_photographer_url: Optional[str] = None

class ProductOut(BaseModel):
    id: int
    shop_id: int
    name: str
    description: Optional[str]
    category: Optional[str]
    price: float
    mrp: Optional[float]
    quantity: int
    unit: str
    image_url: Optional[str]
    image_source: Optional[str]
    unsplash_photographer: Optional[str]
    unsplash_photographer_url: Optional[str]
    is_available: bool
    tags: List[str]
    created_at: datetime
    class Config: from_attributes = True

# Lightweight shop info attached to each search result -- lets the frontend
# show "available at <shop name>" (and distance/open-status) per result,
# since the same item can be sold by multiple shops.
class ShopMiniOut(BaseModel):
    id: int
    name: str
    address: str
    image_url: Optional[str] = None
    rating: float
    total_reviews: int
    is_open: bool
    is_verified: bool
    category: Optional[str] = None
    store_type: StoreType
    class Config: from_attributes = True

class ProductSearchOut(ProductOut):
    shop: ShopMiniOut
    distance_km: Optional[float] = None

class SearchSuggestionOut(BaseModel):
    text: str
    type: str  # 'product' | 'category' | 'shop'

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    is_available: Optional[bool] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_source: Optional[str] = None
    unsplash_photo_id: Optional[str] = None
    unsplash_photographer: Optional[str] = None
    unsplash_photographer_url: Optional[str] = None

# ─── Order ───────────────────────────────────────────────────────────────────
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)

class OrderCreate(BaseModel):
    shop_id: int
    items: List[OrderItemCreate]
    delivery_address: str
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    notes: Optional[str] = None
    payment_mode: str = "cod"

class OrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    total_price: float
    class Config: from_attributes = True

class OrderOut(BaseModel):
    id: int
    user_id: int
    shop_id: int
    status: OrderStatus
    total_amount: float
    delivery_fee: float
    delivery_address: str
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    notes: Optional[str]
    payment_mode: str
    payment_status: PaymentStatus
    eta_minutes: Optional[int]
    otp: Optional[str] = None  # Delivery OTP for customer
    delivery_partner_name: Optional[str] = None
    delivery_partner_phone: Optional[str] = None
    items: List[OrderItemOut]
    created_at: datetime
    class Config: from_attributes = True

# ─── PhonePe Payment ─────────────────────────────────────────────────────────
class PhonePeInitiateRequest(BaseModel):
    order_id: int

class PhonePeInitiateResponse(BaseModel):
    redirect_url: str
    merchant_order_id: str

class PhonePeStatusOut(BaseModel):
    order_id: int
    payment_status: PaymentStatus
    order_status: OrderStatus

# ─── Review ──────────────────────────────────────────────────────────────────
class ReviewCreate(BaseModel):
    shop_id: int
    rating: float = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    order_id: Optional[int] = None

class ReviewOut(BaseModel):
    id: int
    user_id: int
    shop_id: int
    rating: float
    comment: Optional[str]
    sentiment: Optional[str]
    sentiment_score: Optional[float]
    created_at: datetime
    class Config: from_attributes = True