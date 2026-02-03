# Technical Questions for Agriplast - Optimizer Tuning

## Purpose
These questions help tune the AI optimization algorithm to match Agriplast's real-world experience and customer preferences. The answers directly affect how the tool makes trade-off decisions when generating polyhouse layouts.

---

## **Critical Trade-offs**

### 1. **Solar orientation vs space utilization: Which matters more?**

**The Dilemma:**
- Perfect north-south orientation = better sun exposure = healthier crops
- But irregular land shapes may force us to choose: perfect angle OR more polyhouses?

**Questions:**
- If achieving north-south orientation means 15% fewer polyhouses, do customers still want it?
- What's the maximum acceptable deviation from north-south?
  - 5 degrees? (very strict)
  - 10 degrees? (moderate)
  - 15 degrees? (flexible)
  - 20+ degrees? (orientation doesn't matter much)
- Does this change by crop type? (e.g., flowers need perfect orientation, leafy vegetables don't care?)
- Do customers even understand/care about solar orientation?

**Impact on algorithm:**
- Strict (5°) = Fewer polyhouses, perfect sun exposure
- Flexible (15-20°) = More polyhouses, slightly suboptimal orientation
- We currently use latitude-based calculation - should we relax this?

---

### 2. **More polyhouses vs easier maintenance access**

**The Dilemma:**
- Tight spacing (0.5-1m gaps) = More polyhouses = More revenue
- Wide spacing (2-3m gaps) = Fewer polyhouses = Easier access, vehicle entry

**Questions:**
- What gap spacing do your customers typically choose?
  - 0.5m (maximum density, walking only)
  - 1m (standard, some vehicle access)
  - 2m (comfortable, tractor access)
  - 3m+ (very spacious, full vehicle access)
- Does this preference change with farm size?
  - Small farms (<2000 sqm): Tight spacing OK?
  - Large farms (>10000 sqm): Need vehicle access?
- What do customers regret after installation?
  - "Wish we left more space for access"?
  - "Wish we packed more polyhouses in"?

**Impact on algorithm:**
- Default polyhouseGap: 1m vs 2m makes 15-20% difference in coverage
- Vehicle access requirement: Forces 3m+ gaps = 30-40% fewer polyhouses

---

### 3. **Regular rectangles vs irregular shapes to maximize coverage**

**The Dilemma:**
- Perfect rectangles = Easier construction, cleaner look = May waste corner space
- L-shapes, T-shapes = Fill irregular land = Harder to build, more corner materials

**Questions:**
- Do you prefer clean rectangular polyhouses even if corners are left empty?
- Or accept irregular shapes (L-shapes, stepped layouts) to maximize space?
- What's the minimum acceptable width for a polyhouse section?
  - 8m (single block wide)?
  - 16m (two blocks wide)?
  - 24m+ (three+ blocks)?
- Are irregular shapes harder/more expensive to build?
- Do customers complain about irregular shapes?

**Impact on algorithm:**
- minSideLength = 8m: Allows thin strips, maximizes coverage
- minSideLength = 16m: Only allows wider sections, cleaner shapes
- Currently we allow 8m minimum - should we increase this?

---

### 4. **Maximum polyhouse size vs multiple smaller ones**

**The Dilemma:**
- One large polyhouse (200m x 50m) = Fewer structures, less material waste
- Many smaller polyhouses (50m x 20m each) = More flexibility, easier phasing

**Questions:**
- What's the largest polyhouse you've built? (length x width)
- What size do customers prefer?
  - Large (100m+ long): Better for commercial operations?
  - Medium (50-100m long): Most common?
  - Small (20-50m long): Easier for first-time farmers?
- Do structural limitations kick in at certain sizes?
- Is there a "sweet spot" size that's most economical?

**Impact on algorithm:**
- maxSideLength = 200m (current) - should we reduce this?
- Should we favor multiple medium polyhouses over one giant one?

---

### 5. **Corner complexity vs space utilization**

**The Dilemma:**
- More corners = More connector materials = Higher cost = Better space filling
- Fewer corners = Simpler structure = Lower cost = May waste space

**Questions:**
- How much do corner materials cost relative to straight sections?
  - Are corners significantly more expensive?
  - Or roughly the same as straight pipes?
- What's your target for corners per polyhouse?
  - 4 corners (simple rectangle): Cheapest
  - 6-8 corners (L-shape or stepped): Moderate complexity
  - 10+ corners (complex shape): Is this ever worth it?
- Do customers worry about corner durability?

**Impact on algorithm:**
- minCornerDistance = 5m (current): Allows frequent corners
- Should we increase this to 10m or 20m to reduce complexity?
- Trade-off: Simpler shapes but 5-10% less coverage

---

### 6. **Restricted zones: Avoid strictly or override often?**

**The Dilemma:**
- Detected water, steep slopes, forests = Don't build (safe default)
- But customers may know "that pond dries up" or "we'll level that slope"

**Questions:**
- How often do customers want to build on "restricted" areas?
  - Rarely (terrain data is accurate)?
  - Often (they know better than satellite data)?
- Common scenarios where customers override:
  - Seasonal water that dries in summer?
  - Slopes they plan to level?
  - Vegetation they'll clear?
- Should we make it easier to override restrictions by default?

**Impact on algorithm:**
- Currently: Avoid restricted zones by default, allow chat override
- Alternative: Show warnings but allow building by default?
- How aggressive should terrain detection be?

---

### 7. **Gutter size: Fixed 2m or customizable?**

**Questions:**
- Is 2m gutter the standard for all installations?
- Do some crops/regions need wider gutters (3m)?
- Or can some get away with smaller (1m or 1.5m)?
- Does gutter width affect pricing significantly?

**Impact on algorithm:**
- gutterWidth = 2m is hardcoded
- Wider gutters = Less growing area per polyhouse
- Should this be configurable per customer?

---

### 8. **Block size: Always 8m x 4m or vary?**

**Questions:**
- Is 8m x 4m the only block size you offer?
- Or do you have:
  - Smaller blocks (6m x 3m)?
  - Larger blocks (10m x 5m)?
- Do different crops need different block sizes?

**Impact on algorithm:**
- Currently fixed at 8m x 4m (32 sqm per block)
- If sizes vary, we need to make this configurable

---

## **Real-World Scenarios**

### Scenario A: Small irregular plot (2000 sqm, odd shape)
**What matters most?**
- [ ] Fill every corner, accept irregular polyhouses
- [ ] Keep clean rectangles, accept 50-60% coverage
- [ ] Balance both, aim for 65-70% coverage

### Scenario B: Large regular plot (10000 sqm, rectangular)
**What matters most?**
- [ ] Perfect north-south orientation (may get 12 polyhouses)
- [ ] Maximum coverage (may get 18 polyhouses, some rotated)
- [ ] Balance both (15 polyhouses, mostly north-south)

### Scenario C: Land with water body (3000 sqm, 15% water)
**What should we do?**
- [ ] Avoid water completely (safer, less coverage)
- [ ] Build around water with tight spacing (maximize remaining area)
- [ ] Ask customer if they can fill/drain the water

### Scenario D: Customer wants 20 polyhouses but land only fits 15 comfortably
**What do you recommend?**
- [ ] Show 20 with very tight spacing (0.5m gaps)
- [ ] Show 15 with comfortable spacing (2m gaps)
- [ ] Show both options and let them compare

---

## **Optimization Goals - Rank These 1-5**

Please rank these in order of importance (1 = most important, 5 = least):

- [ ] **Maximum space utilization** (pack as many polyhouses as possible)
- [ ] **Perfect solar orientation** (north-south alignment for sun exposure)
- [ ] **Easy maintenance access** (wide gaps for people/vehicles)
- [ ] **Structural simplicity** (clean rectangles, minimal corners)
- [ ] **Cost minimization** (fewer corners, simpler shapes)

**Why this matters:**
The algorithm currently tries to balance all five, but if we know your priorities, we can optimize accordingly.

---

## **Current Algorithm Defaults - Are These Right?**

```javascript
Current settings:
- polyhouseGap: 1m (gap between polyhouses)
- minSideLength: 8m (minimum width/length)
- gutterWidth: 2m (drainage gutter)
- maxSideLength: 200m (maximum length)
- minCornerDistance: 5m (minimum distance between corners)
- solarOrientation: enabled with latitude-based deviation
- blockDimensions: 8m x 4m (fixed)
```

**For each setting, tell us:**
- Is this the right default?
- Should it be stricter or more flexible?
- Should it vary by customer type or region?

---

## **Questions About Customer Behavior**

### What do customers complain about AFTER installation?

- [ ] "Gaps between polyhouses are too tight, can't access easily"
- [ ] "Too much space wasted, should've packed more polyhouses"
- [ ] "Polyhouses aren't facing the right direction, crops get less sun"
- [ ] "Irregular shapes are harder to work with than expected"
- [ ] "Should've built on that water area, it dries up anyway"
- [ ] Other: __________

### What do customers praise about good plans?

- [ ] "Perfect use of every inch of land"
- [ ] "Easy to walk through and maintain"
- [ ] "Clean, professional-looking layout"
- [ ] "Crops are thriving with good sun exposure"
- [ ] "Glad we left room for future expansion"
- [ ] Other: __________

---

## **How to Use These Answers**

Once Agriplast provides responses, we'll adjust the algorithm:

1. **Set better defaults** based on most common preferences
2. **Add presets** (e.g., "Max Coverage" vs "Easy Access" vs "Solar Optimized")
3. **Tune constraint weights** to match real-world priorities
4. **Add smart suggestions** (e.g., "Consider 2m gaps for easier maintenance")
5. **Customize by farm size** (small farms = tight spacing, large farms = vehicle access)

**Next step:** Schedule a 30-minute call to walk through these questions with your most experienced planner/installer.
