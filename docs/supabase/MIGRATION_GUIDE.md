# Database Migration Guide

## How to Run the Migration

1. **Go to Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Clean Migration**
   - Open the file: `supabase/migrations/001_initial_schema_clean.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run"

4. **Verify Success**
   - Go to "Table Editor" in Supabase
   - You should see these tables:
     - user_settings
     - projects
     - chat_messages
     - project_snapshots
     - quotations

## What This Migration Does

### Tables Created
- **user_settings**: Per-user DSL configuration (polyhouse dimensions, gaps, constraints)
- **projects**: Saved polyhouse planning projects with customer/location info
- **chat_messages**: Conversation history for projects
- **project_snapshots**: Undo/redo history
- **quotations**: Quotation history with material selections

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Automatic trigger creates user_settings on signup

### New Fields in Projects Table
- **customer_company_name**: Client's company name
- **contact_name**: Primary contact person
- **contact_email**: Contact email address
- **contact_phone**: Contact phone number
- **location_name**: Location/site name
- **location_address**: Full address with landmarks

## Troubleshooting

### "Policy already exists" error
Use the clean migration file (`001_initial_schema_clean.sql`) which drops existing objects first.

### "Permission denied" error
Make sure you're using the service role key, not the anon key.

### Tables not showing
Refresh the page or check the Supabase logs for errors.
