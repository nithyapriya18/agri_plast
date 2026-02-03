'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Coordinate, Polyhouse } from '@shared/types';
import { X, Minimize2, Maximize2, Search } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

interface MapComponentProps {
  landBoundary: Coordinate[];
  polyhouses: Polyhouse[];
  onBoundaryComplete: (coordinates: Coordinate[]) => void;
  loading: boolean;
  terrainAnalysis?: any;
  regulatoryCompliance?: any;
  editMode: boolean;
}

export default function MapComponent({
  landBoundary,
  polyhouses,
  onBoundaryComplete,
  loading,
  terrainAnalysis,
  regulatoryCompliance,
  editMode,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleReady, setStyleReady] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [instructionsMinimized, setInstructionsMinimized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; place_name: string; center: [number, number] }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitiallyFitBounds = useRef(false);
  const polyhouseMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    console.log('Mapbox token loaded:', token ? `${token.substring(0, 10)}...` : 'MISSING');
    mapboxgl.accessToken = token;

    if (!token) {
      console.error('❌ Mapbox token is missing! Check your .env file and restart the server.');
      return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [77.5946, 12.9716], // Default to Bangalore, India
      zoom: 15,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add drawing controls
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: 'draw_polygon',
    });

    map.current.addControl(draw.current);

    // Handle polygon creation
    map.current.on('draw.create', updateArea);
    map.current.on('draw.update', updateArea);
    map.current.on('draw.delete', () => {
      // Clear boundary when deleted
    });

    map.current.on('load', () => {
      console.log('Map load event fired');
      setMapLoaded(true);
    });

    // Use styledata event which fires when style is loaded/changed
    map.current.on('styledata', () => {
      if (map.current?.isStyleLoaded()) {
        console.log('Style is now loaded (styledata event)');
        setStyleReady(true);
      }
    });

    function updateArea(e: any) {
      // Only process if in edit mode
      if (!editMode) return;

      const data = draw.current?.getAll();
      if (data && data.features.length > 0) {
        const polygon = data.features[0];
        const coords = (polygon.geometry as any).coordinates[0].map((c: number[]) => ({
          lng: c[0],
          lat: c[1],
        }));
        // Remove the last coordinate if it's the same as the first (closing the polygon)
        if (coords.length > 1 &&
            coords[0].lat === coords[coords.length - 1].lat &&
            coords[0].lng === coords[coords.length - 1].lng) {
          coords.pop();
        }
        onBoundaryComplete(coords);
      }
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Load existing land boundary into draw control
  useEffect(() => {
    if (!draw.current || !map.current || !mapLoaded) return;
    if (landBoundary.length === 0) return;

    console.log('Loading existing land boundary into draw control:', landBoundary);

    // Clear existing drawings
    draw.current.deleteAll();

    // Add the land boundary as a polygon
    const feature = {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          ...landBoundary.map(c => [c.lng, c.lat]),
          [landBoundary[0].lng, landBoundary[0].lat] // Close the polygon
        ]]
      },
      properties: {}
    };

    draw.current.add(feature);

    // Fit map to show the boundary
    if (!hasInitiallyFitBounds.current) {
      const lngs = landBoundary.map(c => c.lng);
      const lats = landBoundary.map(c => c.lat);
      map.current.fitBounds([
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)]
      ], { padding: 50 });
      hasInitiallyFitBounds.current = true;
    }
  }, [landBoundary, mapLoaded]);

  // Toggle drawing mode based on editMode
  useEffect(() => {
    if (!draw.current || !map.current) return;

    if (editMode) {
      // If there's already a boundary loaded, enable editing of existing polygon
      if (landBoundary.length > 0) {
        const features = draw.current.getAll();
        if (features.features.length > 0 && features.features[0].id) {
          try {
            // Switch to direct_select mode to edit the existing polygon
            (draw.current.changeMode as any)('direct_select', { featureId: features.features[0].id });
          } catch (error) {
            console.warn('Could not enter direct_select mode, falling back to simple_select:', error);
            // Fall back to simple_select if direct_select fails
            draw.current.changeMode('simple_select');
          }
        } else {
          // No polygon loaded yet, allow drawing new one
          draw.current.changeMode('draw_polygon');
        }
      } else {
        // No boundary, allow drawing new one
        draw.current.changeMode('draw_polygon');
      }
    } else {
      // Disable drawing - switch to simple_select mode (pan/zoom only)
      draw.current.changeMode('simple_select');
    }
  }, [editMode, landBoundary.length]);

  // Fetch autocomplete suggestions with debounce
  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=5&autocomplete=true`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        setSuggestions(data.features);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
      setSuggestions([]);
    }
  };

  // Handle search input changes with debouncing
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for autocomplete
    searchTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300); // 300ms debounce
  };

  // Handle location search using Mapbox Geocoding API (100% FREE - 100k requests/month)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !map.current) return;

    setSearchLoading(true);
    setShowSuggestions(false);

    try {
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxToken}&limit=1`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        map.current.flyTo({
          center: [lng, lat],
          zoom: 15,
          duration: 2000,
        });
      } else {
        alert('Location not found. Please try a different address.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search location. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: { place_name: string; center: [number, number] }) => {
    if (!map.current) return;

    const [lng, lat] = suggestion.center;
    setSearchQuery(suggestion.place_name);
    setShowSuggestions(false);
    setSuggestions([]);

    map.current.flyTo({
      center: [lng, lat],
      zoom: 15,
      duration: 2000,
    });
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update polyhouses visualization
  useEffect(() => {
    console.log('MapComponent polyhouses effect triggered');
    console.log('  - map.current:', !!map.current);
    console.log('  - mapLoaded:', mapLoaded);
    console.log('  - styleReady:', styleReady);
    console.log('  - polyhouses:', polyhouses);
    console.log('  - polyhouses type:', typeof polyhouses);
    console.log('  - polyhouses is array:', Array.isArray(polyhouses));
    console.log('  - polyhouses length:', polyhouses?.length);

    if (!map.current || !mapLoaded || !styleReady) {
      console.log('Map or style not ready yet (mapLoaded:', mapLoaded, ', styleReady:', styleReady, ')');
      return;
    }

    const mapInstance = map.current;
    console.log('Style is loaded, proceeding with polyhouse rendering...');

    // CRITICAL FIX: Handle null/undefined polyhouses
    const validPolyhouses = Array.isArray(polyhouses) ? polyhouses : [];
    if (validPolyhouses.length === 0) {
      console.log('No polyhouses to render (empty array or invalid data)');
      // Still need to clean up existing layers if they exist
    }

    // Debug log to check polyhouse structure
    console.log('Rendering polyhouses:', validPolyhouses.length);
    if (validPolyhouses.length > 0) {
      console.log('Sample polyhouse structure:', {
        id: validPolyhouses[0].id,
        blocksCount: validPolyhouses[0].blocks?.length,
        hasCorners: validPolyhouses[0].blocks?.[0]?.corners?.length > 0,
        sampleBlock: validPolyhouses[0].blocks?.[0],
        sampleCorner: validPolyhouses[0].blocks?.[0]?.corners?.[0],
      });
    }

    // Remove existing layers and sources
    const layersToRemove = [
      'boundary-buffer-fill',
      'boundary-buffer-outline',
      'restricted-zones-fill',
      'restricted-zones-outline',
      'gutters-fill',
      'gutters-outline',
      'blocks-fill',
      'blocks-outline',
    ];

    const sourcesToRemove = [
      'boundary-buffer',
      'restricted-zones',
      'gutters',
      'blocks',
    ];

    layersToRemove.forEach(layerId => {
      if (mapInstance.getLayer(layerId)) {
        mapInstance.removeLayer(layerId);
      }
    });

    sourcesToRemove.forEach(sourceId => {
      if (mapInstance.getSource(sourceId)) {
        mapInstance.removeSource(sourceId);
      }
    });

    // Add land boundary outline to show the restricted buffer zone at edges
    const boundaryBufferCoords = landBoundary.map(c => [c.lng, c.lat]);
    if (boundaryBufferCoords.length > 0 &&
        (boundaryBufferCoords[0][0] !== boundaryBufferCoords[boundaryBufferCoords.length - 1][0] ||
         boundaryBufferCoords[0][1] !== boundaryBufferCoords[boundaryBufferCoords.length - 1][1])) {
      boundaryBufferCoords.push([...boundaryBufferCoords[0]]);
    }

    mapInstance.addSource('boundary-buffer', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [boundaryBufferCoords],
          },
        }],
      },
    });

    // Add boundary outline (thick orange line to show 1-2m buffer zone at edges)
    mapInstance.addLayer({
      id: 'boundary-buffer-outline',
      type: 'line',
      source: 'boundary-buffer',
      paint: {
        'line-color': '#ea580c', // Strong orange for boundary
        'line-width': 8, // Thick line to represent the buffer zone
        'line-opacity': 0.6,
      },
    });

    // Add restricted zones from terrain analysis (water, steep slopes, forests)
    console.log('MapComponent: terrainAnalysis data:', terrainAnalysis);
    if (terrainAnalysis && terrainAnalysis.restrictedZones && terrainAnalysis.restrictedZones.length > 0) {
      console.log(`MapComponent: Rendering ${terrainAnalysis.restrictedZones.length} restricted zones`);
      const restrictedFeatures = terrainAnalysis.restrictedZones
        .filter((zone: any) => zone.coordinates && Array.isArray(zone.coordinates) && zone.coordinates.length >= 3)
        .map((zone: any, index: number) => {
          console.log(`   Zone ${index + 1}: ${zone.type}, ${zone.coordinates.length} coords`);
          return {
            type: 'Feature' as const,
            properties: {
              type: zone.type,
              reason: zone.reason,
              severity: zone.severity,
            },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [
                zone.coordinates.map((c: any) => [c.lng, c.lat]).concat([[zone.coordinates[0].lng, zone.coordinates[0].lat]])
              ],
            },
          };
        });

      mapInstance.addSource('restricted-zones', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: restrictedFeatures,
        },
      });

      // Add fill layer - RED for all restricted zones to clearly show no-build areas
      mapInstance.addLayer({
        id: 'restricted-zones-fill',
        type: 'fill',
        source: 'restricted-zones',
        paint: {
          'fill-color': [
            'match',
            ['get', 'severity'],
            'prohibited', '#dc2626',      // Dark red for prohibited areas
            'challenging', '#f97316',     // Orange for challenging areas
            '#ef4444'                     // Red for other restrictions
          ],
          'fill-opacity': 0.6, // More visible
        },
      });

      // Add outline with diagonal hatch pattern effect
      mapInstance.addLayer({
        id: 'restricted-zones-outline',
        type: 'line',
        source: 'restricted-zones',
        paint: {
          'line-color': '#991b1b', // Dark red outline for strong warning
          'line-width': 3,
          'line-dasharray': [5, 3], // Dashed to show it's restricted
        },
      });
    }

    // Spacing is maintained automatically by the optimizer
    // We don't need to visualize it separately as it just adds visual clutter

    // Create GeoJSON features for gutters (outer bounds - these include the 2m gutter)
    const gutterFeatures = validPolyhouses
      .filter(polyhouse => {
        if (!polyhouse.bounds || polyhouse.bounds.length < 3) {
          console.warn(`Polyhouse ${polyhouse.id} has invalid bounds:`, polyhouse.bounds?.length);
          return false;
        }
        return true;
      })
      .map((polyhouse, index) => {
        // Bounds are stored as Point[] with {x: lng, y: lat}
        const boundsCoords = polyhouse.bounds.map(p => [p.x, p.y]);

        // Validate coordinates are reasonable geographic values
        const isValid = boundsCoords.every(coord =>
          coord[0] >= -180 && coord[0] <= 180 && // longitude
          coord[1] >= -90 && coord[1] <= 90       // latitude
        );

        if (!isValid) {
          console.warn(`Polyhouse ${polyhouse.id} has invalid bound coordinates:`, boundsCoords[0]);
        }

        return {
          type: 'Feature' as const,
          properties: {
            id: `${polyhouse.id}-gutter`,
            index,
            label: polyhouse.label || `P${index + 1}`,
            area: polyhouse.area,
            dimensions: polyhouse.dimensions,
            blocksCount: polyhouse.blocks?.length || 0,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              boundsCoords.concat([[polyhouse.bounds[0].x, polyhouse.bounds[0].y]])
            ],
          },
        };
      });

    // Add gutters source (shows the gutter area around polyhouses)
    mapInstance.addSource('gutters', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: gutterFeatures,
      },
    });

    // Add polyhouse structure fill layer (light green to show the entire polyhouse)
    mapInstance.addLayer({
      id: 'gutters-fill',
      type: 'fill',
      source: 'gutters',
      paint: {
        'fill-color': '#86efac', // Light green for entire polyhouse structure (including gutters)
        'fill-opacity': 0.4, // More transparent so blocks stand out
      },
    });

    // Add polyhouse structure outline layer (dark green border)
    mapInstance.addLayer({
      id: 'gutters-outline',
      type: 'line',
      source: 'gutters',
      paint: {
        'line-color': '#15803d', // Dark green for polyhouse boundaries
        'line-width': 3,
      },
    });

    // Don't render the inner "polyhouses" layer - we'll show blocks directly instead
    // This was covering the blocks with a gray overlay

    // Create GeoJSON features for individual blocks within polyhouses
    const blockFeatures: any[] = [];
    validPolyhouses.forEach((polyhouse, polyhouseIndex) => {
      if (polyhouse.blocks && polyhouse.blocks.length > 0) {
        polyhouse.blocks.forEach((block, blockIndex) => {
          if (block.corners && block.corners.length >= 3) {
            // Corners are stored as Point[] with {x: lng, y: lat}
            const blockCoords = block.corners.map(c => [c.x, c.y]);

            // Validate coordinates are reasonable geographic values
            const isValid = blockCoords.every(coord =>
              coord[0] >= -180 && coord[0] <= 180 && // longitude
              coord[1] >= -90 && coord[1] <= 90       // latitude
            );

            if (!isValid) {
              console.warn(`Block ${polyhouseIndex}-${blockIndex} has invalid coordinates:`, blockCoords[0]);
              return;
            }

            // Close the polygon if not already closed
            if (blockCoords[0][0] !== blockCoords[blockCoords.length - 1][0] ||
                blockCoords[0][1] !== blockCoords[blockCoords.length - 1][1]) {
              blockCoords.push([...blockCoords[0]]);
            }

            blockFeatures.push({
              type: 'Feature' as const,
              properties: {
                polyhouseId: polyhouse.id,
                polyhouseIndex,
                blockIndex,
                blockArea: block.width * block.height,
              },
              geometry: {
                type: 'Polygon' as const,
                coordinates: [blockCoords],
              },
            });
          } else {
            console.warn(`Block ${polyhouseIndex}-${blockIndex} missing or invalid corners:`, block.corners?.length);
          }
        });
      }
    });

    console.log(`Rendering ${blockFeatures.length} blocks across ${validPolyhouses.length} polyhouses`);
    console.log(`Rendering ${gutterFeatures.length} polyhouse gutters`);

    // Add blocks source if we have blocks
    if (blockFeatures.length > 0) {
      mapInstance.addSource('blocks', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: blockFeatures,
        },
      });

      // Add blocks fill layer (darker green for individual blocks)
      mapInstance.addLayer({
        id: 'blocks-fill',
        type: 'fill',
        source: 'blocks',
        paint: {
          'fill-color': '#059669', // Emerald green for blocks
          'fill-opacity': 0.9, // More opaque
        },
      });

      // Add blocks outline layer (bright white borders to separate blocks)
      mapInstance.addLayer({
        id: 'blocks-outline',
        type: 'line',
        source: 'blocks',
        paint: {
          'line-color': '#ffffff', // Bright white borders between blocks
          'line-width': 3, // Thicker borders
          'line-opacity': 1, // Fully opaque
        },
      });
    } else {
      console.warn('No blocks found to render - blocks may not have corner data');
    }

    // Add hover popup for polyhouse info
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'polyhouse-popup',
    });

    mapInstance.on('mousemove', 'gutters-fill', (e) => {
      if (e.features && e.features.length > 0) {
        mapInstance.getCanvas().style.cursor = 'pointer';

        const feature = e.features[0];
        const props = feature.properties;
        const area = props?.area || 0;
        const dimensions = props?.dimensions ? JSON.parse(props.dimensions) : null;
        const label = props?.label || `P${(props?.index || 0) + 1}`;

        const blocksCount = props?.blocksCount || 0;
        let html = `<div style="padding: 8px; font-size: 13px; background: white; color: #1f2937; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">`;
        html += `<strong style="color: #047857;">Polyhouse ${label}</strong><br/>`;
        html += `<strong>Total Area:</strong> ${area.toFixed(0)} m²<br/>`;
        if (dimensions) {
          html += `<strong>Size:</strong> ${dimensions.length.toFixed(1)}m × ${dimensions.width.toFixed(1)}m<br/>`;
        }
        html += `<strong>Blocks:</strong> ${blocksCount}<br/>`;
        html += `</div>`;

        popup.setLngLat(e.lngLat).setHTML(html).addTo(mapInstance);
      }
    });

    mapInstance.on('mouseleave', 'gutters-fill', () => {
      mapInstance.getCanvas().style.cursor = '';
      popup.remove();
    });

    // Clear old polyhouse markers before adding new ones
    polyhouseMarkersRef.current.forEach(marker => marker.remove());
    polyhouseMarkersRef.current = [];

    // Add labels for polyhouses
    validPolyhouses.forEach((polyhouse, index) => {
      // Calculate center of polyhouse
      const center = {
        lng: polyhouse.bounds.reduce((sum, p) => sum + p.x, 0) / polyhouse.bounds.length,
        lat: polyhouse.bounds.reduce((sum, p) => sum + p.y, 0) / polyhouse.bounds.length,
      };

      // Add marker with polyhouse info
      const el = document.createElement('div');
      el.className = 'polyhouse-marker';
      el.style.backgroundColor = '#16a34a';
      el.style.color = 'white';
      el.style.padding = '4px 8px';
      el.style.borderRadius = '4px';
      el.style.fontSize = '12px';
      el.style.fontWeight = 'bold';
      // Use backend label if available, otherwise fallback to P{index+1}
      el.textContent = polyhouse.label || `P${index + 1}`;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([center.lng, center.lat])
        .addTo(mapInstance);

      // Store marker reference for cleanup
      polyhouseMarkersRef.current.push(marker);
    });

    // Fit bounds to show all polyhouses (only on first load, not on updates)
    if (validPolyhouses.length > 0 && !hasInitiallyFitBounds.current) {
      const bounds = new mapboxgl.LngLatBounds();
      validPolyhouses.forEach(polyhouse => {
        polyhouse.bounds.forEach(p => {
          bounds.extend([p.x, p.y]);
        });
      });
      mapInstance.fitBounds(bounds, { padding: 50 });
      hasInitiallyFitBounds.current = true;
    }
  }, [polyhouses, mapLoaded, styleReady]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Location Search Bar with Autocomplete */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-10">
        <div className="search-container relative">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder="Search location (e.g., Bangalore, India)"
              className="w-full px-4 py-3 pr-12 rounded-lg shadow-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-agriplast-green-600 focus:border-transparent"
              disabled={searchLoading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-agriplast-green-600 hover:bg-agriplast-green-700 text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {searchLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Search size={20} />
              )}
            </button>
          </form>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto z-20">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-agriplast-green-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start gap-2">
                    <Search size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                    <span className="text-gray-700 text-sm leading-relaxed">
                      {suggestion.place_name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions overlay */}
      {landBoundary.length === 0 && !loading && showInstructions && (
        <div
          className={`absolute bg-white rounded-lg shadow-xl transition-all duration-300 pointer-events-auto ${
            instructionsMinimized
              ? 'bottom-4 right-4 w-auto'
              : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md p-6'
          }`}
        >
          {instructionsMinimized ? (
            <button
              onClick={() => setInstructionsMinimized(false)}
              className="flex items-center gap-2 px-4 py-3 text-agriplast-green-700 hover:bg-agriplast-green-50 rounded-lg transition-colors"
            >
              <Maximize2 size={18} />
              <span className="font-medium">Show Instructions</span>
            </button>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-bold text-agriplast-green-700">
                  Draw Your Land Boundary
                </h2>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => setInstructionsMinimized(true)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Minimize"
                  >
                    <Minimize2 size={18} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => setShowInstructions(false)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Close"
                  >
                    <X size={18} className="text-gray-600" />
                  </button>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Use the polygon tool on the left to draw the boundary of your agricultural land.
                Click to add points, and double-click to complete the polygon.
              </p>
              <div className="bg-agriplast-green-50 p-3 rounded">
                <p className="text-sm text-agriplast-green-800">
                  <strong>Tip:</strong> Use satellite view to accurately trace your land boundaries.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
