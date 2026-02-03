# Supabase Migrations - Fix 406 Error

## Quick Fix for 406 Error

The 406 error occurs because the RLS policies on `user_settings` are too restrictive or the table is missing columns.

### SOLUTION: Run FIX_406_ERROR.sql

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `FIX_406_ERROR.sql`
5. Paste and click **Run**

This will:
- ✅ Replace restrictive RLS policies with correct ones
- ✅ Add any missing columns (company_name, phone, safety_buffer, etc.)
- ✅ Update max_side_length default to 120m
- ✅ Allow authenticated users to read/write their own settings

### After running the migration:

1. Refresh your frontend application
2. The settings page should now load without 406 error
3. Users can save and load their settings from Supabase

---

## Other Migration Files

- `20240101000000_create_user_settings.sql` - Initial table creation (use if table doesn't exist)
- `20240102000000_update_user_settings.sql` - Add missing columns to existing table
- `DIAGNOSE_406_ERROR.sql` - Diagnostic queries to check table status
- `FIX_406_ERROR.sql` - **Use this one to fix the 406 error** ⭐

---

## Verification

After applying the fix, verify it worked:

1. Open browser console
2. Go to Settings page
3. Should see no 406 errors
4. Check Supabase logs in dashboard for any RLS policy violations
