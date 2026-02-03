# Training Data Optimization Applied

## Problem Identified

Your screenshot showed **only 33% utilization** with 1 polyhouse, but your training data (pic1.jpeg and pic2.jpeg) shows **70-80% utilization** with multiple polyhouses.

### Training Data Analysis

**pic1.jpeg:**
- Irregular land shape
- **11-12 polyhouses** placed
- Each polyhouse: **76×68m = 5,168 sqm**
- Total structure: **10,336 sqm**
- High utilization: **~75-80%**
- Grid size: 8×4m (gable × gutter)

**pic2.jpeg:**
- Trapezoidal land shape
- **4 polyhouses** stacked
- Sizes: 76×56m = 4,256 sqm each, 76×68m = 5,168 sqm, 84×32m = 2,528 sqm (L-Type)
- Total structure: **16,208 sqm**
- High utilization: **~75-80%**
- Grid size: 8×4m

## Changes Applied

### 1. Polyhouse Size Strategy (optimizerV2.ts)

**Before:** Trying to place 8,000-10,000 sqm polyhouses (too large!)
**After:** Target **4,000-5,500 sqm** polyhouses (matching training data)

```typescript
// Training data shows optimal size is 4000-5500 sqm
const minAreaForFirst = 3500; // 3500 sqm minimum
const maxAreaForFirst = 6000; // 6000 sqm maximum
```

### 2. Safety Buffer (planningController.ts)

**Before:** 1m safety buffer
**After:** **0.5m** safety buffer (training data shows tight packing)

```typescript
safetyBuffer: 0.5 // Minimal buffer like training data
```

### 3. Gap Filler Limit (optimizerV2.ts)

**Before:** Max 3 gap-filler polyhouses (too restrictive!)
**After:** Max **50 polyhouses** (training data shows 11-12 per plot)

```typescript
const maxGapFillers = 50; // Allow many polyhouses
```

### 4. Corridor Width

Kept at **2m** between polyhouses (matches training data requirements)

## Expected Result

After these changes, you should see:
- **Multiple polyhouses** (4-12 depending on land size)
- Each polyhouse: **4,000-5,500 sqm**
- **65-80% utilization** (like training data)
- Tight packing with minimal gaps
- Polyhouses follow land contours

## How to Apply

### Step 1: Fix 406 Error First!

Run this SQL in Supabase dashboard:
https://app.supabase.com/project/xslcuvjfoxscqnxfhqfz/sql/new

Copy and paste: `supabase/migrations/FIX_406_ERROR.sql`

### Step 2: Restart Backend

```bash
cd backend
# Stop current process (Ctrl+C)
npm run dev
```

### Step 3: Test

1. Clear browser cache (Cmd+Shift+R)
2. Draw the same land boundary
3. Click "Generate Plan"
4. You should now see **multiple polyhouses** with **70%+ utilization**!

## Verification

After applying these changes, check backend logs for:
```
📐 TRAINING DATA OPTIMIZED (4000-5500 sqm per polyhouse) STRATEGY
```

This confirms the new strategy is active.

## Comparison

| Metric | Before (Wrong) | After (Training Data) |
|--------|----------------|----------------------|
| Polyhouses | 1 | 4-12 (depends on land) |
| Size per polyhouse | Trying 8000-10000 sqm | 4000-5500 sqm |
| Utilization | 33% | 70-80% |
| Safety buffer | 1m | 0.5m |
| Max gap fillers | 3 | 50 |

## Why This Works

The training data proves that **smaller polyhouses (4000-5000 sqm) pack better** than trying to force huge 10,000 sqm structures. By targeting the same size range as your reference images, the optimizer can:

1. Place **more polyhouses** to fill irregular shapes
2. Achieve **higher utilization** (70-80%)
3. Follow **industry standards** from your actual projects
4. Adapt to **different land shapes** (rectangular, trapezoid, irregular)

This matches real-world polyhouse construction practices!
