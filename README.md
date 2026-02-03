# Agriplast Polyhouse Planner

**Stack:** Next.js (frontend), Express (backend), Supabase (auth/DB), AWS Bedrock (AI).  
**Docs:** See `docs/` (e.g. `docs/QUICKSTART.md`, `docs/SETUP_INSTRUCTIONS.md`, `docs/SUPABASE_SETUP.md`).

---

## Prerequisites

- Node.js 18+
- [Mapbox](https://account.mapbox.com/access-tokens/) token (free)
- [Supabase](https://supabase.com) project (auth + DB)
- AWS credentials (Bedrock for AI chat)

---

## Setup

**1. Env**

- Root: `cp .env.example .env` — set `NEXT_PUBLIC_MAPBOX_TOKEN` (and AWS if not using profile).
- Backend: `cp backend/.env.example backend/.env` — set Supabase URL/keys and AWS.
- Frontend: `cp frontend/.env.local.example frontend/.env.local` — set Supabase URL/anon key, `NEXT_PUBLIC_MAPBOX_TOKEN`, and `NEXT_PUBLIC_API_URL=http://localhost:3001`.

**2. Install & build**

```bash
./setup.sh
```

Or manually: `shared` → `backend` → `frontend` (install in each, run `npm run build` in `shared`).

**3. Supabase**

Create project, run SQL from `supabase/migrations/`. See `docs/SUPABASE_SETUP.md`.

---

## Run

Two terminals:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

App: **http://localhost:3000** · API: **http://localhost:3001**

From root you can use: `npm run dev-backend` and `npm run dev-frontend`.
