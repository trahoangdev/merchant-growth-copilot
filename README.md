# Merchant Growth Copilot

AI commerce SaaS MVP for Vietnamese merchants. The app turns catalog, inventory, order, and campaign context into explainable growth recommendations, semantic product search, approval workflows, privacy controls, and campaign lift reporting.

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, TanStack Query, Recharts, lucide-react
- Backend: FastAPI, Pydantic, SQLAlchemy-ready structure
- Data layer: Supabase Postgres by default, CSV fallback for local imports, PostgreSQL with pgvector schema, Redis/Celery-ready background job stack
- AI approach for MVP: real merchant CSV data plus rule-based semantic scoring; real embedding/LLM calls can be added behind the same API

## Project Structure

```text
merchant_growth_copilot/
  client/          Next.js dashboard
  server/          FastAPI API
  server/data/imports/
                   Real merchant CSV input files
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

## Supabase Setup

The app is configured for this Supabase project:

```text
https://dzjzjesnatvecdupaqam.supabase.co
```

Frontend env lives in `client/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dzjzjesnatvecdupaqam.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Backend env lives in `server/.env`:

```env
DATA_SOURCE=supabase
SUPABASE_URL=https://dzjzjesnatvecdupaqam.supabase.co
SUPABASE_PUBLISHABLE_KEY=...
```

The publishable key can read/write only after tables and RLS policies exist. Run this SQL once in the Supabase SQL Editor:

```text
server/db/supabase_schema_seed.sql
```

That file creates:

```text
products
recommendations
recommendation_products
reports
privacy
```

It also seeds starter merchant data and creates demo RLS policies for local development.

After the SQL has been run, you can reseed/upsert from the client package:

```powershell
npm --prefix client run seed:supabase
```

Check whether the API sees Supabase data:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/data-status
```

## CSV Real Data Fallback

Set `DATA_SOURCE=csv` in `server/.env` to read local CSV instead of Supabase. The API does not use bundled mock data. Place real merchant CSV files in `server/data/imports` or set `DATA_DIR` in `server/.env`.

Required files:

```text
server/data/imports/
  products.csv
  recommendations.csv
  recommendation_products.csv
  reports.csv
  privacy.csv
```

`products.csv`

```csv
id,name,category,price_vnd,margin_percent,stock,tags,description
```

- `tags` accepts `|` or `;` separated values.

`recommendations.csv`

```csv
id,title,action_type,target_segment,timing,expected_metric,confidence,risk_flag,evidence,campaign_copy,status
```

- `evidence` accepts `|` or `;` separated values.
- `status` should be `draft`, `approved`, `rejected`, or `edited`.

`recommendation_products.csv`

```csv
recommendation_id,product_id
```

`reports.csv`

```csv
recommendation_id,conversion_lift_percent,aov_lift_percent,repeat_orders,inventory_units_moved,estimated_time_saved_hours
```

`privacy.csv`

```csv
signal,enabled,description
```

- `enabled` accepts `true`, `false`, `yes`, `no`, `1`, or `0`.

Check whether the API sees the real data:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/data-status
```

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
- `GET /api/data-status`
- `POST /api/onboarding`
- `GET /api/products`
- `POST /api/search`
- `GET /api/recommendations`
- `PATCH /api/recommendations/{recommendation_id}`
- `GET /api/reports`
- `GET /api/privacy`

## Next Implementation Steps

1. Replace rule-based search with embeddings stored in `products.embedding`.
2. Persist recommendation feedback in PostgreSQL.
3. Add CSV upload parsing for catalog, orders, inventory, and campaign history.
4. Add merchant/user auth and tenant isolation.
5. Add real campaign export targets such as CSV, copied text, or channel connector.
