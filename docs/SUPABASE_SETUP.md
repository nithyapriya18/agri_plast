# Supabase Setup Guide for Agriplast

This guide will help you set up Supabase for authentication and database.

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** and sign in
3. Click **"New Project"**
4. Fill in the project details:
   - **Name**: Agriplast
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users (e.g., Mumbai for India)
5. Click **"Create new project"** and wait 2-3 minutes

## Step 2: Run Database Migration

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy the entire contents of `/supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. You should see: **"Success. No rows returned"**

This creates all the tables: `user_settings`, `projects`, `chat_messages`, `project_snapshots`, `quotations`

## Step 3: Get API Keys

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **"API"** in the settings menu
3. You'll see two important values:
   - **Project URL**: Something like `https://xxxxx.supabase.co`
   - **anon public** key: Long string starting with `eyJ...`

## Step 4: Configure Frontend

1. In the `/frontend` folder, create a file called `.env.local`:

```bash
cd frontend
cp .env.local.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Replace with your actual values from Step 3.

## Step 5: Configure Email Auth (Optional but Recommended)

By default, Supabase requires email confirmation. For development, you can disable this:

1. Go to **Authentication** → **Providers** → **Email**
2. Toggle **"Enable email confirmations"** to OFF
3. Click **"Save"**

For production, keep email confirmation enabled and configure an email provider (SMTP).

## Step 6: Test Authentication

1. Start the frontend:
```bash
cd frontend
npm run dev
```

2. Visit http://localhost:3000
3. You should be redirected to `/login`
4. Click **"Sign up"** and create an account
5. After signup, you should be redirected to `/dashboard`

## Step 7: Verify Database

1. Go to **Table Editor** in Supabase dashboard
2. Click on `user_settings` table
3. You should see your user's row with default settings
4. Click on `projects` table - should be empty initially

## Troubleshooting

### "Failed to load settings" error
- Check that the migration ran successfully
- Verify RLS (Row Level Security) policies are active
- Check browser console for detailed error messages

### "Invalid API key" error
- Double-check your `.env.local` file
- Make sure you copied the **anon** key, not the **service_role** key
- Restart the Next.js dev server after changing .env.local

### Can't sign up / sign in
- Check Supabase **Auth** → **Users** to see if user was created
- If email confirmation is enabled, check your email
- Check browser console and Network tab for errors

## Security Notes

1. **Never commit `.env.local`** - it's already in `.gitignore`
2. The **anon** key is safe to use in browser (it's public)
3. The **service_role** key should NEVER be exposed to the browser - only use in backend
4. Row Level Security (RLS) protects your data - users can only see their own projects

## Next Steps

- Configure your Supabase project for production
- Set up email templates for auth emails
- Consider upgrading to Supabase Pro for better performance
- Set up database backups

## Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Auth Guide](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
