/**
 * OpenStreetMap Overpass API Service
 * Fast road and building detection using real OSM data
 * Much faster than satellite imagery processing (1-2 seconds vs 30+ seconds)
 */

import { Coordinate } from '@shared/types';

export interface OSMRoad {
  type: 'road';
  coordinates: Coordinate[];
  name?: string;
  highway: string; // motorway, primary, secondary, residential, etc.
}

export interface OSMBuilding {
  type: 'building';
  coordinates: Coordinate[];
  name?: string;
  buildingType?: string;
}

export interface OSMWater {
  type: 'water';
  coordinates: Coordinate[];
  name?: string;
  waterType?: string; // river, lake, reservoir, etc.
}

export interface OSMForest {
  type: 'forest';
  coordinates: Coordinate[];
  name?: string;
  forestType?: string; // forest, wood, etc.
}

export class OpenStreetMapService {
  private overpassUrl = 'https://overpass-api.de/api/interpreter';

  /**
   * Fetch roads, buildings, water bodies, and forests from OpenStreetMap for a bounding box
   * This is MUCH faster than processing satellite imagery
   */
  async fetchRoadsAndBuildings(
    coordinates: Coordinate[]
  ): Promise<{ roads: OSMRoad[]; buildings: OSMBuilding[]; water: OSMWater[]; forests: OSMForest[] }> {
    console.log('  🗺️  Fetching real infrastructure data from OpenStreetMap...');

    // Calculate bounding box
    const lats = coordinates.map(c => c.lat);
    const lngs = coordinates.map(c => c.lng);
    const south = Math.min(...lats);
    const north = Math.max(...lats);
    const west = Math.min(...lngs);
    const east = Math.max(...lngs);

    // Overpass QL query to get roads, buildings, water, and forests
    const query = `
[out:json][timeout:25];
(
  way["highway"](${south},${west},${north},${east});
  way["building"](${south},${west},${north},${east});
  way["natural"="water"](${south},${west},${north},${east});
  way["waterway"](${south},${west},${north},${east});
  way["landuse"="forest"](${south},${west},${north},${east});
  way["natural"="wood"](${south},${west},${north},${east});
);
out geom;
    `.trim();

    try {
      const response = await fetch(this.overpassUrl, {
        method: 'POST',
        body: query,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();

      const roads: OSMRoad[] = [];
      const buildings: OSMBuilding[] = [];
      const water: OSMWater[] = [];
      const forests: OSMForest[] = [];

      // Process OSM elements
      for (const element of data.elements) {
        if (element.type !== 'way' || !element.geometry) continue;

        const coords: Coordinate[] = element.geometry.map((node: any) => ({
          lat: node.lat,
          lng: node.lon,
        }));

        if (element.tags?.highway) {
          // Only include MAJOR roads, not footpaths/cycleways/service roads
          const majorRoadTypes = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified'];
          const highwayType = element.tags.highway;

          if (majorRoadTypes.includes(highwayType)) {
            // It's a major road
            roads.push({
              type: 'road',
              coordinates: coords,
              name: element.tags.name,
              highway: highwayType,
            });
          }
          // Ignore: footway, cycleway, path, service, track, pedestrian, steps, etc.
        } else if (element.tags?.building) {
          // It's a building
          buildings.push({
            type: 'building',
            coordinates: coords,
            name: element.tags.name,
            buildingType: element.tags.building,
          });
        } else if (element.tags?.natural === 'water' || element.tags?.waterway) {
          // It's a water body
          water.push({
            type: 'water',
            coordinates: coords,
            name: element.tags.name,
            waterType: element.tags.natural || element.tags.waterway,
          });
        } else if (element.tags?.landuse === 'forest' || element.tags?.natural === 'wood') {
          // It's a forest
          forests.push({
            type: 'forest',
            coordinates: coords,
            name: element.tags.name,
            forestType: element.tags.landuse || element.tags.natural,
          });
        }
      }

      console.log(`  ✓ Found ${roads.length} roads, ${buildings.length} buildings, ${water.length} water bodies, ${forests.length} forests from OSM`);
      return { roads, buildings, water, forests };

    } catch (error: any) {
      console.error('  ❌ Failed to fetch OSM data:', error.message);
      // Return empty arrays if OSM fails - don't break the entire process
      return { roads: [], buildings: [], water: [], forests: [] };
    }
  }

  /**
   * Check if a point is near a road (within buffer distance)
   */
  isPointNearRoad(point: Coordinate, roads: OSMRoad[], bufferMeters: number = 5): boolean {
    const bufferDegrees = bufferMeters / 111320; // Convert meters to degrees

    for (const road of roads) {
      for (let i = 0; i < road.coordinates.length - 1; i++) {
        const start = road.coordinates[i];
        const end = road.coordinates[i + 1];

        // Check distance from point to line segment
        const dist = this.distanceToLineSegment(point, start, end);
        if (dist < bufferDegrees) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a point is inside any building polygon
   */
  isPointInBuilding(point: Coordinate, buildings: OSMBuilding[]): boolean {
    for (const building of buildings) {
      if (this.isPointInPolygon(point, building.coordinates)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a point is in or near a water body
   */
  isPointInWater(point: Coordinate, water: OSMWater[], bufferMeters: number = 5): boolean {
    const bufferDegrees = bufferMeters / 111320; // Convert meters to degrees

    for (const waterBody of water) {
      // Check if point is in the water polygon
      if (this.isPointInPolygon(point, waterBody.coordinates)) {
        return true;
      }

      // For waterways (rivers, streams), check distance to line
      if (waterBody.waterType && ['river', 'stream', 'canal'].includes(waterBody.waterType)) {
        for (let i = 0; i < waterBody.coordinates.length - 1; i++) {
          const start = waterBody.coordinates[i];
          const end = waterBody.coordinates[i + 1];
          const dist = this.distanceToLineSegment(point, start, end);
          if (dist < bufferDegrees) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Check if a point is inside any forest area
   */
  isPointInForest(point: Coordinate, forests: OSMForest[]): boolean {
    for (const forest of forests) {
      if (this.isPointInPolygon(point, forest.coordinates)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate distance from point to line segment
   */
  private distanceToLineSegment(point: Coordinate, lineStart: Coordinate, lineEnd: Coordinate): number {
    const x = point.lng;
    const y = point.lat;
    const x1 = lineStart.lng;
    const y1 = lineStart.lat;
    const x2 = lineEnd.lng;
    const y2 = lineEnd.lat;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if point is inside polygon
   */
  private isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;

      const intersect = ((yi > point.lat) !== (yj > point.lat))
        && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
