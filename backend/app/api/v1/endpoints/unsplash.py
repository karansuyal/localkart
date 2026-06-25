from fastapi import APIRouter, Depends, HTTPException, Query
from app.services.unsplash_service import unsplash_service
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/search")
async def search_product_images(
    query: str = Query(..., description="Product search term"),
    per_page: int = Query(10, ge=1, le=30),
    current_user = Depends(get_current_user)  
):
    """
    Search product images from Unsplash
    
    Example: /search?query=maggi+noodles&per_page=5
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query parameter required")
    
    results = await unsplash_service.search_products(query, per_page)
    
    return {
        "status": "success",
        "query": query,
        "count": len(results),
        "results": results
    }

@router.get("/photo/{photo_id}")
async def get_photo_details(photo_id: str):
    """Get specific photo details"""
    photo = await unsplash_service.get_photo_by_id(photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo

@router.post("/download/track")
async def track_download(data: dict):
    """Track image download (Required by Unsplash)"""
    download_url = data.get("download_url")
    if not download_url:
        raise HTTPException(status_code=400, detail="download_url required")
    
    success = await unsplash_service.track_download(download_url)
    return {"status": "success" if success else "failed"}