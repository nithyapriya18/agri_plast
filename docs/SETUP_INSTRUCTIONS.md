# Agriplast Setup Instructions

Complete setup guide for the Agriplast polyhouse planning system.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Supabase account (free tier is fine)

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Set Up Supabase

Follow the detailed guide in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

**Quick summary:**
1. Create Supabase project at https://supabase.com
2. Run migration SQL in Supabase SQL Editor
3. Copy API keys to `frontend/.env.local`

### 3. Configure Backend

Create `backend/.env`:

```bash
cd backend
cat > .env << 'EOF'
PORT=3001
NODE_ENV=development

# Supabase Configuration (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# AWS Bedrock (optional - for AI chat features)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
EOF
```

**Important**: The backend requires Supabase credentials to load user settings. Make sure to get the service role key from Supabase dashboard → Settings → API.

### 4. Start Both Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## First Time Use

1. **Sign Up**: Go to http://localhost:3000 and click "Sign up"
2. **Create Account**: Fill in your details (name, email, password, company info)
3. **Dashboard**: You'll be redirected to the dashboard automatically
4. **Settings**: Click "Settings" to configure default DSL parameters (polyhouse dimensions, gaps, solar orientation, etc.)
5. **New Project**: Click "New Project" to start planning a polyhouse layout
6. **Draw Boundary**: Draw your land boundary on the map
7. **Set Preferences**: Answer questions about vehicle access and priorities
8. **Review Plan**: View the AI-generated polyhouse layout, quotation, and chat with the assistant to make modifications
9. **Save Project**: Click "Save Project" to save it to your dashboard

## Project Structure

```
Agriplast/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── services/        # Business logic (optimizer, terrain analysis)
│   │   └── utils/           # Utilities
│   └── package.json
│
├── frontend/                # Next.js application
│   ├── app/                 # App router pages
│   │   ├── login/           # Login page
│   │   ├── signup/          # Signup page
│   │   ├── dashboard/       # Project list
│   │   ├── settings/        # User settings
│   │   └── projects/        # Project pages
│   ├── components/          # React components
│   ├── lib/                 # Client libraries (Supabase)
│   └── middleware.ts        # Auth middleware
│
├── shared/                  # Shared TypeScript types
│   └── src/types.ts
│
└── supabase/                # Database migrations
    └── migrations/
```

## Features

### Authentication
- ✅ Email/password signup and login
- ✅ Session management with Supabase Auth
- ✅ Protected routes (dashboard, settings)
- ✅ Automatic redirect logic

### Dashboard
- ✅ List all your projects
- ✅ View project details (land area, polyhouses, cost)
- ✅ Project status tracking (draft, quoted, approved, installed)
- ✅ Delete projects

### Settings Page
- ✅ Configure default DSL parameters:
  - Block dimensions (8m × 4m)
  - Gutter width
  - Polyhouse gap (minimum 2m)
  - Max/min side lengths
  - Corner distance
  - Solar orientation (enable/disable)
  - Terrain constraints (water, slopes)
- ✅ Reset to defaults
- ✅ Persisted per user in Supabase

### Project Planning
- ✅ Draw land boundaries on map
- ✅ AI-powered polyhouse placement
- ✅ Real-time chat for modifications
- ✅ Cost quotations
- ✅ Save projects to database
- ✅ View project history
- 🔄 Export/share plans (coming soon)

## Configuration Guide

See [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md) for details on tuning the optimizer based on customer feedback.

## Development Workflow

### Making Changes to Settings

1. Update database schema in `supabase/migrations/001_initial_schema.sql`
2. Add new fields to `UserSettings` interface in `frontend/app/settings/page.tsx`
3. Update form in settings page
4. Backend will automatically use settings from Supabase

### Adding New Features

1. **Database**: Add tables in Supabase migration
2. **Types**: Define TypeScript interfaces in `shared/src/types.ts`
3. **Backend**: Add API routes in `backend/src/controllers/`
4. **Frontend**: Create pages in `frontend/app/`

## Common Issues

### "Module not found" errors
```bash
# Clear Next.js cache
rm -rf frontend/.next
npm run dev
```

### Changes not reflecting
```bash
# Restart both servers
# Backend: Ctrl+C then npm run dev
# Frontend: Ctrl+C then npm run dev
```

### Database errors
- Check Supabase project status
- Verify RLS policies are active
- Check browser console for detailed errors

## Next Steps

1. ✅ Complete Supabase setup
2. ✅ Test auth flow (signup, login, logout)
3. ✅ Configure default settings
4. ✅ Integrate map planning page with Supabase
5. ✅ Save projects to database
6. ✅ Implement project detail view
7. 🔄 Add export functionality (PDF/images)
8. 🔄 Implement project sharing
9. 🔄 Add quotation history tracking

## Support

- Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for Supabase issues
- Check [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md) for optimizer tuning
- Review [AGRIPLAST_QUESTIONS.md](./AGRIPLAST_QUESTIONS.md) for business questions

## Production Deployment

Coming soon - will cover:
- Vercel deployment for frontend
- Backend hosting options
- Environment variables for production
- Database backup strategy
