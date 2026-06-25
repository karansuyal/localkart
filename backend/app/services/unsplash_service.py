import httpx
from typing import List, Optional
from app.core.config import settings

class UnsplashService:
    def __init__(self):
        self.access_key = settings.UNSPLASH_ACCESS_KEY
        self.base_url = "https://api.unsplash.com"
        self.headers = {
            "Authorization": f"Client-ID {self.access_key}",
            "Accept-Version": "v1"
        }
    
    async def search_products(self, query: str, per_page: int = 10) -> List[dict]:
        """
        Search product images from Unsplash
        
        Args:
            query: Search term (e.g., "maggi noodles", "grocery items")
            per_page: Number of results (max 30)
        
        Returns:
            List of image data with URLs, photographer info
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/search/photos",
                    headers=self.headers,
                    params={
                        "query": query,
                        "per_page": per_page,
                        "orientation": "squarish"  # Product photos ke liye better
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = []
                    
                    for photo in data.get('results', []):
                        results.append({
                            "id": photo.get('id'),
                            "url": photo.get('urls', {}).get('regular'),
                            "thumb": photo.get('urls', {}).get('thumb'),
                            "full": photo.get('urls', {}).get('full'),
                            "raw": photo.get('urls', {}).get('raw'),
                            "photographer": photo.get('user', {}).get('name'),
                            "photographer_url": photo.get('user', {}).get('links', {}).get('html'),
                            "unsplash_url": photo.get('links', {}).get('html'),
                            "download_url": photo.get('links', {}).get('download_location'),
                            "description": photo.get('description') or photo.get('alt_description')
                        })
                    
                    return results
                else:
                    print(f"Unsplash API Error: {response.status_code}")
                    return []
                    
            except Exception as e:
                print(f"Error searching Unsplash: {e}")
                return []
    
    async def get_photo_by_id(self, photo_id: str) -> Optional[dict]:
        """Get specific photo details by ID"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/photos/{photo_id}",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    photo = response.json()
                    return {
                        "id": photo.get('id'),
                        "url": photo.get('urls', {}).get('regular'),
                        "photographer": photo.get('user', {}).get('name'),
                        "download_url": photo.get('links', {}).get('download_location')
                    }
                return None
            except Exception:
                return None
    
    async def track_download(self, download_url: str) -> bool:
        """
        Track image download (Required by Unsplash terms)
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(download_url, headers=self.headers)
                return response.status_code == 200
            except Exception:
                return False

unsplash_service = UnsplashService()