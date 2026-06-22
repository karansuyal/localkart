"""
Smart Product Recommendation — Collaborative + Content-Based Filtering
"""
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from typing import List, Dict, Optional
import joblib, os

class RecommendationEngine:
    def __init__(self):
        self.user_item_matrix = None
        self.product_features = None
        self.tfidf = TfidfVectorizer(stop_words='english')
        self.collab_sim = None
        self.content_sim = None

    def fit(self, orders_df: pd.DataFrame, products_df: pd.DataFrame):
        """
        orders_df: columns [user_id, product_id, quantity]
        products_df: columns [product_id, name, category, tags]
        """
        # Collaborative Filtering — user-item matrix
        self.user_item_matrix = orders_df.pivot_table(
            index='user_id', columns='product_id', values='quantity', fill_value=0
        )
        self.collab_sim = cosine_similarity(self.user_item_matrix.T)
        self.collab_product_ids = list(self.user_item_matrix.columns)

        # Content-Based — TF-IDF on product text
        products_df['text'] = products_df['name'] + ' ' + products_df['category'].fillna('') + ' ' + products_df['tags'].fillna('')
        tfidf_matrix = self.tfidf.fit_transform(products_df['text'])
        self.content_sim = cosine_similarity(tfidf_matrix)
        self.content_product_ids = list(products_df['product_id'])

        return self

    def collaborative_recommend(self, product_id: int, top_n: int = 5) -> List[int]:
        if product_id not in self.collab_product_ids:
            return []
        idx = self.collab_product_ids.index(product_id)
        scores = list(enumerate(self.collab_sim[idx]))
        scores = sorted(scores, key=lambda x: x[1], reverse=True)[1:top_n+1]
        return [self.collab_product_ids[i] for i, _ in scores]

    def content_recommend(self, product_id: int, top_n: int = 5) -> List[int]:
        if product_id not in self.content_product_ids:
            return []
        idx = self.content_product_ids.index(product_id)
        scores = list(enumerate(self.content_sim[idx]))
        scores = sorted(scores, key=lambda x: x[1], reverse=True)[1:top_n+1]
        return [self.content_product_ids[i] for i, _ in scores]

    def hybrid_recommend(self, product_id: int, top_n: int = 5, collab_weight: float = 0.6) -> List[int]:
        collab_ids = self.collaborative_recommend(product_id, top_n * 2)
        content_ids = self.content_recommend(product_id, top_n * 2)
        scores: Dict[int, float] = {}
        for rank, pid in enumerate(collab_ids):
            scores[pid] = scores.get(pid, 0) + collab_weight * (1 / (rank + 1))
        for rank, pid in enumerate(content_ids):
            scores[pid] = scores.get(pid, 0) + (1 - collab_weight) * (1 / (rank + 1))
        sorted_ids = sorted(scores, key=scores.get, reverse=True)
        return sorted_ids[:top_n]

    def save(self, path: str = "models/recommendation.joblib"):
        os.makedirs("models", exist_ok=True)
        joblib.dump(self, path)

    @staticmethod
    def load(path: str = "models/recommendation.joblib") -> "RecommendationEngine":
        return joblib.load(path)

# Singleton
engine = RecommendationEngine()
