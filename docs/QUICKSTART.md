# Agriplast - Quick Start Guide

Get up and running in 5 minutes.

## Prerequisites
- Node.js 18+
- Mapbox account (free): https://account.mapbox.com/
- AWS credentials from tagfact .env

## Setup

### 1. Install Dependencies (2 minutes)

```bash
# From the Agriplast root directory

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# Shared types
cd shared && npm install && npm run build && cd ..
```

### 2. Configure Environment (1 minute)

**Good news!** The `.env` file is already created with your AWS Bedrock settings from tagfact.

You only need to add your **Mapbox token**:

1. Go to https://account.mapbox.com/access-tokens/ (sign up if needed - it's free)
2. Copy your default public token (starts with `pk.`)
3. Open `.env` file in the root directory
4. Replace `YOUR_MAPBOX_TOKEN_HERE` with your actual token

```bash
# Your .env should look like this:
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsZjM...
```

That's it! The AWS Bedrock configuration is already set up using your default AWS profile.

### 3. Start the Application (1 minute)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Use the Application

1. Open http://localhost:3000
2. Draw a polygon on the map to mark land boundaries
3. View automatic polyhouse optimization
4. Click "Quotation" to see cost breakdown
5. Click "Chat" to interact with AI assistant

## Quick Tips

### Drawing Land Boundaries
- Click to add points
- Double-click to finish
- Use satellite view for accuracy
- Minimum 3 points required

### Chatting with AI
Try these questions:
- "Why did you place polyhouses this way?"
- "Use cheaper materials"
- "What if I make polyhouses bigger?"
- "Explain the quotation"

### Common Issues

**Map not loading?**
- Check your Mapbox token in `.env`
- Verify it starts with `NEXT_PUBLIC_MAPBOX_TOKEN=pk.`

**Backend not connecting?**
- Verify AWS credentials from tagfact
- Check backend is running on port 3001
- Look for errors in backend terminal

**No polyhouses generated?**
- Land area might be too small (try >100 sqm)
- Try a more regular shape

## What's Next?

- Read full [README.md](./README.md) for detailed documentation
- Explore the DSL configuration options
- Customize materials catalog in `backend/src/data/materials.ts`
- Adjust optimization parameters

## Architecture Overview

```
┌─────────────┐
│   Next.js   │  Frontend: Map, Chat, Quotation
│  Frontend   │  http://localhost:3000
└──────┬──────┘
       │ API calls
       ↓
┌─────────────┐
│  Express    │  Backend: Optimization, AI
│   Backend   │  http://localhost:3001
└──────┬──────┘
       │
       ├──→ AWS Bedrock (Claude AI)
       └──→ Turf.js (Geospatial calculations)
```

## Support

For questions or issues:
1. Check the [README.md](./README.md) troubleshooting section
2. Review console logs in browser and terminal
3. Contact Agriplast development team
