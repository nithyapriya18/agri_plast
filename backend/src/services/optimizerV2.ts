/**
 * Professional Polyhouse Optimizer V2
 * Based on industry standards for greenhouse construction
 *
 * Key Principles:
 * - Rectangular polyhouses with proper dimensions
 * - Gable length (X): Multiples of 8m
 * - Gutter width (Y): Multiples of 4m
 * - Maximum area: 10,000 sqm per polyhouse
 * - 2m corridors between structures
 * - Target utilization: 60-80%
 */

import * as turf from '@turf/turf';
import { Feature, Polygon } from 'geojson';
import {
  LandArea,
  Polyhouse,
  Block,
  Point,
  Coordinate,
  PolyhouseConfiguration,
  ProjectZone,
  POLYHOUSE_COLORS,
} from '@shared/types';

/**
 * Generate user-friendly label for polyhouse (P1, P2, P3, ...)
 */
function getPolyhouseLabel(index: number): string {
  return `P${index + 1}`;
}

/**
 * Assign labels and colors to polyhouses sequentially
 */
function assignLabelsAndColors(polyhouses: Polyhouse[]): Polyhouse[] {
  return polyhouses.map((ph, index) => ({
    ...ph,
    label: getPolyhouseLabel(index),
    color: POLYHOUSE_COLORS[index % POLYHOUSE_COLORS.length],
  }));
}

/**
 * Represents a rectangular polyhouse candidate
 */
interface PolyhouseCandidate {
  gableLength: number;  // X direction (long side), multiples of 8m
  gutterWidth: number;  // Y direction (short side), multiples of 4m
  area: number;
  position: Coordinate; // Center point
  rotation: number;     // Angle in degrees
}

/**
 * Professional polyhouse optimizer using industry standards
 */
export class PolyhouseOptimizerV2 {
  private config: PolyhouseConfiguration;
  private landArea: LandArea;
  private terrainData: any; // TerrainAnalysisResult from terrainAnalysis.ts
  private zones: ProjectZone[]; // Project zones (inclusion/exclusion)

  // Industry-standard dimensions
  private readonly GABLE_MODULE = 8;     // 8m gable bay
  private readonly GUTTER_MODULE = 4;    // 4m gutter bay
  private readonly MAX_AREA = 10000;     // 10,000 sqm = 1 hectare (DSL max)
  private readonly CORRIDOR_WIDTH = 3;   // 3m between polyhouses for better access
  private readonly TARGET_MIN_POLYHOUSES = 5;  // Minimum 5 polyhouses (1 hectare each)
  private readonly TARGET_MAX_POLYHOUSES = 10; // Maximum 10 polyhouses
  private readonly TARGET_COVERAGE = 65;       // Target 65% coverage (industry standard)

  constructor(landArea: LandArea, config: PolyhouseConfiguration, terrainData?: any, zones?: ProjectZone[]) {
    this.config = config;
    this.landArea = landArea;
    this.terrainData = terrainData;
    this.zones = zones || [];

    if (terrainData) {
      console.log(`🌍 Terrain data loaded: ${terrainData.restrictedAreas?.length || 0} restricted zones`);
    }

    if (zones && zones.length > 0) {
      const inclusionCount = zones.filter(z => z.zone_type === 'inclusion').length;
      const exclusionCount = zones.filter(z => z.zone_type === 'exclusion').length;
      console.log(`🗺️  Project zones loaded: ${inclusionCount} inclusion zone(s), ${exclusionCount} exclusion zone(s)`);
    }
  }

  /**
   * Build buildable area from project zones
   * If zones exist: Union inclusion zones, subtract exclusion zones
   * If no zones: Use original land boundary
   */
  private buildBuildableArea(): turf.Feature<turf.Polygon | turf.MultiPolygon> {
    // If no zones, use legacy land boundary
    if (!this.zones || this.zones.length === 0) {
      const landCoords = this.landArea.coordinates.map(c => [c.lng, c.lat]);
      landCoords.push([this.landArea.coordinates[0].lng, this.landArea.coordinates[0].lat]);
      return turf.polygon([landCoords]);
    }

    // Get inclusion and exclusion zones
    const inclusionZones = this.zones.filter(z => z.zone_type === 'inclusion');
    const exclusionZones = this.zones.filter(z => z.zone_type === 'exclusion');

    console.log(`\n📍 Processing zones: ${inclusionZones.length} inclusion, ${exclusionZones.length} exclusion`);

    // Start with inclusion zones
    let buildableArea: turf.Feature<turf.Polygon | turf.MultiPolygon> | null = null;

    if (inclusionZones.length > 0) {
      // Union all inclusion zones
      for (const zone of inclusionZones) {
        const zoneCoords = zone.coordinates.map(c => [c.lng, c.lat]);
        // Close the polygon if not already closed
        if (zoneCoords[0][0] !== zoneCoords[zoneCoords.length - 1][0] ||
            zoneCoords[0][1] !== zoneCoords[zoneCoords.length - 1][1]) {
          zoneCoords.push(zoneCoords[0]);
        }
        const zonePoly = turf.polygon([zoneCoords]);

        if (buildableArea === null) {
          buildableArea = zonePoly;
        } else {
          try {
            const unionResult = turf.union(buildableArea, zonePoly);
            if (unionResult) {
              buildableArea = unionResult as turf.Feature<turf.Polygon | turf.MultiPolygon>;
            }
          } catch (error) {
            console.warn(`⚠️  Could not union inclusion zone "${zone.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      console.log(`   ✓ Combined ${inclusionZones.length} inclusion zone(s)`);
    } else {
      // Fallback: Use original land boundary if no inclusion zones
      console.log(`   ⚠️  No inclusion zones found, using land boundary`);
      const landCoords = this.landArea.coordinates.map(c => [c.lng, c.lat]);
      landCoords.push([this.landArea.coordinates[0].lng, this.landArea.coordinates[0].lat]);
      buildableArea = turf.polygon([landCoords]);
    }

    // Subtract exclusion zones
    if (exclusionZones.length > 0 && buildableArea) {
      for (const zone of exclusionZones) {
        const zoneCoords = zone.coordinates.map(c => [c.lng, c.lat]);
        // Close the polygon if not already closed
        if (zoneCoords[0][0] !== zoneCoords[zoneCoords.length - 1][0] ||
            zoneCoords[0][1] !== zoneCoords[zoneCoords.length - 1][1]) {
          zoneCoords.push(zoneCoords[0]);
        }
        const zonePoly = turf.polygon([zoneCoords]);

        try {
          const diffResult = turf.difference(buildableArea, zonePoly);
          if (diffResult) {
            buildableArea = diffResult as turf.Feature<turf.Polygon | turf.MultiPolygon>;
            console.log(`   ✓ Subtracted exclusion zone "${zone.name}"`);
          } else {
            console.warn(`   ⚠️  Exclusion zone "${zone.name}" removed all buildable area`);
          }
        } catch (error) {
          console.warn(`   ⚠️  Could not subtract exclusion zone "${zone.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    if (!buildableArea) {
      // Emergency fallback
      console.error('❌ Could not create buildable area from zones, using land boundary');
      const landCoords = this.landArea.coordinates.map(c => [c.lng, c.lat]);
      landCoords.push([this.landArea.coordinates[0].lng, this.landArea.coordinates[0].lat]);
      return turf.polygon([landCoords]);
    }

    return buildableArea;
  }

  /**
   * Main optimization method - generates optimal polyhouse layout
   */
  async optimize(): Promise<Polyhouse[]> {
    console.log('\n🏗️  Professional Polyhouse Optimizer V2');
    console.log('=' + '='.repeat(50));
    console.log(`Land area: ${(this.landArea.area / 10000).toFixed(2)} hectares (${this.landArea.area.toFixed(0)} sqm)`);

    // DSL RULE: SUN ORIENTATION IS MANDATORY (cannot be disabled)
    // Force enable solar orientation if not already enabled
    if (!this.config.solarOrientation) {
      this.config.solarOrientation = {
        enabled: true,
        latitudeDegrees: this.landArea.centroid.lat,
        allowedDeviationDegrees: 15,
      };
    } else if (!this.config.solarOrientation.enabled) {
      console.warn('⚠️  WARNING: solarOrientation.enabled was false - FORCING to true (DSL requirement)');
      this.config.solarOrientation.enabled = true;
    }
    console.log(`☀️  Sun orientation: ENABLED (lat: ${this.config.solarOrientation.latitudeDegrees.toFixed(2)}°) - MANDATORY for crop growth`);

    const startTime = Date.now();
    const polyhouses: Polyhouse[] = [];

    // Build buildable area from zones (or use land boundary if no zones)
    let landPolygon = this.buildBuildableArea();

    // Apply safety buffer (inward buffer to keep polyhouses away from edges)
    const safetyBuffer = this.config.safetyBuffer || 1.0;
    if (safetyBuffer > 0) {
      console.log(`\n📏 Applying ${safetyBuffer}m safety buffer from land boundary`);
      // Negative buffer creates inward buffer
      const buffered = turf.buffer(landPolygon, -safetyBuffer / 1000, { units: 'kilometers' });
      if (buffered) {
        landPolygon = buffered as any;
        console.log(`   ✓ Safety buffer applied - polyhouses will be ${safetyBuffer}m from edges`);
      } else {
        console.warn(`   ⚠ Could not apply safety buffer - land area may be too small`);
      }
    }

    // Generate candidate sizes (from large to small for cost efficiency)
    const allSizes = this.generateCandidateSizes();

    // DSL OPTIMIZATION STRATEGY (Priority Order):
    // 1. BUILD BIGGEST POLYHOUSES FIRST (maximize to 1 hectare)
    // 2. UNIFORM ORIENTATION (same direction for all - critical for cost)
    // 3. SUN ORIENTATION (mandatory for crop growth)
    // 4. EASE OF ACCESS (3m pathways, straight corridors)
    // 5. COST MINIMIZATION (fewer, larger, uniform = cheaper)
    // 6. SPACE UTILIZATION (60-65% target)
    // 7. Fill with smaller polyhouses ONLY if needed
    const landArea = this.landArea.area;
    const strategyName = "BIGGEST FIRST + UNIFORM ORIENTATION (5-10 structures @ 0.8-1.0 ha each)";

    // Use ONLY the largest sizes (8000-10000 sqm) - BUILD BIGGEST FIRST
    const minAreaForFirst = this.MAX_AREA * 0.8; // 8000+ sqm polyhouses only (0.8 - 1.0 hectare)
    const largeSizes = allSizes.filter(s => s.area >= minAreaForFirst);
    const candidateSizes = largeSizes.length > 0 ? largeSizes : allSizes.slice(0, 5);

    console.log(`\n📐 ${strategyName} for ${(landArea/10000).toFixed(1)} hectares`);
    console.log(`   🎯 DSL Priority: Build BIGGEST first, UNIFORM orientation, SUN aligned`);
    console.log(`   Target: ${this.TARGET_MIN_POLYHOUSES}-${this.TARGET_MAX_POLYHOUSES} polyhouses @ ${this.TARGET_COVERAGE}% coverage`);
    console.log(`   Using ${candidateSizes.length} large sizes: ${candidateSizes[0].gable}×${candidateSizes[0].gutter}=${candidateSizes[0].area}m² to ${candidateSizes[candidateSizes.length - 1].gable}×${candidateSizes[candidateSizes.length - 1].gutter}=${candidateSizes[candidateSizes.length - 1].area}m²`);

    // Use ULTRA FINE grid spacing to find more placement opportunities
    // For large polyhouses, we need to try many positions to find the sweet spot
    const avgDimension = (candidateSizes[0].gable + candidateSizes[0].gutter) / 2;
    const gridSpacing = Math.min(avgDimension * 0.2, 15); // Ultra fine: 20% of avg or max 15m

    console.log(`🎯 Using ULTRA FINE grid spacing: ${gridSpacing.toFixed(0)}m to test all possible positions`);

    // Get bounding box
    const bounds = turf.bbox(landPolygon);
    const [minLng, minLat, maxLng, maxLat] = bounds;

    // Convert to grid
    const latStep = gridSpacing / 111320;
    const lngStep = gridSpacing / (111320 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
    const cols = Math.ceil((maxLng - minLng) / lngStep);
    const rows = Math.ceil((maxLat - minLat) / latStep);

    console.log(`Grid: ${cols} × ${rows} = ${cols * rows} placement positions to try`);

    // Determine orientations based on strategy
    let orientations = this.getOrientations();

    // DSL RULE: UNIFORM ORIENTATION IS DEFAULT (can be overridden in settings/chat)
    // All polyhouses SHOULD face the same direction for:
    // 1. Lower construction cost (simpler build sequence)
    // 2. Better access pathways (straight corridors)
    // 3. Easier maintenance (uniform infrastructure)
    // 4. Sun orientation alignment (optimal for all polyhouses)
    // Mixed orientations increase cost and complexity significantly
    //
    // Configuration: optimization.orientationStrategy
    // - 'uniform' (default): All same direction - lowest cost
    // - 'varied': Mixed orientations - higher cost but may fit irregular land
    // - 'optimized': System decides based on land shape
    const orientationStrategy = this.config.optimization?.orientationStrategy || 'uniform';
    const allowMixedOrientations = orientationStrategy !== 'uniform';

    console.log(`📐 Orientation strategy: "${orientationStrategy}" (from config.optimization.orientationStrategy)`);

    if (!allowMixedOrientations) {
      // Uniform orientation: Find best single orientation for all polyhouses
      // This ensures better access road layout, infrastructure symmetry, and cost efficiency
      console.log('🔄 Finding best uniform orientation for all polyhouses (DEFAULT - lowest cost)...');
      orientations = [this.findBestGlobalOrientation(landPolygon, candidateSizes, orientations)];
      console.log(`   ✅ Using uniform orientation: ${orientations[0]}° (optimized for sun, access & cost)`);
    } else {
      // Mixed orientations: Each polyhouse can rotate independently to follow land contours
      // This enables "stepped" placement in slanting areas for maximum space utilization
      // WARNING: Higher cost and complexity - only use if land shape requires it
      console.log(`⚠️  Using MIXED ORIENTATIONS strategy (higher cost, use only if needed)`);
      console.log(`   Testing ${orientations.length} angles per position:`, orientations.map(o => `${o}°`).join(', '));
      console.log('   Note: This increases construction cost and complexity');
    }

    // Track occupied areas
    const occupiedPolygons: Feature<Polygon>[] = [];

    // Try to place polyhouses at each grid point
    let placedCount = 0;
    console.log('\n🏗️  Starting placement...');
    console.log('🎯 Strategy: Place 6-15 LARGE polyhouses only\n');

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Check if we've reached target
        const currentCoverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;

        // STOP if we've reached target coverage OR max polyhouse count
        if (currentCoverage >= this.TARGET_COVERAGE || polyhouses.length >= this.TARGET_MAX_POLYHOUSES) {
          console.log(`\n⛔ Stopping placement:`);
          if (currentCoverage >= this.TARGET_COVERAGE) {
            console.log(`   ✓ Reached target coverage: ${currentCoverage.toFixed(1)}%`);
          }
          if (polyhouses.length >= this.TARGET_MAX_POLYHOUSES) {
            console.log(`   ✓ Reached max polyhouses: ${polyhouses.length}`);
          }
          break;
        }

        const lat = minLat + row * latStep;
        const lng = minLng + col * lngStep;
        const position: Coordinate = { lat, lng };

        // Check if this position is within the land
        const point = turf.point([lng, lat]);
        if (!turf.booleanPointInPolygon(point, landPolygon)) {
          continue;
        }

        // IMPORTANT: Test ALL angles to find the BEST one for maximum utilization
        let bestPolyhouse: Polyhouse | null = null;
        let bestArea = 0;

        for (const rotation of orientations) {
          // Try each size from largest to smallest
          for (const size of candidateSizes) {
            const candidate: PolyhouseCandidate = {
              gableLength: size.gable,
              gutterWidth: size.gutter,
              area: size.area,
              position,
              rotation,
            };

            // Try to place this candidate
            const polyhouse = await this.tryPlacePolyhouse(candidate, landPolygon, occupiedPolygons);

            // Keep track of the largest polyhouse that fits at this position
            if (polyhouse && polyhouse.area > bestArea) {
              bestPolyhouse = polyhouse;
              bestArea = polyhouse.area;
            }

            // If we found a valid placement at this angle, move to next angle
            if (polyhouse) {
              break; // Try next angle with largest size
            }
          }
        }

        // Place the best polyhouse found at this position (if any)
        if (bestPolyhouse) {
          polyhouses.push(bestPolyhouse);

          // Add to occupied areas with corridor buffer (3m for better access)
          const buffered = this.createBufferedPolygon(bestPolyhouse, this.CORRIDOR_WIDTH);
          occupiedPolygons.push(buffered);

          placedCount++;
          const coverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
          console.log(`  ✓ Polyhouse #${placedCount}: ${bestPolyhouse.gableLength}×${bestPolyhouse.gutterWidth}m = ${bestPolyhouse.area.toFixed(0)}m² @ ${bestPolyhouse.rotation}° (coverage: ${coverage.toFixed(1)}%)`);
        }
      }

      // Break outer loop if we've reached targets
      const currentCoverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
      if (currentCoverage >= this.TARGET_COVERAGE || polyhouses.length >= this.TARGET_MAX_POLYHOUSES) {
        break;
      }
    }

    // Check if we've already reached target utilization
    let currentCoverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;

    console.log(`\n📊 Placement complete: ${polyhouses.length} large polyhouses, ${currentCoverage.toFixed(1)}% coverage`);

    // Check if gap-filling is enabled (default: true)
    const fillGaps = this.config.optimization?.fillGapsWithSmallerPolyhouses ?? true;

    if (!fillGaps) {
      // SKIP SECOND AND THIRD PASSES - User opted for FEWER, LARGER polyhouses only!
      console.log(`\n✅ Strategy: FEWER LARGE POLYHOUSES (gap-filling disabled by user)`);
      console.log(`   This reduces costs and simplifies construction/maintenance`);
      console.log(`   💡 Gap-filling is normally enabled by default for maximum coverage\n`);

      // Return immediately - NO second or third pass
      const finalCoverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
      const elapsedTime = Date.now() - startTime;

      console.log('=' + '='.repeat(50));
      console.log(`✅ Optimization complete in ${elapsedTime}ms`);
      console.log(`   Placed ${polyhouses.length} polyhouses (target: ${this.TARGET_MIN_POLYHOUSES}-${this.TARGET_MAX_POLYHOUSES})`);
      console.log(`   Land utilization: ${finalCoverage.toFixed(1)}% (target: ${this.TARGET_COVERAGE}%)`);
      console.log(`   Average polyhouse size: ${(polyhouses.reduce((sum, p) => sum + p.area, 0) / polyhouses.length).toFixed(0)} sqm`);
      console.log(`   Total polyhouse area: ${polyhouses.reduce((sum, p) => sum + p.area, 0).toFixed(0)} sqm`);
      console.log('=' + '='.repeat(50) + '\n');

      // Assign sequential labels and colors
      const labeledPolyhouses = assignLabelsAndColors(polyhouses);
      console.log(`   Labels assigned: ${labeledPolyhouses.map(p => p.label).join(', ')}`);

      return labeledPolyhouses;
    }

    // GAP-FILLING ENABLED: Add smaller polyhouses to fill remaining spaces
    console.log(`\n✅ Gap-filling ENABLED - Adding smaller polyhouses to fill remaining spaces...`);

    // SECOND PASS: Fill gaps with medium-sized polyhouses (4000-8000 sqm)
    if (currentCoverage < 85) {
      const minAreaForGapFill = minAreaForFirst * 0.4; // Lower threshold: 40% of max
      console.log(`\n🎯 SECOND PASS: Filling gaps with polyhouses ≥${minAreaForGapFill}m² (including large sizes)...`);

      // Include ALL sizes >= 4000 sqm (not just medium ones!)
      // This allows placing another large polyhouse if it fits
      const gapFillers = allSizes.filter(s => s.area >= minAreaForGapFill);

      if (gapFillers.length === 0) {
        console.log('  ⚠️ No suitable gap-filler sizes available, skipping second pass');
        return polyhouses;
      }

      console.log(`  Using ${gapFillers.length} large gap-fillers (${gapFillers[0].area}-${gapFillers[gapFillers.length - 1].area} sqm)`);

      // Use much coarser grid spacing for gap-filling (FAST performance)
      const mediumGridSpacing = Math.min(gridSpacing * 3, 30); // 3x coarser than first pass, max 30m
      const medLatStep = mediumGridSpacing / 111320;
      const medLngStep = mediumGridSpacing / (111320 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
      const medCols = Math.ceil((maxLng - minLng) / medLngStep);
      const medRows = Math.ceil((maxLat - minLat) / medLatStep);

      console.log(`  Grid: ${medCols} × ${medRows} = ${medCols * medRows} positions (using ${mediumGridSpacing.toFixed(0)}m spacing)`);

      let secondPassCount = 0;
      let secondPassIterations = 0;
      const maxGapFillers = 10; // Limit to 10 additional polyhouses for faster completion
      const maxIterations = Math.min(medCols * medRows, 500); // Safety limit - max 500 positions

      for (let row = 0; row < medRows; row++) {
        for (let col = 0; col < medCols; col++) {
          secondPassIterations++;

          // Safety check: prevent infinite loops
          if (secondPassIterations > maxIterations) {
            console.log(`  ⚠️ Reached iteration limit (${maxIterations}) - stopping second pass`);
            break;
          }

          // Stop if we've reached excellent utilization or max limit
          const currentUtilization = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
          if (currentUtilization >= 85 || secondPassCount >= maxGapFillers) {
            if (secondPassCount >= maxGapFillers) {
              console.log(`  ⚠️ Reached limit of ${maxGapFillers} gap-filler polyhouses`);
            } else {
              console.log(`  ✅ Excellent utilization (${currentUtilization.toFixed(1)}%) - stopping second pass`);
            }
            break;
          }

          // Progress logging every 50 iterations for faster feedback
          if (secondPassIterations % 50 === 0) {
            console.log(`  ... checked ${secondPassIterations}/${maxIterations} positions, placed ${secondPassCount} polyhouses`);
          }
          const lat = minLat + row * medLatStep;
          const lng = minLng + col * medLngStep;
          const position: Coordinate = { lat, lng };

          const point = turf.point([lng, lat]);
          if (!turf.booleanPointInPolygon(point, landPolygon)) {
            continue;
          }

          // Test limited angles for faster gap-filling (use same orientations as placed polyhouses)
          let bestPolyhouse: Polyhouse | null = null;
          let bestArea = 0;

          // For gap-filling, only test 1-3 main orientations instead of all angles
          const gapFillingOrientations = orientations.length > 3 ? [orientations[0], orientations[Math.floor(orientations.length / 2)]] : orientations;

          for (const rotation of gapFillingOrientations) {
            for (const size of gapFillers) {
              const candidate: PolyhouseCandidate = {
                gableLength: size.gable,
                gutterWidth: size.gutter,
                area: size.area,
                position,
                rotation,
              };

              const polyhouse = await this.tryPlacePolyhouse(candidate, landPolygon, occupiedPolygons);

              if (polyhouse && polyhouse.area > bestArea) {
                bestPolyhouse = polyhouse;
                bestArea = polyhouse.area;
              }

              if (polyhouse) {
                break; // Try next angle
              }
            }
          }

          // Place the best polyhouse found at this position (if any)
          if (bestPolyhouse) {
            polyhouses.push(bestPolyhouse);
            const buffered = this.createBufferedPolygon(bestPolyhouse, this.CORRIDOR_WIDTH);
            occupiedPolygons.push(buffered);
            secondPassCount++;

            currentCoverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
            if (secondPassCount % 2 === 0) {
              console.log(`  +${secondPassCount} polyhouses (${currentCoverage.toFixed(1)}%)`);
            }
          }
        }
        // Break outer loop if limit reached
        if (secondPassCount >= maxGapFillers || secondPassIterations > maxIterations) break;
      }

      console.log(`  ✅ Second pass: +${secondPassCount} polyhouses (checked ${secondPassIterations} positions)`);
    }

    // THIRD PASS: Fill remaining gaps with SMALL polyhouses if coverage < 70%
    currentCoverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;

    if (currentCoverage < 70) {
      console.log(`\n🎯 THIRD PASS: Filling remaining gaps with SMALL polyhouses (500-2500 sqm)...`);

      // Use small polyhouses to maximize utilization
      const smallSizes = allSizes.filter(s => s.area >= 500 && s.area <= 2500);

      if (smallSizes.length > 0) {
        console.log(`  Using ${smallSizes.length} small sizes (${smallSizes[smallSizes.length - 1].area}-${smallSizes[0].area} sqm)`);

        // Use coarse grid for small polyhouses (FAST performance)
        const smallGridSpacing = Math.min(gridSpacing * 2, 20); // 2x coarser, max 20m
        const smallLatStep = smallGridSpacing / 111320;
        const smallLngStep = smallGridSpacing / (111320 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
        const smallCols = Math.ceil((maxLng - minLng) / smallLngStep);
        const smallRows = Math.ceil((maxLat - minLat) / smallLatStep);

        console.log(`  Grid: ${smallCols} × ${smallRows} = ${smallCols * smallRows} positions (using ${smallGridSpacing.toFixed(0)}m spacing)`);

        let thirdPassCount = 0;
        let thirdPassIterations = 0;
        const maxSmallPolyhouses = 10; // Limit to 10 small polyhouses for faster completion
        const maxIterations = Math.min(smallCols * smallRows, 400); // Safety limit - max 400 positions

        for (let row = 0; row < smallRows; row++) {
          for (let col = 0; col < smallCols; col++) {
            thirdPassIterations++;

            // Safety check: prevent infinite loops
            if (thirdPassIterations > maxIterations) {
              console.log(`  ⚠️ Reached iteration limit (${maxIterations}) - stopping third pass`);
              break;
            }

            const currentUtilization = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
            if (currentUtilization >= 75 || thirdPassCount >= maxSmallPolyhouses) {
              if (currentUtilization >= 75) {
                console.log(`  ✅ Good utilization (${currentUtilization.toFixed(1)}%) - stopping third pass`);
              }
              break;
            }

            // Progress logging every 50 iterations for faster feedback
            if (thirdPassIterations % 50 === 0) {
              console.log(`  ... checked ${thirdPassIterations}/${maxIterations} positions, placed ${thirdPassCount} small polyhouses`);
            }

            const lat = minLat + row * smallLatStep;
            const lng = minLng + col * smallLngStep;
            const position: Coordinate = { lat, lng };

            const point = turf.point([lng, lat]);
            if (!turf.booleanPointInPolygon(point, landPolygon)) {
              continue;
            }

            let bestPolyhouse: Polyhouse | null = null;
            let bestArea = 0;

            // For small polyhouses, only test main orientation for speed
            const smallPolyhouseOrientations = orientations.length > 1 ? [orientations[0]] : orientations;

            for (const rotation of smallPolyhouseOrientations) {
              for (const size of smallSizes) {
                const candidate: PolyhouseCandidate = {
                  gableLength: size.gable,
                  gutterWidth: size.gutter,
                  area: size.area,
                  position,
                  rotation,
                };

                const polyhouse = await this.tryPlacePolyhouse(candidate, landPolygon, occupiedPolygons);

                if (polyhouse && polyhouse.area > bestArea) {
                  bestPolyhouse = polyhouse;
                  bestArea = polyhouse.area;
                }

                if (polyhouse) break;
              }
            }

            if (bestPolyhouse) {
              polyhouses.push(bestPolyhouse);
              const buffered = this.createBufferedPolygon(bestPolyhouse, this.CORRIDOR_WIDTH);
              occupiedPolygons.push(buffered);
              thirdPassCount++;

              if (thirdPassCount % 3 === 0) {
                const coverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
                console.log(`  +${thirdPassCount} small polyhouses (${coverage.toFixed(1)}%)`);
              }
            }
          }

          if (thirdPassCount >= maxSmallPolyhouses || thirdPassIterations > maxIterations) break;
        }

        console.log(`  ✅ Third pass: +${thirdPassCount} small polyhouses (checked ${thirdPassIterations} positions)`);
      }
    }

    // Calculate final results
    const finalCoverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
    const elapsedTime = Date.now() - startTime;

    console.log('\n' + '='.repeat(52));
    console.log(`✅ Optimization complete in ${elapsedTime}ms`);
    console.log(`   Placed ${polyhouses.length} polyhouses`);
    console.log(`   Land utilization: ${finalCoverage.toFixed(1)}%`);
    console.log(`   Total polyhouse area: ${polyhouses.reduce((sum, p) => sum + p.area, 0).toFixed(0)} sqm`);
    console.log('='.repeat(52) + '\n');

    // Assign sequential labels and colors
    const labeledPolyhouses = assignLabelsAndColors(polyhouses);
    console.log(`   Labels assigned: ${labeledPolyhouses.map(p => p.label).join(', ')}`);

    return labeledPolyhouses;
  }

  /**
   * Generate candidate polyhouse sizes based on industry standards
   * STRATEGY: Prioritize sizes close to 10,000 sqm (1 hectare)
   */
  private generateCandidateSizes(): Array<{gable: number; gutter: number; area: number}> {
    const sizes: Array<{gable: number; gutter: number; area: number}> = [];

    // Generate all valid combinations
    // Gable: 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120...
    // Gutter: 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120

    for (let gable = this.GABLE_MODULE; gable <= 120; gable += this.GABLE_MODULE) {
      for (let gutter = this.GUTTER_MODULE; gutter <= 120; gutter += this.GUTTER_MODULE) {
        const area = gable * gutter;

        // Must not exceed maximum area (10,000 sqm = 1 hectare)
        if (area <= this.MAX_AREA) {
          sizes.push({ gable, gutter, area });
        }
      }
    }

    // Sort by area (largest first) - prioritize 10,000 sqm polyhouses
    sizes.sort((a, b) => b.area - a.area);

    return sizes;
  }

  /**
   * Get orientations to try based on configuration
   */
  /**
   * Find the best single orientation for all polyhouses
   * Tests a sample of positions with each orientation and returns the one with maximum coverage
   */
  private findBestGlobalOrientation(
    landPolygon: Feature<Polygon>,
    candidateSizes: any[],
    orientations: number[]
  ): number {
    const bounds = turf.bbox(landPolygon);
    const [minLng, minLat, maxLng, maxLat] = bounds;

    // Sample 5x5 grid of positions
    const testPositions: Coordinate[] = [];
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4; j++) {
        const lat = minLat + (maxLat - minLat) * i / 4;
        const lng = minLng + (maxLng - minLng) * j / 4;
        const point = turf.point([lng, lat]);
        if (turf.booleanPointInPolygon(point, landPolygon)) {
          testPositions.push({ lat, lng });
        }
      }
    }

    let bestOrientation = 0;
    let bestTotalArea = 0;

    // Test each orientation
    for (const rotation of orientations) {
      let totalArea = 0;

      // Try placing largest polyhouse at each test position with this orientation
      for (const position of testPositions) {
        const candidate: PolyhouseCandidate = {
          gableLength: candidateSizes[0].gable,
          gutterWidth: candidateSizes[0].gutter,
          area: candidateSizes[0].area,
          position,
          rotation,
        };

        const rectangle = this.createRectangle(candidate);
        if (this.isValidPlacement(rectangle, landPolygon, [])) {
          totalArea += candidate.area;
        }
      }

      if (totalArea > bestTotalArea) {
        bestTotalArea = totalArea;
        bestOrientation = rotation;
      }
    }

    return bestOrientation;
  }

  private getOrientations(): number[] {
    const strategy = this.config.optimization.orientationStrategy || 'optimized';
    const latitude = this.config.solarOrientation.latitudeDegrees;

    // For solar optimization, gutters should face east-west
    // This means gable (long side) runs north-south
    // Optimal orientation depends on latitude and land shape

    if (strategy === 'uniform') {
      // Single orientation: Based on latitude
      // For northern hemisphere (lat > 0): prefer 90° (N-S)
      // For southern hemisphere (lat < 0): prefer 90° (N-S)
      return [90];
    } else if (strategy === 'varied') {
      // Two primary orientations
      return [0, 90];
    } else {
      // COMPREHENSIVE ANGLE TESTING for maximum utilization
      // Test every 10 degrees to find the angle that best fits the plot shape
      // This ensures we find the optimal orientation for ANY plot shape
      const angles: number[] = [];
      for (let angle = 0; angle < 180; angle += 10) {
        angles.push(angle);
      }
      return angles; // 0, 10, 20, 30, ..., 170 degrees (18 angles)
    }
  }

  /**
   * Try to place a polyhouse candidate
   */
  private async tryPlacePolyhouse(
    candidate: PolyhouseCandidate,
    landPolygon: Feature<Polygon>,
    occupiedAreas: Feature<Polygon>[]
  ): Promise<Polyhouse | null> {
    // Check minimum blocks constraint BEFORE creating the polyhouse
    const numBlocks = (candidate.gableLength / this.GABLE_MODULE) * (candidate.gutterWidth / this.GUTTER_MODULE);
    const minimumBlocks = this.config.minimumBlocksPerPolyhouse || 10;

    if (numBlocks < minimumBlocks) {
      // Skip polyhouses that don't meet minimum blocks requirement
      return null;
    }

    // Create rectangle at position with rotation
    const rectangle = this.createRectangle(candidate);

    // Validate placement
    if (!this.isValidPlacement(rectangle, landPolygon, occupiedAreas)) {
      return null;
    }

    // Create polyhouse object
    const polyhouse: Polyhouse = {
      id: `polyhouse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      gableLength: candidate.gableLength,
      gutterWidth: candidate.gutterWidth,
      rotation: candidate.rotation,
      center: candidate.position,
      area: candidate.area,
      innerArea: candidate.area,
      dimensions: {
        length: candidate.gableLength,
        width: candidate.gutterWidth,
      },
      bounds: rectangle.corners,
      blocks: this.generateBlocks(candidate),
      label: '', // Will be assigned later
      color: '', // Will be assigned later
    };

    return polyhouse;
  }

  /**
   * Create a rectangle with given dimensions and rotation
   */
  private createRectangle(candidate: PolyhouseCandidate): {
    corners: Point[];
    polygon: Feature<Polygon>;
  } {
    const { position, gableLength, gutterWidth, rotation } = candidate;
    const angleRad = (rotation * Math.PI) / 180;

    // Half dimensions
    const halfGable = gableLength / 2;
    const halfGutter = gutterWidth / 2;

    // Create corners in local coordinates (unrotated)
    const localCorners = [
      { x: -halfGable, y: -halfGutter },  // Bottom-left
      { x: halfGable, y: -halfGutter },   // Bottom-right
      { x: halfGable, y: halfGutter },    // Top-right
      { x: -halfGable, y: halfGutter },   // Top-left
    ];

    // Rotate and translate to geographic coordinates
    const corners: Point[] = localCorners.map(corner => {
      // Rotate
      const rotatedX = corner.x * Math.cos(angleRad) - corner.y * Math.sin(angleRad);
      const rotatedY = corner.x * Math.sin(angleRad) + corner.y * Math.cos(angleRad);

      // Convert to geographic coordinates
      const lng = position.lng + rotatedX / (111320 * Math.cos(position.lat * Math.PI / 180));
      const lat = position.lat + rotatedY / 111320;

      return { x: lng, y: lat };
    });

    // Create polygon
    const coords = corners.map(c => [c.x, c.y]);
    coords.push([corners[0].x, corners[0].y]); // Close the polygon
    const polygon = turf.polygon([coords]);

    return { corners, polygon };
  }

  /**
   * Validate polyhouse placement
   */
  private isValidPlacement(
    rectangle: { polygon: Feature<Polygon> },
    landPolygon: Feature<Polygon>,
    occupiedAreas: Feature<Polygon>[]
  ): boolean {
    // Must be completely within land boundary
    // Use booleanContains to check if landPolygon completely contains the rectangle
    try {
      if (!turf.booleanContains(landPolygon, rectangle.polygon)) {
        // Also try booleanWithin as fallback (they should be equivalent but turf.js can be quirky)
        if (!turf.booleanWithin(rectangle.polygon, landPolygon)) {
          return false;
        }
      }
    } catch (error) {
      // If there's a geometry error, reject the placement
      return false;
    }

    // CRITICAL: Must not overlap with water bodies or restricted zones
    if (this.terrainData && this.terrainData.restrictedAreas) {
      for (const restrictedZone of this.terrainData.restrictedAreas) {
        // Only block placement for truly unbuildable zones (water bodies with 'prohibited' severity)
        if (restrictedZone.type === 'water' && restrictedZone.severity === 'prohibited') {
          try {
            // Create polygon from restricted zone coordinates
            const restrictedCoords = restrictedZone.coordinates.map((c: any) => [c.lng, c.lat]);
            if (restrictedCoords.length >= 3) {
              restrictedCoords.push(restrictedCoords[0]); // Close the polygon
              const restrictedPolygon = turf.polygon([restrictedCoords]);

              // Check for any overlap
              if (
                turf.booleanOverlap(rectangle.polygon, restrictedPolygon) ||
                turf.booleanContains(restrictedPolygon, rectangle.polygon) ||
                turf.booleanContains(rectangle.polygon, restrictedPolygon) ||
                turf.booleanIntersects(rectangle.polygon, restrictedPolygon)
              ) {
                return false; // Cannot build on water
              }
            }
          } catch (error) {
            // If polygon is invalid, skip it
            console.warn('Invalid restricted zone polygon:', error);
          }
        }
      }
    }

    // Must not overlap with occupied areas (which include corridor buffers)
    for (const occupied of occupiedAreas) {
      if (
        turf.booleanOverlap(rectangle.polygon, occupied) ||
        turf.booleanContains(occupied, rectangle.polygon) ||
        turf.booleanContains(rectangle.polygon, occupied)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create buffered polygon around polyhouse (for corridor spacing)
   */
  private createBufferedPolygon(polyhouse: Polyhouse, bufferMeters: number): Feature<Polygon> {
    const coords = polyhouse.bounds.map(p => [p.x, p.y]);
    coords.push([polyhouse.bounds[0].x, polyhouse.bounds[0].y]);
    const polygon = turf.polygon([coords]);
    const buffered = turf.buffer(polygon, bufferMeters, { units: 'meters' });
    return buffered as Feature<Polygon>;
  }

  /**
   * Generate 8x4 grid blocks for visualization
   */
  private generateBlocks(candidate: PolyhouseCandidate): Block[] {
    const blocks: Block[] = [];
    const { gableLength, gutterWidth, position, rotation } = candidate;

    const numGableBays = gableLength / this.GABLE_MODULE;
    const numGutterBays = gutterWidth / this.GUTTER_MODULE;

    const angleRad = (rotation * Math.PI) / 180;
    const halfGable = gableLength / 2;
    const halfGutter = gutterWidth / 2;

    // Generate blocks in a grid
    for (let i = 0; i < numGableBays; i++) {
      for (let j = 0; j < numGutterBays; j++) {
        // Block position in local coordinates (relative to polyhouse center)
        const localX = -halfGable + i * this.GABLE_MODULE;
        const localY = -halfGutter + j * this.GUTTER_MODULE;

        // Block corners in local coordinates
        const blockCorners = [
          { x: localX, y: localY },
          { x: localX + this.GABLE_MODULE, y: localY },
          { x: localX + this.GABLE_MODULE, y: localY + this.GUTTER_MODULE },
          { x: localX, y: localY + this.GUTTER_MODULE },
        ];

        // Rotate and convert to geographic coordinates
        const geoCorners = blockCorners.map(corner => {
          const rotatedX = corner.x * Math.cos(angleRad) - corner.y * Math.sin(angleRad);
          const rotatedY = corner.x * Math.sin(angleRad) + corner.y * Math.cos(angleRad);

          const lng = position.lng + rotatedX / (111320 * Math.cos(position.lat * Math.PI / 180));
          const lat = position.lat + rotatedY / 111320;

          return { x: lng, y: lat };
        });

        const block: Block = {
          id: `block-${i}-${j}`,
          position: { x: localX, y: localY },
          width: this.GABLE_MODULE,
          height: this.GUTTER_MODULE,
          rotation: rotation,
          corners: geoCorners,
        };

        blocks.push(block);
      }
    }

    return blocks;
  }
}
