from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import User
from app.schemas.schemas import UserRegister, UserLogin, TokenResponse, FirebaseAuthRequest
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from app.core.config import settings
import os, json

router = APIRouter()

# Firebase Admin SDK initialize karo (ek baar)
def get_firebase_app():
    if not firebase_admin._apps:
        # Render pe environment variable se credentials lo
        cred_json = settings.FIREBASE_SERVICE_ACCOUNT_JSON
        if cred_json:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
    return firebase_admin.get_app()

# ─── Firebase Phone Auth ──────────────────────────────────────────────────────
@router.post("/firebase-login", response_model=TokenResponse)
async def firebase_login(data: FirebaseAuthRequest, db: AsyncSession = Depends(get_db)):
    """
    Frontend Firebase se phone verify karta hai aur idToken bhejta hai.
    Hum verify karke apna JWT token dete hain.
    """
    try:
        get_firebase_app()
        decoded = firebase_auth.verify_id_token(data.firebase_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Firebase token invalid: {str(e)}")

    phone = decoded.get("phone_number")
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number nahi mila token mein")

    # User dhundo ya banao
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    if not user:
        from app.models.user import UserRole
        role_str = data.role or "customer"
        try:
            role = UserRole(role_str)
        except ValueError:
            role = UserRole.customer

        user = User(
            name=data.name or "User",
            phone=phone,
            email=f"{phone.replace('+','')}@phone.localkart",
            hashed_password="FIREBASE_USER",
            role=role,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    token_data = {"sub": str(user.id), "role": user.role.value}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        role=user.role.value
    )


# ─── Old routes (existing users ke liye) ─────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=data.name, email=data.email, phone=data.phone,
        hashed_password=hash_password(data.password), role=data.role
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token_data = {"sub": str(user.id), "role": user.role.value}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id, role=user.role.value
    )

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    token_data = {"sub": str(user.id), "role": user.role.value}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id, role=user.role.value
    )
