# SiteSense DSL Rules and Constraints

## Hard Constraints (Cannot Be Changed)

### 1. Block Dimensions
- **Size**: 8m × 4m (fixed)
- **Cannot be modified** - Industry standard module
- All polyhouses are composed of these 8×4 blocks

### 2. Polyhouse Size Limits
- **Maximum size**: 1 hectare (10,000 sqm)
- **Hard limit** - Cannot exceed without structural risk
- Each polyhouse can be composed of multiple 8×4 blocks up to this limit

### 3. Dimension Limits
- **Maximum gutter width**: 100 meters
  - Can be overridden to 120m **at customer's risk**
  - Must be multiple of 4m (gutter module)

- **Maximum gable length**: 120 meters
  - Can be overridden to 120m with customer acknowledgment
  - Must be multiple of 8m (gable module)

## Optimization Priority Rules (MUST Follow in Order)

### 1. BUILD BIGGEST POLYHOUSES FIRST ⭐ MOST IMPORTANT
- **Always** target the maximum size (1 hectare / 10,000 sqm) first
- Fill the land with the largest possible polyhouses
- Only after placing maximum-sized polyhouses, fill remaining space with smaller ones
- **Cost efficiency**: Fewer, larger polyhouses = lower material and installation cost

### 2. UNIFORM ORIENTATION ⭐ CRITICAL (DEFAULT)
- **All polyhouses SHOULD face the same direction (DEFAULT behavior)**
- Can be overridden in Settings or via Chat to use mixed orientations
- Configuration: `optimization.orientationStrategy`
  - `'uniform'` (DEFAULT): All same direction - lowest cost ✅
  - `'varied'`: Two primary orientations - moderate complexity
  - `'optimized'`: System decides - tests many angles (higher cost)
- Uniform orientation provides:
  - Easy pathway planning
  - Simplified construction sequencing
  - Better maintenance access
  - Lower overall cost
- **⚠️ Mixed orientations increase cost by 20-30%** - only use if land shape requires it

### 3. SUN ORIENTATION ⭐ MANDATORY (CANNOT BE DISABLED)
- **MUST consider sun direction** for optimal crop growth
- **ALWAYS ENABLED** - System will force-enable if disabled
- Configuration: `solarOrientation.enabled` - must be `true`
- Polyhouses oriented for maximum sunlight exposure based on latitude
- Typically east-west gutter orientation for Indian climates (gable runs north-south)
- Solar orientation takes precedence over other spatial considerations
- **Cannot be overridden** - crop growth requires proper sun exposure

### 4. EASE OF ACCESS
- **Pathways between polyhouses** are essential
- Minimum 3m corridor width for vehicle and personnel access
- Uniform orientation creates straight pathways
- Better access = lower maintenance cost

### 5. COST MINIMIZATION
- Fewer polyhouses = lower cost
- Larger polyhouses = better economy of scale
- Uniform orientation = simplified construction
- Straight pathways = easier infrastructure

### 6. SPACE UTILIZATION
- Maximize land coverage **while following above rules**
- Target 60-65% utilization (industry standard)
- Don't sacrifice orientation or size for marginal coverage gains

### 7. FILL WITH SMALLER POLYHOUSES (Last Priority)
- Only after largest polyhouses are placed
- Use to fill irregular spaces or corners
- Still maintain uniform orientation where possible
- Minimum size: 16m × 8m (minimum viable polyhouse)

## Design Philosophy

**REMEMBER**:
- One large 1-hectare polyhouse is better than two 0.5-hectare polyhouses
- Uniform orientation is better than maximizing coverage
- Sun orientation is non-negotiable
- Ease of construction and maintenance reduces lifetime cost

**Priority Order**:
1. Largest possible polyhouses
2. Uniform orientation (same direction)
3. Sun alignment
4. Access pathways
5. Fill remaining space with smaller polyhouses

## Technical Implementation

### Optimizer Strategy
1. Start with candidate polyhouses of 8000-10000 sqm (0.8-1.0 hectare)
2. Find best global orientation that maximizes sun exposure
3. Place largest polyhouses first using this uniform orientation
4. Maintain 3m corridors between structures
5. Only then attempt to fill gaps with smaller polyhouses (if needed)
6. Never sacrifice orientation for marginal space gains

### Configuration Validation
- Block dimensions: 8m × 4m (enforced)
- Max polyhouse area: 10000 sqm (enforced)
- Max gutter width: 100m (warning at override)
- Max gable length: 120m (standard)
- Orientation: Uniform across all polyhouses (preferred)
- Corridor width: 3m minimum (enforced)

## Customer Communication

When presenting plans:
1. Highlight the largest polyhouses first
2. Explain uniform orientation benefits (cost, access, maintenance)
3. Show sun direction alignment
4. Demonstrate access pathways
5. Justify any smaller polyhouses (if used to fill gaps)

**Bottom Line**: Build fewer, larger, uniformly-oriented polyhouses for lowest cost and best operational efficiency.
