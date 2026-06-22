from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from recommendation.engine import engine
import pandas as pd, numpy as np

router = APIRouter()

class RecommendRequest(BaseModel):
    product_id: int
    top_n: int = 5

class TrainRequest(BaseModel):
    orders: List[dict]   # [{user_id, product_id, quantity}]
    products: List[dict] # [{product_id, name, category, tags}]

@router.post("/train")
async def train_model(data: TrainRequest):
    orders_df = pd.DataFrame(data.orders)
    products_df = pd.DataFrame(data.products)
    engine.fit(orders_df, products_df)
    engine.save()
    return {"message": "Recommendation model trained successfully"}

@router.post("/recommend", response_model=List[int])
async def recommend(req: RecommendRequest):
    # Agar model train nahi hua toh empty list return karo
    if engine.collab_sim is None or engine.content_sim is None:
        return []
    try:
        return engine.hybrid_recommend(req.product_id, req.top_n)
    except Exception as e:
        return []

@router.get("/popular")
async def popular_products():
    if engine.collab_product_ids:
        return engine.collab_product_ids[:10]
    return []