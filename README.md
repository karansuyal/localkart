# LocalKart AI – Hyperlocal Marketplace

> Empowering Local Shops Through AI and Hyperlocal Commerce

---

## Quick Start (Docker — Recommended)

```bash
git clone <repo>
cd localkart-ai
docker-compose up --build
```

Then open: http://localhost:3000

**Demo Login Credentials:**
| Role | Email | Password |
|------|-------|----------|
| Customer | customer@localkart.com | cust123 |
| Shopkeeper | shop@localkart.com | shop123 |
| Delivery | delivery@localkart.com | delivery123 |
| Admin | admin@localkart.com | admin123 |

---

## Manual Setup

### 1. Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### 2. Database
```bash
psql -U postgres -c "CREATE DATABASE localkart;"
```

### 3. Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # Edit with your values
alembic upgrade head         # Run migrations
python seed.py               # Load demo data
uvicorn app.main:app --reload --port 8000
```

### 4. AI Service
```bash
cd ai
pip install -r requirements.txt
cp .env.example .env         # Add OpenAI key (optional)
uvicorn main:app --reload --port 8001
```

### 5. Frontend
```bash
cd frontend
npm install
cp .env.example .env         # Edit with your values
npm run dev                  # Opens at http://localhost:3000
```

---

## API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Project Structure

```
localkart-ai/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/v1/endpoints/  # Auth, Shops, Products, Orders, Reviews, Deliveries, Admin, WebSocket
│   │   ├── core/              # Config, Database, Security (JWT)
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── services/          # Cloudinary upload service
│   ├── migrations/            # Alembic DB migrations
│   ├── seed.py                # Demo data seeder
│   └── requirements.txt
│
├── ai/                        # AI/ML microservice
│   ├── recommendation/        # Collaborative + Content-based filtering
│   ├── forecasting/           # Prophet + XGBoost demand forecasting
│   ├── chatbot/               # LangChain + RAG business advisor (Hindi+English)
│   ├── sentiment/             # Review sentiment analysis
│   ├── price_comparison/      # Multi-shop price comparison engine
│   └── main.py
│
├── frontend/                  # React + Tailwind CSS
│   └── src/
│       ├── pages/
│       │   ├── customer/      # Home, ShopPage, Cart, Orders, Chatbot
│       │   ├── shopkeeper/    # Dashboard, Inventory, Orders, Analytics
│       │   ├── delivery/      # Delivery dashboard
│       │   └── admin/         # Admin panel
│       ├── hooks/             # useOrderTracking, useShopNotifications (WebSocket)
│       ├── context/           # Zustand store (auth + cart)
│       └── services/          # Axios API client
│
└── docker-compose.yml
```

---

## AI Features

| Feature | Technology | Endpoint |
|---------|-----------|---------|
| Smart Recommendations | Collaborative + Content Filtering | `POST /recommendations/recommend` |
| Demand Forecasting | Prophet + XGBoost | `POST /forecast/predict` |
| Business Advisor Chatbot | LangChain + RAG (Hinglish) | `POST /chatbot/ask` |
| Sentiment Analysis | TextBlob + Hindi NLP | `POST /sentiment/analyze` |
| Price Comparison | Custom scoring engine | `POST /price/compare` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Zustand, React Query, Recharts |
| Backend | FastAPI, SQLAlchemy 2.0, Alembic, WebSockets |
| Database | PostgreSQL 16, Redis |
| Auth | JWT (python-jose + passlib bcrypt) |
| AI/ML | Scikit-Learn, XGBoost, Prophet, LangChain, TextBlob |
| Storage | Cloudinary |
| DevOps | Docker, Docker Compose |
