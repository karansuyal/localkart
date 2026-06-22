from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class ShopPrice(BaseModel):
    shop_id: int
    shop_name: str
    price: float
    distance_km: Optional[float] = None
    rating: Optional[float] = None
    is_open: bool = True

class PriceCompareRequest(BaseModel):
    product_name: str
    shop_prices: List[ShopPrice]

class PriceCompareResponse(BaseModel):
    product_name: str
    best_price: ShopPrice
    all_prices: List[ShopPrice]
    savings: float
    recommendation: str

def score_shop(shop: ShopPrice, min_price: float) -> float:
    price_score = (1 - (shop.price - min_price) / max(min_price, 1)) * 0.6
    rating_score = ((shop.rating or 3.0) / 5.0) * 0.25
    distance_score = max(0, 1 - (shop.distance_km or 0) / 10) * 0.15
    return price_score + rating_score + distance_score

@router.post("/compare", response_model=PriceCompareResponse)
async def compare_prices(req: PriceCompareRequest):
    open_shops = [s for s in req.shop_prices if s.is_open]
    if not open_shops:
        open_shops = req.shop_prices

    min_price = min(s.price for s in open_shops)
    max_price = max(s.price for s in open_shops)

    scored = sorted(open_shops, key=lambda s: score_shop(s, min_price), reverse=True)
    best = scored[0]
    sorted_by_price = sorted(open_shops, key=lambda s: s.price)

    savings = max_price - best.price
    rec = f"{best.shop_name} best option hai! ₹{best.price:.0f} mein milega"
    if savings > 0:
        rec += f", jo sabse mehenge dukan se ₹{savings:.0f} sasta hai."
    else:
        rec += "."

    return PriceCompareResponse(
        product_name=req.product_name,
        best_price=best,
        all_prices=sorted_by_price,
        savings=savings,
        recommendation=rec
    )
