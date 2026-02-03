# Google Maps API Setup - 5 Minutes ⏱️

## Quick Setup Steps

### 1. Go to Google Cloud Console
👉 [https://console.cloud.google.com/](https://console.cloud.google.com/)

### 2. Create/Select Project
- Click the project dropdown at the top
- Click "New Project" or select existing one
- Name it: "Agriplast" or whatever you prefer

### 3. Enable Maps Static API
1. Go to **"APIs & Services"** → **"Library"**
2. Search for **"Maps Static API"**
3. Click on it
4. Click **"Enable"**

### 4. Create API Key
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"**
3. Select **"API key"**
4. **Copy the API key** that appears

### 5. (Recommended) Restrict the API Key
1. Click "Edit API key" on the key you just created
2. Under "API restrictions":
   - Select "Restrict key"
   - Check **only** "Maps Static API"
3. Under "Application restrictions":
   - Select "IP addresses"
   - Add your server IP (or leave unrestricted for testing)
4. Click **"Save"**

### 6. Add to Your .env File

Open `backend/.env` and add:

```bash
GOOGLE_MAPS_API_KEY=AIza...your_actual_key_here
```

### 7. Restart Backend

```bash
cd backend
npm run dev
```

Look for this message in the console:
```
✓ Bedrock Vision terrain analysis ENABLED (accurate detection)
```

## ✅ You're Done!

Now create a new project and watch the magic happen:
```
🛰️  Starting Bedrock-powered satellite imagery analysis...
  📷 Fetching satellite imagery from Google Maps...
  ✓ Satellite image fetched successfully
  🤖 Analyzing image with Claude Vision...
  ✓ Analysis complete!
```

## 🎯 Troubleshooting

### "Bedrock Vision disabled" warning
- Make sure API key is in `backend/.env` (not `frontend/.env`)
- Check there are no typos
- Restart the backend server

### "Failed to fetch satellite imagery"
- Verify Maps Static API is enabled in Google Cloud Console
- Check API key restrictions aren't too strict
- Try temporarily with no restrictions for testing

### "Request had insufficient authentication scopes"
- Make sure Maps Static API is enabled (not just "Maps JavaScript API")
- Wait 1-2 minutes after enabling the API
- Try regenerating the API key

## 💰 Billing Setup (Required by Google)

Even though it's FREE for your usage, Google requires a billing account:

1. Go to **"Billing"** in Google Cloud Console
2. Click **"Link a billing account"**
3. Add credit card (you won't be charged with $200/month free credit)
4. Google gives you $300 free credit for new accounts!

**Don't worry**: With $200/month Maps credit + $300 new account credit, you're covered for a long time.

## 📊 Monitor Usage

To see your API usage:
1. Go to Google Cloud Console → **APIs & Services** → **Dashboard**
2. Click on **Maps Static API**
3. View usage graphs

Set a daily quota if you want to be extra safe:
1. Go to **APIs & Services** → **Credentials**
2. Click on your API key
3. Under "API restrictions" → "Requests per day": Set to 1000 (or whatever you want)

## 🎉 Ready to Test!

Try these locations:
- **Ulsoor Lake, Bangalore**: Draw boundary at 12.97°N, 77.61°E
- **Agricultural land**: Draw boundary at 13.3°N, 77.5°E
- **Your actual site**: Use the coordinates

You should see accurate water body, forest, and road detection! 🛰️
