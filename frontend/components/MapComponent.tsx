'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleMap, DrawingManager, Marker, Polygon, Autocomplete } from '@react-google-maps/api';
import { Coordinate, Polyhouse, ProjectZone } from '@shared/types';
import { Search, Edit3 } from 'lucide-react';

interface MapComponentProps {
  landBoundary: Coordinate[];
  polyhouses: Polyhouse[];
  zones?: ProjectZone[];
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
  zones = [],
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
  const [hoveredZone, setHoveredZone] = useState<number | null>(null);
  const hasInitiallyFitBounds = useRef(false);
  const [isDrawingModeActive, setIsDrawingModeActive] = useState(false);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMap(null);
  }, []);

  // Aggressive cleanup: Remove all drawing controls when polyhouses exist or drawing mode is disabled
  useEffect(() => {
    if (!map) return;

    // If polyhouses exist or drawing mode is not active, forcibly remove any drawing manager
    if (polyhouses.length > 0 || !isDrawingModeActive) {
      if (drawingManager) {
        drawingManager.setDrawingMode(null);
        drawingManager.setMap(null);
        setDrawingManager(null);
      }

      // Also remove any drawing controls that might be lingering on the map
      // This forcibly cleans up the DOM elements
      const mapDiv = map.getDiv();
      if (mapDiv) {
        const drawingControls = mapDiv.querySelectorAll('.gmnoprint');
        drawingControls.forEach((control) => {
          // Check if it's a drawing control by looking for specific classes or content
          const htmlControl = control as HTMLElement;
          if (htmlControl.title?.includes('Draw') || htmlControl.querySelector('[title*="Draw"]')) {
            htmlControl.style.display = 'none';
          }
        });
      }
    }
  }, [map, polyhouses.length, drawingManager, isDrawingModeActive]);

  // Cleanup drawing manager when edit mode is off or land boundary exists
  useEffect(() => {
    if (drawingManager && (!editMode || (landBoundary && landBoundary.length > 0))) {
      drawingManager.setDrawingMode(null);
      drawingManager.setMap(null);
      setDrawingManager(null);
      setIsDrawingModeActive(false);
    }
  }, [editMode, landBoundary, drawingManager]);

  // Handle drawing manager load
  const onDrawingManagerLoad = useCallback((drawingManager: google.maps.drawing.DrawingManager) => {
    // Don't set drawing manager if polyhouses already exist
    if (polyhouses.length > 0 || !isDrawingModeActive) {
      drawingManager.setDrawingMode(null);
      drawingManager.setMap(null);
      return;
    }
    setDrawingManager(drawingManager);
  }, [polyhouses.length, isDrawingModeActive]);

  // Handle activate drawing mode
  const handleActivateDrawing = useCallback(() => {
    if (polyhouses.length > 0) {
      alert('Cannot draw when polyhouses are already placed. Please clear polyhouses first.');
      return;
    }
    if (landBoundary && landBoundary.length > 0) {
      alert('Land boundary already exists. Please clear it first if you want to redraw.');
      return;
    }
    setIsDrawingModeActive(true);
  }, [polyhouses.length, landBoundary]);

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

    // Switch drawing manager to select mode after drawing and deactivate drawing mode
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
    }
    setIsDrawingModeActive(false);
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

  // Calculate center of polygon for label placement
  const calculatePolygonCenter = (coordinates: Coordinate[]): Coordinate => {
    if (coordinates.length === 0) return { lat: 0, lng: 0 };

    const sumLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0);
    const sumLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0);

    return {
      lat: sumLat / coordinates.length,
      lng: sumLng / coordinates.length,
    };
  };

  // Render zone polygons (inclusion/exclusion zones)
  const getZonePolygons = () => {
    if (!zones || zones.length === 0) return [];

    console.log(`🗺️  Rendering ${zones.length} zone(s):`, zones.map(z => ({ name: z.name, type: z.zone_type, points: z.coordinates.length })));

    const elements: React.ReactElement[] = [];

    zones.forEach((zone, index) => {
      const isInclusion = zone.zone_type === 'inclusion';
      const color = zone.color || (isInclusion ? '#4CAF50' : '#F44336');
      const isHovered = hoveredZone === index;

      // Polygon with more prominent borders
      elements.push(
        <Polygon
          key={`zone-${zone.id || index}`}
          paths={zone.coordinates}
          options={{
            strokeColor: color,
            strokeOpacity: isHovered ? 1.0 : 0.9,
            strokeWeight: isHovered ? 5 : 3, // Thicker borders to see overlapping zones
            fillColor: color,
            fillOpacity: isHovered ? (isInclusion ? 0.25 : 0.4) : (isInclusion ? 0.15 : 0.3),
            zIndex: 5 + index, // Different z-index for each zone
          }}
          onMouseOver={() => setHoveredZone(index)}
          onMouseOut={() => setHoveredZone(null)}
        />
      );

      // Label at center
      const center = calculatePolygonCenter(zone.coordinates);
      elements.push(
        <Marker
          key={`zone-label-${zone.id || index}`}
          position={center}
          label={{
            text: `${zone.name}\n${isInclusion ? '✓ Inclusion' : '✕ Exclusion'}`,
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            className: 'zone-label',
          }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0,
            fillOpacity: 0,
            strokeOpacity: 0,
          }}
        />
      );
    });

    return elements;
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
          draggingCursor: polyhouses.length > 0 ? 'default' : 'move',
          // Disable all drawing-related interactions when polyhouses exist
          clickableIcons: polyhouses.length === 0,
          disableDoubleClickZoom: false,
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

        {/* Draw Boundary Button - Only show when no polyhouses and no existing boundary */}
        {editMode && polyhouses.length === 0 && (!landBoundary || landBoundary.length === 0) && !isDrawingModeActive && (
          <div className="absolute top-20 left-4 z-10">
            <button
              onClick={handleActivateDrawing}
              className="flex items-center gap-2 px-4 py-3 bg-agriplast-green-600 hover:bg-agriplast-green-700 text-white font-medium rounded-lg shadow-lg transition-colors"
            >
              <Edit3 className="w-5 h-5" />
              Draw Land Boundary
            </button>
          </div>
        )}

        {/* Drawing Manager - Only show when explicitly activated via button */}
        {isDrawingModeActive && editMode && polyhouses.length === 0 && (!landBoundary || landBoundary.length === 0) && typeof google !== 'undefined' ? (
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

        {/* Zone polygons (inclusion/exclusion zones) */}
        {getZonePolygons()}

        {/* Polyhouse markers */}
        {getPolyhouseMarkers()}

        {/* Polyhouse polygons */}
        {getPolyhousePolygons()}
      </GoogleMap>

      {/* Zone Legend - Only show if zones exist */}
      {zones && zones.length > 0 && (
        <div className="absolute top-4 right-4 z-10 max-w-xs">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 border-2 border-gray-300 dark:border-gray-600">
            <div className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Project Zones ({zones.length})
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {zones.map((zone, index) => {
                const isInclusion = zone.zone_type === 'inclusion';
                return (
                  <div
                    key={zone.id || index}
                    className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    onMouseEnter={() => setHoveredZone(index)}
                    onMouseLeave={() => setHoveredZone(null)}
                  >
                    <div
                      className="w-5 h-5 rounded flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: zone.color, opacity: isInclusion ? 0.6 : 0.8 }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {zone.name}
                      </div>
                      <div className={`text-xs font-medium ${
                        isInclusion
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {isInclusion ? '✓ Inclusion' : '✕ Exclusion'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {(zone.area_sqm / 10000).toFixed(2)} ha
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
              Hover over zones on map for details
            </div>
          </div>
        </div>
      )}

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

      {/* Zone Hover Tooltip */}
      {hoveredZone !== null && zones && zones[hoveredZone] && (
        <div className={`absolute bottom-6 left-6 z-30 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 border-2 ${
          zones[hoveredZone].zone_type === 'inclusion'
            ? 'border-green-500 dark:border-green-600'
            : 'border-red-500 dark:border-red-600'
        } max-w-xs pointer-events-none`}>
          <div className="text-sm">
            <div className="font-bold text-gray-900 dark:text-white mb-2 text-base flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: zones[hoveredZone].color }}
              />
              {zones[hoveredZone].name}
            </div>
            <div className="space-y-1">
              <div className="text-gray-600 dark:text-gray-400 flex justify-between">
                <span className="font-medium">Type:</span>
                <span className={`font-semibold ${
                  zones[hoveredZone].zone_type === 'inclusion'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {zones[hoveredZone].zone_type === 'inclusion' ? '✓ Inclusion Zone' : '✕ Exclusion Zone'}
                </span>
              </div>
              <div className="text-gray-600 dark:text-gray-400 flex justify-between">
                <span className="font-medium">Area:</span>
                <span>{zones[hoveredZone].area_sqm.toFixed(0)} m² ({(zones[hoveredZone].area_sqm / 10000).toFixed(2)} ha)</span>
              </div>
              {zones[hoveredZone].file_name && (
                <div className="text-gray-600 dark:text-gray-400 flex justify-between">
                  <span className="font-medium">File:</span>
                  <span className="text-xs truncate max-w-[150px]">{zones[hoveredZone].file_name}</span>
                </div>
              )}
            </div>
            <div className={`mt-2 pt-2 border-t text-xs ${
              zones[hoveredZone].zone_type === 'inclusion'
                ? 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                : 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
            }`}>
              {zones[hoveredZone].zone_type === 'inclusion'
                ? 'Polyhouses can be placed in this zone'
                : 'No polyhouses will be placed in this zone'}
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
