#!/bin/bash
set -e

echo "🔧 Fixing all TypeScript compilation errors..."

cd "$(dirname "$0")/backend"

# Fix 1: Remove perimeter reference in planningController.ts
echo "  ✓ Fix 1: Removing deprecated perimeter property..."
sed -i '' '/perimeter: polyhouse\.perimeter,/d' src/controllers/planningController.ts

# Fix 2: Fix terrainAnalysis type issues in planningController.ts (add || undefined)
echo "  ✓ Fix 2: Fixing terrain analysis type compatibility..."
sed -i '' 's/terrainAnalysis: terrainAnalysis,/terrainAnalysis: terrainAnalysis || undefined,/g' src/controllers/planningController.ts

# Fix 3: Fix regulatoryCompliance type issues in planningController.ts (add || undefined)
echo "  ✓ Fix 3: Fixing regulatory compliance type compatibility..."
sed -i '' 's/regulatoryCompliance: regulatoryCompliance,/regulatoryCompliance: regulatoryCompliance || undefined,/g' src/controllers/planningController.ts

# Fix 4: Fix materials.ts boolean to string
echo "  ✓ Fix 4: Fixing materials.ts boolean type..."
sed -i '' 's/solarOriented: true,/solarOriented: 1,/g' src/data/materials.ts

# Fix 5: Fix versions.ts string array issue
echo "  ✓ Fix 5: Fixing versions.ts string type..."
sed -i '' 's/req.query.projectId,/String(req.query.projectId),/g' src/routes/versions.ts

# Fix 6-10: Fix optimizerSimple.ts issues
echo "  ✓ Fix 6-10: Fixing optimizerSimple.ts..."
# Remove coordinates references
sed -i '' 's/const centerLat = polyhouse\.coordinates\[0\]\.lat;/const centerLat = polyhouse.bounds[0].y;/g' src/services/optimizerSimple.ts
sed -i '' 's/const centerLng = polyhouse\.coordinates\[0\]\.lng;/const centerLng = polyhouse.bounds[0].x;/g' src/services/optimizerSimple.ts
# Add rotation property to blocks
sed -i '' 's/corners: \[/rotation: 0, corners: [/g' src/services/optimizerSimple.ts
# Remove coordinates from polyhouse object
sed -i '' '/coordinates: blocks\[0\]\.corners\.map/d' src/services/optimizerSimple.ts
sed -i '' '/{ lat: c\.y, lng: c\.x }),/d' src/services/optimizerSimple.ts
# Fix the area calc reference
sed -i '' 's/area: polyhouse\.coordinates\.reduce/area: polyhouse.bounds.reduce/g' src/services/optimizerSimple.ts

# Fix 11: Fix optimizerV2.ts allowMixedOrientations reference
echo "  ✓ Fix 11: Fixing optimizerV2.ts..."
sed -i '' 's/const allowMixed = this\.config\.optimization\.allowMixedOrientations;/\/\/ Mixed orientations no longer supported - using orientation strategy/g' src/services/optimizerV2.ts

# Fix 12-14: Fix terrain analysis GeoJSON Position types
echo "  ✓ Fix 12-14: Fixing terrainAnalysis.ts Position types..."
sed -i '' 's/clipped.geometry.coordinates\[0\]\.map((c: number\[\])/((clipped.geometry.coordinates[0] as number[][])).map((c: number[])/g' src/services/terrainAnalysis.ts

# Fix 15-17: Fix regulatoryCompliance.ts unknown types
echo "  ✓ Fix 15-17: Fixing regulatoryCompliance.ts types..."
# Add type annotation at the top
sed -i '' '/^import axios from/a\
\
\/\/ Mapbox API types\
interface MapboxReverseGeocodeResponse {\
  features: Array<{\
    text: string;\
    place_name: string;\
    place_type: string[];\
    context?: Array<{\
      id: string;\
      text: string;\
      short_code?: string;\
    }>;\
  }>;\
}
' src/services/regulatoryCompliance.ts

# Add type cast for API response
sed -i '' 's/const data = await response\.json();/const data = await response.json() as MapboxReverseGeocodeResponse;/g' src/services/regulatoryCompliance.ts

echo "✅ All fixes applied! Running TypeScript compiler to verify..."
npm run build

echo "🎉 Build successful!"
