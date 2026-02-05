/**
 * Geocoding Utilities
 * Handles reverse geocoding to identify location names from coordinates
 */

import { Coordinate } from '@shared/types';

// Mapbox API types
interface MapboxFeature {
  text: string;
  place_name: string;
  place_type: string[];
}

interface MapboxReverseGeocodeResponse {
  features: MapboxFeature[];
}

export interface LocationInfo {
  locationName: string;
  district?: string;
  state?: string;
  country?: string;
  formatted: string;
}

/**
 * Reverse geocode coordinates to get location information
 * Uses Mapbox Geocoding API for accurate results
 */
export async function reverseGeocode(coordinates: Coordinate[]): Promise<LocationInfo> {
  // Calculate centroid of the land area
  const lat = coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length;
  const lng = coordinates.reduce((sum, c) => sum + c.lng, 0) / coordinates.length;

  console.log(`🌍 Reverse geocoding location at ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E`);

  const mapboxToken = process.env.MAPBOX_TOKEN;

  if (!mapboxToken) {
    console.warn('  ⚠ MAPBOX_TOKEN not configured, using coordinates as location');
    return {
      locationName: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
      formatted: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
    };
  }

  try {
    // Use Mapbox Geocoding API with place,district,region,country types for detailed location
    // Add 5 second timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
      `access_token=${mapboxToken}&types=place,district,region,country&limit=5`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as MapboxReverseGeocodeResponse;

    if (!data.features || data.features.length === 0) {
      throw new Error('No location data found');
    }

    // Extract location details from features
    let place = '';
    let district = '';
    let state = '';
    let country = '';

    // Process features to build location hierarchy
    for (const feature of data.features) {
      if (feature.place_type.includes('place') && !place) {
        place = feature.text;
      }
      if (feature.place_type.includes('district') && !district) {
        district = feature.text;
      }
      if (feature.place_type.includes('region') && !state) {
        state = feature.text;
      }
      if (feature.place_type.includes('country') && !country) {
        country = feature.text;
      }
    }

    // Build location name with most specific information available
    let locationName = '';
    let formatted = '';

    if (place) {
      locationName = place;
      formatted = place;
      if (district && district !== place) {
        formatted += `, ${district}`;
      }
      if (state) {
        formatted += `, ${state}`;
      }
      if (country) {
        formatted += `, ${country}`;
      }
    } else if (district) {
      locationName = district;
      formatted = district;
      if (state) {
        formatted += `, ${state}`;
      }
      if (country) {
        formatted += `, ${country}`;
      }
    } else if (state) {
      locationName = state;
      formatted = state;
      if (country) {
        formatted += `, ${country}`;
      }
    } else if (country) {
      locationName = country;
      formatted = country;
    } else {
      // Fallback to first feature's place_name
      const firstFeature = data.features[0];
      locationName = firstFeature.text || firstFeature.place_name || `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
      formatted = firstFeature.place_name || locationName;
    }

    console.log(`  ✓ Location identified: ${formatted}`);

    return {
      locationName,
      district: district || undefined,
      state: state || undefined,
      country: country || undefined,
      formatted,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('  ❌ Reverse geocoding timed out after 5 seconds');
    } else {
      console.error('  ❌ Reverse geocoding failed:', error instanceof Error ? error.message : error);
    }

    // Fallback to coordinates
    return {
      locationName: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
      formatted: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
    };
  }
}
