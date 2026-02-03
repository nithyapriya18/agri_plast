# Configuration Guide - Making the Optimizer Match Reality

## Philosophy

This tool should **adapt to real customer behavior**, not impose theoretical ideals. All parameters are configurable based on actual field data.

---

## How to Configure Based on Customer Feedback

### Step 1: Collect Real Data
Use `AGRIPLAST_QUESTIONS.md` to interview:
- Sales team (what do customers ask for?)
- Installation team (what works in practice?)
- Existing customers (what do they wish they changed?)

### Step 2: Update Defaults
Defaults in [planningController.ts](backend/src/controllers/planningController.ts#L64-93) should reflect **most common** customer choices, not theoretical "best practices".

### Step 3: Make It Overridable
Every parameter can be overridden via:
- API request (`configuration` parameter)
- Chat interface (AI interprets and updates DSL)
- Admin panel (future feature)

---

## Current Configurable Parameters

### Spacing & Dimensions
```typescript
polyhouseGap: 2,        // Min: 2m (current), Max: any
minSideLength: 8,       // Fixed at block width for now
maxSideLength: 100,     // Max: 100m (current)
minCornerDistance: 4,   // Min: 4m = block width
```

**When to change**:
- If customers consistently ask for more access → increase `polyhouseGap`
- If customers want fewer, larger polys → increase `maxSideLength`
- If L-shapes cause issues → increase `minCornerDistance`

### Solar Orientation
```typescript
solarOrientation: {
  enabled: true,          // Mandatory per requirements
  latitudeDegrees: lat,   // Auto from location
  allowedDeviationDegrees: calculated  // From cos(A) formula
}
```

**When to change**:
- If formula is too restrictive → add manual override option
- If customers don't care about orientation → make `enabled: false` option
- If different crops need different angles → add crop-type parameter

### Terrain Detection
```typescript
terrain: {
  considerSlope: false,   // Currently disabled
  avoidWater: true,      // Only restriction
  ignoreRestrictedZones: false  // Override flag
}
```

**When to change**:
- If water detection has false positives → add sensitivity parameter
- If slopes should be avoided → set `considerSlope: true`
- If customers always override → set `ignoreRestrictedZones: true` as default

---

## Making Changes

### Example: Customer wants tighter spacing

**Feedback**: "We want polyhouses closer together, 1m gap is fine"

**Change**:
```typescript
// In planningController.ts line 70
polyhouseGap: 1,  // Changed from 2
```

### Example: Solar orientation too strict

**Feedback**: "Customers don't care about exact angles, just want more polyhouses"

**Change**:
```typescript
// In optimizer.ts, add override in getValidOrientations()
if (this.config.solarOrientation.allowRelaxedMode) {
  // Allow ±45° or more
  allowedDeviation = Math.max(allowedDeviation, 45);
}
```

### Example: False water detection

**Feedback**: "System detects seasonal puddles as permanent water"

**Change**:
```typescript
// Add sensitivity parameter to terrainAnalysis
if (waterPoints.length < samplingPoints.length * 0.05) {
  // Ignore if < 5% water (likely seasonal)
  return [];
}
```

---

## Priority Ranking System (Future)

Instead of hardcoded priorities, let customers choose:

```typescript
priorities: {
  solarOrientation: 5,    // 1-5 scale
  spaceUtilization: 4,
  maintenanceAccess: 2,
  structuralSimplicity: 3,
  costMinimization: 3
}
```

Algorithm weighs decisions based on these values.

---

## Testing Configuration Changes

1. **Make change** in code
2. **Test with real customer scenario** from past projects
3. **Compare results**: Does new config match what customer actually chose?
4. **If yes**: Keep change
5. **If no**: Revert and collect more data

---

## Anti-Patterns to Avoid

❌ **"I think customers want X"** → Make assumption
✅ **"10 customers asked for X"** → Update default

❌ **"This is the best way"** → Force behavior
✅ **"This is common, but overridable"** → Suggest but allow override

❌ **"According to research..."** → Use academic theory
✅ **"According to last quarter's installations..."** → Use field data

---

## Key Insight

**The best configuration is the one that results in more accepted proposals.**

Track:
- Proposal acceptance rate before/after config changes
- Customer satisfaction with installations
- Revision requests during planning

Optimize for **real-world results**, not theoretical perfection.
