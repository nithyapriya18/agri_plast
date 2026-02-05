# Fix Render Deployment Settings

Your Render service needs these updated settings because the backend imports from the shared folder.

## Update in Render Dashboard

Go to your Render service dashboard → Settings and change:

### 1. Root Directory
**Current:** `backend`
**Change to:** *(leave empty/blank)*

### 2. Build Command
**Current:** `npm install && npm run build`
**Change to:**
```bash
cd shared && npm install && cd ../backend && npm install && npm run build
```

### 3. Start Command
**Current:** `npm start`
**Change to:**
```bash
cd backend && node dist/index.js
```

### 4. Save Changes
Click "Save Changes" at the bottom. Render will automatically redeploy with the new configuration.

---

## Why These Changes?

- The backend's TypeScript config imports types from `../shared/src/`
- With Root Directory set to `backend`, it can't access the shared folder
- By removing Root Directory, commands run from the project root
- We install shared dependencies first, then backend dependencies
- Then we cd into backend for the start command

---

## Alternative: Deploy Using render.yaml (Blueprint)

If you prefer Infrastructure as Code, you can:

1. Delete the current service in Render
2. Go to Render Dashboard → "New" → "Blueprint"
3. Connect your GitHub repo
4. Render will automatically detect and use `render.yaml`
5. All settings will be applied from the yaml file

The render.yaml is already configured correctly in your repo.
