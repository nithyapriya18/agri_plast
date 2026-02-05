# Quick Start: Deploy Agriplast in 10 Minutes

This is a streamlined guide to get Agriplast deployed quickly. For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Prerequisites Checklist

- [ ] GitHub repository pushed
- [ ] Render.com account
- [ ] Vercel account
- [ ] Supabase project URL and keys
- [ ] AWS IAM user with Bedrock access (NOT SSO)
- [ ] Mapbox token

---

## Step 1: Deploy Backend to Render (3 minutes)

1. Go to https://render.com and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `agriplast-backend`
   - **Region**: Oregon (US West) or closest to you
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - Click "Advanced" → Add these **Environment Variables**:

```
NODE_ENV=production
PORT=3002
SUPABASE_URL=https://xslcuvjfoxscqnxfhqfz.supabase.co
SUPABASE_ANON_KEY=<your_key>
SUPABASE_SERVICE_KEY=<your_key>
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=<your_key>
AWS_SECRET_ACCESS_KEY=<your_key>
MAPBOX_TOKEN=<your_token>
GOOGLE_MAPS_API_KEY=<your_key>
```

5. Click "Create Web Service"
6. Wait for deployment (2-3 minutes)
7. Copy your Render URL (e.g., `https://agriplast-backend.onrender.com`)

---

## Step 2: Deploy Frontend (3 minutes)

1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure:
   - **Root Directory**: `frontend`
   - Click "Deploy"

5. After deployment, go to **Settings** → **Environment Variables**
6. Add these for **all environments** (Production, Preview, Development):

```
NEXT_PUBLIC_API_URL=<your_railway_url_from_step1>
NEXT_PUBLIC_SUPABASE_URL=https://xslcuvjfoxscqnxfhqfz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_key>
NEXT_PUBLIC_MAPBOX_TOKEN=<your_token>
```

7. Go to **Deployments** → Click "..." → "Redeploy"

---

## Step 3: Update Backend CORS (1 minute)

1. Copy your Vercel URL (e.g., `https://agriplast.vercel.app`)
2. Go back to Render → Environment
3. Add: `FRONTEND_URL=<your_vercel_url>`
4. Click "Save Changes" - Render will auto-redeploy

---

## Step 4: Run Database Migration (2 minutes)

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/FINAL_FIX_USER_SIGNUP.sql`
3. Paste and run in SQL Editor
4. Verify success

---

## Step 5: Test (2 minutes)

1. Visit your Vercel URL
2. Sign up with a test account
3. Create a new project
4. Try the chat feature: "Add one more polyhouse"
5. Verify the map updates

---

## Done! 🎉

Your Agriplast app is now live at your Vercel URL.

---

## Troubleshooting Quick Fixes

**CORS errors:**
```bash
# In Render, verify FRONTEND_URL is set correctly
FRONTEND_URL=https://your-exact-vercel-url.vercel.app
```

**Backend not responding:**
```bash
# Check Render logs (Logs tab) and verify these are set:
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

**Render service sleeping:**
- Render free tier sleeps after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- Consider upgrading to Starter plan ($7/month) for always-on service

**Supabase errors:**
```bash
# Verify in Supabase SQL Editor that trigger exists:
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

---

## Need Help?

See the full [DEPLOYMENT.md](DEPLOYMENT.md) guide for detailed troubleshooting.
