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

---

## PhonePe Payment Gateway Setup

Checkout now offers **Cash on Delivery** and **Pay Online (PhonePe)**. The online flow uses PhonePe's official Standard Checkout (PG API v2) via their Python SDK.

### 1. Get sandbox/UAT credentials
Sign up at [business.phonepe.com](https://business.phonepe.com) and request UAT/sandbox access to get your `Client ID`, `Client Secret`, and `Client Version`. No live business account is required just to test — sandbox access is enough to start.

### 2. Configure `.env` (backend)
```bash
PHONEPE_CLIENT_ID=your-client-id
PHONEPE_CLIENT_SECRET=your-client-secret
PHONEPE_CLIENT_VERSION=1
PHONEPE_ENV=SANDBOX          # switch to PRODUCTION when you go live
PHONEPE_CALLBACK_USERNAME=localkart      # you choose these, and set the
PHONEPE_CALLBACK_PASSWORD=change-this-password  # same values on PhonePe's dashboard
FRONTEND_URL=http://localhost:3000
```

### 3. Configure the webhook on PhonePe's dashboard
PhonePe needs a **publicly reachable** URL to POST payment confirmations to:
```
https://<your-backend-domain>/api/v1/payments/phonepe/webhook
```
In local dev, expose your backend with a tunnel (e.g. `ngrok http 8000`) and use that URL. Set the same username/password there as `PHONEPE_CALLBACK_USERNAME` / `PHONEPE_CALLBACK_PASSWORD` above.

### 4. Run the new migration
```bash
cd backend
alembic upgrade head    # adds payment_status / phonepe_* columns to orders
```

### 5. How it works
- Customer picks **Pay Online** on the Cart page → order is created (unpaid) → redirected to PhonePe's hosted checkout.
- PhonePe calls the webhook when payment completes — this is the source of truth, not the redirect back to the app.
- The shopkeeper/delivery-partner "new order" alerts only fire **after payment is confirmed**, so no one is notified about an order that was never actually paid for.
- The `/payment/result` page polls order status after redirect and shows success/failure to the customer.
- Going live later is just swapping the `.env` values (`PHONEPE_ENV=PRODUCTION` + real credentials) — no code changes needed.

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
