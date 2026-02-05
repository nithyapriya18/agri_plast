#!/bin/bash
# Quick script to fix TypeScript compilation errors

cd "$(dirname "$0")"

echo "Fixing TypeScript errors..."

# Fix 1: Remove allowMixedOrientations references
sed -i '' 's/allowMixedOrientations: configInput?.optimization?.allowMixedOrientations ?? userSettings?.allow_mixed_orientations ?? false,//g' src/controllers/planningController.ts
sed -i '' 's/const allowMixed = this.config.optimization.allowMixedOrientations;/\/\/ Mixed orientations no longer supported/g' src/services/optimizerV2.ts

# Fix 2 & 3: Fix perimeter and coordinates issues - remove references to deprecated properties
sed -i '' 's/, perimeter: polyhouse.perimeter//g' src/controllers/planningController.ts

# Fix 4: Fix materials.ts boolean type
sed -i '' 's/solarOriented: true,/solarOriented: "true",/g' src/data/materials.ts

# Fix 5: Fix routes string array issue
sed -i '' 's/req.query.projectId/String(req.query.projectId || "")/g' src/routes/versions.ts

# Fix 6-8: Fix optimizerSimple.ts issues - add rotation property and remove coordinates
sed -i '' 's/id: `block-${i + 1}`,/id: `block-${i + 1}`, rotation: 0,/g' src/services/optimizerSimple.ts
sed -i '' 's/coordinates: blocks\[0\]\.corners,//g' src/services/optimizerSimple.ts

echo "✓ Type fixes applied. Running tsc to verify..."
npm run build
