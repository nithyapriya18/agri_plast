# GPS Link & KML File Upload UI

## Features Implemented (Backend) ✅

1. **GPS Link Extraction** - Extracts coordinates from Google Maps URLs
2. **KML File Upload** - Parses KML files and extracts polygon boundaries

## UI Code to Add

Add this section to the map step (after project details, before the map):

```tsx
{/* Step 2: Map View with GPS/KML Options */}
{currentStep === 'map' && (
  <main className="flex flex-col h-screen bg-gray-50">
    {/* Header with GPS/KML options */}
    <header className="bg-white shadow-sm border-b border-gray-200 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {projectDetails.name}
        </h1>

        {/* Structure Type Selection */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-700">Structure Type</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setStructureType('polyhouse')}
              className={`p-3 border-2 rounded-lg transition-all ${
                structureType === 'polyhouse'
                  ? 'border-green-600 bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">Polyhouse</div>
              <div className="text-xs text-gray-500 mt-1">Naturally Ventilated</div>
              <div className="text-xs text-gray-400 mt-1">Most Common</div>
            </button>
            <button
              onClick={() => setStructureType('cable_net')}
              className={`p-3 border-2 rounded-lg transition-all ${
                structureType === 'cable_net'
                  ? 'border-green-600 bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">Cable Net House</div>
              <div className="text-xs text-gray-500 mt-1">Low Cost Alternative</div>
              <div className="text-xs text-gray-400 mt-1">Budget Friendly</div>
            </button>
            <button
              onClick={() => setStructureType('fan_pad')}
              className={`p-3 border-2 rounded-lg transition-all ${
                structureType === 'fan_pad'
                  ? 'border-green-600 bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">Fan & Pad</div>
              <div className="text-xs text-gray-500 mt-1">15-20°C Climate Control</div>
              <div className="text-xs text-gray-400 mt-1">Leafy Greens, Berries</div>
            </button>
          </div>
        </div>

        {/* GPS Link / KML Upload Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: GPS Link */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-2 text-blue-900 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Option 1: Paste GPS Link
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={gpsLink}
                onChange={(e) => setGpsLink(e.target.value)}
                placeholder="https://www.google.com/maps/@12.345,78.910..."
                className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleGPSLinkExtract}
                disabled={extractingFromGPS || !gpsLink.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
              >
                {extractingFromGPS ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Extracting...
                  </span>
                ) : (
                  'Extract'
                )}
              </button>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Paste Google Maps URL to extract location
            </p>
          </div>

          {/* Option 2: KML File */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold mb-2 text-green-900 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Option 2: Upload KML File
            </h3>
            <div className="relative">
              <input
                type="file"
                accept=".kml"
                onChange={handleKMLUpload}
                disabled={extractingFromGPS}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-green-600 file:text-white
                  hover:file:bg-green-700
                  file:cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-green-600 mt-2">
              Upload KML file with plot boundary coordinates
            </p>
          </div>
        </div>

        {/* Option 3: Draw Manually */}
        <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Option 3:</span> Or draw the boundary manually on the map below
          </p>
        </div>
      </div>
    </header>

    {/* Map Component (existing code) */}
    <div className="flex-1 relative overflow-hidden">
      <MapComponent
        landBoundary={landBoundary}
        polyhouses={planningResult?.polyhouses || []}
        onBoundaryComplete={handleBoundaryComplete}
        loading={loading}
        terrainAnalysis={planningResult?.terrainAnalysis}
        regulatoryCompliance={planningResult?.regulatoryCompliance}
        editMode={editMode}
      />
      {/* ... rest of existing map UI ... */}
    </div>
  </main>
)}
```

## How It Works

### GPS Link Extraction:
1. User pastes Google Maps URL
2. System extracts lat/lng using regex: `/@(-?\d+\.\d+),(-?\d+\.\d+)/`
3. Creates initial rectangular boundary
4. User can adjust by dragging corners

### KML File Upload:
1. User uploads `.kml` file
2. System parses XML using `DOMParser`
3. Extracts coordinates from `<coordinates>` tag
4. Format: `lng,lat,alt lng,lat,alt ...`
5. Converts to `Coordinate[]` array
6. Removes duplicate closing point if exists
7. Displays on map for user to verify

## Supported KML Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>My Plot</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              77.123,12.345,0
              77.124,12.345,0
              77.124,12.346,0
              77.123,12.346,0
              77.123,12.345,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>
```

## Error Handling

Both methods include comprehensive error handling:
- Invalid URLs → Shows format example
- Invalid KML → Shows parsing error
- Missing coordinates → Clear error message
- File type check → Only `.kml` allowed

## After Upload

After GPS/KML extraction:
1. Boundary appears on map
2. User can drag corners to fine-tune
3. System shows success message with coordinate count
4. User clicks "Generate Plan" when ready
5. **No optimization questions** - automatically sun-oriented with max utilization

## Test Cases

### GPS Link:
- ✅ `https://www.google.com/maps/@12.9715987,77.5945627,17z`
- ✅ `https://maps.google.com/?q=12.9715987,77.5945627`
- ❌ Shortened links (user gets helpful message)

### KML File:
- ✅ Standard KML from Google Earth
- ✅ KML with altitude values (ignored)
- ✅ KML with duplicate closing point (removed)
- ❌ Invalid XML (shows parsing error)
- ❌ KML without coordinates (shows error)

## Benefits

1. **Faster workflow** - No manual drawing for plots with GPS data
2. **More accurate** - Uses exact coordinates from survey
3. **Professional** - Accepts industry-standard KML format
4. **User-friendly** - Still allows manual adjustment after import
