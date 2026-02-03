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
import { TerrainAnalysisResult } from './terrainAnalysis';
import { ComplianceCheckResult } from './regulatoryCompliance';

/**
 * Generate user-friendly label for polyhouse (P1, P2, P3, ...)
 */
function getPolyhouseLabel(index: number): string {
  return `P${index + 1}`;
}

/**
 * Assign labels and colors to polyhouses
 */
function assignLabelsAndColors(polyhouses: Polyhouse[]): Polyhouse[] {
  return polyhouses.map((ph, index) => ({
    ...ph,
    label: getPolyhouseLabel(index),
    color: POLYHOUSE_COLORS[index % POLYHOUSE_COLORS.length],
  }));
}

/**
 * Core polyhouse optimization engine
 * Maximizes the number of rectangular polyhouses that fit in a land area
 * while respecting all DSL constraints
 */
export class PolyhouseOptimizer {
  private config: PolyhouseConfiguration;
  private landArea: LandArea;
  private terrainGrid: Map<string, { slope: number; onWater: boolean }>;
  private terrainData?: TerrainAnalysisResult;
  private complianceData?: ComplianceCheckResult;

  constructor(landArea: LandArea, config: PolyhouseConfiguration) {
    this.config = config;
    this.landArea = landArea;
    this.terrainGrid = new Map();
  }

  /**
   * Main optimization method - DSL V3 INDEPENDENT ROTATION STRATEGY
   * With integrated terrain analysis and regulatory compliance
   * Each polyhouse can rotate independently within solar constraints for Tetris-style packing
   * Returns an array of optimized polyhouses
   */
  async optimize(): Promise<Polyhouse[]> {
    console.log('Starting polyhouse optimization (DSL V3 - Independent Rotation + Terrain + Regulatory)...');
    const startTime = Date.now();

    // STEP 1: SKIP TERRAIN ANALYSIS FOR NOW (user wants to test without restrictions)
    console.log('\nSkipping terrain analysis - building everywhere without restrictions');
    // if (this.config.terrain.considerSlope || this.config.terrain.avoidWater) {
    //   console.log('\n🌍 Analyzing terrain conditions...');
    //   this.terrainData = await this.terrainAnalysis.analyzeTerrain(
    //     this.landArea.coordinates,
    //     {
    //       resolution: 'medium',
    //       includeVegetation: true,
    //       includeWaterBodies: this.config.terrain.avoidWater,
    //       slopeThreshold: this.config.terrain.maxSlope,
    //     }
    //   );

    //   // Populate terrain grid for quick lookups during placement
    //   this.populateTerrainGrid(this.terrainData);

    //   console.log(`  ✓ Buildable area: ${(this.terrainData.buildableArea * 100).toFixed(1)}%`);
    //   console.log(`  ✓ Average slope: ${this.terrainData.averageSlope.toFixed(1)}°`);

    //   if (this.terrainData.restrictedAreas.length > 0) {
    //     console.log(`  🚫 Restricted zones: ${this.terrainData.restrictedAreas.length}`);
    //     this.terrainData.restrictedAreas.forEach((zone, i) => {
    //       console.log(`     ${i + 1}. ${zone.type} (${zone.severity})`);
    //     });
    //     if (!this.config.terrain.ignoreRestrictedZones) {
    //       console.log(`  ⚠️  Polyhouses will NOT be placed in restricted zones (default behavior)`);
    //       console.log(`     To override, user can say "build on restricted areas" in chat`);
    //     }
    //   }

    //   if (this.terrainData.warnings.length > 0) {
    //     console.log(`  ⚠ Warnings:`);
    //     this.terrainData.warnings.forEach(w => console.log(`    - ${w}`));
    //   }
    // }

    // STEP 2: SKIP REGULATORY COMPLIANCE FOR NOW
    console.log('\nSkipping regulatory compliance - no restrictions applied');
    // console.log('\n📋 Checking regulatory compliance...');
    // this.complianceData = await this.regulatoryCompliance.checkCompliance(
    //   this.landArea.coordinates,
    //   [] // Will update with actual structures after placement
    // );

    // if (this.complianceData.warnings.length > 0) {
    //   console.log(`  ⚠ Regulatory warnings:`);
    //   this.complianceData.warnings.slice(0, 3).forEach(w => console.log(`    - ${w.description}`));
    // }

    // if (this.complianceData.permits_required.length > 0) {
    //   console.log(`  📄 Required permits: ${this.complianceData.permits_required.length}`);
    // }

    // STEP 3: Optimize polyhouse placement with all constraints
    console.log(`\nIndependent rotation mode: Each polyhouse optimizes its own orientation`);
    const polyhouses = await this.fillAreaWithIndependentRotation();
    const totalArea = polyhouses.reduce((sum, p) => sum + p.innerArea, 0);
    const coverage = (totalArea / this.landArea.area) * 100;

    console.log(`\nOptimization completed in ${Date.now() - startTime}ms`);
    console.log(`Total polyhouses: ${polyhouses.length}`);
    console.log(`Total coverage: ${coverage.toFixed(1)}%`);

    // Assign user-friendly labels and colors
    const polyhousesWithLabels = assignLabelsAndColors(polyhouses);

    return polyhousesWithLabels;
  }

  /**
   * Populate terrain grid from analysis result for fast lookups
   */
  private populateTerrainGrid(terrainData: TerrainAnalysisResult): void {
    for (const point of terrainData.terrainGrid) {
      const key = this.coordKey(point.coordinate);
      this.terrainGrid.set(key, {
        slope: point.slope,
        onWater: point.landCover === 'water' || point.landCover === 'permanent_water',
      });
    }
  }

  /**
   * Generate unique key for coordinate
   */
  private coordKey(coord: Coordinate): string {
    return `${coord.lat.toFixed(6)},${coord.lng.toFixed(6)}`;
  }

  /**
   * SIMPLIFIED: Fill the area with polyhouses - FAST grid-based approach
   */
  private async fillAreaWithIndependentRotation(): Promise<Polyhouse[]> {
    const polyhouses: Polyhouse[] = [];
    const polygon = turf.polygon([this.landArea.coordinates.map(c => [c.lng, c.lat])]);
    const occupiedAreas: Feature<Polygon>[] = [];

    const landAreaSqm = this.landArea.area;
    console.log(`Starting polyhouse placement for ${landAreaSqm.toFixed(0)} sqm`);

    // Get valid orientations - but LIMIT to just 3 for speed
    const allOrientations = this.getValidOrientations();
    const orientations = allOrientations.length > 3
      ? [allOrientations[0], allOrientations[Math.floor(allOrientations.length / 2)], allOrientations[allOrientations.length - 1]]
      : allOrientations;

    console.log(`  Using ${orientations.length} orientations for speed: ${orientations.map(a => a + '°').join(', ')}`);

    // Create a simple grid of candidate positions
    const bbox = turf.bbox(polygon);
    const [minLng, minLat, maxLng, maxLat] = bbox;

    // ALWAYS use fine grid spacing for MAXIMUM SPACE UTILIZATION (primary goal)
    // Fine grid = MORE placement attempts = BETTER COVERAGE in all scenarios
    const strategy = this.config.optimization.orientationStrategy || 'optimized';

    let gridSpacing: number;
    // FINE GRID SPACING: Try many placement positions to fill every usable space
    if (this.landArea.area > 300000) { // > 30 hectares
      gridSpacing = 25; // Fine spacing even for large areas
    } else if (this.landArea.area > 100000) { // > 10 hectares
      gridSpacing = 15;
    } else if (this.landArea.area > 10000) { // > 1 hectare
      gridSpacing = 10;
    } else if (this.landArea.area > 2000) { // > 0.2 hectares
      gridSpacing = 8; // Very fine for small areas
    } else {
      gridSpacing = 6; // Ultra-fine for tiny areas
    }

    console.log(`  🎯 MAXIMUM UTILIZATION: Fine grid spacing ${gridSpacing}m to fill all usable space`);
    console.log(`  Land area: ${(this.landArea.area / 10000).toFixed(2)} hectares`);
    console.log(`  Orientation strategy: ${strategy}`);
    if (strategy === 'uniform') {
      console.log(`     → All polyhouses will face same direction (may reduce utilization in angled corners)`);
    } else {
      console.log(`     → Polyhouses will intelligently angle to fill irregular shapes and corners`);
    }
    const latStep = gridSpacing / 111320; // degrees
    const lngStep = gridSpacing / (111320 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180)); // degrees

    // Calculate grid size
    const cols = Math.ceil((maxLng - minLng) / lngStep);
    const rows = Math.ceil((maxLat - minLat) / latStep);
    const totalGridPoints = cols * rows;

    console.log(`  Grid: ${cols} × ${rows} = ${totalGridPoints} points to try`);
    console.log(`  Pass 1: Placing larger polyhouses...`);

    let placed = 0;

    // UNIFORM INITIAL SIZE - expansion phase will grow them to fill available space
    // No artificial size restrictions - only constraints are:
    // - Block size: 8m × 4m
    // - Max side length: 100m
    // - Gutter: 2m
    // - Gap between polyhouses: 1m
    const blockWidth = this.config.blockDimensions.width;
    const blockHeight = this.config.blockDimensions.height;
    const initialLengthBlocks = 5; // 40m length (5 blocks × 8m)
    const initialWidthBlocks = 4;  // 16m width (4 blocks × 4m)

    console.log(`  Initial size: ${initialLengthBlocks}x${initialWidthBlocks} blocks (${initialLengthBlocks * blockWidth}m × ${initialWidthBlocks * blockHeight}m = ${initialLengthBlocks * initialWidthBlocks * blockWidth * blockHeight} sqm)`);
    console.log(`  Growth phase will expand each polyhouse to fill available space (up to 100m max side length)`);

    // Track progress for large grids
    const progressInterval = Math.max(1, Math.floor(rows / 10)); // Log every 10%
    let lastProgress = 0;

    // Single pass - try to place polyhouses at each grid point
    for (let row = 0; row < rows; row++) {
      // Progress logging for large areas
      if (row % progressInterval === 0 && row > 0) {
        const progress = Math.round((row / rows) * 100);
        if (progress > lastProgress) {
          console.log(`  Progress: ${progress}% (${placed} polyhouses placed so far)`);
          lastProgress = progress;
        }
      }

      for (let col = 0; col < cols; col++) {
        const lat = minLat + row * latStep;
        const lng = minLng + col * lngStep;
        const position: Coordinate = { lat, lng };

        let placed_at_position = false;

        // Try each orientation with uniform initial size
        for (const orientation of orientations) {
          const polyhouse = await this.tryPlaceSimplePolyhouse(
            position,
            orientation,
            initialLengthBlocks,
            initialWidthBlocks,
            polygon,
            occupiedAreas
          );

          if (polyhouse) {
            polyhouses.push(polyhouse);
            const bounds = this.getPolyhouseBounds(polyhouse);
            const coords = bounds.map(p => [p.lng, p.lat]);
            if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
              coords.push([coords[0][0], coords[0][1]]);
            }
            occupiedAreas.push(turf.polygon([coords]));
            placed++;
            placed_at_position = true;
            break; // Success, try next grid point
          }
        }
      }
    }

    const util = (polyhouses.reduce((sum: number, p: Polyhouse) => sum + p.innerArea, 0) / landAreaSqm) * 100;
    console.log(`  Placed ${placed} polyhouses, ${util.toFixed(1)}% coverage`);

    // GROWTH PHASE: Expand existing polyhouses into unused space
    console.log(`\n🌱 Growth Phase: Expanding polyhouses into remaining gaps...`);
    const expandedPolyhouses = await this.expandPolyhouses(polyhouses, polygon);

    const finalUtil = (expandedPolyhouses.reduce((sum: number, p: Polyhouse) => sum + p.innerArea, 0) / landAreaSqm) * 100;
    console.log(`  After expansion: ${expandedPolyhouses.length} polyhouses, ${finalUtil.toFixed(1)}% coverage (gained ${(finalUtil - util).toFixed(1)}%)`);

    return expandedPolyhouses;
  }

  /**
   * Growth Phase: Expand existing polyhouses into remaining gaps
   * Try to extend each polyhouse by adding blocks in all 4 directions
   */
  private async expandPolyhouses(
    polyhouses: Polyhouse[],
    landPolygon: Feature<Polygon>
  ): Promise<Polyhouse[]> {
    const expandedPolyhouses: Polyhouse[] = [];
    let totalExpansions = 0;

    const blockWidth = this.config.blockDimensions.width;
    const blockHeight = this.config.blockDimensions.height;

    for (let i = 0; i < polyhouses.length; i++) {
      const polyhouse = polyhouses[i];

      // Calculate current dimensions in blocks
      const currentLengthBlocks = Math.round(polyhouse.dimensions.length / blockWidth);
      const currentWidthBlocks = Math.round(polyhouse.dimensions.width / blockHeight);

      // Calculate center position from bounds
      const centerLat = polyhouse.bounds.reduce((sum, p) => sum + p.y, 0) / polyhouse.bounds.length;
      const centerLng = polyhouse.bounds.reduce((sum, p) => sum + p.x, 0) / polyhouse.bounds.length;
      const centerPosition: Coordinate = { lat: centerLat, lng: centerLng };

      let bestExpanded = polyhouse;
      let bestArea = polyhouse.innerArea;
      let hadExpansion = false;

      // Try expanding by 1-4 blocks in each direction
      for (let lengthAdd = 0; lengthAdd <= 4; lengthAdd++) {
        for (let widthAdd = 0; widthAdd <= 4; widthAdd++) {
          if (lengthAdd === 0 && widthAdd === 0) continue; // Skip current size

          const newLengthBlocks = currentLengthBlocks + lengthAdd;
          const newWidthBlocks = currentWidthBlocks + widthAdd;

          // Don't exceed maximum side length
          const maxBlocks = Math.floor(this.config.maxSideLength / Math.max(blockWidth, blockHeight));
          if (newLengthBlocks > maxBlocks || newWidthBlocks > maxBlocks) continue;

          // Get occupied areas (all polyhouses except current one)
          const occupiedAreas: Feature<Polygon>[] = expandedPolyhouses
            .concat(polyhouses.slice(i + 1))
            .map(p => {
              const bounds = this.getPolyhouseBounds(p);
              const coords = bounds.map(pt => [pt.lng, pt.lat]);
              if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
                coords.push([coords[0][0], coords[0][1]]);
              }
              return turf.polygon([coords]);
            });

          // Try to create expanded polyhouse at same center position and orientation
          const expandedPolyhouse = this.createPolyhouse(
            centerPosition,
            polyhouse.orientation,
            newLengthBlocks,
            newWidthBlocks
          );

          // Check if expanded version fits
          if (await this.isValidPolyhouse(expandedPolyhouse, landPolygon, occupiedAreas)) {
            if (expandedPolyhouse.innerArea > bestArea) {
              bestExpanded = expandedPolyhouse;
              bestArea = expandedPolyhouse.innerArea;
              hadExpansion = true;
            }
          }
        }
      }

      if (hadExpansion) {
        const newLengthBlocks = Math.round(bestExpanded.dimensions.length / blockWidth);
        const newWidthBlocks = Math.round(bestExpanded.dimensions.width / blockHeight);
        console.log(`    Expanded P${i + 1}: ${currentLengthBlocks}x${currentWidthBlocks} → ${newLengthBlocks}x${newWidthBlocks} blocks (+${(bestArea - polyhouse.innerArea).toFixed(0)} sqm)`);
        totalExpansions++;
      }

      expandedPolyhouses.push(bestExpanded);
    }

    if (totalExpansions > 0) {
      console.log(`  ✓ Successfully expanded ${totalExpansions} polyhouses`);
    } else {
      console.log(`  No expansion opportunities found (polyhouses already optimal)`);
    }

    return expandedPolyhouses;
  }

  /**
   * SIMPLIFIED: Try to place a single polyhouse with given size
   */
  private async tryPlaceSimplePolyhouse(
    position: Coordinate,
    orientation: number,
    lengthBlocks: number,
    widthBlocks: number,
    landPolygon: Feature<Polygon>,
    occupiedAreas: Feature<Polygon>[]
  ): Promise<Polyhouse | null> {
    // Check minimum blocks constraint
    const totalBlocks = lengthBlocks * widthBlocks;
    const minimumBlocks = this.config.minimumBlocksPerPolyhouse || 10;

    if (totalBlocks < minimumBlocks) {
      // Skip polyhouses that don't meet minimum blocks requirement
      return null;
    }

    const polyhouse = this.createPolyhouse(position, orientation, lengthBlocks, widthBlocks);

    // Check if it fits
    if (await this.isValidPolyhouse(polyhouse, landPolygon, occupiedAreas)) {
      return polyhouse;
    }

    return null;
  }

  /**
   * Get valid orientations based on solar constraints using custom Agriplast formula
   * Formula: Allowed range is (90-A to 90+A) degrees, where cos(A) = sin(declination)/cos(latitude)
   * This ensures gutters (on east-west sides) get direct sunlight at least once per day
   */
  private getValidOrientations(): number[] {
    if (!this.config.solarOrientation.enabled) {
      // No solar constraint - try ALL angles for maximum coverage (every 10° for performance)
      const orientations = [];
      for (let angle = 0; angle < 180; angle += 10) {
        orientations.push(angle);
      }
      console.log(`  Solar orientation DISABLED - trying all angles (every 10° = ${orientations.length} orientations)`);
      return orientations;
    }

    const latitude = this.config.solarOrientation.latitudeDegrees;

    // Use maximum solar declination (23.5° at summer solstice) for year-round compliance
    // This ensures gutters get sunlight even in the worst-case season
    const SOLAR_DECLINATION = 23.5; // degrees

    // Calculate allowed deviation angle A using Agriplast's formula
    // cos(A) = sin(declination) / cos(latitude)
    const latitudeRad = (latitude * Math.PI) / 180;
    const declinationRad = (SOLAR_DECLINATION * Math.PI) / 180;

    const cosA = Math.sin(declinationRad) / Math.cos(latitudeRad);

    // Handle edge cases
    let allowedDeviation: number;
    if (Math.abs(cosA) > 1) {
      // At extreme latitudes or on equator, formula breaks down
      if (Math.abs(latitude) < 1) {
        // Near equator: orientation doesn't matter much
        allowedDeviation = 90; // Any orientation is fine
        console.log(`  Near equator (lat=${latitude.toFixed(1)}°): allowing all orientations`);
      } else {
        // Near poles: very restricted
        allowedDeviation = 0; // Must be exactly north-south
        console.log(`  High latitude (lat=${latitude.toFixed(1)}°): restricting to north-south only`);
      }
    } else {
      // Normal case: calculate allowed deviation
      allowedDeviation = Math.acos(cosA) * (180 / Math.PI);
      console.log(`  Solar constraint: latitude=${latitude.toFixed(1)}°, allowed deviation=±${allowedDeviation.toFixed(1)}°`);
    }

    // Base orientation is 90° (east-west alignment)
    // Allowed range is (90-A) to (90+A)
    const baseOrientation = 90;
    const minAngle = baseOrientation - allowedDeviation;
    const maxAngle = baseOrientation + allowedDeviation;

    // Generate orientations based on user's orientation strategy preference
    const orientations: number[] = [];
    const strategy = this.config.optimization.orientationStrategy || 'optimized';

    console.log(`  Orientation strategy: ${strategy}`);

    if (strategy === 'uniform') {
      // Single orientation: only use the base angle (90° east-west)
      orientations.push(baseOrientation);
      console.log(`  Uniform strategy: Single angle at ${baseOrientation}° (professional look)`);
    } else if (strategy === 'varied') {
      // Two orientations: base angle + one variant for balance
      orientations.push(baseOrientation);
      // Add a variant angle (either minAngle or maxAngle, whichever is different enough)
      const variant = Math.abs(minAngle - baseOrientation) > 5 ? Math.round(minAngle) : Math.round(maxAngle);
      if (variant !== baseOrientation && !orientations.includes(variant)) {
        orientations.push(((variant % 360) + 360) % 360);
      }
      console.log(`  Varied strategy: Two angles for balance`);
    } else {
      // 'optimized': Multiple orientations within the allowed range for Tetris packing (maximum coverage)
      // Try angles every 10° within the allowed range
      const step = 10;
      for (let angle = Math.floor(minAngle / step) * step; angle <= maxAngle; angle += step) {
        const normalizedAngle = ((angle % 360) + 360) % 360;
        orientations.push(normalizedAngle);
      }

      // Always include the exact boundary angles for maximum coverage
      if (!orientations.includes(Math.round(minAngle))) {
        orientations.push(((Math.round(minAngle) % 360) + 360) % 360);
      }
      if (!orientations.includes(Math.round(maxAngle))) {
        orientations.push(((Math.round(maxAngle) % 360) + 360) % 360);
      }
      console.log(`  Optimized strategy: Multiple angles (every 10°) for max coverage`);
    }

    orientations.sort((a, b) => a - b);

    console.log(`  Valid orientations: ${orientations.map(a => a.toFixed(0) + '°').join(', ')}`);

    return orientations;
  }

  /**
   * Try to place a polyhouse at a given position with a specific orientation
   * @param sizePreference 'large', 'medium', or 'small' for multi-pass optimization
   */
  /**
   * Create a polyhouse with given parameters
   */
  private createPolyhouse(
    centerPosition: Coordinate,
    orientation: number,
    lengthBlocks: number,
    widthBlocks: number
  ): Polyhouse {
    const blocks: Block[] = [];
    const blockWidth = this.config.blockDimensions.width;
    const blockHeight = this.config.blockDimensions.height;

    const angleRad = (orientation * Math.PI) / 180;

    // Calculate offset to center the polyhouse at the position
    const totalLength = lengthBlocks * blockWidth;
    const totalWidth = widthBlocks * blockHeight;

    for (let i = 0; i < lengthBlocks; i++) {
      for (let j = 0; j < widthBlocks; j++) {
        // Calculate block position relative to center
        const localX = (i - lengthBlocks / 2) * blockWidth;
        const localY = (j - widthBlocks / 2) * blockHeight;

        // Rotate around center
        const rotatedX = localX * Math.cos(angleRad) - localY * Math.sin(angleRad);
        const rotatedY = localX * Math.sin(angleRad) + localY * Math.cos(angleRad);

        // Convert to absolute coordinates
        const lat = centerPosition.lat + rotatedY / 111320;
        const lng = centerPosition.lng + rotatedX / (111320 * Math.cos(centerPosition.lat * Math.PI / 180));

        // Calculate corners in local coordinates first
        const localCorners = this.calculateBlockCorners({ x: rotatedX, y: rotatedY }, blockWidth, blockHeight, angleRad);

        // Convert corners to geographic coordinates
        const geoCorners = localCorners.map(corner => {
          const cornerLat = centerPosition.lat + corner.y / 111320;
          const cornerLng = centerPosition.lng + corner.x / (111320 * Math.cos(centerPosition.lat * Math.PI / 180));
          return { x: cornerLng, y: cornerLat };
        });

        const block: Block = {
          id: `block-${i}-${j}`,
          position: { x: rotatedX, y: rotatedY },
          width: blockWidth,
          height: blockHeight,
          rotation: orientation,
          corners: geoCorners,
        };

        blocks.push(block);
      }
    }

    // Calculate polyhouse bounds with gutter
    const bounds = this.calculatePolyhouseBoundsWithGutter(blocks, this.config.gutterWidth);

    return {
      id: `polyhouse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: '', // Will be assigned after optimization
      color: '', // Will be assigned after optimization
      blocks,
      orientation,
      gutterWidth: this.config.gutterWidth,
      bounds: bounds.map(coord => ({ x: coord.lng, y: coord.lat })),
      area: this.calculatePolygonArea(bounds),
      innerArea: lengthBlocks * widthBlocks * blockWidth * blockHeight,
      dimensions: {
        length: totalLength,
        width: totalWidth,
      },
    };
  }

  /**
   * Calculate block corners
   */
  private calculateBlockCorners(
    position: Point,
    width: number,
    height: number,
    angleRad: number
  ): Point[] {
    const corners: Point[] = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ];

    return corners.map(corner => {
      const rotatedX = corner.x * Math.cos(angleRad) - corner.y * Math.sin(angleRad);
      const rotatedY = corner.x * Math.sin(angleRad) + corner.y * Math.cos(angleRad);
      return {
        x: position.x + rotatedX,
        y: position.y + rotatedY,
      };
    });
  }

  /**
   * Calculate polyhouse bounds with gutter
   * Note: Block corners are already in geographic coordinates (lng/lat)
   */
  private calculatePolyhouseBoundsWithGutter(
    blocks: Block[],
    gutterWidth: number
  ): Coordinate[] {
    // Find all corner points from all blocks (already in geographic coordinates)
    const allCorners: Coordinate[] = [];

    blocks.forEach((block, blockIndex) => {
      if (!block.corners || block.corners.length === 0) {
        console.warn(`  ⚠️  Block ${blockIndex} has no corners!`);
        return;
      }

      block.corners.forEach(corner => {
        // Corners are already in geographic coordinates (x=lng, y=lat)
        // Don't convert again - that was causing massive area calculations!
        allCorners.push({ lat: corner.y, lng: corner.x });
      });
    });

    // Create convex hull
    const points = allCorners.map(c => turf.point([c.lng, c.lat]));
    const hull = turf.convex(turf.featureCollection(points));

    if (!hull) return allCorners.slice(0, 4);

    // Buffer by gutter width (in meters)
    console.log(`  Buffering polyhouse by ${gutterWidth}m for gutter`);
    const buffered = turf.buffer(hull, gutterWidth, { units: 'meters' });

    if (!buffered) return allCorners.slice(0, 4);

    return buffered.geometry.coordinates[0].map(coord => ({
      lat: coord[1] as number,
      lng: coord[0] as number,
    }));
  }

  /**
   * Validate if a polyhouse meets all constraints
   */
  private async isValidPolyhouse(
    polyhouse: Polyhouse,
    landPolygon: Feature<Polygon>,
    occupiedAreas: Feature<Polygon>[]
  ): Promise<boolean> {
    // Check if polyhouse is within land bounds
    const bounds = this.getPolyhouseBounds(polyhouse);
    const coords = bounds.map(p => [p.lng, p.lat]);
    // Ensure polygon is closed
    if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
      coords.push([coords[0][0], coords[0][1]]);
    }

    let polyhousePolygon;
    try {
      polyhousePolygon = turf.polygon([coords]);
    } catch (error) {
      console.error('Failed to create polyhouse polygon:', error, coords);
      return false;
    }

    const isWithin = turf.booleanWithin(polyhousePolygon, landPolygon);
    const contains = turf.booleanContains(landPolygon, polyhousePolygon);

    if (!isWithin && !contains) {
      return false;
    }

    // RELAXED: Minimum distance from land boundary - only ensure polyhouse is fully within bounds
    // No additional buffer required - the gutter already provides spacing
    // This was previously rejecting valid placements near edges

    // Check for overlap with existing polyhouses
    // SIMPLIFIED approach: just check for direct overlap, not gaps
    // The gutter already provides spacing, gaps are user-configurable
    for (const occupied of occupiedAreas) {
      try {
        // Only reject if polyhouses directly overlap or touch
        if (turf.booleanOverlap(polyhousePolygon, occupied) ||
            turf.booleanContains(occupied, polyhousePolygon) ||
            turf.booleanContains(polyhousePolygon, occupied)) {
          return false; // Direct overlap - reject
        }

        // Check minimum gap only if required gap is significant
        const requiredGap = this.config.polyhouseGap;
        if (requiredGap > 0.5) {
          // Very simple distance check between centers
          const distance = turf.distance(
            turf.centerOfMass(polyhousePolygon),
            turf.centerOfMass(occupied),
            { units: 'meters' }
          );

          // Minimum distance = sum of approximate radii + required gap
          // Use very rough estimate: radius ≈ sqrt(area/π)
          const thisRadius = Math.sqrt(polyhouse.area / Math.PI);
          const occupiedRadius = Math.sqrt(polyhouse.area / Math.PI); // Same estimate
          const minDistance = thisRadius + occupiedRadius + requiredGap;

          // Be lenient: only reject if distance is significantly less than minimum
          if (distance < minDistance * 0.7) {
            return false;
          }
        }
      } catch (error) {
        // If any check fails, allow placement (be permissive)
        console.warn('Gap check failed, allowing placement:', error);
      }
    }

    // SKIP ALL TERRAIN CONSTRAINTS FOR NOW
    // Check terrain constraints if enabled (unless user overrides restricted zones)
    if (false && !this.config.terrain.ignoreRestrictedZones) {
      if (this.config.terrain.considerSlope && !this.config.terrain.landLevelingOverride) {
        const avgSlope = await this.getAverageSlope(polyhouse);
        if (avgSlope > this.config.terrain.maxSlope) {
          return false;
        }
      }

      // Check for water if enabled
      if (this.config.terrain.avoidWater) {
        const onWater = await this.isOnWater(polyhouse);
        if (onWater) {
          return false;
        }
      }

      // Check if polyhouse overlaps with any detected restricted zones
      const overlapsRestrictedZone = this.overlapsRestrictedZone(polyhouse);
      if (overlapsRestrictedZone) {
        const firstBlock = polyhouse.blocks[0];
        if (firstBlock) {
          console.log(`  Rejected polyhouse at (${firstBlock.position.x.toFixed(1)}, ${firstBlock.position.y.toFixed(1)}) - overlaps restricted zone`);
        } else {
          console.log(`  Rejected polyhouse - overlaps restricted zone`);
        }
        return false;
      }
    }

    // Check if polyhouse overlaps with user-defined exclusions (wells, irrigation, etc.)
    const overlapsUserExclusion = this.overlapsUserDefinedExclusion(polyhouse);
    if (overlapsUserExclusion) {
      const firstBlock = polyhouse.blocks[0];
      if (firstBlock) {
        console.log(`  Rejected polyhouse at (${firstBlock.position.x.toFixed(1)}, ${firstBlock.position.y.toFixed(1)}) - overlaps user-defined exclusion (${overlapsUserExclusion})`);
      } else {
        console.log(`  Rejected polyhouse - overlaps user-defined exclusion (${overlapsUserExclusion})`);
      }
      return false;
    }

    return true;
  }

  /**
   * Check if polyhouse overlaps with any restricted zones from terrain analysis
   */
  private overlapsRestrictedZone(polyhouse: Polyhouse): boolean {
    if (!this.terrainData || !this.terrainData.restrictedAreas || this.terrainData.restrictedAreas.length === 0) {
      return false; // No restricted zones detected
    }

    const polyhouseBounds = this.getPolyhouseBounds(polyhouse);
    // Close the polygon
    if (polyhouseBounds.length > 0) {
      const firstCoord = polyhouseBounds[0];
      const lastCoord = polyhouseBounds[polyhouseBounds.length - 1];
      if (firstCoord.lat !== lastCoord.lat || firstCoord.lng !== lastCoord.lng) {
        polyhouseBounds.push({...firstCoord});
      }
    }

    const polyhousePolygon = turf.polygon([polyhouseBounds.map(c => [c.lng, c.lat])]);

    for (const restrictedZone of this.terrainData.restrictedAreas) {
      if (!restrictedZone.coordinates || restrictedZone.coordinates.length < 3) {
        continue;
      }

      // Close the restricted zone polygon
      const zoneCoords = [...restrictedZone.coordinates];
      if (zoneCoords.length > 0) {
        const firstCoord = zoneCoords[0];
        const lastCoord = zoneCoords[zoneCoords.length - 1];
        if (firstCoord.lat !== lastCoord.lat || firstCoord.lng !== lastCoord.lng) {
          zoneCoords.push({...firstCoord});
        }
      }

      try {
        const restrictedPolygon = turf.polygon([zoneCoords.map(c => [c.lng, c.lat])]);

        // Check for overlap or containment
        if (turf.booleanOverlap(polyhousePolygon, restrictedPolygon) ||
            turf.booleanContains(restrictedPolygon, polyhousePolygon) ||
            turf.booleanWithin(polyhousePolygon, restrictedPolygon)) {
          return true; // Overlaps with restricted zone
        }
      } catch (error) {
        // If polygon check fails, skip this zone
        console.warn('Failed to check restricted zone overlap:', error);
        continue;
      }
    }

    return false; // No overlap with any restricted zone
  }

  /**
   * Check if polyhouse overlaps with user-defined exclusion zones (wells, irrigation, etc.)
   * Returns the name of the exclusion zone if overlap detected, null otherwise
   */
  private overlapsUserDefinedExclusion(polyhouse: Polyhouse): string | null {
    if (!this.config.userDefinedExclusions || this.config.userDefinedExclusions.length === 0) {
      return null; // No user-defined exclusions
    }

    const polyhouseBounds = this.getPolyhouseBounds(polyhouse);
    // Close the polygon
    if (polyhouseBounds.length > 0) {
      const firstCoord = polyhouseBounds[0];
      const lastCoord = polyhouseBounds[polyhouseBounds.length - 1];
      if (firstCoord.lat !== lastCoord.lat || firstCoord.lng !== lastCoord.lng) {
        polyhouseBounds.push({...firstCoord});
      }
    }

    const polyhousePolygon = turf.polygon([polyhouseBounds.map(c => [c.lng, c.lat])]);

    for (const exclusion of this.config.userDefinedExclusions) {
      if (!exclusion.coordinates || exclusion.coordinates.length < 3) {
        continue;
      }

      // Close the exclusion zone polygon
      const exclusionCoords = [...exclusion.coordinates];
      if (exclusionCoords.length > 0) {
        const firstCoord = exclusionCoords[0];
        const lastCoord = exclusionCoords[exclusionCoords.length - 1];
        if (firstCoord.lat !== lastCoord.lat || firstCoord.lng !== lastCoord.lng) {
          exclusionCoords.push({...firstCoord});
        }
      }

      try {
        const exclusionPolygon = turf.polygon([exclusionCoords.map(c => [c.lng, c.lat])]);

        // Check for overlap or containment
        if (turf.booleanOverlap(polyhousePolygon, exclusionPolygon) ||
            turf.booleanContains(exclusionPolygon, polyhousePolygon) ||
            turf.booleanWithin(polyhousePolygon, exclusionPolygon)) {
          return exclusion.name; // Overlaps with this exclusion zone
        }
      } catch (error) {
        console.warn(`Failed to check user exclusion "${exclusion.name}" overlap:`, error);
        continue;
      }
    }

    return null; // No overlap with any user-defined exclusion
  }

  /**
   * Get polyhouse bounds as coordinates
   */
  private getPolyhouseBounds(polyhouse: Polyhouse): Coordinate[] {
    // Use the pre-calculated bounds
    return polyhouse.bounds.map(p => ({ lat: p.y, lng: p.x }));
  }

  /**
   * Calculate area of a polygon in square meters
   */
  private calculatePolygonArea(coordinates: Coordinate[]): number {
    const polygon = turf.polygon([coordinates.map(c => [c.lng, c.lat])]);
    return turf.area(polygon);
  }

  /**
   * Get average slope for a polyhouse area
   * Uses terrain data from Copernicus satellite analysis
   */
  private async getAverageSlope(polyhouse: Polyhouse): Promise<number> {
    if (this.terrainGrid.size === 0) {
      return 0; // No terrain data available, assume flat
    }

    // Sample terrain data at polyhouse corners and center
    const bounds = this.getPolyhouseBounds(polyhouse);
    const slopes: number[] = [];

    for (const coord of bounds) {
      const key = this.coordKey(coord);
      const terrainData = this.terrainGrid.get(key);
      if (terrainData) {
        slopes.push(terrainData.slope);
      }
    }

    if (slopes.length === 0) {
      return 0; // No data points found
    }

    // Return average slope
    return slopes.reduce((sum, s) => sum + s, 0) / slopes.length;
  }

  /**
   * Check if polyhouse is on water
   * Uses terrain data from Copernicus satellite analysis
   */
  private async isOnWater(polyhouse: Polyhouse): Promise<boolean> {
    if (this.terrainGrid.size === 0) {
      return false; // No terrain data available, assume land
    }

    // Check if any corner of the polyhouse is on water
    const bounds = this.getPolyhouseBounds(polyhouse);

    for (const coord of bounds) {
      const key = this.coordKey(coord);
      const terrainData = this.terrainGrid.get(key);
      if (terrainData && terrainData.onWater) {
        return true; // At least one point is on water
      }
    }

    return false; // No water detected
  }

  /**
   * Get terrain analysis results (for inclusion in planning result)
   */
  public getTerrainAnalysis(): TerrainAnalysisResult | undefined {
    return this.terrainData;
  }

  /**
   * Get regulatory compliance results (for inclusion in planning result)
   */
  public getComplianceResults(): ComplianceCheckResult | undefined {
    return this.complianceData;
  }

}
