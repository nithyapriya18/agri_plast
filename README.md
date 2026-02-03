# Agriplast Polyhouse Planner

**Stack:** Next.js (frontend + API routes), Neon (DB), Google Auth (authorized_users allowlist), AWS Bedrock (AI).  
Optional: Supabase (legacy auth/DB), or standalone Express backend.  
**Docs:** See `docs/` (e.g. `docs/QUICKSTART.md`, `docs/SETUP_INSTRUCTIONS.md`).

---

## Prerequisites

- Node.js 18+
- [Mapbox](https://account.mapbox.com/access-tokens/) token (free)
- [Neon](https://neon.tech) database (run `schema/neon/*.sql` in order)
- [Google Cloud](https://console.cloud.google.com/) OAuth client (for sign-in)
- AWS credentials (Bedrock for AI chat)

---

## Setup

**1. Env**

- Frontend: `cp frontend/.env.local.example frontend/.env.local`
  - `DATABASE_URL` — Neon connection string
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Google OAuth client ID
  - `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox token
  - `NEXT_PUBLIC_API_URL` — leave empty to use same-origin Next.js API; set to `http://localhost:3001` only if using the standalone Express backend
  - Optional: Supabase URL/anon key if you still use Supabase for some flows

**2. Install & build**

```bash
./setup.sh
```

Or manually: `shared` → `frontend` (install in each, run `npm run build` in `shared`).

**3. Database (Neon)**

Create a Neon project, then run the SQL files in `schema/neon/` in order (00 through 09). Add allowed users to `authorized_users` so they can sign in with Google.

---

## Run

**Single app (Next.js with API routes, no separate backend):**

```bash
cd frontend && npm run dev
```

App + API: **http://localhost:3000**

**With standalone Express backend (optional):**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:3001` in `frontend/.env.local` so the frontend calls the Express API.
