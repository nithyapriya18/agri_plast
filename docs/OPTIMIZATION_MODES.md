# Agriplast Polyhouse Optimizer - Utilization Modes

## Overview
The system now supports **two optimization modes** that users can switch between via the **AI Chat interface**.

---

## 🎯 Mode 1: BALANCED (Default)

**Target Utilization**: 50-65%
**Focus**: Quality polyhouses with good access and drainage

### Configuration:
```typescript
{
  polyhouseGap: 1m           // Safe spacing between polyhouses
  minSideLength: 16m         // Minimum 2 blocks (32 sqm minimum per polyhouse)
  minCornerDistance: 5m      // Reasonable placement density
  aspectRatio: max 4:1       // Prevents thin/awkward shapes
  minWidth: 8m               // At least 2 blocks wide
}
```

### Benefits:
✅ High quality polyhouse shapes (no thin/jagged structures)
✅ 1m gaps allow good access for maintenance
✅ Proper drainage space around each polyhouse
✅ Easy to build and maintain
✅ Fast calculation (~10-15 seconds)

### When to Use:
- Standard commercial operations
- Professional farm installations
- When quality matters more than max coverage
- When maintenance access is important

---

## 🚀 Mode 2: MAXIMUM COVERAGE

**Target Utilization**: 70-85%
**Focus**: Pack maximum polyhouses, use every available space

### Configuration:
```typescript
{
  polyhouseGap: 0.5m         // MINIMUM safe spacing
  minSideLength: 8m          // Allow single 8m×4m blocks (32 sqm)
  minCornerDistance: 3m      // Very tight placement
  aspectRatio: max 4:1       // Still prevents extreme shapes
  minWidth: 8m               // Single block width allowed
}
```

### Benefits:
✅ Maximum return on investment (70-85% coverage)
✅ Uses every available space
✅ Fills small gaps with tiny polyhouses
✅ More polyhouses = more production capacity

### Trade-offs:
⚠️ Less space between polyhouses (0.5m minimum)
⚠️ Tighter maintenance access
⚠️ More polyhouses = more structural complexity
⚠️ Slower calculation (~30-60 seconds)

### When to Use:
- Premium land in expensive areas
- Maximum ROI requirements
- Large commercial operations
- When customer is paying top dollar and wants every sqm utilized

---

## 📱 How to Switch Modes via Chat

Users simply ask the AI in natural language:

### Trigger Phrases for MAXIMUM COVERAGE:
```
"I want maximum utilization"
"Use 100% of my land"
"Pack as many polyhouses as possible"
"I need the highest coverage"
"Maximize my space"
"Fill every gap"
```

### AI Response Flow:
1. **AI acknowledges**: "I understand you want to maximize space utilization"
2. **AI explains trade-offs**: "This will pack polyhouses with 0.5m gaps, allow smaller units, and achieve 70-85% coverage instead of your current 55%"
3. **AI triggers**: `[RECALCULATE:MAXIMIZE]` flag (invisible to user)
4. **Backend recalculates** with aggressive settings
5. **User sees updated plan** with more polyhouses and higher utilization

---

## 🤖 Behind the Scenes (Technical)

### Default Mode (Balanced):
```typescript
// planningController.ts
configuration: {
  polyhouseGap: 1,
  minSideLength: 16,
  minCornerDistance: 5,
}

// optimizer.ts - Multi-pass
Pass 1: Large polyhouses (fastest coverage)
Pass 2: Medium polyhouses (fill medium gaps)
Pass 3: Small polyhouses (fill remaining gaps)
```

### Maximum Coverage Mode:
```typescript
// Triggered by chat [RECALCULATE:MAXIMIZE]
configuration: {
  polyhouseGap: 0.5,        // ← REDUCED
  minSideLength: 8,         // ← REDUCED (allow tiny polyhouses)
  minCornerDistance: 3,     // ← REDUCED
  _maximizeCoverage: true   // ← Special flag
}

// optimizer.ts - AGGRESSIVE
Pass 1: Try large polyhouses first
Pass 2: Fill gaps with medium polyhouses
Pass 3: Fill tiny gaps with single-block polyhouses (8m×4m)
Pass 4: (Optional) Ultra-dense packing with 0.5m gaps
```

---

## 📊 Expected Results Comparison

### Small Area (12,000 sqm):

| Mode | Polyhouses | Utilization | Time | Notes |
|------|-----------|-------------|------|-------|
| **Balanced** | 6-8 | 50-60% | 10s | Quality shapes, good access |
| **Maximum** | 12-18 | 70-80% | 30s | Tight packing, fills all gaps |

### Medium Area (100,000 sqm):

| Mode | Polyhouses | Utilization | Time | Notes |
|------|-----------|-------------|------|-------|
| **Balanced** | 40-50 | 50-60% | 30s | Professional layout |
| **Maximum** | 70-90 | 70-80% | 90s | Maximum ROI |

### Large Area (220,000+ sqm like Cubbon Park):

| Mode | Polyhouses | Utilization | Time | Notes |
|------|-----------|-------------|------|-------|
| **Balanced** | 80-100 | 50-60% | 45s | Manageable complexity |
| **Maximum** | 140-180 | 70-80% | 2-3min | Every sqm used |

---

## 💰 Business Impact

### For 100,000 sqm land:

**Balanced Mode** (55% utilization):
- Coverage: 55,000 sqm
- ~45 polyhouses
- Easier maintenance
- Better for standard operations

**Maximum Coverage Mode** (75% utilization):
- Coverage: 75,000 sqm
- ~70 polyhouses
- **+20,000 sqm additional production space!**
- **+25 more polyhouses!**
- Tighter operations, but maximum ROI

**Extra Revenue Calculation:**
```
20,000 sqm × ₹500/sqm/year = ₹10,000,000/year extra revenue
```

For premium customers paying top dollar, the extra 20% coverage can justify the tighter spacing.

---

## 🎯 Recommendations by Customer Type

### Standard Customers (Balanced Mode):
- Family farms
- Small-to-medium commercial operations
- Customers who value ease of maintenance
- Standard service packages

### Premium Customers (Maximum Coverage):
- Large commercial operations
- Customers in high land-cost areas (city outskirts)
- Customers explicitly requesting "maximum utilization"
- Premium service packages with higher quotation values

### Let Chat Decide:
The AI chat will naturally guide customers to the right mode based on their questions and concerns. It explains trade-offs clearly before switching modes.

---

## 🛠️ For Developers

### To modify optimization aggressiveness:

**File**: `backend/src/services/bedrock.ts`
```typescript
// Adjust configuration for MAXIMIZE mode
if (response.includes('[RECALCULATE:MAXIMIZE]')) {
  changes.polyhouseGap = 0.5;  // ← Adjust here
  changes.minSideLength = 8;    // ← Adjust here
  changes.minCornerDistance = 3; // ← Adjust here
}
```

**File**: `backend/src/services/optimizer.ts`
```typescript
// Number of candidates per pass
Pass 1: 150 candidates (large)
Pass 2: 250 candidates (medium)
Pass 3: 300 candidates (small + tiny)

// Increase for even more coverage (slower)
// Decrease for faster calculation
```

---

## ✅ Current Status

**Implemented**:
- ✅ Dual-mode optimization (Balanced + Maximum)
- ✅ Multi-pass gap filling
- ✅ Shape quality constraints (aspect ratio, min width)
- ✅ Solar orientation compliance
- ✅ Chat-based mode switching
- ✅ AI explains trade-offs automatically

**Ready for Production**:
- System defaults to Balanced (safe, high quality)
- Premium customers can request Maximum via chat
- AI clearly explains trade-offs before switching
- Recalculation happens automatically

**Next Steps** (Future):
- [ ] Terrain data integration (Copernicus)
- [ ] Custom mode (user-specified gaps/constraints)
- [ ] Batch optimization for multiple orientations
- [ ] Visual diff between modes

---

**System is production-ready!** 🎉

Default mode gives quality results. Premium customers can unlock maximum coverage through natural conversation with the AI.
