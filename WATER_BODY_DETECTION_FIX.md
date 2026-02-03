# Critical Fix: Water Body Detection

## Problem
System was placing polyhouses on water bodies (e.g., Ulsoor Lake) because terrain analysis was running AFTER optimization was complete.

## Root Cause
1. Terrain analysis happened AFTER polyhouse placement (line 132 in planningController.ts)
2. Optimizer had no knowledge of water bodies during placement
3. Terrain data was only used for display, not for actual constraints

## Fixes Applied

### 1. Moved Terrain Analysis Before Optimization
**File**: [planningController.ts:121-158](backend/src/controllers/planningController.ts#L121-L158)

- Terrain analysis now runs FIRST (before line 122)
- Passes terrain data to optimizer constructor
- Makes terrain analysis BLOCKING - won't build on unknown terrain
- Checks if less than 10% buildable - throws error instead of building

### 2. Updated Optimizer to Respect Water Bodies
**File**: [optimizerV2.ts:49-56](backend/src/services/optimizerV2.ts#L49-L56)

- Added `terrainData` parameter to constructor
- Logs number of restricted zones on initialization

**File**: [optimizerV2.ts:533-577](backend/src/services/optimizerV2.ts#L533-L577)

- Updated `isValidPlacement()` method
- Checks for overlap with water-restricted zones
- Only blocks placement for water bodies marked as 'prohibited'
- Uses turf.js intersection checks to detect any overlap

### 3. Fixed Buildable Area Calculation
**File**: [terrainAnalysis.ts:260-277](backend/src/services/terrainAnalysis.ts#L260-L277)

**Before**:
```typescript
buildableArea: buildableCount / samplingPoints.length  // Wrong! Returns 0-1 percentage
```

**After**:
```typescript
// Calculate actual land area
const landAreaSqm = turf.area(landPolygon);
// Calculate buildable area in square meters
const buildableAreaSqm = (buildableCount / samplingPoints.length) * landAreaSqm;
return { buildableArea: buildableAreaSqm }  // Correct! Returns sqm
```

## How It Works Now

### New Flow:
1. **Analyze Terrain** → Detect water, forests, roads with Bedrock Vision + OSM
2. **Check Buildability** → If <10% buildable, throw error
3. **Pass Terrain to Optimizer** → Optimizer knows about restricted zones
4. **Validate Each Placement** → Check for water overlap before placing
5. **Place Polyhouses** → Only in buildable areas

### Water Detection:
- **Bedrock Vision** (primary): Analyzes satellite imagery with Claude AI
- **OpenStreetMap** (fallback): Detects tagged water bodies
- **Severity**: Water marked as 'prohibited' (absolutely unbuildable)
- **Buffer**: 5m buffer around water bodies for safety

## Testing

### Test with Ulsoor Lake:
1. Draw boundary inside or overlapping Ulsoor Lake
2. System should detect water body via Bedrock Vision
3. If >90% water, optimization should FAIL with error
4. If partial water, polyhouses placed only on land portions

Expected console output:
```
🌍 Starting terrain analysis (medium resolution)...
  🛰️  Using Bedrock Vision for satellite imagery analysis...
  ✓ Vision analysis complete!
    - Water bodies: 1 detected
  Buildable area: 5.0% (250 sqm)
✗ Error: Area is 5.0% buildable. Cannot build on water bodies.
```

### Test with Normal Land:
1. Draw boundary on agricultural land
2. System detects no water (100% buildable)
3. Optimization proceeds normally

Expected console output:
```
🌍 Starting terrain analysis (medium resolution)...
  ✓ Terrain analysis complete: 1 restricted zones found
  Buildable area: 98.5% (15820 sqm)
🏗️  Professional Polyhouse Optimizer V2
🌍 Terrain data loaded: 1 restricted zones
```

## Next Steps

1. Test with Ulsoor Lake to verify water detection
2. Check backend console logs for Vision analysis results
3. If still placing on water, check:
   - Is Google Maps API key valid?
   - Are there errors in Vision analysis?
   - Is OSM detecting the water body?

## Files Changed
- [backend/src/controllers/planningController.ts](backend/src/controllers/planningController.ts)
- [backend/src/services/optimizerV2.ts](backend/src/services/optimizerV2.ts)
- [backend/src/services/terrainAnalysis.ts](backend/src/services/terrainAnalysis.ts)
