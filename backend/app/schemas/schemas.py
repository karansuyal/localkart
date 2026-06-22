from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole, OrderStatus

# ─── Auth ────────────────────────────────────────────────────────────────────
class FirebaseAuthRequest(BaseModel):
    firebase_token: str
    name: Optional[str] = "User"
    role: Optional[str] = "customer"

class SendOTPRequest(BaseModel):
    phone: str          # +91XXXXXXXXXX format
    name: str = "User"  # Register ke waqt naam
    role: str = "customer"

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str            # 6 digit

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = None
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.customer

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    role: str

# ─── User ────────────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id: int
    name: str
    email: str
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

# ─── Shop ────────────────────────────────────────────────────────────────────
class ShopCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    latitude: float
    longitude: float
    address: str
    phone: Optional[str] = None

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
    is_available: bool
    tags: List[str]
    created_at: datetime
    class Config: from_attributes = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    is_available: Optional[bool] = None
    description: Optional[str] = None

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
    notes: Optional[str]
    payment_mode: str
    items: List[OrderItemOut]
    created_at: datetime
    class Config: from_attributes = True

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

# ─── Dark Store ───────────────────────────────────────────────────────────────
class DarkStoreConvert(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class NearestStoreOut(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    address: str
    distance_km: Optional[float] = None
    class Config: from_attributes = True