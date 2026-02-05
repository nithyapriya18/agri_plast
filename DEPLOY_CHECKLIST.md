# Deployment Checklist ✅

Use this checklist to ensure a smooth deployment to Render + Vercel.

## Pre-Deployment

- [ ] Code is committed and pushed to GitHub
- [ ] All tests are passing locally
- [ ] `.env` files are NOT committed (check `.gitignore`)
- [ ] Supabase project is set up and accessible

## AWS Setup

- [ ] AWS IAM user created (NOT SSO profile)
- [ ] `AmazonBedrockFullAccess` policy attached
- [ ] Access key ID and secret access key generated
- [ ] Keys saved securely (you'll need them for environment variables)

## Backend Deployment (Render)

- [ ] Render account created and GitHub connected
- [ ] New Web Service created from your repository
- [ ] Root directory set to `backend`
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`
- [ ] All environment variables added:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3002`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_KEY`
  - [ ] `AWS_REGION=us-east-2`
  - [ ] `AWS_ACCESS_KEY_ID`
  - [ ] `AWS_SECRET_ACCESS_KEY`
  - [ ] `MAPBOX_TOKEN`
  - [ ] `GOOGLE_MAPS_API_KEY` (optional)
- [ ] Service deployed successfully (status: Live)
- [ ] Backend URL copied (e.g., `https://agriplast-backend.onrender.com`)
- [ ] Health check works: `/health` returns `{"status":"ok"}`

## Frontend Deployment (Vercel)

- [ ] Vercel account created
- [ ] New project created from GitHub repository
- [ ] Root directory set to `frontend`
- [ ] All environment variables added (Production, Preview, Development):
  - [ ] `NEXT_PUBLIC_API_URL=<your-render-backend-url>`
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `NEXT_PUBLIC_MAPBOX_TOKEN`
- [ ] First deployment completed
- [ ] Frontend URL copied (e.g., `https://agriplast.vercel.app`)

## CORS Configuration

- [ ] Back to Render → Environment
- [ ] Added `FRONTEND_URL=<your-vercel-url>`
- [ ] Saved changes (triggers auto-redeploy)
- [ ] Backend redeployed with new CORS setting

## Database Setup

- [ ] Opened Supabase SQL Editor
- [ ] Ran migration: `supabase/migrations/FINAL_FIX_USER_SIGNUP.sql`
- [ ] Verified trigger exists:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  ```
- [ ] Verified `user_settings` table exists

## Testing

- [ ] Visited frontend URL
- [ ] Sign up works (no "Database error finding user")
- [ ] Can log in successfully
- [ ] Dashboard loads
- [ ] Can create a new project
- [ ] Map displays correctly
- [ ] Chat works: "Add one more polyhouse"
- [ ] Map updates after chat request
- [ ] Can save project
- [ ] Can view saved projects
- [ ] Quotation generates correctly
- [ ] Pricing configuration loads

## Post-Deployment

- [ ] Set up custom domain (optional)
  - [ ] Vercel: Settings → Domains
  - [ ] Render: Settings → Custom Domains
- [ ] Enable monitoring alerts
  - [ ] Render: Settings → Notifications
  - [ ] Vercel: Settings → Notifications
- [ ] Document production URLs in team docs
- [ ] Update README with production links
- [ ] Set up uptime monitoring (optional - e.g., UptimeRobot)

## Troubleshooting Checks

If something doesn't work:

- [ ] Check Render logs for backend errors
- [ ] Check Vercel logs for frontend errors
- [ ] Verify all environment variables are set correctly
- [ ] Test backend health endpoint directly
- [ ] Check browser console for CORS errors
- [ ] Verify Supabase connection strings are correct
- [ ] Test AWS Bedrock access with AWS CLI
- [ ] Check if Render free tier is asleep (first request takes 30-60s)

## Optional Improvements

- [ ] Upgrade Render to Starter plan ($7/month) to eliminate cold starts
- [ ] Set up GitHub Actions for automated testing
- [ ] Configure Sentry for error tracking
- [ ] Set up database backups in Supabase
- [ ] Add Google Analytics or similar
- [ ] Configure CDN for static assets
- [ ] Set up SSL certificates (automatic on Render/Vercel)

---

## Quick Links

- **Frontend**: `___________________________`
- **Backend**: `___________________________`
- **Supabase**: https://supabase.com/dashboard/project/xslcuvjfoxscqnxfhqfz
- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## Support Resources

- [QUICKSTART_DEPLOY.md](QUICKSTART_DEPLOY.md) - 10-minute deployment guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment instructions
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
