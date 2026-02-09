/**
 * Google Elevation API Service
 * Provides accurate elevation data using Google Maps Elevation API
 * More reliable and up-to-date than Copernicus DEM
 */

import { Coordinate } from '@shared/types';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface GoogleElevationConfig {
  apiKey: string;
  cacheDir: string;
  enableCache: boolean;
}

export class GoogleElevationService {
  private config: GoogleElevationConfig;
  private cache: Map<string, any>;

  constructor() {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY is required for Google Elevation API');
    }

    this.config = {
      apiKey,
      cacheDir: path.join(process.cwd(), '.cache', 'google-elevation'),
      enableCache: true,
    };
    this.cache = new Map();

    // Ensure cache directory exists
    if (this.config.enableCache && !fs.existsSync(this.config.cacheDir)) {
      fs.mkdirSync(this.config.cacheDir, { recursive: true });
    }
  }

  /**
   * Fetch elevation data from Google Maps Elevation API
   * Batch requests for efficiency (max 512 locations per request)
   */
  async fetchElevation(coordinates: Coordinate[]): Promise<Map<string, number>> {
    console.log(`  📡 Fetching elevation data from Google Elevation API...`);

    // Check cache first
    const cacheKey = this.getCacheKey(coordinates);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      console.log('  ✓ Using cached elevation data');
      return new Map(Object.entries(cached));
    }

    const elevationMap = new Map<string, number>();
    const batchSize = 512; // Google API limit

    // Process in batches
    for (let i = 0; i < coordinates.length; i += batchSize) {
      const batch = coordinates.slice(i, Math.min(i + batchSize, coordinates.length));

      try {
        const locations = batch.map(coord => `${coord.lat},${coord.lng}`).join('|');

        const response = await axios.get('https://maps.googleapis.com/maps/api/elevation/json', {
          params: {
            locations,
            key: this.config.apiKey,
          },
          timeout: 30000,
        });

        if (response.data.status === 'OK' && response.data.results) {
          response.data.results.forEach((result: any, index: number) => {
            const coord = batch[index];
            const key = `${coord.lat.toFixed(6)},${coord.lng.toFixed(6)}`;
            elevationMap.set(key, result.elevation);
          });
        } else if (response.data.status === 'OVER_QUERY_LIMIT') {
          throw new Error('Google Elevation API quota exceeded. Please check your API key limits.');
        } else {
          console.warn(`Google Elevation API warning: ${response.data.status}`);
        }

        // Rate limiting: wait 100ms between batches
        if (i + batchSize < coordinates.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error fetching elevation for batch ${i / batchSize + 1}:`, error);
        // Use default elevation for failed points
        batch.forEach(coord => {
          const key = `${coord.lat.toFixed(6)},${coord.lng.toFixed(6)}`;
          elevationMap.set(key, 0);
        });
      }
    }

    // Cache the results
    await this.saveToCache(cacheKey, Object.fromEntries(elevationMap));

    return elevationMap;
  }

  /**
   * Get land slope between two points
   */
  calculateSlope(elevation1: number, elevation2: number, distance: number): number {
    if (distance === 0) return 0;
    const heightDiff = Math.abs(elevation2 - elevation1);
    const slopeRadians = Math.atan(heightDiff / distance);
    return slopeRadians * (180 / Math.PI); // Convert to degrees
  }

  /**
   * Generate cache key for coordinates
   */
  private getCacheKey(coordinates: Coordinate[]): string {
    if (coordinates.length === 0) return 'empty';

    // Use bounding box for cache key
    const lats = coordinates.map(c => c.lat);
    const lngs = coordinates.map(c => c.lng);
    const minLat = Math.min(...lats).toFixed(4);
    const maxLat = Math.max(...lats).toFixed(4);
    const minLng = Math.min(...lngs).toFixed(4);
    const maxLng = Math.max(...lngs).toFixed(4);

    return `elevation_${minLat}_${maxLat}_${minLng}_${maxLng}`;
  }

  /**
   * Get data from cache
   */
  private async getFromCache(key: string): Promise<any> {
    if (!this.config.enableCache) return null;

    // Check in-memory cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Check file cache
    const filePath = path.join(this.config.cacheDir, `${key}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        this.cache.set(key, data);
        return data;
      } catch (error) {
        console.error('Error reading cache file:', error);
      }
    }

    return null;
  }

  /**
   * Save data to cache
   */
  private async saveToCache(key: string, data: any): Promise<void> {
    if (!this.config.enableCache) return;

    // Save to in-memory cache
    this.cache.set(key, data);

    // Save to file cache
    try {
      const filePath = path.join(this.config.cacheDir, `${key}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error writing cache file:', error);
    }
  }
}
