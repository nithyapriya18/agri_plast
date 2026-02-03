# Quick Fix Guide - 406 Error & Polyhouses Not Rendering

## ✅ Good News
The Supabase connection test passed! Your backend CAN access the database.

## 🔧 Quick Fix Steps

### Step 1: Run the Complete SQL Fix (If Not Done Already)

1. Go to: https://app.supabase.com/project/xslcuvjfoxscqnxfhqfz/sql/new
2. Copy ALL contents from: `supabase/migrations/FIX_406_COMPLETE.sql`
3. Paste into SQL Editor
4. Click **RUN** (or Cmd+Enter)

**Critical:** The SQL includes `GRANT ALL ON public.user_settings TO service_role;` which allows the backend to access the table.

### Step 2: Restart Backend

```bash
cd backend
# Stop current backend (Ctrl+C)
npm run dev
```

### Step 3: Clear Browser Cache & Reload

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to **Network** tab
3. Check "Disable cache"
4. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Step 4: Test

1. Draw a land boundary
2. Click "Generate Plan"
3. Polyhouses should render!

## 🔍 If Still Not Working

### Check Backend Logs

Look for this in backend console:
```
✅ GOOD: "Loaded user settings from Supabase for user: <user-id>"
❌ BAD:  "Could not load user settings: ..."
```

### Check Browser Console

1. Open DevTools → Console tab
2. Look for 406 errors
3. Note which endpoint is failing (e.g., `/api/planning/create`)

### Re-run Connection Test

```bash
cd backend
node test-supabase-connection.mjs
```

Expected output:
```
✅ Table exists and is accessible
✅ Write permissions working
🎉 Backend should be able to access user_settings successfully!
```

## 📊 Test Results

Your system:
- ✅ Supabase URL configured
- ✅ Service key configured
- ✅ `user_settings` table exists
- ✅ Service role has write permissions
- ⚠️  Table is empty (0 rows) - this is normal for new users

## 🐛 Common Issues

### Issue 1: "Could not load user settings"
**Solution:** Run `FIX_406_COMPLETE.sql` in Supabase dashboard

### Issue 2: Still getting 406 after SQL fix
**Solution:** Restart backend AND clear browser cache

### Issue 3: Polyhouses render but are too small/wrong
**Solution:** Different issue - see optimizer settings

## 📝 What the SQL Fix Does

1. Creates `user_settings` table if missing
2. Adds missing columns (company_name, phone, etc.)
3. Sets up RLS policies for authenticated users
4. **Grants service_role permissions** ← CRITICAL for backend
5. Updates defaults (max_side_length: 120m)
6. Creates triggers for auto-updating timestamps

## 🎯 Expected Behavior After Fix

1. **Backend logs:** "Loaded user settings from Supabase for user: ..."
2. **Browser:** No 406 errors in console
3. **Map:** Polyhouses render with proper dimensions
4. **Settings page:** Loads without errors

## 💡 Pro Tip

After the fix, go to Settings page and configure your defaults:
- Max side length: 120m (industry standard)
- Polyhouse gap: 2m (minimum access corridor)
- Solar orientation: Enabled (mandatory for plant growth)

These will apply to all new projects!
