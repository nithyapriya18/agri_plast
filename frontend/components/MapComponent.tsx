'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleMap, DrawingManager, Marker, Polygon, Autocomplete } from '@react-google-maps/api';
import { Coordinate, Polyhouse } from '@shared/types';
import { Search } from 'lucide-react';

interface MapComponentProps {
  landBoundary: Coordinate[];
  polyhouses: Polyhouse[];
  onBoundaryComplete: (coordinates: Coordinate[]) => void;
  loading: boolean;
  loadingProgress?: number;
  loadingStatus?: string;
  terrainAnalysis?: any;
  regulatoryCompliance?: any;
  editMode: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946,
};

export default function MapComponent({
  landBoundary,
  polyhouses,
  onBoundaryComplete,
  loading,
  loadingProgress = 0,
  loadingStatus = 'Optimizing layout...',
  terrainAnalysis,
  regulatoryCompliance,
  editMode,
}: MapComponentProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
  const [polygon, setPolygon] = useState<google.maps.Polygon | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [hoveredPolyhouse, setHoveredPolyhouse] = useState<number | null>(null);
  const hasInitiallyFitBounds = useRef(false);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMap(null);
  }, []);

  // Cleanup drawing manager when polyhouses exist or edit mode is off
  useEffect(() => {
    if (drawingManager) {
      if (!editMode || polyhouses.length > 0 || (landBoundary && landBoundary.length > 0)) {
        // Disable drawing mode first
        drawingManager.setDrawingMode(null);
        // Remove from map
        drawingManager.setMap(null);
        setDrawingManager(null);
      }
    }
  }, [editMode, polyhouses.length, landBoundary, drawingManager]);

  // Handle drawing manager load
  const onDrawingManagerLoad = useCallback((drawingManager: google.maps.drawing.DrawingManager) => {
    setDrawingManager(drawingManager);
  }, []);

  // Handle polygon complete
  const onPolygonComplete = useCallback((newPolygon: google.maps.Polygon) => {
    // Clear existing polygon
    if (polygon) {
      polygon.setMap(null);
    }

    // Get coordinates from the polygon
    const path = newPolygon.getPath();
    const coordinates: Coordinate[] = [];

    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinates.push({
        lat: point.lat(),
        lng: point.lng(),
      });
    }

    setPolygon(newPolygon);
    onBoundaryComplete(coordinates);

    // Switch drawing manager to select mode after drawing
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
    }
  }, [polygon, onBoundaryComplete, drawingManager]);

  // Load existing land boundary
  useEffect(() => {
    if (!map || !landBoundary || landBoundary.length === 0) return;

    // Clear existing polygon
    if (polygon) {
      polygon.setMap(null);
    }

    // Don't allow editing if polyhouses exist
    const canEdit = editMode && polyhouses.length === 0;

    // Create new polygon from land boundary
    const newPolygon = new google.maps.Polygon({
      paths: landBoundary.map(coord => ({ lat: coord.lat, lng: coord.lng })),
      strokeColor: '#10b981',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      fillColor: '#10b981',
      fillOpacity: 0.15,
      editable: canEdit,
      draggable: false,
      clickable: canEdit, // Make non-interactive when not editable
      zIndex: 1, // Keep land boundary below polyhouses
    });

    newPolygon.setMap(map);
    setPolygon(newPolygon);

    // Fit bounds to polygon if not done yet
    if (!hasInitiallyFitBounds.current && landBoundary.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      landBoundary.forEach(coord => {
        bounds.extend({ lat: coord.lat, lng: coord.lng });
      });
      map.fitBounds(bounds);
      hasInitiallyFitBounds.current = true;
    }

    // Listen for polygon edits only if editing is allowed
    if (canEdit) {
      const updateCoordinates = () => {
        const path = newPolygon.getPath();
        const coordinates: Coordinate[] = [];
        for (let i = 0; i < path.getLength(); i++) {
          const point = path.getAt(i);
          coordinates.push({ lat: point.lat(), lng: point.lng() });
        }
        onBoundaryComplete(coordinates);
      };

      google.maps.event.addListener(newPolygon.getPath(), 'set_at', updateCoordinates);
      google.maps.event.addListener(newPolygon.getPath(), 'insert_at', updateCoordinates);
      google.maps.event.addListener(newPolygon.getPath(), 'remove_at', updateCoordinates);
    }

    // Cleanup function
    return () => {
      if (newPolygon) {
        newPolygon.setMap(null);
      }
    };
  }, [map, landBoundary, editMode, polyhouses.length]);

  // Handle autocomplete place selection
  const onPlaceChanged = useCallback(() => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location && map) {
        map.setCenter(place.geometry.location);
        map.setZoom(17);
      }
    }
  }, [autocomplete, map]);

  // Handle autocomplete load
  const onAutocompleteLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    setAutocomplete(autocomplete);
  }, []);

  // Convert polyhouses to markers
  const getPolyhouseMarkers = () => {
    if (!polyhouses || polyhouses.length === 0 || typeof google === 'undefined') return [];

    return polyhouses
      .filter(polyhouse => polyhouse.center)
      .map((polyhouse, index) => {
        return (
          <Marker
            key={polyhouse.id || index}
            position={polyhouse.center}
            label={{
              text: `${index + 1}`,
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 20,
              fillColor: '#10b981',
              fillOpacity: 0.8,
              strokeColor: '#059669',
              strokeWeight: 2,
            }}
          />
        );
      });
  };

  // Generate rectangle corners from center, dimensions, and rotation
  const generateRectangleCorners = (
    center: { lat: number; lng: number },
    length: number,  // gableLength in meters
    width: number,   // gutterWidth in meters
    rotation: number // rotation in degrees
  ): { lat: number; lng: number }[] => {
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = 111000 * Math.cos((center.lat * Math.PI) / 180);

    // Half dimensions
    const halfLength = length / 2;
    const halfWidth = width / 2;

    // Rotation in radians
    const rotRad = (rotation * Math.PI) / 180;
    const cosRot = Math.cos(rotRad);
    const sinRot = Math.sin(rotRad);

    // Four corners in local space (before rotation)
    const corners = [
      { x: -halfLength, y: -halfWidth }, // Bottom-left
      { x: halfLength, y: -halfWidth },  // Bottom-right
      { x: halfLength, y: halfWidth },   // Top-right
      { x: -halfLength, y: halfWidth },  // Top-left
    ];

    // Rotate and convert to lat/lng
    return corners.map(corner => {
      // Apply rotation
      const rotatedX = corner.x * cosRot - corner.y * sinRot;
      const rotatedY = corner.x * sinRot + corner.y * cosRot;

      // Convert to lat/lng offset from center
      return {
        lat: center.lat + rotatedY / metersPerDegreeLat,
        lng: center.lng + rotatedX / metersPerDegreeLng,
      };
    });
  };

  // Render polyhouse polygons with individual blocks
  const getPolyhousePolygons = () => {
    if (!polyhouses || polyhouses.length === 0) return [];

    const elements: React.ReactElement[] = [];
    const BLOCK_WIDTH = 8;  // 8 meters
    const BLOCK_HEIGHT = 4; // 4 meters

    polyhouses
      .filter(polyhouse => polyhouse.center && polyhouse.gableLength && polyhouse.gutterWidth)
      .forEach((polyhouse, polyhouseIndex) => {
        // Generate polyhouse outline
        const polyhouseCorners = generateRectangleCorners(
          polyhouse.center,
          polyhouse.gableLength,
          polyhouse.gutterWidth,
          polyhouse.rotation || 0
        );

        // Render polyhouse outline with hover
        const isHovered = hoveredPolyhouse === polyhouseIndex;
        elements.push(
          <Polygon
            key={`polyhouse-${polyhouse.id || polyhouseIndex}`}
            paths={polyhouseCorners}
            options={{
              strokeColor: isHovered ? '#047857' : '#059669',
              strokeOpacity: 0.9,
              strokeWeight: isHovered ? 4 : 3,
              fillColor: '#10b981',
              fillOpacity: isHovered ? 0.3 : 0.15,
              zIndex: 10, // Above land boundary
            }}
            onMouseOver={() => setHoveredPolyhouse(polyhouseIndex)}
            onMouseOut={() => setHoveredPolyhouse(null)}
          />
        );

        // Calculate number of blocks that fit in the polyhouse
        const numBlocksX = Math.floor(polyhouse.gableLength / BLOCK_WIDTH);
        const numBlocksY = Math.floor(polyhouse.gutterWidth / BLOCK_HEIGHT);

        // Generate grid of blocks
        const metersPerDegreeLat = 111000;
        const metersPerDegreeLng = 111000 * Math.cos((polyhouse.center.lat * Math.PI) / 180);
        const rotRad = ((polyhouse.rotation || 0) * Math.PI) / 180;
        const cosRot = Math.cos(rotRad);
        const sinRot = Math.sin(rotRad);

        // Starting position (bottom-left corner of polyhouse)
        const startX = -polyhouse.gableLength / 2;
        const startY = -polyhouse.gutterWidth / 2;

        for (let row = 0; row < numBlocksY; row++) {
          for (let col = 0; col < numBlocksX; col++) {
            // Block position in local coordinates (relative to polyhouse)
            const localX = startX + col * BLOCK_WIDTH + BLOCK_WIDTH / 2;
            const localY = startY + row * BLOCK_HEIGHT + BLOCK_HEIGHT / 2;

            // Apply rotation to block center position
            const rotatedX = localX * cosRot - localY * sinRot;
            const rotatedY = localX * sinRot + localY * cosRot;

            // Convert to lat/lng
            const blockCenter = {
              lat: polyhouse.center.lat + rotatedY / metersPerDegreeLat,
              lng: polyhouse.center.lng + rotatedX / metersPerDegreeLng,
            };

            // Generate block corners
            const blockCorners = generateRectangleCorners(
              blockCenter,
              BLOCK_WIDTH,
              BLOCK_HEIGHT,
              polyhouse.rotation || 0
            );

            elements.push(
              <Polygon
                key={`block-${polyhouse.id || polyhouseIndex}-${row}-${col}`}
                paths={blockCorners}
                options={{
                  strokeColor: '#ffffff',
                  strokeOpacity: 1,
                  strokeWeight: 2,
                  fillColor: '#10b981',
                  fillOpacity: 0.7,
                  zIndex: 11, // Above polyhouse outline
                }}
                onMouseOver={() => setHoveredPolyhouse(polyhouseIndex)}
                onMouseOut={() => setHoveredPolyhouse(null)}
              />
            );
          }
        }
      });

    return elements;
  };

  return (
    <div className="relative w-full h-full" style={{ cursor: polyhouses.length > 0 ? 'default' : 'inherit' }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={15}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          mapTypeId: 'satellite',
          mapTypeControl: true,
          mapTypeControlOptions: {
            position: google.maps.ControlPosition.TOP_RIGHT,
          },
          streetViewControl: false,
          fullscreenControl: true,
          draggableCursor: polyhouses.length > 0 ? 'default' : 'crosshair',
          draggingCursor: 'move',
        }}
      >
        {/* Search Box */}
        {typeof google !== 'undefined' && (
          <div className="absolute top-4 left-4 z-10">
            <Autocomplete
              onLoad={onAutocompleteLoad}
              onPlaceChanged={onPlaceChanged}
              options={{
                componentRestrictions: { country: 'in' },
                fields: ['geometry', 'name', 'formatted_address'],
              }}
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search location..."
                  className="w-80 px-4 py-3 pr-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-agriplast-green-500 text-sm text-gray-900 dark:text-gray-100"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <Search className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
              </div>
            </Autocomplete>
          </div>
        )}

        {/* Drawing Manager - Only show if no polyhouses exist and in edit mode */}
        {editMode && polyhouses.length === 0 && (!landBoundary || landBoundary.length === 0) && typeof google !== 'undefined' ? (
          <DrawingManager
            onLoad={onDrawingManagerLoad}
            onPolygonComplete={onPolygonComplete}
            options={{
              drawingControl: true,
              drawingMode: google.maps.drawing.OverlayType.POLYGON,
              drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [google.maps.drawing.OverlayType.POLYGON],
              },
              polygonOptions: {
                strokeColor: '#10b981',
                strokeOpacity: 0.8,
                strokeWeight: 3,
                fillColor: '#10b981',
                fillOpacity: 0.15,
                editable: true,
                draggable: false,
              },
            }}
          />
        ) : null}

        {/* Polyhouse markers */}
        {getPolyhouseMarkers()}

        {/* Polyhouse polygons */}
        {getPolyhousePolygons()}
      </GoogleMap>

      {/* Compass Widget */}
      <div className="absolute bottom-6 right-6 z-10">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700">
          <svg width="60" height="60" viewBox="0 0 100 100" className="transform">
            {/* Compass circle */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 dark:text-gray-600" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-gray-700" />

            {/* Cardinal directions */}
            <text x="50" y="15" textAnchor="middle" className="text-[12px] font-bold fill-red-600 dark:fill-red-500">N</text>
            <text x="85" y="54" textAnchor="middle" className="text-[10px] font-semibold fill-gray-600 dark:fill-gray-400">E</text>
            <text x="50" y="92" textAnchor="middle" className="text-[10px] font-semibold fill-gray-600 dark:fill-gray-400">S</text>
            <text x="15" y="54" textAnchor="middle" className="text-[10px] font-semibold fill-gray-600 dark:fill-gray-400">W</text>

            {/* North arrow */}
            <path d="M 50 50 L 50 20 L 45 30 Z" fill="currentColor" className="text-red-600 dark:text-red-500" />
            <path d="M 50 50 L 50 20 L 55 30 Z" fill="currentColor" className="text-red-400 dark:text-red-300" />

            {/* Center dot */}
            <circle cx="50" cy="50" r="3" fill="currentColor" className="text-gray-600 dark:text-gray-400" />
          </svg>
        </div>
      </div>

      {/* Polyhouse Hover Tooltip */}
      {hoveredPolyhouse !== null && polyhouses[hoveredPolyhouse] && (
        <div className="absolute bottom-6 left-6 z-30 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 border-2 border-green-500 dark:border-green-600 max-w-xs pointer-events-none">
          <div className="text-sm">
            <div className="font-bold text-gray-900 dark:text-white mb-2 text-base">
              {polyhouses[hoveredPolyhouse].label || `Polyhouse ${hoveredPolyhouse + 1}`}
            </div>
            <div className="space-y-1">
              <div className="text-gray-600 dark:text-gray-400 flex justify-between">
                <span className="font-medium">Size:</span>
                <span>{polyhouses[hoveredPolyhouse].area.toFixed(0)} m² ({(polyhouses[hoveredPolyhouse].area / 10000).toFixed(2)} ha)</span>
              </div>
              <div className="text-gray-600 dark:text-gray-400 flex justify-between">
                <span className="font-medium">Dimensions:</span>
                <span>{polyhouses[hoveredPolyhouse].gableLength?.toFixed(1)}m × {polyhouses[hoveredPolyhouse].gutterWidth?.toFixed(1)}m</span>
              </div>
              {polyhouses[hoveredPolyhouse].gableLength && polyhouses[hoveredPolyhouse].gutterWidth && (
                <div className="text-gray-600 dark:text-gray-400 flex justify-between">
                  <span className="font-medium">Blocks:</span>
                  <span>{Math.floor(polyhouses[hoveredPolyhouse].gableLength / 8) * Math.floor(polyhouses[hoveredPolyhouse].gutterWidth / 4)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl min-w-[320px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 border-4 border-agriplast-green-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-900 dark:text-white font-medium">{loadingStatus}</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
                <span className="text-sm font-semibold text-agriplast-green-600 dark:text-agriplast-green-400">
                  {loadingProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-agriplast-green-500 to-agriplast-green-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
