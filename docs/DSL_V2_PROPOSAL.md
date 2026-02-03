# Agriplast DSL V2 - Improved Configuration System

## Philosophy Change

**Current Problem**: We're treating polyhouses as independent rectangles that must fit perfectly.
**Better Approach**: Think like a construction company - prioritize BUILDABILITY and PRACTICAL LAYOUTS.

---

## Key Improvements

### 1. **Solar Orientation - Simplified**

**Current (WRONG)**:
- Each polyhouse can be independently oriented within ±23.44° based on latitude
- This creates gaps and irregular spacing between polyhouses

**Proposed (BETTER)**:
```typescript
solarOrientation: {
  strategy: 'unified' | 'zoned' | 'independent',
  primaryAngle: number,  // Calculated from latitude
  tolerance: number,     // ±degrees allowed
}
```

**Why better**:
- **Unified**: ALL polyhouses aligned to same optimal angle (easiest to build, max fill)
- **Zoned**: Group polyhouses by region, each zone has one orientation
- **Independent**: Current approach (rarely needed, only for complex terrain)

**For most customers**: Use "unified" strategy - all polyhouses parallel = easier construction, better space utilization.

---

### 2. **Corner Quality - Smarter Rules**

**Current (TOO RIGID)**:
- Minimum 20m between corners = creates jagged, unusable polyhouses
- Prevents filling small irregular spaces

**Proposed (ADAPTIVE)**:
```typescript
shapeQuality: {
  minCornerDistance: {
    large: 20m,   // For polyhouses > 500 sqm
    medium: 10m,  // For polyhouses 200-500 sqm
    small: 5m,    // For polyhouses < 200 sqm
  },
  maxAspectRatio: 4.0,  // Length:Width ratio (prevent thin strips)
  minConvexity: 0.7,    // How "rectangular" the shape is (1.0 = perfect rectangle)
  preferRectangular: true, // Bias toward simple rectangles
}
```

**Why better**:
- Small polyhouses can be more irregular (easier to fill gaps)
- Large polyhouses remain clean and buildable
- Convexity check ensures no weird concave shapes

---

### 3. **Gap Strategy - Construction-Aware**

**Current (ARBITRARY)**:
- Fixed 2m gap between all polyhouses
- Doesn't consider access needs or grouping

**Proposed (PRACTICAL)**:
```typescript
spacing: {
  minGap: 1.0m,           // Absolute minimum (maintenance access)
  preferredGap: 2.0m,     // Standard spacing
  vehicleAccessGap: 4.0m, // For truck/tractor access

  grouping: {
    enabled: true,
    maxPolyhousesPerGroup: 5,
    groupGap: 1.0m,        // Within group (tight)
    betweenGroupsGap: 4.0m, // Between groups (vehicle access)
  }
}
```

**Why better**:
- Groups of 3-5 polyhouses placed close together (1m gap)
- Wide access lanes (4m) between groups for vehicles
- Results in 15-20% better utilization + practical access

---

### 4. **Block Arrangement - Flexibility**

**Current (RIGID)**:
- 8m × 4m blocks arranged in perfect grid
- Gutter always 2m

**Proposed (CONFIGURABLE)**:
```typescript
blockSystem: {
  standard: {
    width: 8m,
    height: 4m,
  },

  allowHalfBlocks: true,  // Use 4m × 4m for edges (8m would overhang)
  allowRotation: true,    // Can rotate block 90° if it fits better

  gutter: {
    width: 2m,
    optional: false,  // Always required for now
    canShareBetweenPolyhouses: false,  // Future: adjacent polyhouses share gutter
  }
}
```

**Why better**:
- Half-blocks (4m × 4m) fill edge spaces without overhanging land
- Block rotation gives more flexibility for irregular shapes
- Shared gutters between adjacent polyhouses = more block area

---

### 5. **Optimization Strategy - Multi-Objective**

**Current (SINGLE GOAL)**:
- Maximize number of blocks
- Ignores construction cost, complexity

**Proposed (BALANCED SCORING)**:
```typescript
optimization: {
  objectives: {
    coverage: {
      weight: 0.40,  // 40% - Fill as much land as possible
      target: 'maximize',
    },
    simplicity: {
      weight: 0.25,  // 25% - Prefer rectangular, simple shapes
      target: 'maximize',
      metrics: ['convexity', 'cornerCount', 'straightEdges']
    },
    constructionCost: {
      weight: 0.20,  // 20% - Minimize material waste
      target: 'minimize',
      factors: ['cornerConnectors', 'customCuts', 'totalEdgeLength']
    },
    accessibility: {
      weight: 0.15,  // 15% - Ensure good access
      target: 'maximize',
      requirements: ['vehicleAccess', 'maintenanceSpace']
    }
  },

  mode: 'balanced' | 'maximize_coverage' | 'minimize_cost',
}
```

**Scoring Example**:
```
Polyhouse A:
- Coverage: 85% of possible area → Score: 85 × 0.40 = 34.0
- Simplicity: Perfect rectangle → Score: 100 × 0.25 = 25.0
- Cost: 8 corners, standard connectors → Score: 90 × 0.20 = 18.0
- Access: 4m gaps on 2 sides → Score: 100 × 0.15 = 15.0
TOTAL: 92.0

Polyhouse B:
- Coverage: 92% of possible area → Score: 92 × 0.40 = 36.8
- Simplicity: Jagged L-shape → Score: 40 × 0.25 = 10.0
- Cost: 14 corners, custom cuts → Score: 50 × 0.20 = 10.0
- Access: Tight gaps → Score: 60 × 0.15 = 9.0
TOTAL: 65.8

Winner: Polyhouse A (simpler, more buildable, even with less coverage)
```

---

### 6. **Terrain Handling - Intelligent Zoning**

**Current (BINARY)**:
- Can build / Cannot build (based on slope threshold)
- Downloads all Copernicus data (slow)

**Proposed (ZONED)**:
```typescript
terrain: {
  analysis: 'quick' | 'detailed',

  zones: {
    buildable: {
      maxSlope: 5°,
      waterBody: false,
    },
    challenging: {
      maxSlope: 10°,
      requiresLeveling: true,
      costMultiplier: 1.3,  // 30% more expensive
    },
    prohibited: {
      slope: > 10°,
      waterBody: true,
    }
  },

  overrides: {
    userUndertakesLeveling: boolean,  // Ignore slope if user will level
    acceptChallengingTerrain: boolean, // Build on 5-10° slopes
  }
}
```

**Why better**:
- Quick analysis using sampled points (not full Copernicus download)
- Shows user WHERE they can build and WHY
- Gives option to build on challenging terrain at higher cost

---

### 7. **Size Constraints - Practical Limits**

**Current (ARBITRARY)**:
- Max side: 100m
- Min side: 16m (changed to 8m for max mode)

**Proposed (JUSTIFIED)**:
```typescript
constraints: {
  polyhouse: {
    maxSideLength: {
      value: 100m,
      reason: 'Structural integrity - longer requires extra support',
    },
    minSideLength: {
      value: 16m,  // 2 blocks × 8m
      reason: 'Minimum practical size for equipment access',
      canReduce: {
        to: 8m,  // 1 block × 8m
        condition: 'filling small gaps',
        warning: 'Very small polyhouses have higher per-sqm cost',
      }
    },

    minArea: 32 sqm,  // One 8m × 4m block minimum
    maxArea: 5000 sqm, // Practical upper limit per structure
  },

  landArea: {
    minArea: 100 sqm,   // Below this, not worth optimizing
    maxArea: 100000 sqm, // Above this, break into sub-regions
    warnArea: 50000 sqm, // Warn: optimization will take 2-3 minutes
  }
}
```

---

## Complete DSL V2 Structure

```typescript
interface PolyhouseConfigurationV2 {
  // Block system (foundation)
  blockSystem: {
    standard: { width: 8, height: 4 },
    allowHalfBlocks: boolean,
    allowRotation: boolean,
    gutter: { width: 2, optional: false }
  },

  // Solar optimization
  solarOrientation: {
    strategy: 'unified' | 'zoned' | 'independent',
    primaryAngle: number,
    tolerance: number,
    latitude: number,
  },

  // Shape quality
  shapeQuality: {
    minCornerDistance: { large: 20, medium: 10, small: 5 },
    maxAspectRatio: 4.0,
    minConvexity: 0.7,
    preferRectangular: true,
  },

  // Spacing strategy
  spacing: {
    minGap: 1.0,
    preferredGap: 2.0,
    vehicleAccessGap: 4.0,
    grouping: {
      enabled: boolean,
      maxPolyhousesPerGroup: number,
      groupGap: number,
      betweenGroupsGap: number,
    }
  },

  // Size limits
  constraints: {
    polyhouse: {
      maxSideLength: number,
      minSideLength: number,
      minArea: number,
      maxArea: number,
    },
    landArea: {
      minArea: number,
      maxArea: number,
    }
  },

  // Terrain handling
  terrain: {
    analysis: 'quick' | 'detailed',
    zones: {...},
    overrides: {...}
  },

  // Multi-objective optimization
  optimization: {
    objectives: {
      coverage: { weight: 0.40 },
      simplicity: { weight: 0.25 },
      constructionCost: { weight: 0.20 },
      accessibility: { weight: 0.15 },
    },
    mode: 'balanced' | 'maximize_coverage' | 'minimize_cost',
  }
}
```

---

## Expected Results with DSL V2

### Current (DSL V1):
- Balanced mode: 50-60% utilization
- Maximum mode: 70-85% utilization
- Many small, irregular polyhouses
- Long calculation times (30-60s)
- Difficult to build layouts

### Proposed (DSL V2):
- Balanced mode: **65-75% utilization** (grouping + unified orientation)
- Maximum mode: **80-90% utilization** (half-blocks + tighter groups)
- Fewer, cleaner polyhouses (easier to build)
- Faster calculation: 10-20s (smart zoning + sampling)
- **Lower construction cost** (simpler shapes, fewer corners)

---

## Implementation Priority

**Phase 1 (Quick Wins)**:
1. Unified solar orientation (all polyhouses parallel)
2. Adaptive corner distance (large/medium/small rules)
3. Polyhouse grouping (tight within groups, wide between groups)

**Phase 2 (Better Optimization)**:
4. Multi-objective scoring system
5. Half-block support for edges
6. Quick terrain analysis (sampling instead of full download)

**Phase 3 (Advanced)**:
7. Zoned orientation (for very complex land)
8. Shared gutters between adjacent polyhouses
9. Cost estimation based on shape complexity

---

## Questions for Karthik

1. **Grouping**: Would you prefer 3-5 polyhouses grouped together with 1m gaps, then 4m between groups for vehicle access?
2. **Orientation**: For most customers, should ALL polyhouses be parallel (easier construction) or allow independent angles?
3. **Small polyhouses**: Allow 8m × 4m (32 sqm) polyhouses to fill gaps, even though they're more expensive per sqm?
4. **Half blocks**: Can you build 4m × 4m "half blocks" at edges where full 8m × 4m doesn't fit?
5. **Shared gutters**: If two polyhouses are adjacent, can they share one 2m gutter instead of each having their own?
6. **Cost factors**: What makes a polyhouse more expensive? (More corners? Longer perimeter? Custom cuts?)

---

## Visualization Improvements Needed

Show the user:
1. **Why** certain areas can't be filled (terrain too steep, water body, solar angle conflict)
2. **Cost breakdown** by polyhouse (corners, edge length, custom materials)
3. **Groupings** with color coding (Group 1 in light green, Group 2 in light blue, etc.)
4. **Access paths** highlighted in yellow (4m vehicle access lanes)
5. **Terrain zones** overlay (green = buildable, yellow = challenging, red = prohibited)

This gives users actionable insights, not just "here's your layout."
