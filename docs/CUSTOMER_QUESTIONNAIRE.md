# Agriplast Customer Questionnaire

## Questions to Ask Farmers Before Planning

This document outlines the key questions Agriplast should ask their farming customers. These questions directly impact the polyhouse planning and optimization.

---

## **Critical Questions (Must Ask)**

### 1. **What crops will you primarily grow?**
**Why it matters:** Different crops need different polyhouse specifications

| Crop Type | Impact on Design |
|-----------|------------------|
| **Flowers** | Need taller structures, precise climate control, may need shading |
| **Leafy Vegetables** | Shorter structures OK, high density possible, quick turnover |
| **Vine Crops** (tomatoes, cucumbers) | Need height for trellising, strong structure for weight |
| **Mixed/Experimental** | Need flexibility, may want separate climate zones |

**What we adjust:**
- Polyhouse height requirements
- Ventilation systems
- Material selection

---

### 2. **What's your budget range per square meter?**
**Why it matters:** Determines material quality and features

| Budget Level | Cost Range | What They Get |
|--------------|-----------|---------------|
| **Economy** | ₹200-300/sqm | Basic structure, manual operations, standard materials |
| **Standard** | ₹350-500/sqm | Good quality, some automation, better materials |
| **Premium** | ₹600+/sqm | Best materials, full automation compatible, longest lifespan |

**What we adjust:**
- Material specifications in quotation
- Feature recommendations
- Warranty options

---

### 3. **Will you use automation systems?**
**Why it matters:** Affects spacing and infrastructure planning

| Answer | Planning Impact |
|--------|-----------------|
| **Yes, Automated** | - Need wider access paths for maintenance<br>- Plan for power routing<br>- Include sensor/controller mounting points<br>- Budget for drip irrigation, climate sensors |
| **No, Manual** | - Narrower paths acceptable<br>- Simpler electrical setup<br>- Lower infrastructure cost<br>- More labor-intensive operations |

**What we adjust:**
- Gap spacing between polyhouses
- Electrical infrastructure recommendations
- Access path widths

---

### 4. **Do you need vehicle access between polyhouses?**
**Why it matters:** Directly affects spacing and coverage percentage

| Requirement | Gap Size | Impact |
|-------------|----------|--------|
| **Yes, Vehicles** | 3-4 meters | - Lower coverage (50-60%)<br>- Better accessibility<br>- Easier maintenance<br>- Can transport harvests efficiently |
| **No, Walking Only** | 1-2 meters | - Higher coverage (70-85%)<br>- More polyhouses<br>- Manual transport needed<br>- Good for small-scale farms |

**What we adjust:**
- `polyhouseGap` configuration (1m vs 3m)
- Total coverage percentage expectations
- Material delivery planning

---

### 5. **What's most important to you?**
**Why it matters:** Sets the optimization strategy

| Priority | What It Means | Typical Result |
|----------|--------------|----------------|
| **Maximum Coverage** | "I want to use every inch of land" | - 70-85% utilization<br>- More smaller polyhouses<br>- Tighter spacing (0.5-1m)<br>- May compromise on orientation |
| **Quality & Access** | "I want perfect setup, fewer but better" | - 50-60% utilization<br>- Fewer larger polyhouses<br>- Perfect north-south orientation<br>- Wide access paths (2-3m) |
| **Balanced** | "Give me the best of both" | - 60-70% utilization<br>- Good spacing (1-2m)<br>- Solar-optimized when possible<br>- Recommended for most customers |

**What we adjust:**
- `minSideLength` (allows smaller or larger polyhouses)
- `polyhouseGap` (0.5m aggressive to 2m conservative)
- Solar orientation flexibility

---

### 6. **What's your project timeline?**
**Why it matters:** Affects permit strategy and design complexity

| Timeline | Approach | Considerations |
|----------|----------|----------------|
| **Urgent (2-3 months)** | Fast-track construction | - May need to avoid restricted areas<br>- Simpler designs<br>- Limited permit time<br>- Standard materials (readily available) |
| **Planned (6+ months)** | Full compliance optimization | - Can handle all permits<br>- May build on restricted areas with proper prep<br>- Custom material orders possible<br>- Optimal design |

**What we adjust:**
- Regulatory compliance approach
- Material sourcing strategy
- Whether to build on restricted zones

---

## **Secondary Questions (Important but Flexible)**

### 7. **How many workers will typically be in the polyhouses?**
- Just family (1-3 people): Standard paths fine
- Small team (5-10 workers): May need wider access
- Large operation (10+ workers): Need vehicle access, wider paths

### 8. **Do you have water access points on the property?**
- Multiple points: Flexible polyhouse placement
- Limited (1-2 points): Plan polyhouses near water source
- None yet: Include water infrastructure in quotation

### 9. **Is drainage a concern in your area?**
- Floods/waterlogging: Need elevated structures, better drainage channels
- No issues: Standard 2m gutter sufficient

### 10. **Are you planning to expand in the future?**
- Yes: Leave 20-30% space for future expansion
- No: Maximize current coverage

### 11. **Do you have any existing structures/obstacles?**
- Trees, buildings, power lines: Mark on map, plan around them
- Clear land: Optimal flexibility

### 12. **Do you need space for storage/processing facilities?**
- Yes: Reserve 10-15% of land
- No: Pure cultivation focus

---

## **How This Integrates with the App**

### Current Flow:
1. **Customer draws land boundary** on map
2. **Questionnaire pops up** with 6 core questions
3. **Customer answers** → Agriplast sales rep can guide them
4. **App generates optimized plan** based on preferences
5. **Results shown** with quotation

### What Gets Configured:

```javascript
Customer Answer → Configuration Change:

Crop Type: "Vine crops" → heightRequirement: 'tall' (future feature)
Budget: "Economy" → materialTier: 'standard'
Automation: "Yes" → polyhouseGap: 2m (wider for maintenance)
Vehicle Access: "Yes" → polyhouseGap: 3-4m (tractor width)
Priority: "Max Coverage" → minSideLength: 8m, polyhouseGap: 0.5m
Timeline: "Urgent" → avoidRestrictedZones: true
```

---

## **Sales Process Integration**

### For Agriplast Sales Team:

**When meeting a new customer:**

1. **Show them the app** → "Let me show you how we plan your polyhouses"

2. **Draw their land boundary together** → "Draw your property on this satellite view"

3. **Walk through questionnaire** → "Let me ask a few questions to optimize your layout"

4. **Explain trade-offs in real-time:**
   - "If you choose vehicle access, you'll get 12 polyhouses instead of 18"
   - "With maximum coverage, spacing will be tight at 0.5m - is that OK?"
   - "Your budget allows for this material quality [show quotation]"

5. **Generate and present** → Show map + quotation instantly

6. **Use chat for "what-if" scenarios** → "What if I use cheaper materials?" "What if I skip this water area?"

---

## **Future Enhancements**

### Additional Questions to Consider:

1. **Do you have a specific ROI target?** (affects crop selection advice)
2. **What's your experience level?** (novice vs expert farmer)
3. **Will you seek organic certification?** (specific spacing/material requirements)
4. **Local subsidy programs?** (may have specific requirements)
5. **Soil type?** (affects foundation recommendations)
6. **Local climate severity?** (extreme heat/cold = better materials needed)

---

## **Question Priority Matrix**

| Question | Impact on Plan | Impact on Cost | Must Ask? |
|----------|----------------|----------------|-----------|
| Crop type | Medium | Medium | ✓ Yes |
| Budget | Low | High | ✓ Yes |
| Automation | Medium | Medium | ✓ Yes |
| Vehicle access | **High** | Low | ✓ **Yes** |
| Priority | **High** | Medium | ✓ **Yes** |
| Timeline | Medium | Medium | ✓ Yes |
| Worker count | Low | Low | Optional |
| Water access | Medium | Medium | Optional |
| Drainage | Low | Medium | Optional |
| Expansion plans | Medium | Low | Optional |

**Bold = Highest impact on layout**

---

## **Pro Tips for Agriplast Sales Team**

1. **Start with Priority question** - If they say "maximum coverage", you know they're cost-conscious
2. **Vehicle access is usually the biggest surprise** - Explain early: "3m gaps means fewer polyhouses"
3. **Use the chat to explore alternatives** - "Let me ask the AI what happens if we use economy materials"
4. **Screenshot the map for proposals** - Visual sells better than numbers
5. **Explain the colors** - Green structures, red restricted zones, orange boundary
6. **Show the Site Analysis panel** - Builds trust: "See, we detected water here - shouldn't build there"

---

## **Training Scenarios**

### Scenario 1: Cost-Conscious Farmer
- Small plot (2000 sqm)
- Budget: Economy
- Priority: Maximum coverage
- **Result:** 70-85% coverage, more smaller polyhouses, tight spacing

### Scenario 2: Quality-Focused Commercial
- Large plot (1+ acre)
- Budget: Premium
- Vehicle access needed
- Automation planned
- **Result:** 50-60% coverage, fewer large polyhouses, perfect spacing

### Scenario 3: First-Time Farmer
- Medium plot (5000 sqm)
- Budget: Standard
- No automation (yet)
- Mixed crops (experimental)
- **Result:** 60-65% balanced approach, leave room for expansion
