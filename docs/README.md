# Agriplast Polyhouse Planning System

> AI-powered polyhouse planning and quotation system with full authentication and project management

## Quick Start

See [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) for complete setup guide.

## Problem

Agriplast manually maps land, creates CAD mockups, and generates quotations for potential customers. Only 1 out of 10 converts, wasting 90% of effort.

## Solution

Full-featured web application that:
1. **User Authentication** - Secure signup/login with Supabase
2. **Customizable Settings** - Configure polyhouse dimensions, gaps, and constraints per user
3. **Interactive Mapping** - Draw land boundaries on satellite imagery (Mapbox)
4. **Smart Optimization** - Auto-places polyhouses with solar orientation and terrain analysis
5. **Instant Quotations** - Generate detailed cost breakdowns in INR
6. **Project Management** - Save, view, and manage unlimited projects
7. **AI Chat** - Modify plans using natural language (experimental)

---

## Features

### ✅ Authentication & User Management
- Email/password signup and login
- Session management with Supabase Auth
- Protected routes with automatic redirects

### ✅ Customizable Settings
- Configure polyhouse dimensions (block size, gutter width)
- Set spacing constraints (gap, corner distance)
- Define size limits (min/max side length)
- Terrain preferences (solar, water, slope)
- Settings persist per user

### ✅ AI-Powered Planning
- Interactive map with boundary drawing
- Real-time terrain analysis (Copernicus satellite data)
- Custom solar orientation formula
- Multi-pass optimization algorithm
- Water detection and avoidance

### ✅ Project Management
- Save unlimited projects
- Dashboard with project statistics
- Status tracking (draft/quoted/approved/installed)
- Project detail view
- Delete with confirmation

### ✅ Smart Quotations
- Automatic cost calculation
- Material breakdown
- Labor and installation costs
- Indian Rupee (₹) formatting

## Installation

### Prerequisites
- Node.js 18+
- Supabase account (free tier)
- Mapbox account (free tier)

### Setup

1. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd frontend
   npm install
   ```

2. **Configure Supabase**
   - Follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
   - Run database migrations
   - Copy API keys

3. **Set environment variables**

   Frontend `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_MAPBOX_TOKEN=xxx
   ```

   Backend `.env`:
   ```bash
   PORT=3001
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_KEY=xxx
   ```

4. **Start servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

5. **Access application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

---

## Usage

1. **Sign up** at http://localhost:3000/signup
2. **Configure settings** - Set your default DSL parameters
3. **Create project** - Click "New Project" from dashboard
4. **Draw boundary** - Click on map to draw land boundary
5. **Set preferences** - Answer questions about access and priorities
6. **Review plan** - View AI-generated layout and quotation
7. **Chat with AI** - Modify plan using natural language
8. **Save project** - Save to dashboard for later

---

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- React with TypeScript
- Mapbox GL JS
- Tailwind CSS
- Supabase Auth (SSR)

### Backend
- Express.js with TypeScript
- Supabase PostgreSQL
- Turf.js for geometry
- Copernicus Satellite API

### Database
- Supabase (PostgreSQL)
- Row-level security
- User settings and projects

---

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │────────▶│   Backend    │────────▶│  Supabase   │
│  (Next.js)  │         │  (Express)   │         │ (PostgreSQL)│
└─────────────┘         └──────────────┘         └─────────────┘
      │                         │
      │                         │
      ▼                         ▼
┌─────────────┐         ┌──────────────┐
│   Mapbox    │         │ Copernicus   │
│     API     │         │   Satellite  │
└─────────────┘         └──────────────┘
```

---

## Configuration (DSL)

Default parameters (customizable per user in Settings):

```typescript
{
  blockDimensions: { width: 8, height: 4 },  // meters
  gutterWidth: 2,                             // meters
  polyhouseGap: 2,                            // meters (minimum)
  maxSideLength: 100,                         // meters
  minSideLength: 8,                           // meters
  minCornerDistance: 4,                       // meters
  solarOrientation: { enabled: true },
  terrain: {
    avoidWater: true,
    considerSlope: false,
    maxSlope: 15
  },
  optimization: {
    maximizeSpace: true,
    minimizeCost: true,
    preferLargerPolyhouses: true
  }
}
```

---

## Materials Catalog

| Item | Options | Price Range |
|------|---------|-------------|
| Pipes | GI/MS/PVC 25-32mm | ₹55-120/m |
| Covers | UV plastic/Shade/Insect nets | ₹35-65/sqm |
| Gutters | GI/PVC 150mm | ₹95-180/m |
| Foundation | Concrete + anchor bolts | ₹5,500/m³ |

---

## Project Structure

```
Agriplast/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # API endpoints
│   │   ├── services/        # Business logic
│   │   │   ├── optimizer.ts           # Polyhouse placement
│   │   │   ├── terrainAnalysis.ts    # Satellite data
│   │   │   └── quotation.ts          # Cost calculation
│   │   └── lib/
│   │       └── supabase.ts            # Supabase client
│   └── package.json
│
├── frontend/                # Next.js application
│   ├── app/
│   │   ├── login/           # Login page
│   │   ├── signup/          # Signup page
│   │   ├── dashboard/       # Project list
│   │   ├── settings/        # User settings
│   │   └── projects/
│   │       ├── new/         # New project creation
│   │       └── [id]/        # Project detail view
│   ├── components/          # React components
│   ├── lib/
│   │   └── supabase/        # Supabase clients
│   └── middleware.ts        # Auth protection
│
├── shared/                  # Shared TypeScript types
│   └── src/types.ts
│
└── supabase/                # Database migrations
    └── migrations/
        └── 001_initial_schema.sql
```

---

## Key Features

### Solar Orientation
- Custom formula: `cos(A) = sin(declination) / cos(latitude)`
- Ensures gutters face optimal direction for sunlight
- Allowed range: (90-A) to (90+A) degrees

### Terrain Analysis
- Fetches Copernicus satellite data
- Detects water bodies (types 80, 200, 210)
- Calculates buildable area percentage
- Creates restricted zones

### Optimization Algorithm
- Multi-pass with increasing candidate density
- Adaptive positioning: 1 candidate per 100 sqm
- Validates solar orientation, gaps, boundaries
- Maximizes space utilization

### User Settings Integration
- Backend loads settings from Supabase
- Merges with configuration overrides
- Falls back to system defaults
- Priority: Defaults → User Settings → Preferences → API

---

## Documentation

- [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) - Detailed setup
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Database config
- [WORKFLOW.md](./WORKFLOW.md) - Complete system workflow
- [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md) - Tuning optimizer
- [AGRIPLAST_QUESTIONS.md](./AGRIPLAST_QUESTIONS.md) - Business requirements

---

## Security

- Supabase Auth with JWT tokens
- Row-level security on all tables
- Data isolation per user
- Middleware route protection
- Environment variable security

---

## Troubleshooting

### Backend not loading settings
- Check `SUPABASE_SERVICE_KEY` in backend `.env`
- Verify Supabase connection in console

### Projects not saving
- Check browser console for errors
- Ensure user is authenticated

### No polyhouses generated
- Land area too small (minimum ~100 sqm)
- Restricted zones covering land
- Check terrain warnings

### Settings not persisting
- Check RLS policies in Supabase
- Verify user authentication

---

## Future Enhancements

- PDF/CAD export
- 3D visualization
- Mobile app
- Project sharing
- Quotation history

---

## Support

- [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) - Setup help
- [WORKFLOW.md](./WORKFLOW.md) - System flow
- [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md) - Tuning

## License

Proprietary - Agriplast © 2026
