# Agriplast Polyhouse Optimizer - Expert Design Recommendations

## Executive Summary
Current system works but needs refinements for production use with Karthik's feedback cycle.

---

## 1. DSL Structure Improvements

### Current DSL Issues:
- Mix of user requirements and internal optimization parameters
- No clear validation rules
- Missing important agricultural constraints

### Recommended DSL Structure:

```typescript
interface PolyhouseConfiguration {
  // === BLOCK SPECIFICATIONS (Fixed by Agriplast) ===
  blockDimensions: {
    width: 8;      // meters - FIXED standard
    height: 4;     // meters - FIXED standard
  };

  // === DRAINAGE & SPACING (Agricultural Requirements) ===
  gutterWidth: 2;          // meters - for water drainage
  polyhouseGap: 2;         // meters - minimum gap between polyhouses
  accessRoadWidth?: 4;     // meters - optional access roads

  // === SIZE CONSTRAINTS (Structural Limits) ===
  polyhouse: {
    maxSideLength: 100;    // meters - structural limit
    minSideLength: 16;     // meters - minimum viable (2 blocks)
    maxArea: 10000;        // sqm - single polyhouse limit
    minWidth: 8;           // meters - minimum width (1 block minimum)
    maxAspectRatio: 4;     // length/width ratio limit
  };

  // === SOLAR ORIENTATION (Latitude-based) ===
  solarOrientation: {
    enabled: true;
    latitudeDegrees: number;      // auto-calculated from land center
    allowedDeviationDegrees: number; // auto-calculated
    preferredOrientations?: number[]; // optional user override
  };

  // === TERRAIN CONSTRAINTS (Copernicus Data) ===
  terrain: {
    considerSlope: boolean;
    maxSlope: 15;                  // degrees
    avoidWater: boolean;
    landLevelingOverride: boolean; // user commits to leveling
  };

  // === OPTIMIZATION GOALS (User Priorities) ===
  optimization: {
    goal: 'maximize_coverage' | 'maximize_polyhouses' | 'uniform_sizes';
    preferLargerPolyhouses: boolean;
    allowPartialFill: boolean;     // allow smaller polyhouses at edges
    minUtilization: 40;            // minimum % of land to use
  };

  // === QUALITY CONSTRAINTS (Shape Quality) ===
  quality: {
    preventJaggedShapes: boolean;
    minCompactness: 0.08;          // area/perimeter² ratio
    preferSquarish: boolean;       // prefer aspect ratio close to 1
  };
}
```

---

## 2. Optimization Algorithm Improvements

### Current Algorithm Issues:
1. **Greedy spiral approach** - may miss globally optimal solutions
2. **No backtracking** - once placed, polyhouses are fixed
3. **Shape quality not considered** - allows very thin rectangles
4. **Limited orientation exploration** - only 5 discrete angles

### Recommended Multi-Stage Approach:

#### **Stage 1: Coarse Grid Placement**
```
- Divide land into coarse grid (~50m spacing)
- Try to place largest possible rectangles at each point
- Filter by:
  * Solar orientation validity
  * Terrain suitability
  * Size constraints
```

#### **Stage 2: Shape Refinement**
```
- For each placed polyhouse:
  * Try to grow in valid directions
  * Optimize aspect ratio
  * Ensure minimum width maintained
  * Check for "jaggedness" metrics
```

#### **Stage 3: Gap Filling**
```
- Identify unfilled regions
- Try smaller polyhouses in gaps
- Respect minimum gap requirements
- Stop when utilization goal reached or no valid placements remain
```

#### **Stage 4: Validation & Adjustment**
```
- Verify all constraints met
- Check total utilization
- Validate solar orientations
- Verify terrain compliance
```

---

## 3. Shape Quality Metrics

### Prevent "Jagged" Polyhouses

```typescript
function evaluateShapeQuality(polyhouse: Polyhouse): ShapeQuality {
  const { length, width } = polyhouse.dimensions;

  // 1. Aspect Ratio (1.0 is perfect square)
  const aspectRatio = Math.max(length, width) / Math.min(length, width);
  const aspectScore = 1 / (1 + Math.abs(aspectRatio - 1.5)); // Prefer 3:2 ratio

  // 2. Compactness (circle = 1, complex shapes → 0)
  const area = polyhouse.innerArea;
  const perimeter = calculatePerimeter(polyhouse.bounds);
  const compactness = (4 * Math.PI * area) / (perimeter * perimeter);

  // 3. Minimum Width Check
  const minWidth = Math.min(...calculateAllWidths(polyhouse));
  const widthScore = minWidth >= 8 ? 1.0 : 0; // Must be at least 1 block

  // 4. Edge Straightness
  const edges = calculateEdges(polyhouse.bounds);
  const straightEdgeRatio = edges.filter(e => e.isStraight).length / edges.length;

  return {
    aspectRatio,
    compactness,
    minimumWidth: minWidth,
    overallScore: aspectScore * 0.3 +
                  compactness * 0.3 +
                  widthScore * 0.2 +
                  straightEdgeRatio * 0.2
  };
}
```

### Reject Poor Quality Shapes

```typescript
function isShapeAcceptable(polyhouse: Polyhouse, config: Configuration): boolean {
  const quality = evaluateShapeQuality(polyhouse);

  // Hard constraints
  if (quality.minimumWidth < config.polyhouse.minWidth) return false;
  if (quality.aspectRatio > config.polyhouse.maxAspectRatio) return false;

  // Soft constraints (for quality preference)
  if (config.quality.preventJaggedShapes) {
    if (quality.compactness < config.quality.minCompactness) return false;
  }

  return true;
}
```

---

## 4. Solar Orientation Implementation

### Issue: Current Discrete Angle Sampling
The optimizer tries only 5 orientations, which may miss optimal angles.

### Recommended Approach:

```typescript
function generateOrientationCandidates(latitudeDegrees: number): number[] {
  const { baseOrientation, allowedDeviation } = calculateSolarOrientation(latitudeDegrees);

  if (allowedDeviation >= 180) {
    // Any orientation works - try 8 cardinal/ordinal directions
    return [0, 45, 90, 135, 180, 225, 270, 315];
  }

  if (allowedDeviation === 0) {
    // Strict N-S only
    return [0, 180]; // Try both directions
  }

  // Generate evenly spaced angles within allowed range
  const numAngles = Math.ceil(allowedDeviation / 10); // Every ~10 degrees
  const angles: number[] = [baseOrientation];

  for (let i = 1; i <= numAngles; i++) {
    const offset = (i * allowedDeviation) / numAngles;
    angles.push((baseOrientation + offset) % 360);
    angles.push((baseOrientation - offset + 360) % 360);
  }

  // Also try perpendicular if allowed
  if (allowedDeviation >= 90) {
    angles.push((baseOrientation + 90) % 360);
    angles.push((baseOrientation + 270) % 360);
  }

  return [...new Set(angles)].sort((a, b) => a - b);
}
```

---

## 5. Performance vs. Quality Trade-offs

### Current Issue:
- Too many candidates = slow (your 800 candidates took 2 minutes)
- Too few candidates = poor coverage

### Recommended Adaptive Strategy:

```typescript
function calculateOptimalCandidates(landArea: number): number {
  // Use logarithmic scaling for better performance
  const baseComplexity = 50;
  const areaFactor = Math.log10(landArea / 10000); // Normalized to 10k sqm

  return Math.min(
    400,  // Maximum for reasonable time
    Math.max(
      50,   // Minimum for quality
      baseComplexity * (1 + areaFactor)
    )
  );
}

// For 12,000 sqm:  ~58 candidates  (current: 57) ✓
// For 100,000 sqm: ~100 candidates (current: 200) - FASTER
// For 220,000 sqm: ~150 candidates (current: 800) - MUCH FASTER
```

---

## 6. Terrain Integration (Copernicus Data)

### Current Status:
- Code references terrain but doesn't actually use it yet
- S3 bucket setup mentioned but not implemented

### Recommended Implementation:

```typescript
interface TerrainData {
  slope: number;        // degrees
  elevation: number;    // meters
  waterPresence: boolean;
  soilType?: string;    // future
}

class TerrainService {
  private cache: Map<string, TerrainData> = new Map();

  async getTerrainAt(coordinate: Coordinate): Promise<TerrainData> {
    const key = `${coordinate.lat.toFixed(6)},${coordinate.lng.toFixed(6)}`;

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Fetch from S3/Copernicus data
    const data = await this.fetchFromCopernicus(coordinate);
    this.cache.set(key, data);
    return data;
  }

  async isLocationSuitable(
    coordinate: Coordinate,
    config: PolyhouseConfiguration
  ): Promise<boolean> {
    if (config.terrain.landLevelingOverride) {
      // User will level - only check water
      const terrain = await this.getTerrainAt(coordinate);
      return !terrain.waterPresence || !config.terrain.avoidWater;
    }

    const terrain = await this.getTerrainAt(coordinate);

    if (config.terrain.considerSlope && terrain.slope > config.terrain.maxSlope) {
      return false;
    }

    if (config.terrain.avoidWater && terrain.waterPresence) {
      return false;
    }

    return true;
  }
}
```

---

## 7. Corner Types & Block Connectivity

### Understanding Corner Types:
- **90° (Inward)**: Interior corner, L-shape inward bend
- **180° (Straight)**: Straight edge, no corner
- **270° (Outward)**: Exterior corner, L-shape outward bend

### Current Issue:
Polyhouses are simple rectangles (all 90° corners), so corner type tracking isn't fully utilized.

### Recommendation:
For rectangular polyhouses (current approach), you only have 90° corners. More complex shapes would need this logic, but those should be avoided for quality reasons!

---

## 8. Key Metrics to Track

```typescript
interface OptimizationMetrics {
  // Coverage
  totalLandArea: number;
  totalPolyhouseArea: number;
  utilizationPercentage: number;

  // Quality
  numberOfPolyhouses: number;
  averagePolyhouseSize: number;
  averageAspectRatio: number;
  averageCompactness: number;

  // Compliance
  solarOrientationCompliance: number;  // % of polyhouses correctly oriented
  terrainCompliance: number;           // % avoiding slopes/water

  // Performance
  computationTimeMs: number;
  candidatesEvaluated: number;
  polyhousesRejected: number;
}
```

---

## 9. Validation Checklist

Before returning results to frontend:

```typescript
function validatePlan(result: PlanningResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check all polyhouses have proper gutters
  for (const ph of result.polyhouses) {
    if (!hasProperGutters(ph, result.configuration.gutterWidth)) {
      errors.push(`Polyhouse ${ph.id} missing proper gutters`);
    }
  }

  // 2. Check spacing between polyhouses
  for (let i = 0; i < result.polyhouses.length; i++) {
    for (let j = i + 1; j < result.polyhouses.length; j++) {
      const gap = calculateMinimumGap(result.polyhouses[i], result.polyhouses[j]);
      if (gap < result.configuration.polyhouseGap) {
        errors.push(`Insufficient gap between polyhouses ${i} and ${j}`);
      }
    }
  }

  // 3. Check solar orientations
  for (const ph of result.polyhouses) {
    if (!isOrientationValid(ph.orientation, result.landArea.centroid.lat)) {
      errors.push(`Polyhouse ${ph.id} has invalid solar orientation`);
    }
  }

  // 4. Check size constraints
  for (const ph of result.polyhouses) {
    const { length, width } = ph.dimensions;
    if (length > result.configuration.polyhouse.maxSideLength ||
        width > result.configuration.polyhouse.maxSideLength) {
      errors.push(`Polyhouse ${ph.id} exceeds maximum side length`);
    }
  }

  // 5. Utilization warnings
  if (result.metadata.utilizationPercentage < 40) {
    warnings.push('Low land utilization - consider adjusting constraints');
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

---

## 10. Roadmap for Karthik's Feedback

### Phase 1: Core Fixes (Immediate)
- [x] Fix coordinate conversion bug
- [x] Improve performance
- [ ] Add shape quality metrics
- [ ] Implement proper aspect ratio constraints

### Phase 2: Quality Improvements (Week 2)
- [ ] Add compactness scoring
- [ ] Improve orientation sampling
- [ ] Add validation checklist
- [ ] Terrain integration (Copernicus data)

### Phase 3: Advanced Features (Month 2)
- [ ] Multi-objective optimization (cost vs coverage)
- [ ] Shading analysis between polyhouses
- [ ] Irrigation planning
- [ ] Access road planning
- [ ] Wind direction considerations

---

## Conclusion

**What's Working:**
✅ Solar orientation math is correct
✅ Basic rectangular placement works
✅ Performance is reasonable after fixes

**What Needs Improvement:**
⚠️ Shape quality not enforced (aspect ratio, compactness)
⚠️ Limited orientation sampling
⚠️ No terrain data integration yet
⚠️ Validation is minimal

**Priority Actions:**
1. Add shape quality constraints (prevent thin/jagged polyhouses)
2. Improve orientation sampling (more angles tested)
3. Implement proper validation before returning results
4. Connect Copernicus terrain data

This design follows agricultural best practices while maintaining computational efficiency. Each polyhouse is treated independently (as required), and the DSL is clean and extensible for Karthik's feedback cycle.
