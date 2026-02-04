/**
 * Professional Polyhouse Optimizer V2
 * Based on industry standards for greenhouse construction
 * Gable: 8m multiples, Gutter: 4m multiples, Max 10k sqm, 2m corridors.
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
} from '@/lib/shared/types';

function getPolyhouseLabel(index: number): string {
  return `P${index + 1}`;
}

function assignLabelsAndColors(polyhouses: Polyhouse[]): Polyhouse[] {
  return polyhouses.map((ph, index) => ({
    ...ph,
    label: getPolyhouseLabel(index),
    color: POLYHOUSE_COLORS[index % POLYHOUSE_COLORS.length],
  }));
}

interface PolyhouseCandidate {
  gableLength: number;
  gutterWidth: number;
  area: number;
  position: Coordinate;
  rotation: number;
}

export class PolyhouseOptimizerV2 {
  private config: PolyhouseConfiguration;
  private landArea: LandArea;
  private terrainData: any;

  private readonly GABLE_MODULE = 8;
  private readonly GUTTER_MODULE = 4;
  private readonly MAX_AREA = 10000;
  private readonly CORRIDOR_WIDTH = 2;

  constructor(landArea: LandArea, config: PolyhouseConfiguration, terrainData?: any) {
    this.config = config;
    this.landArea = landArea;
    this.terrainData = terrainData;
  }

  async optimize(): Promise<Polyhouse[]> {

    const startTime = Date.now();
    const polyhouses: Polyhouse[] = [];

    const landCoords = this.landArea.coordinates.map(c => [c.lng, c.lat]);
    landCoords.push([this.landArea.coordinates[0].lng, this.landArea.coordinates[0].lat]);
    let landPolygon = turf.polygon([landCoords]);

    const safetyBuffer = this.config.safetyBuffer || 1.0;
    if (safetyBuffer > 0) {
      const buffered = turf.buffer(landPolygon, -safetyBuffer / 1000, { units: 'kilometers' });
      if (buffered) {
        landPolygon = buffered as any;
      }
    }

    const allSizes = this.generateCandidateSizes();
    const landArea = this.landArea.area;
    const strategyName = "MAXIMUM SIZE (up to 10k sqm per polyhouse)";
    const minAreaForFirst = this.MAX_AREA * 0.7;
    const largeSizes = allSizes.filter(s => s.area >= minAreaForFirst);
    const candidateSizes = largeSizes.length > 0 ? largeSizes : allSizes.slice(0, 10);

    const avgDimension = (candidateSizes[0].gable + candidateSizes[0].gutter) / 2;
    const gridSpacing = Math.min(avgDimension * 0.2, 15);

    const bounds = turf.bbox(landPolygon);
    const [minLng, minLat, maxLng, maxLat] = bounds;
    const latStep = gridSpacing / 111320;
    const lngStep = gridSpacing / (111320 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
    const cols = Math.ceil((maxLng - minLng) / lngStep);
    const rows = Math.ceil((maxLat - minLat) / latStep);

    let orientations = this.getOrientations();
    const allowMixedOrientations = this.config.optimization.allowMixedOrientations ?? false;
    if (!allowMixedOrientations) {
      orientations = [this.findBestGlobalOrientation(landPolygon, candidateSizes, orientations)];
    }

    const occupiedPolygons: Feature<Polygon>[] = [];
    let placedCount = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const lat = minLat + row * latStep;
        const lng = minLng + col * lngStep;
        const position: Coordinate = { lat, lng };
        const point = turf.point([lng, lat]);
        if (!turf.booleanPointInPolygon(point, landPolygon)) continue;

        let bestPolyhouse: Polyhouse | null = null;
        let bestArea = 0;
        for (const rotation of orientations) {
          for (const size of candidateSizes) {
            const candidate: PolyhouseCandidate = { gableLength: size.gable, gutterWidth: size.gutter, area: size.area, position, rotation };
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
          occupiedPolygons.push(this.createBufferedPolygon(bestPolyhouse, this.CORRIDOR_WIDTH));
          placedCount++;
        }
      }
    }

    let currentCoverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;

    if (currentCoverage >= 85) {
      return assignLabelsAndColors(polyhouses);
    }

    if (currentCoverage < 85) {
      const minAreaForGapFill = minAreaForFirst * 0.4;
      const gapFillers = allSizes.filter(s => s.area >= minAreaForGapFill);
      if (gapFillers.length === 0) return assignLabelsAndColors(polyhouses);

      const mediumGridSpacing = gridSpacing;
      const medLatStep = mediumGridSpacing / 111320;
      const medLngStep = mediumGridSpacing / (111320 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
      const medCols = Math.ceil((maxLng - minLng) / medLngStep);
      const medRows = Math.ceil((maxLat - minLat) / medLatStep);
      let secondPassCount = 0;
      const maxGapFillers = 20;

      for (let row = 0; row < medRows; row++) {
        for (let col = 0; col < medCols; col++) {
          const currentUtilization = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
          if (currentUtilization >= 85 || secondPassCount >= maxGapFillers) break;
          const lat = minLat + row * medLatStep;
          const lng = minLng + col * medLngStep;
          const position: Coordinate = { lat, lng };
          const pt = turf.point([lng, lat]);
          if (!turf.booleanPointInPolygon(pt, landPolygon)) continue;

          let best: Polyhouse | null = null;
          let bestA = 0;
          for (const rotation of orientations) {
            for (const size of gapFillers) {
              const candidate: PolyhouseCandidate = { gableLength: size.gable, gutterWidth: size.gutter, area: size.area, position, rotation };
              const ph = await this.tryPlacePolyhouse(candidate, landPolygon, occupiedPolygons);
              if (ph && ph.area > bestA) { best = ph; bestA = ph.area; }
              if (ph) break;
            }
          }
          if (best) {
            polyhouses.push(best);
            occupiedPolygons.push(this.createBufferedPolygon(best, this.CORRIDOR_WIDTH));
            secondPassCount++;
            currentCoverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
          }
        }
        if (secondPassCount >= maxGapFillers) break;
      }
    }

    currentCoverage = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
    if (currentCoverage < 70) {
      const smallSizes = allSizes.filter(s => s.area >= 500 && s.area <= 2500);
      if (smallSizes.length > 0) {
        const smallGridSpacing = Math.min(gridSpacing * 0.5, 8);
        const smallLatStep = smallGridSpacing / 111320;
        const smallLngStep = smallGridSpacing / (111320 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));
        const smallCols = Math.ceil((maxLng - minLng) / smallLngStep);
        const smallRows = Math.ceil((maxLat - minLat) / smallLatStep);
        let thirdPassCount = 0;
        const maxSmallPolyhouses = 30;

        for (let row = 0; row < smallRows; row++) {
          for (let col = 0; col < smallCols; col++) {
            const currentUtilization = (polyhouses.reduce((sum, p) => sum + p.area, 0) / this.landArea.area) * 100;
            if (currentUtilization >= 75 || thirdPassCount >= maxSmallPolyhouses) break;
            const lat = minLat + row * smallLatStep;
            const lng = minLng + col * smallLngStep;
            const position: Coordinate = { lat, lng };
            const pt = turf.point([lng, lat]);
            if (!turf.booleanPointInPolygon(pt, landPolygon)) continue;

            let best: Polyhouse | null = null;
            let bestA = 0;
            for (const rotation of orientations) {
              for (const size of smallSizes) {
                const candidate: PolyhouseCandidate = { gableLength: size.gable, gutterWidth: size.gutter, area: size.area, position, rotation };
                const ph = await this.tryPlacePolyhouse(candidate, landPolygon, occupiedPolygons);
                if (ph && ph.area > bestA) { best = ph; bestA = ph.area; }
                if (ph) break;
              }
            }
            if (best) {
              polyhouses.push(best);
              occupiedPolygons.push(this.createBufferedPolygon(best, this.CORRIDOR_WIDTH));
              thirdPassCount++;
            }
          }
          if (thirdPassCount >= maxSmallPolyhouses) break;
        }
      }
    }

    const labeledPolyhouses = assignLabelsAndColors(polyhouses);
    return labeledPolyhouses;
  }

  private generateCandidateSizes(): Array<{gable: number; gutter: number; area: number}> {
    const sizes: Array<{gable: number; gutter: number; area: number}> = [];
    for (let gable = this.GABLE_MODULE; gable <= 120; gable += this.GABLE_MODULE) {
      for (let gutter = this.GUTTER_MODULE; gutter <= 120; gutter += this.GUTTER_MODULE) {
        const area = gable * gutter;
        if (area <= this.MAX_AREA) sizes.push({ gable, gutter, area });
      }
    }
    sizes.sort((a, b) => b.area - a.area);
    return sizes;
  }

  private findBestGlobalOrientation(landPolygon: Feature<Polygon>, candidateSizes: any[], orientations: number[]): number {
    const bounds = turf.bbox(landPolygon);
    const [minLng, minLat, maxLng, maxLat] = bounds;
    const testPositions: Coordinate[] = [];
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4; j++) {
        const lat = minLat + (maxLat - minLat) * i / 4;
        const lng = minLng + (maxLng - minLng) * j / 4;
        if (turf.booleanPointInPolygon(turf.point([lng, lat]), landPolygon)) testPositions.push({ lat, lng });
      }
    }
    let bestOrientation = 0;
    let bestTotalArea = 0;
    for (const rotation of orientations) {
      let totalArea = 0;
      for (const position of testPositions) {
        const candidate: PolyhouseCandidate = {
          gableLength: candidateSizes[0].gable,
          gutterWidth: candidateSizes[0].gutter,
          area: candidateSizes[0].area,
          position,
          rotation,
        };
        const rectangle = this.createRectangle(candidate);
        if (this.isValidPlacement(rectangle, landPolygon, [])) totalArea += candidate.area;
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
    if (strategy === 'uniform') return [90];
    if (strategy === 'varied') return [0, 90];
    const angles: number[] = [];
    for (let angle = 0; angle < 180; angle += 10) angles.push(angle);
    return angles;
  }

  private async tryPlacePolyhouse(
    candidate: PolyhouseCandidate,
    landPolygon: Feature<Polygon>,
    occupiedAreas: Feature<Polygon>[]
  ): Promise<Polyhouse | null> {
    const numBlocks = (candidate.gableLength / this.GABLE_MODULE) * (candidate.gutterWidth / this.GUTTER_MODULE);
    const minimumBlocks = this.config.minimumBlocksPerPolyhouse || 10;
    if (numBlocks < minimumBlocks) return null;

    const rectangle = this.createRectangle(candidate);
    if (!this.isValidPlacement(rectangle, landPolygon, occupiedAreas)) return null;

    return {
      id: `polyhouse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      gableLength: candidate.gableLength,
      gutterWidth: candidate.gutterWidth,
      rotation: candidate.rotation,
      center: candidate.position,
      area: candidate.area,
      innerArea: candidate.area,
      dimensions: { length: candidate.gableLength, width: candidate.gutterWidth },
      bounds: rectangle.corners,
      blocks: this.generateBlocks(candidate),
      label: '',
      color: '',
    };
  }

  private createRectangle(candidate: PolyhouseCandidate): { corners: Point[]; polygon: Feature<Polygon> } {
    const { position, gableLength, gutterWidth, rotation } = candidate;
    const angleRad = (rotation * Math.PI) / 180;
    const halfGable = gableLength / 2;
    const halfGutter = gutterWidth / 2;
    const localCorners = [
      { x: -halfGable, y: -halfGutter },
      { x: halfGable, y: -halfGutter },
      { x: halfGable, y: halfGutter },
      { x: -halfGable, y: halfGutter },
    ];
    const corners: Point[] = localCorners.map(corner => {
      const rotatedX = corner.x * Math.cos(angleRad) - corner.y * Math.sin(angleRad);
      const rotatedY = corner.x * Math.sin(angleRad) + corner.y * Math.cos(angleRad);
      const lng = position.lng + rotatedX / (111320 * Math.cos(position.lat * Math.PI / 180));
      const lat = position.lat + rotatedY / 111320;
      return { x: lng, y: lat };
    });
    const coords = corners.map(c => [c.x, c.y]);
    coords.push([corners[0].x, corners[0].y]);
    return { corners, polygon: turf.polygon([coords]) };
  }

  private isValidPlacement(
    rectangle: { polygon: Feature<Polygon> },
    landPolygon: Feature<Polygon>,
    occupiedAreas: Feature<Polygon>[]
  ): boolean {
    try {
      if (!turf.booleanContains(landPolygon, rectangle.polygon) && !turf.booleanWithin(rectangle.polygon, landPolygon))
        return false;
    } catch {
      return false;
    }
    if (this.terrainData?.restrictedAreas) {
      for (const restrictedZone of this.terrainData.restrictedAreas) {
        if (restrictedZone.type === 'water' && restrictedZone.severity === 'prohibited') {
          try {
            const restrictedCoords = restrictedZone.coordinates.map((c: any) => [c.lng, c.lat]);
            if (restrictedCoords.length >= 3) {
              restrictedCoords.push(restrictedCoords[0]);
              const restrictedPolygon = turf.polygon([restrictedCoords]);
              if (
                turf.booleanOverlap(rectangle.polygon, restrictedPolygon) ||
                turf.booleanContains(restrictedPolygon, rectangle.polygon) ||
                turf.booleanContains(rectangle.polygon, restrictedPolygon) ||
                turf.booleanIntersects(rectangle.polygon, restrictedPolygon)
              )
                return false;
            }
          } catch {
            // Skip invalid restricted zone polygon
          }
        }
      }
    }
    for (const occupied of occupiedAreas) {
      if (
        turf.booleanOverlap(rectangle.polygon, occupied) ||
        turf.booleanContains(occupied, rectangle.polygon) ||
        turf.booleanContains(rectangle.polygon, occupied)
      )
        return false;
    }
    return true;
  }

  private createBufferedPolygon(polyhouse: Polyhouse, bufferMeters: number): Feature<Polygon> {
    const coords = polyhouse.bounds.map(p => [p.x, p.y]);
    coords.push([polyhouse.bounds[0].x, polyhouse.bounds[0].y]);
    const polygon = turf.polygon([coords]);
    return turf.buffer(polygon, bufferMeters, { units: 'meters' }) as Feature<Polygon>;
  }

  private generateBlocks(candidate: PolyhouseCandidate): Block[] {
    const blocks: Block[] = [];
    const { gableLength, gutterWidth, position, rotation } = candidate;
    const numGableBays = gableLength / this.GABLE_MODULE;
    const numGutterBays = gutterWidth / this.GUTTER_MODULE;
    const angleRad = (rotation * Math.PI) / 180;
    const halfGable = gableLength / 2;
    const halfGutter = gutterWidth / 2;
    for (let i = 0; i < numGableBays; i++) {
      for (let j = 0; j < numGutterBays; j++) {
        const localX = -halfGable + i * this.GABLE_MODULE;
        const localY = -halfGutter + j * this.GUTTER_MODULE;
        const blockCorners = [
          { x: localX, y: localY },
          { x: localX + this.GABLE_MODULE, y: localY },
          { x: localX + this.GABLE_MODULE, y: localY + this.GUTTER_MODULE },
          { x: localX, y: localY + this.GUTTER_MODULE },
        ];
        const geoCorners = blockCorners.map(corner => {
          const rotatedX = corner.x * Math.cos(angleRad) - corner.y * Math.sin(angleRad);
          const rotatedY = corner.x * Math.sin(angleRad) + corner.y * Math.cos(angleRad);
          return {
            x: position.lng + rotatedX / (111320 * Math.cos(position.lat * Math.PI / 180)),
            y: position.lat + rotatedY / 111320,
          };
        });
        blocks.push({
          id: `block-${i}-${j}`,
          position: { x: localX, y: localY },
          width: this.GABLE_MODULE,
          height: this.GUTTER_MODULE,
          rotation,
          corners: geoCorners,
        });
      }
    }
    return blocks;
  }
}
