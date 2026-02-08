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

  // Industry-standard dimensions
  private readonly GABLE_MODULE = 8;     // 8m gable bay
  private readonly GUTTER_MODULE = 4;    // 4m gutter bay
  private readonly MAX_AREA = 10000;     // 10,000 sqm = 1 hectare
  private readonly CORRIDOR_WIDTH = 3;   // 3m between polyhouses for better access
  private readonly TARGET_MIN_POLYHOUSES = 6;  // Minimum 6 polyhouses (like manual design)
  private readonly TARGET_MAX_POLYHOUSES = 15; // Maximum 15 polyhouses
  private readonly TARGET_COVERAGE = 65;       // Target 65% coverage (industry standard)

  constructor(landArea: LandArea, config: PolyhouseConfiguration, terrainData?: any) {
    this.config = config;
    this.landArea = landArea;
    this.terrainData = terrainData;

    if (terrainData) {
      console.log(`🌍 Terrain data loaded: ${terrainData.restrictedAreas?.length || 0} restricted zones`);
    }
  }

  /**
   * Main optimization method - generates optimal polyhouse layout
   */
  async optimize(): Promise<Polyhouse[]> {
    console.log('\n🏗️  Professional Polyhouse Optimizer V2');
    console.log('=' + '='.repeat(50));
    console.log(`Land area: ${(this.landArea.area / 10000).toFixed(2)} hectares (${this.landArea.area.toFixed(0)} sqm)`);

    const startTime = Date.now();
    const polyhouses: Polyhouse[] = [];

    // Create land polygon for validation
    const landCoords = this.landArea.coordinates.map(c => [c.lng, c.lat]);
    landCoords.push([this.landArea.coordinates[0].lng, this.landArea.coordinates[0].lat]);
    let landPolygon = turf.polygon([landCoords]);

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

    // STRATEGY: Place FEWER, LARGER polyhouses (like manual design with only 6-15 structures)
    // Manual design shows 6 large polyhouses (~5000-6000 sqm each) is optimal
    const landArea = this.landArea.area;
    const strategyName = "FEWER LARGE POLYHOUSES (6-15 structures, 5000-10000 sqm each)";

    // Use ONLY the largest sizes (5000-10000 sqm) for maximum cost efficiency
    const minAreaForFirst = this.MAX_AREA * 0.5; // 5000+ sqm polyhouses only
    const largeSizes = allSizes.filter(s => s.area >= minAreaForFirst);
    const candidateSizes = largeSizes.length > 0 ? largeSizes : allSizes.slice(0, 10);

    console.log(`\n📐 ${strategyName} for ${(landArea/10000).toFixed(1)} hectares`);
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
    // Enable mixed orientations for better space utilization in slanting/irregular areas
    // This allows "stepped" placement following land contours (like manual design)
    const allowMixedOrientations = true;

    if (!allowMixedOrientations) {
      // Uniform orientation: Find best single orientation for all polyhouses
      // This ensures better access road layout and infrastructure symmetry
      console.log('🔄 Finding best uniform orientation for all polyhouses...');
      orientations = [this.findBestGlobalOrientation(landPolygon, candidateSizes, orientations)];
      console.log(`   Using uniform orientation: ${orientations[0]}° (better for access roads & infrastructure)`);
    } else {
      // Mixed orientations: Each polyhouse can rotate independently to follow land contours
      // This enables "stepped" placement in slanting areas for maximum space utilization
      console.log(`🔄 Using MIXED ORIENTATIONS strategy (stepped placement in slanting areas)`);
      console.log(`   Testing ${orientations.length} angles per position:`, orientations.map(o => `${o}°`).join(', '));
      console.log('   This maximizes space utilization by following land contours');
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

    // SKIP SECOND AND THIRD PASSES - We want FEWER, LARGER polyhouses only!
    // Manual design shows 6 large polyhouses is optimal for cost and maintenance
    console.log(`\n✅ Strategy: FEWER LARGE POLYHOUSES (no gap-filling with small structures)`);
    console.log(`   This reduces costs and simplifies construction/maintenance\n`);

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

    // OLD CODE BELOW - DISABLED (second and third passes create too many small polyhouses)
    /*
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

      // Use similar grid spacing as first pass
      const mediumGridSpacing = gridSpacing;
      const medLatStep = mediumGridSpacing / 111320;
      const medLngStep = mediumGridSpacing / (111320 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
      const medCols = Math.ceil((maxLng - minLng) / medLngStep);
      const medRows = Math.ceil((maxLat - minLat) / medLatStep);

      console.log(`  Grid: ${medCols} × ${medRows} = ${medCols * medRows} positions`);

      let secondPassCount = 0;
      const maxGapFillers = 20; // Allow enough polyhouses for good coverage

      for (let row = 0; row < medRows; row++) {
        for (let col = 0; col < medCols; col++) {
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
          const lat = minLat + row * medLatStep;
          const lng = minLng + col * medLngStep;
          const position: Coordinate = { lat, lng };

          const point = turf.point([lng, lat]);
          if (!turf.booleanPointInPolygon(point, landPolygon)) {
            continue;
          }

          // Test ALL angles to find the best one
          let bestPolyhouse: Polyhouse | null = null;
          let bestArea = 0;

          for (const rotation of orientations) {
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
        if (secondPassCount >= maxGapFillers) break;
      }

      console.log(`  ✅ Second pass: +${secondPassCount} polyhouses`);
    }

    // THIRD PASS: Fill remaining gaps with SMALL polyhouses if coverage < 70%
    currentCoverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;

    if (currentCoverage < 70) {
      console.log(`\n🎯 THIRD PASS: Filling remaining gaps with SMALL polyhouses (500-2500 sqm)...`);

      // Use small polyhouses to maximize utilization
      const smallSizes = allSizes.filter(s => s.area >= 500 && s.area <= 2500);

      if (smallSizes.length > 0) {
        console.log(`  Using ${smallSizes.length} small sizes (${smallSizes[smallSizes.length - 1].area}-${smallSizes[0].area} sqm)`);

        // Use finer grid for small polyhouses
        const smallGridSpacing = Math.min(gridSpacing * 0.5, 8); // Even finer grid
        const smallLatStep = smallGridSpacing / 111320;
        const smallLngStep = smallGridSpacing / (111320 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
        const smallCols = Math.ceil((maxLng - minLng) / smallLngStep);
        const smallRows = Math.ceil((maxLat - minLat) / smallLatStep);

        console.log(`  Grid: ${smallCols} × ${smallRows} = ${smallCols * smallRows} positions`);

        let thirdPassCount = 0;
        const maxSmallPolyhouses = 30;

        for (let row = 0; row < smallRows; row++) {
          for (let col = 0; col < smallCols; col++) {
            const currentUtilization = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
            if (currentUtilization >= 75 || thirdPassCount >= maxSmallPolyhouses) {
              if (currentUtilization >= 75) {
                console.log(`  ✅ Good utilization (${currentUtilization.toFixed(1)}%) - stopping third pass`);
              }
              break;
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

            for (const rotation of orientations) {
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

          if (thirdPassCount >= maxSmallPolyhouses) break;
        }

        console.log(`  ✅ Third pass: +${thirdPassCount} small polyhouses`);
      }
    }

    // OLD CODE - commented out (creates too many small polyhouses)
    const finalCoverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
    const elapsedTime = Date.now() - startTime;

    console.log('\n' + '='.repeat(52));
    console.log(`✅ Optimization complete in ${elapsedTime}ms`);
    console.log(`   Placed ${polyhouses.length} polyhouses`);
    console.log(`   Land utilization: ${finalCoverage.toFixed(1)}%`);
    console.log(`   Total polyhouse area: ${polyhouses.reduce((sum, p) => sum + p.area, 0).toFixed(0)} sqm`);
    console.log('='.repeat(52) + '\n');

    // Assign sequential labels and colors (A, B, C... without gaps)
    const labeledPolyhouses = assignLabelsAndColors(polyhouses);
    console.log(`   Labels assigned: ${labeledPolyhouses.map(p => p.label).join(', ')}`);

    return labeledPolyhouses;
    */
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
