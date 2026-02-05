/**
 * SIMPLE Polyhouse Optimizer
 *
 * Strategy:
 * 1. Find ONE big polyhouse that fills as much space as possible
 * 2. Add more polyhouses to fill remaining space
 * 3. Always consider sun orientation
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
} from '@shared/types';

export class PolyhouseOptimizerSimple {
  private config: PolyhouseConfiguration;
  private landArea: LandArea;
  private polyhouseCounter: number = 0;

  private readonly GABLE_MODULE = 8;
  private readonly GUTTER_MODULE = 4;
  private readonly MAX_AREA = 10000;
  private readonly CORRIDOR_WIDTH = 2;

  constructor(landArea: LandArea, config: PolyhouseConfiguration) {
    this.config = config;
    this.landArea = landArea;
  }

  async optimize(): Promise<Polyhouse[]> {
    console.log('\n🏗️  SIMPLE Polyhouse Optimizer');
    console.log('=' + '='.repeat(50));
    console.log(`Land area: ${(this.landArea.area / 10000).toFixed(2)} hectares`);

    const polyhouses: Polyhouse[] = [];

    // Create land polygon
    const landCoords = this.landArea.coordinates.map(c => [c.lng, c.lat]);
    landCoords.push([this.landArea.coordinates[0].lng, this.landArea.coordinates[0].lat]);
    const landPolygon = turf.polygon([landCoords]);

    // Get bounding box
    const bbox = turf.bbox(landPolygon);
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Calculate dimensions in meters
    const widthMeters = turf.distance([minLng, centerLat], [maxLng, centerLat], { units: 'meters' });
    const heightMeters = turf.distance([centerLng, minLat], [centerLng, maxLat], { units: 'meters' });

    console.log(`Bounding box: ${widthMeters.toFixed(0)}m × ${heightMeters.toFixed(0)}m`);

    // Calculate centroid (better than geometric center for irregular shapes)
    const centroid = turf.centroid(landPolygon);
    const centroidLat = centroid.geometry.coordinates[1];
    const centroidLng = centroid.geometry.coordinates[0];

    // Try multiple placement points for irregular shapes
    const placementPoints = [
      { lat: centroidLat, lng: centroidLng, label: 'centroid' },
      { lat: centerLat, lng: centerLng, label: 'bbox center' },
    ];

    // Try 4 orientations: 0°, 45°, 90°, 135°
    const orientationsToTry = [0, 45, 90, 135];
    let bestPolyhouse: Polyhouse | null = null;
    let bestArea = 0;

    for (const point of placementPoints) {
      // Check if this point is actually inside the polygon
      const testPoint = turf.point([point.lng, point.lat]);
      if (!turf.booleanPointInPolygon(testPoint, landPolygon)) {
        console.log(`  Skipping ${point.label} (outside polygon)`);
        continue;
      }

      for (const angle of orientationsToTry) {
        // Try to fit the LARGEST possible polyhouse at this angle and point
        const poly = this.findLargestPolyhouse(landPolygon, angle, { lat: point.lat, lng: point.lng });

        if (poly && poly.area > bestArea) {
          bestPolyhouse = poly;
          bestArea = poly.area;
          console.log(`  → New best: ${poly.area.toFixed(0)}m² at ${angle}° from ${point.label}`);
        }
      }
    }

    if (bestPolyhouse) {
      console.log(`✓ Found optimal polyhouse: ${bestPolyhouse.dimensions.length}m × ${bestPolyhouse.dimensions.width}m at ${bestPolyhouse.rotation}°`);
      console.log('\n🔄 MAXIMUM UTILIZATION MODE: Filling entire area...');

      // Calculate grid spacing (polyhouse diagonal + 2m corridor)
      const polyhouseLength = bestPolyhouse.dimensions.length;
      const polyhouseWidth = bestPolyhouse.dimensions.width;
      const gridSpacingLat = (polyhouseWidth + this.CORRIDOR_WIDTH) / 111320;
      const gridSpacingLng = (polyhouseLength + this.CORRIDOR_WIDTH) / (111320 * Math.cos(centerLat * Math.PI / 180));

      // Start from the minimum corner of the bounding box
      const startLat = minLat;
      const startLng = minLng;

      // Calculate how many rows and columns we need to cover the entire bbox
      const numRows = Math.ceil((maxLat - minLat) / gridSpacingLat) + 2;
      const numCols = Math.ceil((maxLng - minLng) / gridSpacingLng) + 2;

      console.log(`Scanning ${numRows} rows × ${numCols} columns across entire area...`);

      // Systematically scan the ENTIRE bounding box
      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
          const testLat = startLat + (row * gridSpacingLat);
          const testLng = startLng + (col * gridSpacingLng);

          // Check if this point is in the polygon
          const testPoint = turf.point([testLng, testLat]);
          if (!turf.booleanPointInPolygon(testPoint, landPolygon)) continue;

          // Try to place a polyhouse here
          const testPoly = this.createPolyhouse(
            polyhouseLength,
            polyhouseWidth,
            bestPolyhouse.rotation,
            { lat: testLat, lng: testLng }
          );

          // Check if it fits
          if (!this.fitsInLand(testPoly, landPolygon)) continue;

          // Check for overlap with existing polyhouses (using precise corner-to-corner distance)
          let overlaps = false;
          for (const existing of polyhouses) {
            // Check if any corners are too close
            const minDist = this.CORRIDOR_WIDTH;
            for (const c1 of testPoly.bounds) {
              for (const c2 of existing.bounds) {
                const dist = turf.distance([c1.x, c1.y], [c2.x, c2.y], { units: 'meters' });
                if (dist < minDist) {
                  overlaps = true;
                  break;
                }
              }
              if (overlaps) break;
            }
            if (overlaps) break;
          }

          if (!overlaps) {
            polyhouses.push(testPoly);
            if (polyhouses.length % 10 === 0) {
              console.log(`  Placed ${polyhouses.length} polyhouses...`);
            }
          }
        }
      }

      console.log(`✓ Total placed: ${polyhouses.length} polyhouses`);
    } else {
      console.warn(`⚠️  Could not place any polyhouse in the land area`);
      console.warn(`   Land area: ${this.landArea.area.toFixed(0)}m² (${(this.landArea.area / 10000).toFixed(2)} hectares)`);
      console.warn(`   Bounding box: ${widthMeters.toFixed(0)}m × ${heightMeters.toFixed(0)}m`);
      console.warn(`   Minimum polyhouse size attempted: ${this.config.minSideLength || 8}m × ${this.config.minSideLength || 8}m`);
    }

    const coverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
    console.log(`\n✅ Optimization complete: ${polyhouses.length} polyhouses, ${coverage.toFixed(1)}% coverage`);

    return polyhouses;
  }

  /**
   * Find the largest polyhouse that fits at a given angle
   */
  private findLargestPolyhouse(
    landPolygon: Feature<Polygon>,
    angle: number,
    center: Coordinate
  ): Polyhouse | null {
    // Get bounding box
    const bbox = turf.bbox(landPolygon);
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Calculate maximum dimensions
    const widthMeters = turf.distance([minLng, centerLat], [maxLng, centerLat], { units: 'meters' });
    const heightMeters = turf.distance([centerLng, minLat], [centerLng, maxLat], { units: 'meters' });

    // Use 80% of bounding box for more conservative fitting in irregular shapes
    let maxGable = Math.floor((widthMeters * 0.8) / this.GABLE_MODULE) * this.GABLE_MODULE;
    let maxGutter = Math.floor((heightMeters * 0.8) / this.GUTTER_MODULE) * this.GUTTER_MODULE;

    // Ensure we don't exceed max side length
    const maxSide = this.config.maxSideLength || 120;
    maxGable = Math.min(maxGable, maxSide);
    maxGutter = Math.min(maxGutter, maxSide);

    // Use configured minimum side length (default 8m = 1 bay)
    const minSide = this.config.minSideLength || 8;

    // Try sizes from largest to smallest
    for (let gable = maxGable; gable >= minSide; gable -= this.GABLE_MODULE) {
      for (let gutter = maxGutter; gutter >= minSide; gutter -= this.GUTTER_MODULE) {
        const area = gable * gutter;

        // Skip if over max area
        if (area > this.MAX_AREA) continue;

        // Try to create this polyhouse
        const poly = this.createPolyhouse(gable, gutter, angle, center);

        // Check if it fits in the land
        if (this.fitsInLand(poly, landPolygon)) {
          console.log(`  ✓ Found fit: ${gable}m × ${gutter}m at ${angle}°`);
          return poly;
        }
      }
    }

    return null;
  }

  /**
   * Create a polyhouse at the given center with specified dimensions
   */
  private createPolyhouse(
    gableLength: number,
    gutterWidth: number,
    rotation: number,
    center: Coordinate
  ): Polyhouse {
    const halfGable = gableLength / 2;
    const halfGutter = gutterWidth / 2;

    // Create corners (before rotation)
    const corners = [
      { lat: center.lat + halfGutter / 111320, lng: center.lng - halfGable / (111320 * Math.cos(center.lat * Math.PI / 180)) },
      { lat: center.lat + halfGutter / 111320, lng: center.lng + halfGable / (111320 * Math.cos(center.lat * Math.PI / 180)) },
      { lat: center.lat - halfGutter / 111320, lng: center.lng + halfGable / (111320 * Math.cos(center.lat * Math.PI / 180)) },
      { lat: center.lat - halfGutter / 111320, lng: center.lng - halfGable / (111320 * Math.cos(center.lat * Math.PI / 180)) },
    ];

    // Rotate if needed
    if (rotation !== 0) {
      const angleRad = (rotation * Math.PI) / 180;
      for (const corner of corners) {
        const dx = corner.lng - center.lng;
        const dy = corner.lat - center.lat;
        corner.lng = center.lng + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
        corner.lat = center.lat + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
      }
    }

    // Create blocks with proper corners
    const blocks: Block[] = [];
    const numGableBays = gableLength / this.GABLE_MODULE;
    const numGutterBays = gutterWidth / this.GUTTER_MODULE;

    // Calculate the top-left corner of the polyhouse (before rotation)
    const topLeftLat = center.lat + halfGutter / 111320;
    const topLeftLng = center.lng - halfGable / (111320 * Math.cos(center.lat * Math.PI / 180));

    let blockIndex = 0;
    for (let row = 0; row < numGutterBays; row++) {
      for (let col = 0; col < numGableBays; col++) {
        // Calculate block position in meters from top-left
        const blockStartX = col * this.GABLE_MODULE;
        const blockStartY = row * this.GUTTER_MODULE;

        // Create block corners (before rotation)
        const blockCorners = [
          {
            lat: topLeftLat - blockStartY / 111320,
            lng: topLeftLng + blockStartX / (111320 * Math.cos(center.lat * Math.PI / 180))
          },
          {
            lat: topLeftLat - blockStartY / 111320,
            lng: topLeftLng + (blockStartX + this.GABLE_MODULE) / (111320 * Math.cos(center.lat * Math.PI / 180))
          },
          {
            lat: topLeftLat - (blockStartY + this.GUTTER_MODULE) / 111320,
            lng: topLeftLng + (blockStartX + this.GABLE_MODULE) / (111320 * Math.cos(center.lat * Math.PI / 180))
          },
          {
            lat: topLeftLat - (blockStartY + this.GUTTER_MODULE) / 111320,
            lng: topLeftLng + blockStartX / (111320 * Math.cos(center.lat * Math.PI / 180))
          },
        ];

        // Rotate block corners if needed
        if (rotation !== 0) {
          const angleRad = (rotation * Math.PI) / 180;
          for (const corner of blockCorners) {
            const dx = corner.lng - center.lng;
            const dy = corner.lat - center.lat;
            corner.lng = center.lng + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
            corner.lat = center.lat + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
          }
        }

        blocks.push({
          id: `block-${blockIndex}`,
          width: this.GABLE_MODULE,
          height: this.GUTTER_MODULE,
          position: { x: blockStartX, y: blockStartY },
          rotation: 0,
          corners: blockCorners.map(c => ({ x: c.lng, y: c.lat })),
        });
        blockIndex++;
      }
    }

    // Calculate bounds (outer boundary with gutters)
    const gutterWidth2m = this.CORRIDOR_WIDTH; // 2m gutter
    const halfGableWithGutter = (gableLength + gutterWidth2m) / 2;
    const halfGutterWithGutter = (gutterWidth + gutterWidth2m) / 2;

    const bounds = [
      { lat: center.lat + halfGutterWithGutter / 111320, lng: center.lng - halfGableWithGutter / (111320 * Math.cos(center.lat * Math.PI / 180)) },
      { lat: center.lat + halfGutterWithGutter / 111320, lng: center.lng + halfGableWithGutter / (111320 * Math.cos(center.lat * Math.PI / 180)) },
      { lat: center.lat - halfGutterWithGutter / 111320, lng: center.lng + halfGableWithGutter / (111320 * Math.cos(center.lat * Math.PI / 180)) },
      { lat: center.lat - halfGutterWithGutter / 111320, lng: center.lng - halfGableWithGutter / (111320 * Math.cos(center.lat * Math.PI / 180)) },
    ];

    // Rotate bounds if needed
    if (rotation !== 0) {
      const angleRad = (rotation * Math.PI) / 180;
      for (const bound of bounds) {
        const dx = bound.lng - center.lng;
        const dy = bound.lat - center.lat;
        bound.lng = center.lng + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
        bound.lat = center.lat + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
      }
    }

    const innerArea = gableLength * gutterWidth;
    const totalArea = (gableLength + gutterWidth2m) * (gutterWidth + gutterWidth2m);

    return {
      id: `poly-${++this.polyhouseCounter}`,
      label: String.fromCharCode(64 + this.polyhouseCounter), // A, B, C, ...
      color: '#4CAF50',
      center,
      area: totalArea,
      innerArea: innerArea,
      gableLength: gableLength,
      gutterWidth: gutterWidth,
      rotation,
      blocks,
      dimensions: {
        length: gableLength,
        width: gutterWidth,
      },
      bounds: bounds.map(b => ({ x: b.lng, y: b.lat })),
    };
  }

  /**
   * Check if polyhouse fits completely inside land polygon
   */
  private fitsInLand(polyhouse: Polyhouse, landPolygon: Feature<Polygon>): boolean {
    try {
      // SIMPLE CHECK: Just verify all corners are inside the polygon
      return polyhouse.bounds.every(bound => {
        const point = turf.point([bound.x, bound.y]);
        return turf.booleanPointInPolygon(point, landPolygon);
      });
    } catch (error) {
      return false;
    }
  }
}
