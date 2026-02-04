'use client';

import { useEffect, useRef, useState } from 'react';
import { useJsApiLoader, GoogleMap } from '@react-google-maps/api';
import { Coordinate, Polyhouse } from '@/lib/shared/types';
import { X, Minimize2, Search } from 'lucide-react';

const DEFAULT_CENTER = { lng: 77.5946, lat: 12.9716 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const MAP_OPTIONS: google.maps.MapOptions = {
  zoom: 15,
  center: DEFAULT_CENTER,
  mapTypeId: 'hybrid',
  mapTypeControl: true,
  zoomControl: true,
  fullscreenControl: true,
  streetViewControl: false,
};
const GOOGLE_MAPS_LIBRARIES: ('drawing' | 'places')[] = ['drawing', 'places'] as const;

interface MapComponentProps {
  landBoundary: Coordinate[];
  polyhouses: Polyhouse[];
  onBoundaryComplete: (coordinates: Coordinate[]) => void;
  loading: boolean;
  terrainAnalysis?: { restrictedZones?: Array<{ coordinates: Array<{ lng: number; lat: number }>; type?: string; reason?: string; severity?: string }> };
  regulatoryCompliance?: unknown;
  editMode: boolean;
}

interface Suggestion {
  place_id: string;
  description: string;
  lat: number;
  lng: number;
}

export default function MapComponent({
  landBoundary,
  polyhouses,
  onBoundaryComplete,
  loading,
  terrainAnalysis,
  editMode,
}: MapComponentProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const boundaryPolygonRef = useRef<google.maps.Polygon | null>(null);
  const dataLayersRef = useRef<google.maps.Data[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const hasInitiallyFitBounds = useRef(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [instructionsMinimized, setInstructionsMinimized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    language: 'en',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (!apiKey) {
      console.error('❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing! Add it to .env.local and restart the dev server.');
    } else {
      console.log('✓ Google Maps API key loaded:', apiKey.substring(0, 10) + '...');
    }
  }, [apiKey]);

  const initDrawingManager = (map: google.maps.Map) => {
    if (drawingManagerRef.current) return;
    const dm = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_RIGHT,
        drawingModes: [google.maps.drawing.OverlayType.POLYGON],
      },
      polygonOptions: {
        editable: false,
        fillColor: '#22c55e',
        fillOpacity: 0.2,
        strokeWeight: 2,
        strokeColor: '#15803d',
      },
    });
    dm.setMap(editMode && landBoundary.length === 0 ? map : null);
    google.maps.event.addListener(dm, 'overlaycomplete', (e: google.maps.drawing.OverlayCompleteEvent) => {
      if (e.type !== google.maps.drawing.OverlayType.POLYGON) return;
      const polygon = e.overlay as google.maps.Polygon;
      const path = polygon.getPath();
      const coords: Coordinate[] = [];
      for (let i = 0; i < path.getLength(); i++) {
        const p = path.getAt(i);
        coords.push({ lat: p.lat(), lng: p.lng() });
      }
      polygon.setMap(null);
      if (coords.length > 1 && coords[0].lat === coords[coords.length - 1].lat && coords[0].lng === coords[coords.length - 1].lng) {
        coords.pop();
      }
      onBoundaryComplete(coords);
    });
    drawingManagerRef.current = dm;
  };

  const pathToCoords = (path: google.maps.MVCArray<google.maps.LatLng>): Coordinate[] => {
    const coords: Coordinate[] = [];
    for (let i = 0; i < path.getLength(); i++) {
      const p = path.getAt(i);
      coords.push({ lat: p.lat(), lng: p.lng() });
    }
    return coords;
  };

  useEffect(() => {
    if (!isLoaded || loadError || !mapRef.current) return;

    const map = mapRef.current;

    if (boundaryPolygonRef.current) {
      boundaryPolygonRef.current.setMap(null);
      google.maps.event.clearInstanceListeners(boundaryPolygonRef.current);
      boundaryPolygonRef.current = null;
    }

    if (landBoundary.length === 0) {
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        drawingManagerRef.current.setMap(editMode ? map : null);
      }
      return;
    }

    const closed = [...landBoundary];
    if (closed.length > 1 && (closed[0].lat !== closed[closed.length - 1].lat || closed[0].lng !== closed[closed.length - 1].lng)) {
      closed.push(closed[0]);
    }
    const path = closed.map(c => new google.maps.LatLng(c.lat, c.lng));

    const poly = new google.maps.Polygon({
      paths: path,
      editable: editMode,
      draggable: false,
      fillColor: '#22c55e',
      fillOpacity: 0.2,
      strokeWeight: 2,
      strokeColor: '#15803d',
    });
    poly.setMap(map);
    boundaryPolygonRef.current = poly;

    poly.getPath().addListener('set_at', () => {
      const coords = pathToCoords(poly.getPath());
      if (coords.length > 1) onBoundaryComplete(coords.slice(0, -1));
    });
    poly.getPath().addListener('insert_at', () => {
      const coords = pathToCoords(poly.getPath());
      if (coords.length > 1) onBoundaryComplete(coords.slice(0, -1));
    });

    if (drawingManagerRef.current) {
      drawingManagerRef.current.setMap(null);
      drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    }

    if (!hasInitiallyFitBounds.current) {
      const bounds = new google.maps.LatLngBounds();
      landBoundary.forEach(c => bounds.extend(new google.maps.LatLng(c.lat, c.lng)));
      map.fitBounds(bounds, 50);
      hasInitiallyFitBounds.current = true;
    }

    return () => {
      poly.setMap(null);
      google.maps.event.clearInstanceListeners(poly);
    };
  }, [isLoaded, landBoundary, editMode, onBoundaryComplete]);

  useEffect(() => {
    if (!mapRef.current || !drawingManagerRef.current) return;
    if (editMode && landBoundary.length === 0) {
      drawingManagerRef.current.setMap(mapRef.current);
      drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    } else {
      drawingManagerRef.current.setMap(null);
    }
    if (boundaryPolygonRef.current) {
      boundaryPolygonRef.current.setEditable(editMode);
    }
  }, [editMode, landBoundary.length]);

  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 3 || !mapRef.current || !isLoaded) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      if (!autocompleteServiceRef.current) {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      }
      const service = autocompleteServiceRef.current;
      const sessionToken = new google.maps.places.AutocompleteSessionToken();
      
      service.getPlacePredictions(
        { input: query, sessionToken, types: ['establishment', 'geocode'] },
        async (predictions, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
          }
          
          const list: Suggestion[] = [];
          const placePromises = predictions.slice(0, 5).map(async (p) => {
            if (!p.place_id) return null;
            try {
              const { Place } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
              const place = new Place({ id: p.place_id, requestedLanguage: 'en' });
              await place.fetchFields({ fields: ['location', 'displayName', 'formattedAddress'] });
              
              const location = place.location;
              if (location) {
                return {
                  place_id: p.place_id,
                  description: p.description || '',
                  lat: location.lat(),
                  lng: location.lng(),
                };
              }
            } catch (err) {
              console.error('Error fetching place details:', err);
            }
            return null;
          });
          
          const results = await Promise.all(placePromises);
          const validResults = results.filter((r): r is Suggestion => r !== null);
          setSuggestions(validResults);
          setShowSuggestions(validResults.length > 0);
        }
      );
    } catch (err) {
      console.error('Autocomplete error:', err);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const flyTo = (lat: number, lng: number) => {
    if (!mapRef.current) return;
    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(15);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setShowSuggestions(false);
    try {
      const geocoder = new google.maps.Geocoder();
      const res = await geocoder.geocode({ address: searchQuery });
      if (res.results && res.results[0]?.geometry?.location) {
        const loc = res.results[0].geometry.location;
        flyTo(loc.lat(), loc.lng());
      } else {
        alert('Location not found. Try a different address.');
      }
    } catch (err) {
      console.error('Search error:', err);
      alert('Failed to search location. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSuggestionClick = (s: Suggestion) => {
    setSearchQuery(s.description);
    setShowSuggestions(false);
    setSuggestions([]);
    flyTo(s.lat, s.lng);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !isLoaded) return;

    const map = mapRef.current;
    dataLayersRef.current.forEach(dl => dl.setMap(null));
    dataLayersRef.current = [];
    markersRef.current.forEach(m => {
      if ('setMap' in m) {
        m.setMap(null);
      } else {
        m.map = null;
      }
    });
    markersRef.current = [];
    if (infoWindowRef.current) infoWindowRef.current.close();

    const boundaryBufferCoords = landBoundary.map(c => new google.maps.LatLng(c.lat, c.lng));
    if (landBoundary.length > 0 && boundaryBufferCoords.length > 0) {
      const boundaryData = new google.maps.Data();
      boundaryData.addGeoJson({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[...landBoundary.map(c => [c.lng, c.lat]), [landBoundary[0].lng, landBoundary[0].lat]]],
        },
      });
      boundaryData.setStyle({ strokeColor: '#ea580c', strokeWeight: 8, strokeOpacity: 0.6, fillOpacity: 0 });
      boundaryData.setMap(map);
      dataLayersRef.current.push(boundaryData);
    }

    const restricted = terrainAnalysis?.restrictedZones || [];
    if (restricted.length > 0) {
      const restrictedData = new google.maps.Data();
      const restrictedFeatures = restricted
        .filter((zone: { coordinates: Array<{ lng: number; lat: number }> }) => zone.coordinates && zone.coordinates.length >= 3)
        .map((zone: { coordinates: Array<{ lng: number; lat: number }>; severity?: string }) => {
          const ring = [...zone.coordinates.map((c: { lng: number; lat: number }) => [c.lng, c.lat]), [zone.coordinates[0].lng, zone.coordinates[0].lat]];
          return {
            type: 'Feature' as const,
            properties: { severity: zone.severity || '' },
            geometry: { type: 'Polygon' as const, coordinates: [ring] },
          };
        });
      restrictedData.addGeoJson({ type: 'FeatureCollection', features: restrictedFeatures });
      restrictedData.setStyle((feature) => {
        const severity = feature.getProperty('severity') || '';
        let fillColor = '#ef4444';
        if (severity === 'prohibited') fillColor = '#dc2626';
        else if (severity === 'challenging') fillColor = '#f97316';
        return {
          fillColor,
          fillOpacity: 0.6,
          strokeColor: '#991b1b',
          strokeWeight: 3,
          strokeOpacity: 1,
        };
      });
      restrictedData.setMap(map);
      dataLayersRef.current.push(restrictedData);
    }

    const validPolyhouses = Array.isArray(polyhouses) ? polyhouses : [];
    const gutterFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = validPolyhouses
      .filter(p => p.bounds && p.bounds.length >= 3)
      .map((polyhouse, index) => {
        const ring = [...polyhouse.bounds!.map(p => [p.x, p.y]), [polyhouse.bounds![0].x, polyhouse.bounds![0].y]];
        return {
          type: 'Feature' as const,
          properties: { id: `${polyhouse.id}-gutter`, index, label: polyhouse.label || `P${index + 1}`, area: polyhouse.area, dimensions: polyhouse.dimensions, blocksCount: polyhouse.blocks?.length || 0 },
          geometry: { type: 'Polygon' as const, coordinates: [ring] },
        };
      });

    if (gutterFeatures.length > 0) {
      const guttersData = new google.maps.Data();
      guttersData.addGeoJson({ type: 'FeatureCollection', features: gutterFeatures });
      guttersData.setStyle({ fillColor: '#86efac', fillOpacity: 0.4, strokeColor: '#15803d', strokeWeight: 3 });
      guttersData.setMap(map);
      dataLayersRef.current.push(guttersData);

      const infoWindow = new google.maps.InfoWindow({
        pixelOffset: new google.maps.Size(0, -10),
      });
      infoWindowRef.current = infoWindow;
      guttersData.addListener('mouseover', (e: google.maps.Data.MouseEvent) => {
        const props = e.feature.getProperty;
        const area = e.feature.getProperty('area') || 0;
        const dimensions = e.feature.getProperty('dimensions');
        const dims = dimensions ? (typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions) : null;
        const label = e.feature.getProperty('label') || 'P1';
        const blocksCount = e.feature.getProperty('blocksCount') || 0;
        let html = `<div style="padding: 8px; font-size: 13px; background: white; color: #1f2937; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">`;
        html += `<strong style="color: #047857;">Polyhouse ${label}</strong><br/>`;
        html += `<strong>Total Area:</strong> ${Number(area).toFixed(0)} m²<br/>`;
        if (dims) {
          html += `<strong>Size:</strong> ${dims.length?.toFixed(1) || '-'}m × ${dims.width?.toFixed(1) || '-'}m<br/>`;
        }
        html += `<strong>Blocks:</strong> ${blocksCount}<br/>`;
        html += `</div>`;
        infoWindow.setContent(html);
        infoWindow.setPosition(e.latLng);
        infoWindow.open(map);
        if (map.getDiv()) map.getDiv()!.style.cursor = 'pointer';
      });
      guttersData.addListener('mouseout', () => {
        infoWindow.close();
        if (map.getDiv()) map.getDiv()!.style.cursor = '';
      });
    }

    const blockFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
    validPolyhouses.forEach((polyhouse, pIdx) => {
      polyhouse.blocks?.forEach((block, bIdx) => {
        if (!block.corners || block.corners.length < 3) return;
        const ring = [...block.corners.map(c => [c.x, c.y])];
        if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push([...ring[0]]);
        blockFeatures.push({
          type: 'Feature',
          properties: { polyhouseIndex: pIdx, blockIndex: bIdx },
          geometry: { type: 'Polygon', coordinates: [ring] },
        });
      });
    });
    if (blockFeatures.length > 0) {
      const blocksData = new google.maps.Data();
      blocksData.addGeoJson({ type: 'FeatureCollection', features: blockFeatures });
      blocksData.setStyle({ fillColor: '#059669', fillOpacity: 0.9, strokeColor: '#ffffff', strokeWeight: 3 });
      blocksData.setMap(map);
      dataLayersRef.current.push(blocksData);
    }

    validPolyhouses.forEach((polyhouse, index) => {
      const center = {
        lng: polyhouse.bounds!.reduce((s, p) => s + p.x, 0) / polyhouse.bounds!.length,
        lat: polyhouse.bounds!.reduce((s, p) => s + p.y, 0) / polyhouse.bounds!.length,
      };
      const label = polyhouse.label || `P${index + 1}`;
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="24" viewBox="0 0 48 24"><rect width="48" height="24" rx="4" fill="#16a34a" stroke="#15803d" stroke-width="1"/><text x="24" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${esc(label)}</text></svg>`;
      const iconUrl = 'data:image/svg+xml,' + encodeURIComponent(svg);
      const marker = new google.maps.Marker({
        position: center,
        map,
        icon: { url: iconUrl, scaledSize: new google.maps.Size(48, 24), anchor: new google.maps.Point(24, 12) },
        zIndex: 100,
      });
      markersRef.current.push(marker);
    });

    if (validPolyhouses.length > 0 && !hasInitiallyFitBounds.current) {
      const bounds = new google.maps.LatLngBounds();
      validPolyhouses.forEach(p => p.bounds?.forEach(b => bounds.extend(new google.maps.LatLng(b.y, b.x))));
      map.fitBounds(bounds, 50);
      hasInitiallyFitBounds.current = true;
    }
  }, [polyhouses, mapLoaded, isLoaded, landBoundary, terrainAnalysis]);

  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    setMapLoaded(true);
    initDrawingManager(map);
  };

  const onMapUnmount = () => {
    drawingManagerRef.current?.setMap(null);
    drawingManagerRef.current = null;
    boundaryPolygonRef.current?.setMap(null);
    boundaryPolygonRef.current = null;
    dataLayersRef.current.forEach(d => d.setMap(null));
    dataLayersRef.current = [];
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();
    infoWindowRef.current = null;
    mapRef.current = null;
    setMapLoaded(false);
  };

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-slate-950 text-red-600 p-4">
        <div className="text-center">
          <p className="font-bold mb-2">Failed to load Google Maps</p>
          <p className="text-sm">Check that:</p>
          <ul className="text-sm list-disc list-inside mt-2">
            <li>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set in .env.local</li>
            <li>Maps JavaScript API, Places API, and Geocoding API are enabled in GCP</li>
            <li>API key restrictions allow your domain</li>
          </ul>
          {!apiKey && <p className="text-xs mt-2 text-red-700">API key is missing!</p>}
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-slate-950">
        <div className="animate-spin h-8 w-8 border-2 border-agriplast-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        options={MAP_OPTIONS}
        center={DEFAULT_CENTER}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
      />

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-10">
        <div className="search-container relative">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
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
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto z-20">
              {suggestions.map((s) => (
                <button
                  key={s.place_id}
                  onClick={() => handleSuggestionClick(s)}
                  className="w-full text-left px-4 py-3 hover:bg-agriplast-green-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start gap-2">
                    <Search size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                    <span className="text-gray-700 text-sm leading-relaxed">{s.description}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {landBoundary.length === 0 && !loading && showInstructions && (
        <div
          className={`absolute bg-white rounded-lg shadow-xl transition-all duration-300 pointer-events-auto ${
            instructionsMinimized ? 'bottom-4 right-4 w-auto' : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md p-6'
          }`}
        >
          {instructionsMinimized ? (
            <button
              onClick={() => setInstructionsMinimized(false)}
              className="flex items-center gap-2 px-4 py-3 text-agriplast-green-700 hover:bg-agriplast-green-50 rounded-lg transition-colors"
            >
              <Minimize2 size={18} />
              <span className="font-medium">Show Instructions</span>
            </button>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-bold text-agriplast-green-700">Draw Your Land Boundary</h2>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => setInstructionsMinimized(true)} className="p-1 hover:bg-gray-100 rounded transition-colors" title="Minimize">
                    <Minimize2 size={18} className="text-gray-600" />
                  </button>
                  <button onClick={() => setShowInstructions(false)} className="p-1 hover:bg-gray-100 rounded transition-colors" title="Close">
                    <X size={18} className="text-gray-600" />
                  </button>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Use the polygon tool on the right to draw the boundary of your agricultural land. Click to add points, and double-click to complete the polygon.
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
