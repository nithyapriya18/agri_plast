/**
 * KML Parser Service
 * Extracts coordinates from KML files for zone management
 */

import { DOMParser } from '@xmldom/xmldom';
import { Coordinate } from '@shared/types';
import * as turf from '@turf/turf';

export interface ParsedZone {
  name: string;
  coordinates: Coordinate[];
  area: number; // square meters
}

export interface KMLParseResult {
  zones: ParsedZone[];
  errors: string[];
}

/**
 * Parse KML file content and extract all placemarks
 * Supports both Polygon and LineString geometries
 */
export function parseKMLContent(kmlContent: string): KMLParseResult {
  const errors: string[] = [];
  const zones: ParsedZone[] = [];

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlContent, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parserError) {
      throw new Error('Invalid XML structure in KML file');
    }

    // Find all Placemark elements
    const placemarks = xmlDoc.getElementsByTagName('Placemark');

    if (placemarks.length === 0) {
      errors.push('No Placemark elements found in KML file');
      return { zones: [], errors };
    }

    // Process each placemark
    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];

      try {
        // Extract name
        const nameElement = placemark.getElementsByTagName('name')[0];
        const name = nameElement?.textContent?.trim() || `Zone ${i + 1}`;

        // Try to find coordinates in Polygon first
        let coordinatesText: string | null = null;
        const polygons = placemark.getElementsByTagName('Polygon');
        if (polygons.length > 0) {
          const coordinates = polygons[0].getElementsByTagName('coordinates')[0];
          coordinatesText = coordinates?.textContent?.trim() || null;
        }

        // Fallback to LineString if no Polygon found
        if (!coordinatesText) {
          const lineStrings = placemark.getElementsByTagName('LineString');
          if (lineStrings.length > 0) {
            const coordinates = lineStrings[0].getElementsByTagName('coordinates')[0];
            coordinatesText = coordinates?.textContent?.trim() || null;
          }
        }

        if (!coordinatesText) {
          errors.push(`No coordinates found in placemark: ${name}`);
          continue;
        }

        // Parse coordinates
        const coordinates = parseCoordinates(coordinatesText);

        if (coordinates.length < 3) {
          errors.push(`Insufficient coordinates (${coordinates.length}) in placemark: ${name}. Need at least 3 points.`);
          continue;
        }

        // Calculate area using Turf.js
        const turfCoords = coordinates.map(c => [c.lng, c.lat]);
        // Close the polygon if not already closed
        if (turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] ||
            turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]) {
          turfCoords.push(turfCoords[0]);
        }

        const polygon = turf.polygon([turfCoords]);
        const area = turf.area(polygon); // Returns square meters

        zones.push({
          name,
          coordinates,
          area,
        });
      } catch (error) {
        errors.push(`Error parsing placemark ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (zones.length === 0 && errors.length === 0) {
      errors.push('No valid zones could be extracted from KML file');
    }

    return { zones, errors };
  } catch (error) {
    errors.push(`Failed to parse KML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { zones: [], errors };
  }
}

/**
 * Parse coordinate string from KML format
 * KML format: "lng,lat,altitude lng,lat,altitude ..."
 * Converts to: [{lat, lng}, {lat, lng}, ...]
 */
function parseCoordinates(coordinatesText: string): Coordinate[] {
  const coordinates: Coordinate[] = [];

  // Split by whitespace and newlines
  const points = coordinatesText.split(/\s+/).filter(s => s.length > 0);

  for (const point of points) {
    try {
      const parts = point.split(',');
      if (parts.length >= 2) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        // parts[2] would be altitude, which we ignore

        if (!isNaN(lng) && !isNaN(lat)) {
          // Validate reasonable lat/lng ranges
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            coordinates.push({ lat, lng });
          }
        }
      }
    } catch (error) {
      // Skip invalid coordinates
      continue;
    }
  }

  return coordinates;
}

/**
 * Validate KML file content
 * Returns true if valid, false otherwise
 */
export function validateKMLContent(kmlContent: string): { valid: boolean; error?: string } {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlContent, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parserError) {
      return { valid: false, error: 'Invalid XML structure' };
    }

    // Check for KML root element
    const kmlElement = xmlDoc.getElementsByTagName('kml')[0];
    if (!kmlElement) {
      return { valid: false, error: 'Not a valid KML file (missing <kml> root element)' };
    }

    // Check for at least one Placemark
    const placemarks = xmlDoc.getElementsByTagName('Placemark');
    if (placemarks.length === 0) {
      return { valid: false, error: 'No Placemark elements found' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Extract zone name from KML content (first placemark)
 * Useful for suggesting default zone name
 */
export function extractZoneName(kmlContent: string): string | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlContent, 'text/xml');

    const placemarks = xmlDoc.getElementsByTagName('Placemark');
    if (placemarks.length > 0) {
      const nameElement = placemarks[0].getElementsByTagName('name')[0];
      return nameElement?.textContent?.trim() || null;
    }

    return null;
  } catch (error) {
    return null;
  }
}
