"""
Demand Forecasting using Prophet + XGBoost ensemble
"""
import pandas as pd
import numpy as np
from typing import List, Dict
import warnings
warnings.filterwarnings('ignore')

class DemandForecaster:
    def __init__(self):
        self.models = {}  # product_id -> model

    def forecast_prophet(self, sales_df: pd.DataFrame, product_id: int, periods: int = 7) -> pd.DataFrame:
        """
        sales_df: columns [ds (date), y (quantity sold)]
        Returns forecast DataFrame with columns [ds, yhat, yhat_lower, yhat_upper]
        """
        try:
            from prophet import Prophet
            model = Prophet(yearly_seasonality=False, weekly_seasonality=True, daily_seasonality=False)
            model.fit(sales_df)
            future = model.make_future_dataframe(periods=periods)
            forecast = model.predict(future)
            self.models[product_id] = model
            return forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(periods)
        except Exception as e:
            raise RuntimeError(f"Prophet forecast failed: {e}")

    def forecast_xgboost(self, sales_df: pd.DataFrame, periods: int = 7) -> List[float]:
        """Feature-based forecasting using XGBoost"""
        from xgboost import XGBRegressor
        df = sales_df.copy()
        df['ds'] = pd.to_datetime(df['ds'])
        df['dayofweek'] = df['ds'].dt.dayofweek
        df['month'] = df['ds'].dt.month
        df['day'] = df['ds'].dt.day
        df['lag_1'] = df['y'].shift(1)
        df['lag_7'] = df['y'].shift(7)
        df['rolling_7'] = df['y'].rolling(7).mean()
        df.dropna(inplace=True)

        features = ['dayofweek', 'month', 'day', 'lag_1', 'lag_7', 'rolling_7']
        X, y = df[features], df['y']
        model = XGBRegressor(n_estimators=100, max_depth=3, random_state=42)
        model.fit(X, y)

        preds = []
        last_row = df.iloc[-1]
        for i in range(1, periods + 1):
            next_date = last_row['ds'] + pd.Timedelta(days=i)
            row = {
                'dayofweek': next_date.dayofweek,
                'month': next_date.month,
                'day': next_date.day,
                'lag_1': preds[-1] if preds else last_row['y'],
                'lag_7': df.iloc[-7]['y'] if len(df) >= 7 else last_row['y'],
                'rolling_7': np.mean(preds[-7:]) if len(preds) >= 7 else last_row['y']
            }
            pred = model.predict(pd.DataFrame([row]))[0]
            preds.append(max(0, float(pred)))
        return preds

    def get_demand_insight(self, current_avg: float, forecasted_avg: float, product_name: str) -> str:
        pct_change = ((forecasted_avg - current_avg) / max(current_avg, 1)) * 100
        if pct_change > 20:
            return f"📈 {product_name} ki demand agle hafte {pct_change:.0f}% badhne ki sambhavna hai! Stock badha lo."
        elif pct_change < -20:
            return f"📉 {product_name} ki demand {abs(pct_change):.0f}% kam ho sakti hai. Over-stocking se bachna."
        else:
            return f"➡️ {product_name} ki demand stable rahegi. Normal stock maintain karo."

forecaster = DemandForecaster()
