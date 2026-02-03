# Agriplast Complete Workflow

This document explains the end-to-end workflow of the Agriplast polyhouse planning system with Supabase integration.

## System Architecture

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

## User Journey

### 1. Authentication
- User visits http://localhost:3000
- Redirected to login page if not authenticated
- Can sign up with email/password + company details
- On signup, `user_settings` record is created with default DSL parameters
- On login, redirected to dashboard

### 2. Settings Configuration
- User clicks "Settings" from dashboard
- Configure company information:
  - Company name
  - Phone number
- Configure polyhouse dimensions:
  - Block width (default: 8m)
  - Block height (default: 4m)
  - Gutter width (default: 2m)
  - Polyhouse gap (default: 2m)
- Configure size constraints:
  - Min side length (default: 8m)
  - Max side length (default: 100m)
  - Corner distance (default: 4m)
- Configure terrain constraints:
  - Solar orientation (default: enabled)
  - Water avoidance (default: enabled)
  - Slope consideration (default: disabled)
  - Max slope (default: 15°)
- Settings saved to Supabase `user_settings` table
- Settings are per-user, isolated by Row Level Security

### 3. Create New Project
- User clicks "New Project" from dashboard
- Redirected to `/projects/new`
- Map interface loads with drawing tools

#### Step 3.1: Draw Land Boundary
- User draws polygon on map by clicking points
- Double-click or click first point to close polygon
- Polygon validated (minimum 3 points)
- Coordinates stored in memory

#### Step 3.2: Customer Preferences
- Modal appears asking:
  - Vehicle access required? (affects polyhouse gap)
  - Priority: Coverage, Balance, or Accessibility
- Preferences influence configuration overrides

#### Step 3.3: Backend Processing
1. **Frontend sends request** to `/api/planning/create`:
   ```json
   {
     "landArea": {
       "name": "Land Area 1/30/2026",
       "coordinates": [...]
     },
     "configuration": {...},
     "customerPreferences": {...},
     "userId": "uuid"
   }
   ```

2. **Backend loads user settings** from Supabase:
   - Queries `user_settings` table by `userId`
   - Merges with configuration overrides
   - Falls back to defaults if no settings found

3. **Terrain analysis** (if enabled):
   - Fetches Copernicus satellite data for coordinates
   - Identifies water bodies (types 80, 200, 210)
   - Calculates buildable area percentage
   - Creates restricted zones

4. **Solar orientation calculation**:
   - Uses custom formula: cos(A) = sin(declination) / cos(latitude)
   - Allowed gutter orientation: (90-A) to (90+A) degrees
   - Ensures gutters receive optimal sunlight

5. **Polyhouse optimization**:
   - Multi-pass algorithm with adaptive candidate positions
   - Pass 1: Initial exploration (1 candidate per 100 sqm)
   - Pass 2: Refinement (1.5x candidates)
   - Pass 3: Final optimization (2x candidates)
   - Validates against:
     - Land boundaries
     - Restricted zones (water)
     - Solar orientation constraints
     - Minimum gaps between polyhouses
     - Corner distance requirements

6. **Quotation generation**:
   - Calculate material costs per polyhouse
   - Labor costs
   - Installation costs
   - Total project cost

7. **Response** returned to frontend:
   ```json
   {
     "planningResult": {
       "polyhouses": [...],
       "quotation": {...},
       "terrainAnalysis": {...},
       "metadata": {...}
     },
     "resultId": "result-123456"
   }
   ```

#### Step 3.4: Review and Modify
- Map displays polyhouses overlaid on land
- Quotation panel shows cost breakdown
- Terrain info panel shows buildable area, slope, elevation
- Chat interface allows modifications:
  - "Add more polyhouses"
  - "Increase spacing"
  - "Change orientation"
  - AI responds and recalculates

#### Step 3.5: Save Project
- User clicks "Save Project"
- Modal prompts for project name
- Project saved to Supabase `projects` table:
  ```sql
  INSERT INTO projects (
    user_id,
    name,
    location_name,
    land_boundary,
    land_area_sqm,
    polyhouse_count,
    total_coverage_sqm,
    utilization_percentage,
    estimated_cost,
    configuration,
    polyhouses,
    quotation,
    terrain_analysis,
    status
  ) VALUES (...)
  ```
- User redirected to dashboard

### 4. Dashboard View
- Lists all projects for authenticated user
- Shows project cards with:
  - Project name and location
  - Land area (sqm)
  - Number of polyhouses
  - Utilization percentage
  - Estimated cost
  - Status badge (draft/quoted/approved/installed)
  - Creation date
- Actions:
  - "View" - opens project detail page
  - "Delete" - removes project (with confirmation)

### 5. Project Detail View
- URL: `/projects/[id]`
- Loads project from Supabase
- Read-only map view with polyhouses
- Statistics display:
  - Land area
  - Polyhouse count
  - Utilization percentage
  - Estimated cost
- Status management dropdown:
  - Draft → Quoted → Approved → Installed
  - Updates saved to database
- Actions:
  - View quotation (expandable panel)
  - Delete project
  - Back to dashboard

## Data Flow Diagram

### Creating a Project

```
┌──────────┐
│   User   │
└────┬─────┘
     │ 1. Draw boundary
     ▼
┌──────────────────┐
│  Frontend Map    │
└────┬─────────────┘
     │ 2. POST /api/planning/create
     │    (landArea, userId, config)
     ▼
┌──────────────────┐
│ Backend          │
│ Controller       │
└────┬─────────────┘
     │ 3. Load user settings
     ▼
┌──────────────────┐
│   Supabase       │
│ user_settings    │
└────┬─────────────┘
     │ 4. Settings data
     ▼
┌──────────────────┐
│ Backend          │
│ Optimizer        │
└────┬─────────────┘
     │ 5. Fetch terrain data
     ▼
┌──────────────────┐
│  Copernicus      │
│  Satellite       │
└────┬─────────────┘
     │ 6. Land cover data
     ▼
┌──────────────────┐
│ Backend          │
│ Optimizer        │───── 7. Run optimization
└────┬─────────────┘
     │ 8. Planning result
     ▼
┌──────────────────┐
│  Frontend        │───── 9. Display polyhouses
└────┬─────────────┘
     │ 10. User saves
     ▼
┌──────────────────┐
│   Supabase       │
│   projects       │
└──────────────────┘
```

## Database Schema

### user_settings
- Stores per-user DSL configuration
- Fields: block dimensions, gaps, constraints, terrain preferences
- One record per user (user_id is primary key)
- RLS: Users can only read/write their own settings

### projects
- Stores saved polyhouse planning projects
- Fields: name, boundaries, polyhouses, quotation, status
- Multiple records per user
- RLS: Users can only read/write their own projects

### chat_messages (future)
- Stores conversation history for each project
- Links to projects table

### project_snapshots (future)
- Stores undo/redo history for projects
- Enables time-travel debugging

### quotations (future)
- Stores quotation history with material selections
- Tracks pricing changes over time

## Security

### Authentication
- Supabase Auth handles user management
- Email/password authentication
- JWT tokens stored in HTTP-only cookies
- Session refresh handled automatically

### Authorization
- Row Level Security (RLS) on all tables
- Policy: `user_id = auth.uid()`
- Users can only access their own data

### Middleware Protection
- Next.js middleware checks authentication
- Protected routes: `/dashboard`, `/projects/*`, `/settings`
- Unauthenticated users redirected to `/login`
- Authenticated users on `/login` or `/signup` redirected to `/dashboard`

## Configuration Priority

When creating a plan, configuration is merged in this order (lowest to highest priority):

1. **System defaults** (hardcoded fallbacks)
2. **User settings** (from Supabase `user_settings`)
3. **Customer preferences** (from modal)
4. **API overrides** (from request body `configuration`)

Example:
- System default polyhouse gap: 2m
- User setting: 3m (saved in Supabase)
- Customer preference: Vehicle access required → 3m
- API override: Not provided
- **Result: 3m**

## Key Files

### Frontend
- `app/page.tsx` - Root redirect (auth check)
- `app/login/page.tsx` - Login page
- `app/signup/page.tsx` - Registration page
- `app/dashboard/page.tsx` - Project list
- `app/settings/page.tsx` - User settings
- `app/projects/new/page.tsx` - New project creation
- `app/projects/[id]/page.tsx` - Project detail view
- `lib/supabase/client.ts` - Browser Supabase client
- `lib/supabase/server.ts` - Server Supabase client
- `middleware.ts` - Auth protection

### Backend
- `src/controllers/planningController.ts` - Planning API
- `src/services/optimizer.ts` - Polyhouse placement algorithm
- `src/services/terrainAnalysis.ts` - Copernicus satellite data
- `src/services/quotation.ts` - Cost calculation
- `src/lib/supabase.ts` - Supabase client

### Database
- `supabase/migrations/001_initial_schema.sql` - Schema and RLS

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MAPBOX_TOKEN=xxx
```

### Backend (.env)
```
PORT=3001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
AWS_REGION=us-east-1 (optional)
```

## Common Operations

### Adding a New DSL Parameter

1. **Update database schema**:
   ```sql
   ALTER TABLE user_settings ADD COLUMN new_param REAL DEFAULT 10.0;
   ```

2. **Update settings page** (`app/settings/page.tsx`):
   ```typescript
   const [newParam, setNewParam] = useState(10.0);
   ```

3. **Update backend controller** (`planningController.ts`):
   ```typescript
   newParam: userSettings?.new_param ?? 10,
   ```

4. **Update optimizer** if needed

### Changing Default Values

Edit `backend/src/controllers/planningController.ts`:
```typescript
polyhouseGap: userSettings?.polyhouse_gap ?? 2, // Change 2 to new default
```

## Troubleshooting

### "User settings not loading"
- Check backend console for Supabase errors
- Verify `SUPABASE_SERVICE_KEY` in backend `.env`
- Check RLS policies on `user_settings` table

### "Projects not saving"
- Check browser console for errors
- Verify Supabase connection in frontend
- Check RLS policies on `projects` table
- Ensure user is authenticated

### "No polyhouses generated"
- Land area too small (minimum ~100 sqm)
- Land shape too irregular
- Restricted zones covering entire land
- Solar orientation too restrictive

### "Settings not persisting"
- Check Supabase RLS policies
- Verify user_id matches authenticated user
- Check browser console for errors on save

## Performance Considerations

- Optimization runs on backend (CPU-intensive)
- Typical computation time: 2-5 seconds
- Frontend shows loading animation during optimization
- Copernicus data fetched once per plan
- User settings cached in frontend during session

## Future Enhancements

1. **Export functionality**
   - PDF quotations
   - CAD drawings
   - Image exports

2. **Collaboration**
   - Share projects with team members
   - Comments and annotations

3. **Analytics**
   - Track project success rates
   - Optimize defaults based on accepted proposals

4. **Mobile app**
   - React Native app for field use
   - Offline mode with sync
