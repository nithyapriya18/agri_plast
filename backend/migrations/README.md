# Database Migrations

This directory contains SQL migration files for the Agriplast database schema.

## Migration Files

### 001_add_dsl_columns.sql
**Purpose**: Add DSL (Domain Specific Language) columns for conversational-first redesign

**Changes**:
- Adds `pricing_preferences` (JSONB) to `user_settings` table
- Adds `design_preferences` (JSONB) to `user_settings` table
- Adds `learning_profile` (JSONB) to `user_settings` table
- Adds `dsl_version` (INTEGER) to `user_settings` table
- Adds `preferences_snapshot` (JSONB) to `projects` table
- Creates indexes for performance optimization
- Creates trigger to auto-update learning profile on project creation

**Rollback**: Use `001_add_dsl_columns_rollback.sql`

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and click **Run**

### Option 2: Supabase CLI
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migration
supabase db push backend/migrations/001_add_dsl_columns.sql
```

### Option 3: psql (Direct Database Connection)
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:[PORT]/postgres" \\
  -f backend/migrations/001_add_dsl_columns.sql
```

## How to Rollback Migrations

If you need to revert a migration:

```bash
# Using Supabase Dashboard
# - Go to SQL Editor
# - Run the corresponding *_rollback.sql file

# Or using psql
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:[PORT]/postgres" \\
  -f backend/migrations/001_add_dsl_columns_rollback.sql
```

## Migration Naming Convention

```
<number>_<descriptive_name>.sql
<number>_<descriptive_name>_rollback.sql
```

- **number**: Sequential migration number (001, 002, 003, etc.)
- **descriptive_name**: Brief description in snake_case
- **_rollback**: Rollback script for the migration

## Verifying Migrations

After applying a migration, verify it was successful:

```sql
-- Check if columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_settings'
  AND column_name IN ('pricing_preferences', 'design_preferences', 'learning_profile', 'dsl_version');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name = 'preferences_snapshot';

-- Check if indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%_dsl%' OR indexname LIKE '%preferences%';

-- Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_learning_profile';
```

## Testing Migrations

Before applying to production:
1. Apply migration to a development/staging database
2. Test all affected features
3. Run rollback script to ensure it works
4. Re-apply migration
5. Only then apply to production

## Notes

- Always backup your database before applying migrations
- Test migrations on a non-production environment first
- Keep migration files in version control
- Document any manual steps required
- Migrations should be idempotent when possible (use `IF NOT EXISTS`, `IF EXISTS`)
