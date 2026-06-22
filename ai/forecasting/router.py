from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from forecasting.forecaster import forecaster
import pandas as pd

router = APIRouter()

class SalesData(BaseModel):
    ds: str   # date string YYYY-MM-DD
    y: float  # quantity

class ForecastRequest(BaseModel):
    product_id: int
    product_name: str
    sales_history: List[SalesData]
    periods: int = 7
    method: str = "prophet"  # "prophet" | "xgboost" | "ensemble"

class ForecastResponse(BaseModel):
    product_id: int
    forecast: List[dict]
    insight: str
    trend: str  # up / down / stable

@router.post("/predict", response_model=ForecastResponse)
async def predict_demand(req: ForecastRequest):
    try:
        df = pd.DataFrame([{"ds": s.ds, "y": s.y} for s in req.sales_history])
        current_avg = df['y'].tail(7).mean()

        if req.method == "prophet":
            result_df = forecaster.forecast_prophet(df, req.product_id, req.periods)
            forecast = result_df.to_dict(orient='records')
            forecasted_avg = result_df['yhat'].mean()
        elif req.method == "xgboost":
            preds = forecaster.forecast_xgboost(df, req.periods)
            forecast = [{"day": i+1, "yhat": p} for i, p in enumerate(preds)]
            forecasted_avg = sum(preds) / len(preds)
        else:  # ensemble
            result_df = forecaster.forecast_prophet(df, req.product_id, req.periods)
            xgb_preds = forecaster.forecast_xgboost(df, req.periods)
            prophet_preds = result_df['yhat'].tolist()
            blended = [(p + x) / 2 for p, x in zip(prophet_preds, xgb_preds)]
            forecast = [{"day": i+1, "yhat": v} for i, v in enumerate(blended)]
            forecasted_avg = sum(blended) / len(blended)

        insight = forecaster.get_demand_insight(current_avg, forecasted_avg, req.product_name)
        pct = (forecasted_avg - current_avg) / max(current_avg, 1) * 100
        trend = "up" if pct > 10 else ("down" if pct < -10 else "stable")

        return ForecastResponse(product_id=req.product_id, forecast=forecast, insight=insight, trend=trend)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
