# Agriplast Deployment Guide

This guide will walk you through deploying Agriplast to production using Vercel (frontend) and Render (backend).

## Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- Render account (sign up at https://render.com)
- AWS account with Bedrock access configured
- Supabase project set up

---

## Part 1: Deploy Backend to Render

### Step 1: Prepare Your Repository

1. Commit all your changes:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Deploy to Render

1. Go to https://render.com and sign in with GitHub
2. Click "New +" → "Web Service"
3. Connect your GitHub repository (authorize Render if needed)
4. Select your Agriplast repository
5. Configure the service:
   - **Name**: `agriplast-backend` (or your preferred name)
   - **Region**: Choose closest to you (e.g., Oregon for US West)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or Starter for $7/month - no sleep)

### Step 3: Configure Environment Variables in Render

Click "Advanced" and add these environment variables:

```
NODE_ENV=production
PORT=3002

# Supabase
SUPABASE_URL=https://xslcuvjfoxscqnxfhqfz.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# AWS Bedrock (IMPORTANT: Use IAM credentials, not SSO profile)
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Mapbox
MAPBOX_TOKEN=your_mapbox_token

# Google Maps (optional)
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

**IMPORTANT for AWS**: Render cannot use AWS SSO profiles. You need to:
1. Go to AWS IAM Console
2. Create a new IAM user with programmatic access
3. Attach the `AmazonBedrockFullAccess` policy
4. Generate access keys
5. Use those keys in the environment variables above

### Step 4: Deploy

1. Click "Create Web Service"
2. Render will start building and deploying (takes 2-3 minutes)
3. Wait for the status to show "Live"

### Step 5: Get Your Backend URL

After deployment succeeds:
1. Render provides a public URL like: `https://agriplast-backend.onrender.com`
2. **Copy this URL** - you'll need it for the frontend
3. Test it by visiting `https://agriplast-backend.onrender.com/health`
4. You should see: `{"status":"ok","timestamp":"..."}`

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Deploy to Vercel

1. Go to https://vercel.com and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - Click "Deploy"

### Step 2: Configure Environment Variables in Vercel

In the Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add these variables for **Production**, **Preview**, and **Development**:

```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://xslcuvjfoxscqnxfhqfz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# AWS Bedrock (for client-side if needed)
USE_AWS_BEDROCK=true
AWS_REGION=us-east-2
BEDROCK_MODEL_ID=global.anthropic.claude-haiku-4-5-20251001-v1:0
```

**Replace** `https://your-railway-backend-url.up.railway.app` with your actual Railway backend URL from Part 1.

### Step 3: Redeploy

After adding environment variables:
1. Go to Deployments
2. Click "..." on the latest deployment
3. Click "Redeploy"

---

## Part 3: Update Backend CORS

Update your backend to allow the Vercel frontend domain:

1. In Render dashboard, go to Environment
2. Add environment variable:
```
FRONTEND_URL=https://your-vercel-app.vercel.app
```

3. Click "Save Changes"
4. Render will automatically redeploy with the new variable

**Note**: The backend code already supports this via [backend/src/index.ts](backend/src/index.ts#L27-29) which automatically adds `FRONTEND_URL` to allowed origins.

---

## Part 4: Run Database Migrations

Run the Supabase migrations to set up your database:

1. Go to your Supabase Dashboard → SQL Editor
2. Run the migration file: [supabase/migrations/FINAL_FIX_USER_SIGNUP.sql](supabase/migrations/FINAL_FIX_USER_SIGNUP.sql)
3. Verify the `user_settings` table and triggers are created

---

## Testing Your Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Try signing up with a test account
3. Create a new project and test the chat functionality
4. Verify the map updates when you request changes

---

## Troubleshooting

### Backend Issues

**Problem**: Backend fails to start
- Check Render logs (Logs tab) for errors
- Verify all environment variables are set
- Ensure AWS credentials are valid (not SSO)
- Check build logs for compilation errors

**Problem**: CORS errors
- Verify `FRONTEND_URL` environment variable is set in Render
- Check Render logs for blocked requests
- Ensure Vercel URL is exact (including https://)

**Problem**: Backend is slow or times out (Free tier)
- Render free tier sleeps after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- Consider upgrading to Starter plan ($7/month) for always-on service

### Frontend Issues

**Problem**: "Failed to fetch" errors
- Verify `NEXT_PUBLIC_API_URL` points to your Render backend
- Check that backend is running (visit `https://your-backend.onrender.com/health`)
- If using free tier, first request may take 30-60s (backend waking up)

**Problem**: Supabase errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check Supabase dashboard for any issues

### AWS Bedrock Issues

**Problem**: "AccessDenied" errors
- Verify IAM user has `AmazonBedrockFullAccess` policy
- Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are correct
- Verify AWS_REGION is `us-east-2`

---

## Cost Estimates

- **Vercel**: Free tier (Hobby) for personal projects, ~$20/month for Pro
- **Render**:
  - Free tier: $0/month (sleeps after 15 min, 750 hours/month)
  - Starter: $7/month (always-on, recommended for production)
- **Supabase**: Free tier, ~$25/month for Pro
- **AWS Bedrock**: Pay per token usage (~$0.25 per million tokens for Claude Haiku)

**Recommended for Production**: Render Starter ($7/month) to avoid cold starts

---

## Production Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Database migrations run successfully
- [ ] Environment variables configured correctly
- [ ] CORS configured with production URLs
- [ ] Test user signup and login
- [ ] Test project creation and chat functionality
- [ ] Monitor logs for errors
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring/alerts

---

## Custom Domain (Optional)

### For Vercel (Frontend):
1. Go to Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### For Render (Backend):
1. Go to Settings → Custom Domains
2. Add your custom domain
3. Configure DNS records as shown (CNAME or A record)

---

## Monitoring

- **Render Logs**: Monitor backend logs in Render dashboard (Logs tab)
- **Render Metrics**: View CPU, memory, and bandwidth usage (Metrics tab)
- **Vercel Logs**: Monitor frontend logs in Vercel dashboard
- **Supabase Logs**: Monitor database queries in Supabase dashboard
- **AWS CloudWatch**: Monitor Bedrock usage and errors

### Setting Up Alerts (Optional)

**Render**:
- Go to Settings → Notifications
- Enable email alerts for deploy failures and service outages

**Vercel**:
- Go to Settings → Notifications
- Enable alerts for deployment failures and runtime errors

---

## Support

If you encounter issues:
1. Check logs in Railway/Vercel dashboards
2. Verify environment variables are set correctly
3. Review the [GitHub Issues](https://github.com/yourusername/agriplast/issues)
4. Contact support for your hosting platforms
