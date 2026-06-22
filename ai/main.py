from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from recommendation.router import router as rec_router
from forecasting.router import router as forecast_router
from chatbot.router import router as chatbot_router
from sentiment.router import router as sentiment_router
from price_comparison.router import router as price_router

app = FastAPI(title="LocalKart AI Service", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(rec_router,      prefix="/recommendations", tags=["Recommendations"])
app.include_router(forecast_router, prefix="/forecast",        tags=["Demand Forecast"])
app.include_router(chatbot_router,  prefix="/chatbot",         tags=["Chatbot"])
app.include_router(sentiment_router,prefix="/sentiment",       tags=["Sentiment"])
app.include_router(price_router,    prefix="/price",           tags=["Price Comparison"])

@app.get("/")
def root():
    return {"message": "LocalKart AI Service running 🤖"}
