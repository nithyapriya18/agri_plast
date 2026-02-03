# Fix 406 Error - Polyhouses Not Rendering

## Problem
You're seeing a 406 error and polyhouses are not rendering on the map.

## Root Cause
The backend cannot access the `user_settings` table in Supabase due to:
1. Missing table or columns
2. RLS policies blocking service role access
3. Missing GRANT permissions for service_role

## Solution

### Step 1: Run the Complete SQL Fix

1. Open your Supabase dashboard: https://app.supabase.com
2. Select your project: `xslcuvjfoxscqnxfhqfz`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of [supabase/migrations/FIX_406_COMPLETE.sql](supabase/migrations/FIX_406_COMPLETE.sql)
6. Paste and click **Run** (or press Cmd/Ctrl + Enter)

This migration will:
- ✅ Create the table if it doesn't exist
- ✅ Add any missing columns
- ✅ Fix RLS policies
- ✅ **Grant permissions to service_role** (Critical for backend access!)
- ✅ Update default values to industry standards

### Step 2: Verify Backend Connection

Run the test script to verify the backend can access Supabase:

```bash
cd backend
node test-supabase-connection.js
```

Expected output:
```
✅ Table exists and is accessible
✅ Write permissions working
🎉 Backend should be able to access user_settings successfully!
```

If you see errors, the test script will tell you exactly what's wrong.

### Step 3: Restart Backend

After running the SQL migration, restart your backend:

```bash
cd backend
npm run dev
```

### Step 4: Test in Browser

1. Refresh your frontend application
2. Draw a land boundary
3. Click "Generate Plan"
4. Polyhouses should now render!

## What Was Missing

The key issue was **GRANT permissions for service_role**:

```sql
GRANT ALL ON public.user_settings TO service_role;
```

Without this, even with a service key, the backend couldn't access the table due to RLS policies.

## Verification

After applying the fix, you should see in backend logs:
```
Loaded user settings from Supabase for user: <user-id>
```

And no 406 errors in the browser console.

## If It Still Doesn't Work

1. Check backend logs for errors
2. Check browser console for the exact endpoint returning 406
3. Run the test script: `node backend/test-supabase-connection.js`
4. Check Supabase logs in dashboard (Logs > Postgres Logs)
5. Verify environment variables:
   ```bash
   cat backend/.env | grep SUPABASE
   ```

## Alternative: Disable User Settings (Temporary)

If you need a quick workaround, you can modify the backend to not load user settings:

In `backend/src/controllers/planningController.ts` (line 64-81), comment out the Supabase query:

```typescript
// Load user settings from Supabase if userId provided
let userSettings = null;
// if (userId) { ... } // <-- Comment this entire block
```

This will use default values instead of loading from Supabase.
