from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from sentiment.analyzer import analyze_sentiment, get_sentiment_emoji

router = APIRouter()

class SentimentRequest(BaseModel):
    text: str

class SentimentResponse(BaseModel):
    text: str
    sentiment: str
    score: float
    emoji: str

class BatchSentimentRequest(BaseModel):
    reviews: List[str]

@router.post("/analyze", response_model=SentimentResponse)
async def analyze(req: SentimentRequest):
    label, score = analyze_sentiment(req.text)
    return SentimentResponse(text=req.text, sentiment=label, score=score, emoji=get_sentiment_emoji(label))

@router.post("/batch")
async def batch_analyze(req: BatchSentimentRequest):
    results = []
    counts = {"positive": 0, "negative": 0, "neutral": 0}
    for review in req.reviews:
        label, score = analyze_sentiment(review)
        counts[label] += 1
        results.append({"text": review, "sentiment": label, "score": score, "emoji": get_sentiment_emoji(label)})
    return {"results": results, "summary": counts, "total": len(req.reviews)}
