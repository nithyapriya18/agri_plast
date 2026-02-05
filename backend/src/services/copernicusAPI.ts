/**
 * Copernicus Data Space API Integration
 * Fetches real satellite data for elevation (DEM) and land cover
 */

import * as fs from 'fs';
import * as path from 'path';
import { Coordinate } from '@shared/types';
import { LandCoverType } from './terrainAnalysis';
import { fromUrl, fromArrayBuffer } from 'geotiff';

// In CommonJS, __dirname and __filename are available globally
// No need to import fileURLToPath or use import.meta

interface CopernicusConfig {
  demEndpoint: string;
  landCoverEndpoint: string;
  cacheDir: string;
  enableCache: boolean;
}

export class CopernicusAPI {
  private config: CopernicusConfig;
  private cache: Map<string, any>;

  constructor() {
    this.config = {
      demEndpoint: process.env.COPERNICUS_DEM_ENDPOINT || 'https://copernicus-dem-30m.s3.amazonaws.com',
      landCoverEndpoint: process.env.COPERNICUS_LANDCOVER_ENDPOINT || 'https://services.terrascope.be/wms/v2',
      cacheDir: path.join(__dirname, '../../.cache/copernicus'),
      enableCache: process.env.ENABLE_TERRAIN_CACHE !== 'false',
    };
    this.cache = new Map();
    this.ensureCacheDir();
  }

  /**
   * Fetch elevation data from Copernicus DEM (30m resolution)
   */
  async fetchElevation(coordinates: Coordinate[]): Promise<Map<string, number>> {
    console.log(`  📡 Fetching elevation data from Copernicus DEM...`);

    // Check cache first
    const cacheKey = this.getCacheKey('dem', coordinates);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      console.log(`  ✓ Using cached elevation data`);
      return new Map(cached);
    }

    try {
      // Copernicus DEM is provided as GeoTIFF tiles
      // Each tile covers 1° × 1° area at 30m resolution
      const elevationMap = new Map<string, number>();

      // Group coordinates by tile
      const tileGroups = this.groupCoordinatesByTile(coordinates);

      for (const [tileId, tileCoords] of tileGroups.entries()) {
        const tileElevations = await this.fetchDEMTile(tileId, tileCoords);
        tileElevations.forEach((elevation, coord) => {
          elevationMap.set(coord, elevation);
        });
      }

      // Cache the results
      await this.saveToCache(cacheKey, Array.from(elevationMap.entries()));

      console.log(`  ✓ Fetched elevation for ${elevationMap.size} points`);
      return elevationMap;
    } catch (error) {
      console.error(`  ❌ Failed to fetch Copernicus DEM data:`, error);
      console.log(`  ⚠ Falling back to simulated elevation data`);
      return this.simulateElevation(coordinates);
    }
  }

  /**
   * Fetch land cover data from Copernicus WorldCover (10m resolution)
   */
  async fetchLandCover(coordinates: Coordinate[]): Promise<Map<string, LandCoverType>> {
    console.log(`  📡 Fetching land cover data from Copernicus WorldCover...`);

    // Check cache first
    const cacheKey = this.getCacheKey('landcover', coordinates);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      console.log(`  ✓ Using cached land cover data`);
      return new Map(cached);
    }

    try {
      const landCoverMap = new Map<string, LandCoverType>();

      // Copernicus WorldCover uses WMS service
      // Group coordinates to minimize API calls
      const batchSize = 100;
      for (let i = 0; i < coordinates.length; i += batchSize) {
        const batch = coordinates.slice(i, i + batchSize);
        const batchResults = await this.fetchLandCoverBatch(batch);
        batchResults.forEach((landCover, coord) => {
          landCoverMap.set(coord, landCover);
        });
      }

      // Cache the results
      await this.saveToCache(cacheKey, Array.from(landCoverMap.entries()));

      console.log(`  ✓ Fetched land cover for ${landCoverMap.size} points`);
      return landCoverMap;
    } catch (error) {
      console.error(`  ❌ Failed to fetch Copernicus land cover data:`, error);
      console.log(`  ⚠ Falling back to simulated land cover data`);
      return this.simulateLandCover(coordinates);
    }
  }

  /**
   * Fetch DEM tile data from Copernicus DEM on AWS S3
   * Copernicus DEM tiles are named: Copernicus_DSM_COG_10_N{lat}_00_E{lng}_00_DEM
   */
  private async fetchDEMTile(
    tileId: string,
    coordinates: Coordinate[]
  ): Promise<Map<string, number>> {
    const elevations = new Map<string, number>();

    if (coordinates.length === 0) return elevations;

    try {
      // Parse tile ID to get lat/lng
      const match = tileId.match(/N(\d+)_E(\d+)/);
      if (!match) {
        throw new Error(`Invalid tile ID: ${tileId}`);
      }

      const tileLat = parseInt(match[1]);
      const tileLng = parseInt(match[2]);

      // Format tile URL for Copernicus DEM (GLO-30)
      const tileUrl = `https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N${String(tileLat).padStart(2, '0')}_00_E${String(tileLng).padStart(3, '0')}_00_DEM/Copernicus_DSM_COG_10_N${String(tileLat).padStart(2, '0')}_00_E${String(tileLng).padStart(3, '0')}_00_DEM.tif`;

      console.log(`  📡 Fetching DEM tile: ${tileUrl}`);

      // Fetch and parse GeoTIFF
      const tiff = await fromUrl(tileUrl);
      const image = await tiff.getImage();
      const bbox = image.getBoundingBox();
      const [width, height] = [image.getWidth(), image.getHeight()];

      // Read raster data
      const rasters = await image.readRasters();
      const elevationData = rasters[0] as any; // First band contains elevation

      // For each coordinate, find the corresponding pixel and extract elevation
      for (const coord of coordinates) {
        const key = this.coordKey(coord);

        // Convert coordinate to pixel position
        const pixelX = Math.floor(((coord.lng - bbox[0]) / (bbox[2] - bbox[0])) * width);
        const pixelY = Math.floor(((bbox[3] - coord.lat) / (bbox[3] - bbox[1])) * height);

        // Check bounds
        if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
          const index = pixelY * width + pixelX;
          let elevation = elevationData[index];

          // Handle no-data values (-32768 or similar)
          if (elevation < -10000 || elevation > 10000) {
            elevation = 0;
          }

          elevations.set(key, elevation);
        }
      }

      console.log(`  ✓ Extracted ${elevations.size} elevation values from tile`);
      return elevations;

    } catch (error: any) {
      console.error(`  ❌ Failed to fetch DEM tile ${tileId}:`, error.message);
      throw error; // Re-throw to trigger fallback
    }
  }

  /**
   * Fetch land cover for a batch of coordinates from ESA WorldCover
   * Uses CloudOptimized GeoTIFF from AWS S3
   */
  private async fetchLandCoverBatch(
    coordinates: Coordinate[]
  ): Promise<Map<string, LandCoverType>> {
    const landCover = new Map<string, LandCoverType>();

    if (coordinates.length === 0) return landCover;

    try {
      // Group coordinates by 3° x 3° tiles (WorldCover tile size)
      const tileGroups = this.groupCoordinatesByWorldCoverTile(coordinates);

      for (const [tileId, tileCoords] of tileGroups.entries()) {
        const tileLandCover = await this.fetchWorldCoverTile(tileId, tileCoords);
        tileLandCover.forEach((type, coord) => {
          landCover.set(coord, type);
        });
      }

      return landCover;

    } catch (error: any) {
      console.error(`  ❌ Failed to fetch land cover:`, error.message);
      throw error; // Re-throw to trigger fallback
    }
  }

  /**
   * Fetch ESA WorldCover tile from AWS S3
   */
  private async fetchWorldCoverTile(
    tileId: string,
    coordinates: Coordinate[]
  ): Promise<Map<string, LandCoverType>> {
    const landCover = new Map<string, LandCoverType>();

    try {
      // Parse tile ID
      const match = tileId.match(/N(\d+)_E(\d+)/);
      if (!match) throw new Error(`Invalid tile ID: ${tileId}`);

      const tileLat = parseInt(match[1]);
      const tileLng = parseInt(match[2]);

      // ESA WorldCover 10m 2021 (v200) tiles
      // Format: ESA_WorldCover_10m_2021_v200_N{lat}_E{lng}_Map.tif
      const tileUrl = `https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N${String(tileLat).padStart(2, '0')}_E${String(tileLng).padStart(3, '0')}_Map.tif`;

      console.log(`  📡 Fetching WorldCover tile: ${tileUrl}`);

      // Fetch and parse GeoTIFF
      const tiff = await fromUrl(tileUrl);
      const image = await tiff.getImage();
      const bbox = image.getBoundingBox();
      const [width, height] = [image.getWidth(), image.getHeight()];

      // Read raster data
      const rasters = await image.readRasters();
      const landCoverData = rasters[0] as any; // First band contains land cover class

      // Map ESA WorldCover classes to our LandCoverType
      for (const coord of coordinates) {
        const key = this.coordKey(coord);

        // Convert coordinate to pixel position
        const pixelX = Math.floor(((coord.lng - bbox[0]) / (bbox[2] - bbox[0])) * width);
        const pixelY = Math.floor(((bbox[3] - coord.lat) / (bbox[3] - bbox[1])) * height);

        if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
          const index = pixelY * width + pixelX;
          const classValue = landCoverData[index];

          // Map ESA classes to our types
          const type = this.mapESAClassToLandCoverType(classValue);
          landCover.set(key, type);
        }
      }

      console.log(`  ✓ Extracted ${landCover.size} land cover values from tile`);
      return landCover;

    } catch (error: any) {
      console.error(`  ❌ Failed to fetch WorldCover tile ${tileId}:`, error.message);
      throw error;
    }
  }

  /**
   * Map ESA WorldCover class values to our LandCoverType enum
   */
  private mapESAClassToLandCoverType(classValue: number): LandCoverType {
    // ESA WorldCover classification:
    // 10: Tree cover, 20: Shrubland, 30: Grassland, 40: Cropland
    // 50: Built-up, 60: Bare/sparse vegetation, 70: Snow and ice
    // 80: Permanent water bodies, 90: Herbaceous wetland, 95: Mangroves, 100: Moss and lichen
    switch (classValue) {
      case 10: return LandCoverType.FOREST;
      case 20: return LandCoverType.SHRUBLAND;
      case 30: return LandCoverType.GRASSLAND;
      case 40: return LandCoverType.CROPLAND;
      case 50: return LandCoverType.BUILT_UP; // ← This is what we need for roads/buildings!
      case 60: return LandCoverType.BARE_SOIL;
      case 80: return LandCoverType.PERMANENT_WATER;
      case 90: return LandCoverType.WETLAND;
      case 95: return LandCoverType.WETLAND; // Mangroves
      case 100: return LandCoverType.GRASSLAND; // Moss/lichen
      default: return LandCoverType.CROPLAND; // Default fallback
    }
  }

  /**
   * Group coordinates by 3° x 3° WorldCover tiles
   */
  private groupCoordinatesByWorldCoverTile(coordinates: Coordinate[]): Map<string, Coordinate[]> {
    const groups = new Map<string, Coordinate[]>();

    for (const coord of coordinates) {
      // WorldCover tiles are 3° x 3°
      const tileLat = Math.floor(coord.lat / 3) * 3;
      const tileLng = Math.floor(coord.lng / 3) * 3;
      const tileId = `N${tileLat}_E${tileLng}`;

      if (!groups.has(tileId)) {
        groups.set(tileId, []);
      }
      groups.get(tileId)!.push(coord);
    }

    return groups;
  }

  /**
   * Group coordinates by 1° × 1° DEM tiles
   */
  private groupCoordinatesByTile(coordinates: Coordinate[]): Map<string, Coordinate[]> {
    const groups = new Map<string, Coordinate[]>();

    for (const coord of coordinates) {
      const latTile = Math.floor(coord.lat);
      const lngTile = Math.floor(coord.lng);
      const tileId = `N${latTile}_E${lngTile}`;

      if (!groups.has(tileId)) {
        groups.set(tileId, []);
      }
      groups.get(tileId)!.push(coord);
    }

    return groups;
  }

  /**
   * Simulate elevation data (fallback)
   */
  private simulateElevation(coordinates: Coordinate[]): Map<string, number> {
    const elevations = new Map<string, number>();
    const baseElevation = 100;

    for (const coord of coordinates) {
      const noise = Math.sin(coord.lat * 1000) * 5 + Math.cos(coord.lng * 1000) * 5;
      const elevation = baseElevation + noise + (Math.random() - 0.5) * 10;
      elevations.set(this.coordKey(coord), elevation);
    }

    return elevations;
  }

  /**
   * Simulate land cover data (FALLBACK ONLY - NOT REAL DATA!)
   * This should NOT be used in production - only when real Copernicus data fails
   */
  private simulateLandCover(coordinates: Coordinate[]): Map<string, LandCoverType> {
    const landCover = new Map<string, LandCoverType>();

    console.error('\n⚠️ ⚠️ ⚠️  WARNING: Using simulated land cover data - NOT REAL satellite data! ⚠️ ⚠️ ⚠️');
    console.error('⚠️  This will NOT match actual roads/buildings visible in satellite imagery!');
    console.error('⚠️  Results will be INACCURATE - polyhouses may be placed on roads/buildings!\n');

    for (const coord of coordinates) {
      const key = this.coordKey(coord);
      const rand = Math.random();
      let type: LandCoverType;

      // Simple random distribution - DOES NOT reflect reality!
      if (rand < 0.85) type = LandCoverType.CROPLAND;
      else if (rand < 0.93) type = LandCoverType.GRASSLAND;
      else if (rand < 0.96) type = LandCoverType.BARE_SOIL;
      else if (rand < 0.98) type = LandCoverType.SHRUBLAND;
      else type = LandCoverType.WATER;

      landCover.set(key, type);
    }

    return landCover;
  }

  /**
   * Cache management
   */
  private getCacheKey(dataType: string, coordinates: Coordinate[]): string {
    const bounds = this.getBounds(coordinates);
    return `${dataType}_${bounds.minLat.toFixed(4)}_${bounds.maxLat.toFixed(4)}_${bounds.minLng.toFixed(4)}_${bounds.maxLng.toFixed(4)}`;
  }

  private async getFromCache(key: string): Promise<any> {
    if (!this.config.enableCache) return null;

    // Check memory cache
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Check file cache
    const cacheFile = path.join(this.config.cacheDir, `${key}.json`);
    if (fs.existsSync(cacheFile)) {
      try {
        const data = fs.readFileSync(cacheFile, 'utf-8');
        const parsed = JSON.parse(data);

        // Check if cache is still valid (24 hours)
        const age = Date.now() - parsed.timestamp;
        if (age < 24 * 60 * 60 * 1000) {
          this.cache.set(key, parsed.data);
          return parsed.data;
        }
      } catch (error) {
        console.error(`Failed to read cache file: ${cacheFile}`, error);
      }
    }

    return null;
  }

  private async saveToCache(key: string, data: any): Promise<void> {
    if (!this.config.enableCache) return;

    // Save to memory cache
    this.cache.set(key, data);

    // Save to file cache
    try {
      const cacheFile = path.join(this.config.cacheDir, `${key}.json`);
      const cacheData = {
        timestamp: Date.now(),
        data,
      };
      fs.writeFileSync(cacheFile, JSON.stringify(cacheData), 'utf-8');
    } catch (error) {
      console.error(`Failed to write cache file`, error);
    }
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.config.cacheDir)) {
      fs.mkdirSync(this.config.cacheDir, { recursive: true });
    }
  }

  private getBounds(coordinates: Coordinate[]) {
    return {
      minLat: Math.min(...coordinates.map(c => c.lat)),
      maxLat: Math.max(...coordinates.map(c => c.lat)),
      minLng: Math.min(...coordinates.map(c => c.lng)),
      maxLng: Math.max(...coordinates.map(c => c.lng)),
    };
  }

  private coordKey(coord: Coordinate): string {
    return `${coord.lat.toFixed(6)},${coord.lng.toFixed(6)}`;
  }
}
