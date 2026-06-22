"""
Sentiment Analysis for Reviews using TextBlob + Transformers
"""
from textblob import TextBlob
from typing import Tuple
import re

# Hindi positive/negative word lists
HINDI_POSITIVE = ["achha", "accha", "badhiya", "shandaar", "zabardast", "best", "fast", "quick",
                  "fresh", "tasty", "happy", "khush", "shandar", "mast", "perfect", "superb"]
HINDI_NEGATIVE = ["bura", "kharab", "ganda", "late", "galat", "bekar", "thanda", "banda",
                  "bekaar", "problem", "issue", "wrong", "slow", "dirty", "bad", "worst"]

def analyze_sentiment(text: str) -> Tuple[str, float]:
    """
    Returns (sentiment_label, score)
    sentiment_label: 'positive' | 'negative' | 'neutral'
    score: -1.0 to 1.0
    """
    if not text or not text.strip():
        return "neutral", 0.0

    text_lower = text.lower()

    # Hindi keyword matching
    pos_count = sum(1 for w in HINDI_POSITIVE if w in text_lower)
    neg_count = sum(1 for w in HINDI_NEGATIVE if w in text_lower)

    if pos_count > neg_count:
        hindi_score = min(pos_count * 0.3, 1.0)
    elif neg_count > pos_count:
        hindi_score = -min(neg_count * 0.3, 1.0)
    else:
        hindi_score = None

    # TextBlob for English part
    blob = TextBlob(text)
    english_score = blob.sentiment.polarity

    # Combine
    if hindi_score is not None:
        final_score = (hindi_score + english_score) / 2
    else:
        final_score = english_score

    if final_score > 0.1:
        label = "positive"
    elif final_score < -0.1:
        label = "negative"
    else:
        label = "neutral"

    return label, round(final_score, 3)

def get_sentiment_emoji(label: str) -> str:
    return {"positive": "😊", "negative": "😞", "neutral": "😐"}.get(label, "😐")
