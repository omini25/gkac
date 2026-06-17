# GKAC — Monorepo Project

**Node.js** backend · **Next.js** frontend · **PostgreSQL** · **Redis** · **Railway**

## Project Structure

```
gkac/
├── backend/          # Express API server (port 3001)
│   ├── src/
│   │   ├── index.ts       # Entry point
│   │   ├── db.ts          # PostgreSQL connection
│   │   ├── redis.ts       # Redis connection
│   │   └── routes/
│   │       └── health.ts  # /api/health endpoint
│   ├── sql/               # Database migrations
│   └── Dockerfile
├── frontend/         # Next.js 14 app (port 3000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   └── lib/
│   │       └── api.ts
│   └── Dockerfile
├── railway.toml      # Railway monorepo config
└── package.json      # Root workspace config
```

## Getting Started (Local)

### Prerequisites
- Node.js ≥ 20
- PostgreSQL (local or remote)
- Redis (local or remote)

### Setup

```bash
# 1. Install all dependencies
npm install

# 2. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Run database migrations
psql $DATABASE_URL -f backend/sql/001_init.sql

# 4. Start both services
npm run dev
```

- Backend: http://localhost:3001/api/health
- Frontend: http://localhost:3000

## Railway Deployment

1. Push this repo to GitHub
2. In [Railway](https://railway.app), create a new project from the repo
3. Add **PostgreSQL** and **Redis** plugins in the Railway dashboard
4. Railway auto-detects `railway.toml` and deploys both services
5. Set the following shared variables:
   - `DATABASE_URL` — auto-provided by Railway PostgreSQL
   - `REDIS_URL` — auto-provided by Railway Redis
   - `NEXT_PUBLIC_API_URL` — your backend's Railway URL

## API Endpoints

| Method | Path           | Description                    |
|--------|----------------|--------------------------------|
| GET    | `/api/health`  | Health check (DB + Redis)      |
| GET    | `/api/items`   | List items (Redis-cached)      |

## Environment Variables

### Backend

| Variable       | Default                        | Description            |
|----------------|--------------------------------|------------------------|
| `DATABASE_URL` | postgresql://...               | PostgreSQL connection  |
| `REDIS_URL`    | redis://localhost:6379         | Redis connection       |
| `PORT`         | 3001                           | Server port            |
| `CORS_ORIGIN`  | http://localhost:3000          | Allowed CORS origin    |

### Frontend

| Variable              | Default                        | Description            |
|-----------------------|--------------------------------|------------------------|
| `NEXT_PUBLIC_API_URL` | http://localhost:3001/api      | Backend API base URL   |
