# Quick Start Guide - New Features

## Overview
Your Agriplast system now has several powerful new features. This guide shows you how to use them.

---

## 1. Polyhouse Labels and Colors

### What It Does
Every polyhouse now gets a letter (A, B, C, ...) and a color for easy identification.

### How to Use It

**In Chat:**
```
User: "Make polyhouse B larger"
Assistant: "Making polyhouse B larger..."

User: "What's the size of polyhouse A?"
Assistant: "Polyhouse A is 800 sqm with 25 blocks..."
```

**On Map:**
- Each polyhouse shows with a colored outline
- Label appears in the center: "P1", "P2", etc. (or A, B, C)
- Hover over polyhouse to see details

**In Quotation:**
- Each polyhouse listed by label
- Color-coded for easy matching with map

---

## 2. Safety Buffer

### What It Does
Keeps polyhouses away from land edges for safety and legal compliance.

### How to Configure

**In Settings:**
1. Go to Settings page
2. Find "Safety Buffer" field
3. Set value (1-5 meters recommended)
4. Save settings

**Default:** 1 meter

**Via API:**
```json
{
  "configuration": {
    "safetyBuffer": 2
  }
}
```

**Via Chat:**
```
"Make the safety buffer 2 meters"
"I don't need a safety buffer"
```

### Why It Matters
- Property line setbacks (legal requirement in some areas)
- Access paths around perimeter
- Drainage and maintenance space
- Professional best practice

---

## 3. Placement Strategy

### What It Does
Tells the system what to optimize for when placing polyhouses.

### Options

**Balanced** (Default)
- Mix of coverage and efficiency
- Good for most use cases
- Tries to fill space while keeping polyhouses reasonable size

**Maximize Coverage**
- Fill as much land as possible
- Creates larger polyhouses
- Best for: "I want to use every inch of my land"

**Maximize Blocks**
- Place as many blocks as possible
- May create more smaller polyhouses
- Best for: "I want the most growing area"

**Equal Area**
- Try to make all polyhouses similar size
- Easier to manage uniform polyhouses
- Best for: "I want consistency"

### How to Configure

**In Settings:**
1. Go to Settings page
2. Find "Placement Strategy" dropdown
3. Select strategy
4. Save settings

**Via Chat:**
```
"Use maximum coverage strategy"
"I want balanced placement"
"Try to maximize the number of blocks"
```

---

## 4. Chat on Existing Projects

### What It Does
You can now modify saved projects using chat - not just new ones.

### How to Use It

1. Open any existing project
2. Click "Chat Assistant" button in the Actions panel
3. Chat appears on bottom right
4. Make requests:
   ```
   "Make the polyhouses smaller"
   "Add more polyhouses"
   "Increase the gap between polyhouses"
   "Remove the smallest polyhouse"
   ```
5. Map updates in real-time
6. Changes are automatically saved

### Use Cases
- Client wants changes after seeing initial plan
- Need to adjust for new requirements
- Want to explore different configurations
- Fine-tuning before finalizing quote

---

## 5. Unbuildable Regions Report

### What It Does
Explains why your land isn't 100% covered with polyhouses.

### Where to Find It
- In quotation panel under "Land Utilization"
- In planning result metadata
- Console logs during optimization

### Example Report
```
Your Land: 10,000 sqm
Polyhouses: 7,200 sqm (72% coverage)

Unbuildable Areas:
- Safety buffer (1m from edges): 500 sqm
- Irregular boundary shape: 800 sqm
- Gap between polyhouses: 500 sqm
- Water body (user marked): 300 sqm
- Steep slope: 700 sqm
```

### Why It's Useful
- Understand optimization results
- Make informed decisions (e.g., "I'll level that slope")
- Set realistic expectations
- Professional transparency with clients

---

## 6. All Settings Now Configurable

### What Changed
Everything that was hardcoded is now configurable.

### Available Settings

**Dimensions**
- Block width (default: 8m)
- Block height (default: 4m)
- Gutter width (default: 2m)

**Spacing**
- Polyhouse gap (default: 1m)
- Safety buffer (default: 1m)
- Min corner distance (default: 4m)

**Size Limits**
- Min side length (default: 8m)
- Max side length (default: 100m)
- Max land area per polyhouse (default: 10,000 sqm)

**Strategies**
- Placement strategy (default: balanced)
- Orientation strategy (default: optimized)

**Terrain**
- Solar orientation (default: enabled)
- Avoid water (default: yes)
- Consider slope (default: no)
- Max slope (default: 15°)
- Land leveling override (default: no)

### Where to Configure
1. **Settings Page** - Your persistent defaults
2. **API Requests** - Per-project overrides
3. **Chat Commands** - Natural language adjustments

---

## Common Workflows

### Workflow 1: Create Professional Quote
```
1. Create new project with customer details
2. Draw land boundary on map
3. Set placement strategy to "balanced"
4. Generate polyhouses
5. Review labels (A, B, C...)
6. Use chat to fine-tune: "Make polyhouse C larger"
7. Generate quotation
8. Save project
```

### Workflow 2: Modify Existing Quote
```
1. Open saved project from dashboard
2. Click "Chat Assistant"
3. Say: "The customer wants more coverage"
4. System adjusts polyhouses
5. Map updates instantly
6. Review new quotation
7. Changes auto-save
```

### Workflow 3: Handle Difficult Land
```
1. Draw land boundary
2. System reports: "Only 60% coverage due to steep slopes"
3. Review unbuildable regions report
4. Decide: "I'll level the steep areas"
5. Use chat: "Ignore slopes, assume leveled land"
6. System recalculates with 85% coverage
7. Note in quotation: "Requires land leveling"
```

### Workflow 4: Compare Strategies
```
1. Create project with "balanced" strategy
2. Note: 10 polyhouses, 7,500 sqm
3. Use chat: "Try maximum coverage"
4. System adjusts
5. Note: 8 polyhouses, 8,200 sqm
6. Compare results
7. Choose best for customer
```

---

## Tips and Best Practices

### Labels
- Reference by letter in chat: clearer than "the third one"
- Colors help identify on map quickly
- Use in quotation discussion: "Polyhouse B covers the south field"

### Safety Buffer
- Start with 1m (default)
- Increase to 2m for legal compliance
- Reduce to 0.5m for maximum coverage (with customer approval)

### Placement Strategy
- Start with "balanced" for most projects
- Use "maximize coverage" for land-constrained projects
- Use "maximize blocks" for growing-area-constrained projects
- Use "equal area" for operational consistency

### Chat
- Be specific: "Make polyhouse B 20% larger" better than "make it bigger"
- Reference labels: "Remove polyhouse F" better than "remove the small one"
- One change at a time: easier to track and understand
- Use chat to explore: "What if we remove the smallest polyhouses?"

### Settings
- Configure your company defaults in Settings
- Override per-project via chat when needed
- Document any non-standard configurations in project notes

---

## Troubleshooting

### "Polyhouses not showing on map"
1. Check browser console for errors
2. Refresh page
3. Verify project has polyhouses in database
4. Check if MapComponent is loaded

### "Chat not updating polyhouses"
1. Verify chat interface is open
2. Check network tab for API errors
3. Ensure backend is running
4. Try refreshing page

### "Labels not showing"
1. Labels should appear automatically
2. Check if polyhouses have label field
3. May need to regenerate project (existing projects before update)

### "Settings not saving"
1. Verify Supabase connection
2. Check RLS policies
3. Try logging out and back in

---

## Support

For issues or questions:
1. Check [IMPROVEMENTS_SUMMARY.md](IMPROVEMENTS_SUMMARY.md) for technical details
2. Check [DEPLOYMENT_FIXES.md](DEPLOYMENT_FIXES.md) for deployment issues
3. Review [OLD_CODE_ANALYSIS.md](OLD_CODE_ANALYSIS.md) for feature origins
4. Consult [CONFIGURATION_GUIDE.md](CONFIGURATION_GUIDE.md) for configuration details

---

## What's Next

Future enhancements being considered:
- Hypothetical obstacles ("future pond here")
- More orientation modes
- Corner violation details
- Area deviation tracking
- PDF export with labeled diagram
- Comparison view (before/after)

These will be added based on user feedback and business priorities.
