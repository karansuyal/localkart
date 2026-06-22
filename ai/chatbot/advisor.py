"""
AI Business Advisor & Local Language Chatbot
LangChain + RAG, Hindi + English support
"""
from typing import List, Optional
import os

SYSTEM_PROMPT = """You are LocalKart AI Business Advisor — a friendly assistant for small Indian shop owners.
You help with: stock management, demand insights, business tips, customer service.
Speak in Hinglish (Hindi+English mix) unless user writes only English.
Be concise, practical, encouraging.

Shop Context:
{context}

Chat History:
{chat_history}

Question: {question}
Answer:"""

class BusinessAdvisor:
    def __init__(self):
        self.llm = None
        self.embeddings = None
        self.vectorstore = None
        self._initialized = False

    def initialize(self, openai_api_key: Optional[str] = None):
        try:
            from langchain_openai import ChatOpenAI
            from langchain_community.embeddings import HuggingFaceEmbeddings
            key = openai_api_key or os.getenv("OPENAI_API_KEY", "")
            self.llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.7, api_key=key)
            self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
            self._initialized = True
        except Exception as e:
            print(f"Advisor init warning: {e}")

    def add_shop_context(self, texts: List[str]):
        if not self._initialized:
            return
        from langchain.schema import Document
        from langchain_community.vectorstores import Chroma
        docs = [Document(page_content=t) for t in texts]
        self.vectorstore = Chroma.from_documents(docs, self.embeddings)

    def chat(self, question: str, chat_history: List[dict] = None) -> str:
        if not self._initialized or not self.llm:
            return self._rule_based_response(question)
        try:
            from langchain.chains import LLMChain
            from langchain.prompts import PromptTemplate
            context = ""
            if self.vectorstore:
                docs = self.vectorstore.similarity_search(question, k=3)
                context = "\n".join([d.page_content for d in docs])
            history_str = ""
            if chat_history:
                for h in chat_history[-5:]:
                    history_str += f"User: {h.get('user','')}\nBot: {h.get('bot','')}\n"
            prompt = PromptTemplate(
                input_variables=["context", "chat_history", "question"],
                template=SYSTEM_PROMPT
            )
            chain = LLMChain(llm=self.llm, prompt=prompt)
            return chain.run(context=context, chat_history=history_str, question=question)
        except Exception:
            return self._rule_based_response(question)

    def _rule_based_response(self, question: str) -> str:
        q = question.lower()
        if any(w in q for w in ["stock", "kya rakhu", "kaunsa", "product"]):
            return "Aapke area mein demand ke hisaab se: Cold drinks, Maggi, Chips, Biscuits best sellers hain. Weekend pe dairy products aur snacks ki demand zyada hoti hai."
        elif any(w in q for w in ["price", "rate", "kitna", "cost"]):
            return "Price competition se bachne ke liye combo offers try karein. Jaise '2 Maggi + 1 Cold Drink = 50 rs' — customers ko value milti hai."
        elif any(w in q for w in ["sale", "bikri", "business", "profit"]):
            return "Sales badhane ke tips: 1) Online listing karein, 2) Fast delivery dein, 3) Regular customers ko discount dein, 4) Festive offers chalayein."
        elif any(w in q for w in ["maggi", "noodles"]):
            return "Maggi ki demand weekdays mein zyada hoti hai, especially evenings mein. Minimum 50 packets weekly stock karein."
        else:
            return "Main aapki kaise help kar sakta hoon? Aap stock, pricing, ya sales ke baare mein pooch sakte hain!"

advisor = BusinessAdvisor()
