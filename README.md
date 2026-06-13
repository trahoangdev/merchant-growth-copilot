# Merchant Growth Copilot

AI commerce SaaS MVP for Vietnamese merchants. The app turns catalog, inventory, order, and campaign context into explainable growth recommendations, semantic product search, approval workflows, privacy controls, and campaign lift reporting.

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, TanStack Query, Recharts, lucide-react
- Backend: FastAPI, Pydantic, SQLAlchemy-ready structure
- Data layer: PostgreSQL with pgvector schema, Redis/Celery-ready background job stack
- AI approach for MVP: mock embeddings/search contract plus rule-based ranking; real embedding/LLM calls can be added behind the same API

## Project Structure

```text
merchant_growth_copilot/
  client/          Next.js dashboard
  server/          FastAPI API
  server/db/       PostgreSQL + pgvector schema
  docker-compose.yml
```

## Local Setup

Create environment files:

```powershell
Copy-Item .\client\.env.example .\client\.env.local
Copy-Item .\server\.env.example .\server\.env
```

Install frontend dependencies:

```powershell
npm --prefix client install
```

Install backend dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r .\server\requirements.txt
```

Optional infrastructure:

```powershell
docker compose up -d
```

Run the API:

```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir server
```

Run the frontend:

```powershell
npm --prefix client run dev
```

Open `http://localhost:3000`.

## MVP Capabilities

- Merchant growth setup with goals and approval-first mode
- Ranked growth action queue
- Explainability panel with evidence, risk flag, and editable campaign copy
- Approve/reject recommendation feedback loop
- Semantic buyer-intent product search
- Privacy signal controls
- Campaign lift dashboard

## API Endpoints

- `GET /api/health`
- `POST /api/onboarding`
- `GET /api/products`
- `POST /api/search`
- `GET /api/recommendations`
- `PATCH /api/recommendations/{recommendation_id}`
- `GET /api/reports`
- `GET /api/privacy`

## Next Implementation Steps

1. Replace mock search with embeddings stored in `products.embedding`.
2. Persist recommendation feedback in PostgreSQL.
3. Add CSV upload parsing for catalog, orders, inventory, and campaign history.
4. Add merchant/user auth and tenant isolation.
5. Add real campaign export targets such as CSV, copied text, or channel connector.
