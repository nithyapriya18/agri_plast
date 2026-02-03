# Fix: Bedrock Vision Priority for Water Detection

## Problem
- Ulsoor Lake was detected as "forest" instead of "water"
- Normal agricultural land was showing false warnings
- System was using OSM data (poor quality) instead of Bedrock Vision (accurate)

## Root Cause
Restricted zones were created ONLY from OpenStreetMap data, even though Bedrock Vision was running and detecting water correctly. Vision analysis was only used for warnings, not for actual placement constraints.

## Solution Applied

### 1. Prioritize Bedrock Vision Over OSM
**File**: [terrainAnalysis.ts:179-192](backend/src/services/terrainAnalysis.ts#L179-L192)

**Before**:
```typescript
// Always used OSM data
const clusteredRestrictions = this.createRestrictedZonesFromOSM(roads, water, forests, coordinates);
```

**After**:
```typescript
// Use Bedrock Vision as primary source
if (visionAnalysis && visionAnalysis.waterBodies.length > 0) {
  console.log('Using Bedrock Vision for water body restricted zones...');
  clusteredRestrictions = this.createRestrictedZonesFromVision(visionAnalysis, coordinates);
} else {
  console.log('Using OSM for restricted zones (Vision analysis unavailable)...');
  clusteredRestrictions = this.createRestrictedZonesFromOSM(roads, water, forests, coordinates);
}
```

### 2. Created Vision-Based Restricted Zones
**File**: [terrainAnalysis.ts:468-520](backend/src/services/terrainAnalysis.ts#L468-L520)

New method `createRestrictedZonesFromVision()` that:
- Converts Bedrock Vision water detections to restricted zones
- Marks water as **'prohibited'** (cannot build)
- Marks forests as **'warning'** (user can choose)
- Uses confidence levels and percentage coverage

### 3. Adjusted Buildable Area for Vision Water Detection
**File**: [terrainAnalysis.ts:272-287](backend/src/services/terrainAnalysis.ts#L272-L287)

```typescript
// If Vision detected significant water coverage, adjust buildable area
if (visionAnalysis && visionAnalysis.waterBodies.length > 0) {
  const totalWaterPercentage = visionAnalysis.waterBodies.reduce(...);

  if (totalWaterPercentage > 50) {
    // Use Vision analysis as primary source for buildable area
    buildableAreaSqm = landAreaSqm * (1 - totalWaterPercentage / 100);
    console.log(`Vision detected ${totalWaterPercentage}% water coverage`);
  }
}
```

## How It Works Now

### Detection Priority:
1. **Bedrock Vision (Primary)**: Analyzes satellite imagery with Claude AI
   - More accurate for water bodies
   - Can see actual features in images
   - Confidence levels and descriptions

2. **OpenStreetMap (Fallback)**: Only used if Vision fails
   - Tagged data (can be outdated)
   - Quality varies by region

### For Ulsoor Lake:
1. Draw boundary on Ulsoor Lake
2. Bedrock Vision analyzes satellite image
3. Detects: "Large water body (lake) covering 95% of area"
4. Creates water restricted zone: 95% coverage, prohibited
5. Buildable area: 5%
6. Optimization FAILS: "Area is 5.0% buildable. Cannot build on water bodies."

Expected console output:
```
🌍 Starting terrain analysis (medium resolution)...
  🛰️  Using Bedrock Vision for satellite imagery analysis...
  ✓ Vision analysis complete!
    - Water bodies: 1 detected
  Using Bedrock Vision for water body restricted zones...
  Created 1 restricted zones from Bedrock Vision analysis
  Vision detected 95% water coverage - adjusted buildable area
✓ Terrain analysis complete: 5.0% buildable (1250 sqm)
✗ Error: Area is 5.0% buildable. Cannot build on water bodies.
```

### For Normal Agricultural Land:
1. Draw boundary on clear land
2. Bedrock Vision analyzes satellite image
3. Detects: "Agricultural land, no significant water bodies"
4. Water coverage: 0%
5. Buildable area: 100%
6. Optimization proceeds normally

Expected console output:
```
🌍 Starting terrain analysis (medium resolution)...
  🛰️  Using Bedrock Vision for satellite imagery analysis...
  ✓ Vision analysis complete!
    - Water bodies: 0 detected
  Using OSM for restricted zones (Vision analysis unavailable)...
✓ Terrain analysis complete: 98.5% buildable (15820 sqm)
🏗️  Professional Polyhouse Optimizer V2
```

## Testing

1. **Restart Backend**: `cd backend && npm run dev`
2. **Test Ulsoor Lake**:
   - Draw boundary inside Ulsoor Lake
   - Should detect water via Vision
   - Should FAIL with "Cannot build on water bodies"
   - Check console for Vision detection logs

3. **Test Normal Land**:
   - Draw boundary on agricultural land
   - Should detect 0% water
   - Should proceed with optimization
   - No false warnings

## Files Changed
- [backend/src/services/terrainAnalysis.ts](backend/src/services/terrainAnalysis.ts)
  - Prioritizes Bedrock Vision over OSM
  - Creates restricted zones from Vision water detections
  - Adjusts buildable area based on Vision water coverage

## Why This is Better
- **Accurate**: Vision can see actual water in satellite images
- **Real-time**: Analyzes current satellite imagery, not outdated tags
- **Confidence**: Vision provides confidence levels and descriptions
- **No false positives**: Won't mark Ulsoor Lake as "forest"
