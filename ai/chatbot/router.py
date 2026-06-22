from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from chatbot.advisor import advisor

router = APIRouter()

class ChatMessage(BaseModel):
    user: str
    bot: str

class ChatRequest(BaseModel):
    question: str
    chat_history: Optional[List[ChatMessage]] = []
    shop_context: Optional[List[str]] = []

class ChatResponse(BaseModel):
    answer: str
    language: str

@router.post("/ask", response_model=ChatResponse)
async def ask(req: ChatRequest):
    if req.shop_context:
        advisor.add_shop_context(req.shop_context)
    history = [{"user": m.user, "bot": m.bot} for m in (req.chat_history or [])]
    answer = advisor.chat(req.question, history)
    lang = "hindi" if any(c in req.question for c in "अआइईउऊएऐओऔकखगघचछजझटठडढणतथदधनपफबभमयरलवशषसह") else "hinglish"
    return ChatResponse(answer=answer, language=lang)

@router.post("/init")
async def init_advisor(openai_key: str = ""):
    advisor.initialize(openai_api_key=openai_key)
    return {"message": "Advisor initialized"}
