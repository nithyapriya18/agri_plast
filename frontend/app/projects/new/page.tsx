'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PlanningResult, ConversationMessage, Coordinate } from '@shared/types';
import EnhancedChatInterface from '@/components/EnhancedChatInterface';
import QuotationPanel from '@/components/QuotationPanel';
import ControlPanel from '@/components/ControlPanel';
import OptimizationLogs from '@/components/OptimizationLogs';
import TerrainInfoPanel from '@/components/TerrainInfoPanel';
// CustomerPreferencesModal removed - now uses default sun-oriented optimization
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

// Dynamic import for MapComponent to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-slate-950 transition-colors">
      <Loader2 className="w-8 h-8 animate-spin text-agriplast-green-600 dark:text-cyan-400" />
    </div>
  ),
});

interface ProjectDetails {
  name: string;
  description: string;
  customerCompanyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  locationName: string;
  locationAddress: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<'details' | 'map'>('details');
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    name: '',
    description: '',
    customerCompanyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    locationName: '',
    locationAddress: '',
  });
  const [landBoundary, setLandBoundary] = useState<Coordinate[]>([]);
  const [planningResult, setPlanningResult] = useState<PlanningResult | null>(null);
  const [planningResultId, setPlanningResultId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [showQuotation, setShowQuotation] = useState(false);
  const [landAreaSize, setLandAreaSize] = useState<number>(10000);
  const [editMode, setEditMode] = useState(true);
  const [gpsLink, setGpsLink] = useState('');
  const [extractingFromGPS, setExtractingFromGPS] = useState(false);
  const [kmlFile, setKmlFile] = useState<File | null>(null);
  const [structureType, setStructureType] = useState<'polyhouse' | 'cable_net' | 'fan_pad'>('polyhouse');
  const [crop, setCrop] = useState<string>('');
  const [showCropSelection, setShowCropSelection] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login?redirectTo=/projects/new');
      return;
    }

    setUser(user);
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectDetails.name.trim()) {
      alert('Please enter a project name');
      return;
    }
    setCurrentStep('map');
  };

  const handleGPSLinkExtract = async () => {
    if (!gpsLink.trim()) {
      alert('Please enter a GPS link');
      return;
    }

    setExtractingFromGPS(true);

    try {
      // Extract coordinates from Google Maps link
      // Format: https://www.google.com/maps/@lat,lng,zoom or https://maps.app.goo.gl/...

      let lat, lng;

      // Try to extract from standard Google Maps URL
      const coordMatch = gpsLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      } else {
        // For shortened links, we'd need to call Google Maps API or a backend service
        alert('Please paste the full Google Maps URL (not a shortened link). Right-click on the map location and copy the URL from your browser.');
        return;
      }

      // Create a simple rectangular boundary around the point (user can adjust)
      const offset = 0.001; // ~100m
      const coordinates: Coordinate[] = [
        { lat: lat + offset, lng: lng - offset },
        { lat: lat + offset, lng: lng + offset },
        { lat: lat - offset, lng: lng + offset },
        { lat: lat - offset, lng: lng - offset },
      ];

      setLandBoundary(coordinates);
      setGpsLink('');
      alert('Boundary extracted! Please adjust the boundary by dragging the corners to match your actual plot.');

    } catch (error) {
      console.error('Error extracting GPS coordinates:', error);
      alert('Failed to extract coordinates. Please check the GPS link format.');
    } finally {
      setExtractingFromGPS(false);
    }
  };

  const handleKMLUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.kml')) {
      alert('Please upload a valid KML file');
      return;
    }

    setExtractingFromGPS(true);
    setKmlFile(file);

    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Invalid KML file format');
      }

      // Extract coordinates from KML - try multiple selectors
      let coordinatesElement = xmlDoc.querySelector('Polygon coordinates') ||
                               xmlDoc.querySelector('LineString coordinates') ||
                               xmlDoc.querySelector('coordinates');

      if (!coordinatesElement) {
        throw new Error('No coordinates found in KML file. Make sure it contains a Polygon or LineString.');
      }

      const coordsText = coordinatesElement.textContent?.trim();
      if (!coordsText) {
        throw new Error('Empty coordinates in KML file');
      }

      // Parse coordinates (format: "lng,lat,alt lng,lat,alt ..." or "lng,lat,alt\nlng,lat,alt")
      const coordPairs = coordsText.split(/[\s\n]+/).filter(s => s.trim() && s.includes(','));
      const coordinates: Coordinate[] = coordPairs.map(pair => {
        const parts = pair.split(',').map(Number);
        return { lat: parts[1], lng: parts[0] };
      }).filter(c => !isNaN(c.lat) && !isNaN(c.lng));

      if (coordinates.length < 3) {
        throw new Error('KML must contain at least 3 coordinates to form a polygon');
      }

      // Remove duplicate closing coordinate if exists
      const firstCoord = coordinates[0];
      const lastCoord = coordinates[coordinates.length - 1];
      if (firstCoord.lat === lastCoord.lat && firstCoord.lng === lastCoord.lng) {
        coordinates.pop();
      }

      setLandBoundary(coordinates);
      setKmlFile(null);
      event.target.value = ''; // Reset file input
      alert(`Successfully loaded ${coordinates.length} coordinates from KML file!`);

    } catch (error) {
      console.error('Error parsing KML file:', error);
      alert(`Failed to parse KML file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setKmlFile(null);
      event.target.value = ''; // Reset file input
    } finally {
      setExtractingFromGPS(false);
    }
  };

  const handleBoundaryComplete = (coordinates: Coordinate[]) => {
    setLandBoundary(coordinates);
    setShowCropSelection(true);
  };

  const startOptimization = async (selectedCrop: string) => {
    setCrop(selectedCrop);
    setShowCropSelection(false);
    setLoading(true);

    // Always use sun-oriented optimization with maximum utilization
    // No need to ask user - this is the standard approach
    const configOverrides = {
      polyhouseGap: 2, // Standard 2m corridor
      minSideLength: 8, // Minimum 8m (1 bay)
      optimization: {
        orientationStrategy: 'optimized', // Always sun-oriented
        preferLargerPolyhouses: true, // Biggest first
        minimizeCost: false, // Maximize utilization, not cost
      },
    };

    try {
      // Load user settings from Supabase (optional - use defaults if fails)
      const supabase = createClient();
      let userSettings = null;

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          userSettings = data;
          console.log('✓ Loaded user settings from Supabase');
        } else {
          console.log('⚠ No user settings found, using defaults');
        }
      } catch (settingsError) {
        console.log('⚠ Using default settings (could not load from Supabase)');
      }

      // Merge user settings with config overrides (use defaults if no settings)
      const finalConfig = {
        ...configOverrides,
        ...(userSettings && {
          blockDimensions: {
            width: userSettings.block_width,
            height: userSettings.block_height,
          },
          gutterWidth: userSettings.gutter_width,
          polyhouseGap: configOverrides.polyhouseGap || userSettings.polyhouse_gap,
          maxSideLength: userSettings.max_side_length,
          minSideLength: configOverrides.minSideLength || userSettings.min_side_length,
          minCornerDistance: userSettings.min_corner_distance,
          solarOrientation: {
            enabled: userSettings.solar_orientation_enabled,
          },
          terrain: {
            avoidWater: userSettings.avoid_water,
            considerSlope: userSettings.consider_slope,
            maxSlope: userSettings.max_slope,
          },
        }),
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/planning/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landArea: {
            name: projectDetails.locationName || `Land Area ${new Date().toLocaleDateString()}`,
            coordinates: landBoundary,
          },
          configuration: finalConfig,
          structureType: structureType,
          crop: selectedCrop,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.planningResult) {
        const errorMsg = data.error || data.message || 'Failed to create plan';
        console.error('API Error:', errorMsg);
        alert(`Failed to create plan: ${errorMsg}`);
        return;
      }

      // DEBUG: Log the received polyhouses structure
      console.log('=== NEW PROJECT POLYHOUSE DEBUG ===');
      console.log('Received polyhouses:', data.planningResult.polyhouses?.length || 0);
      if (data.planningResult.polyhouses && data.planningResult.polyhouses.length > 0) {
        console.log('Sample polyhouse:', {
          id: data.planningResult.polyhouses[0].id,
          blocksCount: data.planningResult.polyhouses[0].blocks?.length,
          hasBlocks: !!data.planningResult.polyhouses[0].blocks,
          hasBounds: !!data.planningResult.polyhouses[0].bounds,
          firstBlock: data.planningResult.polyhouses[0].blocks?.[0],
          hasCorners: data.planningResult.polyhouses[0].blocks?.[0]?.corners?.length > 0,
          cornersLength: data.planningResult.polyhouses[0].blocks?.[0]?.corners?.length,
          sampleCorner: data.planningResult.polyhouses[0].blocks?.[0]?.corners?.[0],
        });

        // CRITICAL FIX: Regenerate corners for blocks that don't have them
        let needsRegeneration = false;
        data.planningResult.polyhouses.forEach((polyhouse: any) => {
          if (!polyhouse.blocks || polyhouse.blocks.length === 0) return;

          // Check if any block is missing corners
          const hasMissingCorners = polyhouse.blocks.some((block: any) =>
            !block.corners || block.corners.length === 0
          );

          if (hasMissingCorners) {
            needsRegeneration = true;
            console.warn(`Polyhouse ${polyhouse.id} has blocks missing corners, regenerating...`);

            // Calculate polyhouse center from bounds (geographic coordinates)
            if (!polyhouse.bounds || polyhouse.bounds.length === 0) {
              console.error(`Cannot regenerate corners: polyhouse ${polyhouse.id} has no bounds`);
              return;
            }

            const centerLng = polyhouse.bounds.reduce((sum: number, p: any) => sum + p.x, 0) / polyhouse.bounds.length;
            const centerLat = polyhouse.bounds.reduce((sum: number, p: any) => sum + p.y, 0) / polyhouse.bounds.length;

            polyhouse.blocks.forEach((block: any) => {
              if (!block.corners || block.corners.length === 0) {
                const angleRad = (block.rotation || 0) * Math.PI / 180;

                // Block position is in LOCAL coordinates (meters, already rotated)
                const blockPosX = block.position?.x || 0;
                const blockPosY = block.position?.y || 0;

                // Create the 4 corners of the block (standard 8m x 4m rectangle)
                const localCorners = [
                  { x: 0, y: 0 },
                  { x: block.width, y: 0 },
                  { x: block.width, y: block.height },
                  { x: 0, y: block.height },
                ];

                // Rotate each corner and add to block position (all in local space)
                const rotatedLocalCorners = localCorners.map((corner: any) => {
                  const rotatedX = corner.x * Math.cos(angleRad) - corner.y * Math.sin(angleRad);
                  const rotatedY = corner.x * Math.sin(angleRad) + corner.y * Math.cos(angleRad);

                  return {
                    x: blockPosX + rotatedX,
                    y: blockPosY + rotatedY,
                  };
                });

                // Convert from local meters to geographic coordinates
                block.corners = rotatedLocalCorners.map((corner: any) => {
                  const cornerLat = centerLat + corner.y / 111320;
                  const cornerLng = centerLng + corner.x / (111320 * Math.cos(centerLat * Math.PI / 180));

                  return {
                    x: cornerLng,
                    y: cornerLat,
                  };
                });

                console.log(`  ✓ Regenerated ${block.corners.length} corners for block ${block.id}`);
              }
            });
          }
        });

        if (needsRegeneration) {
          console.log('✓ Finished regenerating corners for all blocks');
        }
      }

      // Check for terrain warnings BEFORE rendering polyhouses
      const terrainInfo = data.planningResult.terrainAnalysis;
      if (terrainInfo && (terrainInfo.warnings?.length > 0 || terrainInfo.restrictedZones?.length > 0)) {
        // Show warning dialog and let user decide
        const warningsText = terrainInfo.warnings?.join('\n') || '';
        const zonesText = terrainInfo.restrictedZones?.map((z: any) => `• ${z.type}: ${z.reason}`).join('\n') || '';

        const userConfirmed = confirm(
          `⚠️ TERRAIN WARNINGS DETECTED\n\n` +
          `${warningsText}\n\n` +
          `Restricted zones found:\n${zonesText}\n\n` +
          `Do you want to proceed with building polyhouses in this area?\n\n` +
          `Click OK to continue, or Cancel to redraw the boundary.`
        );

        if (!userConfirmed) {
          setLoading(false);
          alert('Please redraw the land boundary to avoid restricted zones.');
          return;
        }
      }

      if (!data.planningResult.polyhouses || data.planningResult.polyhouses.length === 0) {
        const terrainInfo = data.planningResult.terrainAnalysis;
        let message = 'No polyhouses could be placed on this land area.\n\n';

        if (terrainInfo?.restrictedZones && terrainInfo.restrictedZones.length > 0) {
          message += `Possible reasons:\n`;
          message += `• Restricted zones detected: ${terrainInfo.restrictedZones.map((z: any) => z.type).join(', ')}\n`;
          message += `• Buildable area: ${terrainInfo.buildableAreaPercentage?.toFixed(1)}%\n\n`;
          message += `Try:\n`;
          message += `• Drawing the boundary around open areas (avoiding water bodies, forests, and roads)\n`;
          message += `• Making the boundary larger\n`;
          message += `• Adjusting your preferences to allow smaller polyhouses\n\n`;
          message += `Note: Buildings can be demolished - only water bodies, forests, and roads are restricted.`;
        } else {
          message += 'Possible reasons:\n';
          message += '• Area may be too small\n';
          message += '• Shape may be too irregular\n';
          message += '• Constraints may be too restrictive\n\n';
          message += 'Try drawing a larger or more regular boundary.';
        }

        alert(message);
        return;
      }

      setPlanningResult(data.planningResult);
      setPlanningResultId(data.resultId);
      setShowQuotation(true);
      setEditMode(false);

      if (data.planningResult.metadata?.totalLandArea) {
        setLandAreaSize(data.planningResult.metadata.totalLandArea);
      }

      const initialMessage: ConversationMessage = {
        role: 'assistant',
        content: `I've created a plan with ${data.planningResult.polyhouses.length} polyhouse(s) covering ${data.planningResult.metadata.totalPolyhouseArea.toFixed(0)} sqm (${data.planningResult.metadata.utilizationPercentage.toFixed(1)}% utilization). The estimated cost is ₹${data.planningResult.quotation.totalCost.toLocaleString('en-IN')}. How can I help you with this plan?`,
        timestamp: new Date(),
      };
      setConversationHistory([initialMessage]);
      setShowChat(true);
    } catch (error) {
      console.error('Error creating plan:', error);
      alert(`Failed to create plan: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = async () => {
    if (!planningResult || !user) return;

    try {
      const supabase = createClient();

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectDetails.name,
          description: projectDetails.description || null,
          customer_company_name: projectDetails.customerCompanyName || null,
          contact_name: projectDetails.contactName || null,
          contact_email: projectDetails.contactEmail || null,
          contact_phone: projectDetails.contactPhone || null,
          location_name: projectDetails.locationName || null,
          location_address: projectDetails.locationAddress || null,
          land_boundary: planningResult.landArea.coordinates,
          land_area_sqm: planningResult.landArea.area,
          polyhouse_count: planningResult.polyhouses.length,
          total_coverage_sqm: planningResult.metadata.totalPolyhouseAreaWithGutters,
          utilization_percentage: planningResult.metadata.utilizationPercentage,
          estimated_cost: planningResult.quotation.totalCost,
          configuration: planningResult.configuration,
          polyhouses: planningResult.polyhouses,
          quotation: planningResult.quotation,
          terrain_analysis: planningResult.terrainAnalysis,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      setProjectId(project.id);
      alert('Project saved successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project. Please try again.');
    }
  };

  const handleChatMessage = async (message: string) => {
    if (!planningResult || !planningResultId) return;

    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setConversationHistory(prev => [...prev, userMessage]);

    // Add temporary "thinking" message
    const thinkingMessage: ConversationMessage = {
      role: 'assistant',
      content: 'Thinking...',
      timestamp: new Date(),
    };
    setConversationHistory(prev => [...prev, thinkingMessage]);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planningResultId: planningResultId,
          message,
          conversationHistory: [...conversationHistory, userMessage],
          userId: user?.id,
          projectId: projectId,
        }),
      });

      const data = await response.json();

      // Remove thinking message and add real response
      setConversationHistory(prev => {
        const withoutThinking = prev.slice(0, -1);
        const assistantMessage: ConversationMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        return [...withoutThinking, assistantMessage];
      });

      // If recalculation happened, show loading and update map
      if (data.updatedPlanningResult) {
        setLoading(true);
        // Small delay to show the loading animation
        setTimeout(() => {
          setPlanningResult(data.updatedPlanningResult);
          if (data.updatedPlanningResult.landArea) {
            setLandBoundary(data.updatedPlanningResult.landArea.coordinates);
          }
          setLoading(false);
        }, 500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove thinking message and add error message
      setConversationHistory(prev => {
        const withoutThinking = prev.slice(0, -1);
        const errorMessage: ConversationMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        };
        return [...withoutThinking, errorMessage];
      });
    }
  };

  const handleReset = () => {
    if (!confirm('Are you sure you want to reset? All unsaved changes will be lost.')) return;

    setCurrentStep('details');
    setProjectDetails({
      name: '',
      description: '',
      customerCompanyName: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      locationName: '',
      locationAddress: '',
    });
    setLandBoundary([]);
    setPlanningResult(null);
    setPlanningResultId(null);
    setProjectId(null);
    setConversationHistory([]);
    setShowChat(false);
    setShowQuotation(false);
    setLandAreaSize(10000);
    setEditMode(true);
  };

  const handleRestoreSnapshot = (snapshot: PlanningResult) => {
    setPlanningResult(snapshot);
    setLandBoundary(snapshot.landArea.coordinates);

    const restoreMessage: ConversationMessage = {
      role: 'assistant',
      content: `✓ Restored previous state with ${snapshot.polyhouses.length} polyhouses and ${snapshot.metadata.utilizationPercentage.toFixed(1)}% utilization.`,
      timestamp: new Date(),
    };
    setConversationHistory(prev => [...prev, restoreMessage]);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 transition-colors">
        <Loader2 className="w-8 h-8 animate-spin text-green-600 dark:text-cyan-400" />
      </div>
    );
  }

  // Step 1: Project Details Form
  if (currentStep === 'details') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
        <header className="bg-white/80 dark:bg-slate-900 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-slate-800 transition-colors">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:via-teal-400 dark:to-emerald-400 transition-colors">New Project</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-teal-400 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              ← Cancel
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 p-8 transition-colors">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-300 dark:via-teal-300 dark:to-emerald-300 mb-2 transition-colors">Project Information</h2>
              <p className="text-gray-600 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-teal-400 transition-colors">Enter details about this polyhouse planning project</p>
            </div>

            <form onSubmit={handleDetailsSubmit} className="space-y-6">
              {/* Project Details */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-300 dark:via-teal-300 dark:to-emerald-300 border-b dark:border-slate-800 pb-2 transition-colors">Project Details</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-teal-400 mb-1 transition-colors">
                    Project Name <span className="text-red-500 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-rose-400 dark:to-pink-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectDetails.name}
                    onChange={(e) => setProjectDetails({ ...projectDetails, name: e.target.value })}
                    placeholder="e.g., Bangalore Farm Expansion 2026"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-2 dark:focus:ring-cyan-500 dark:focus:border-transparent focus:border-transparent transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-teal-400 mb-1 transition-colors">Description</label>
                  <textarea
                    value={projectDetails.description}
                    onChange={(e) => setProjectDetails({ ...projectDetails, description: e.target.value })}
                    placeholder="Brief description of the project"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-2 dark:focus:ring-cyan-500 dark:focus:border-transparent focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-300 dark:via-teal-300 dark:to-emerald-300 border-b dark:border-slate-800 pb-2 transition-colors">Customer Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-teal-400 mb-1 transition-colors">Company Name</label>
                    <input
                      type="text"
                      value={projectDetails.customerCompanyName}
                      onChange={(e) => setProjectDetails({ ...projectDetails, customerCompanyName: e.target.value })}
                      placeholder="Customer's company"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-2 dark:focus:ring-cyan-500 dark:focus:border-transparent focus:border-transparent transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-teal-400 mb-1 transition-colors">Contact Name</label>
                    <input
                      type="text"
                      value={projectDetails.contactName}
                      onChange={(e) => setProjectDetails({ ...projectDetails, contactName: e.target.value })}
                      placeholder="Primary contact person"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-2 dark:focus:ring-cyan-500 dark:focus:border-transparent focus:border-transparent transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-teal-400 mb-1 transition-colors">Contact Email</label>
                    <input
                      type="email"
                      value={projectDetails.contactEmail}
                      onChange={(e) => setProjectDetails({ ...projectDetails, contactEmail: e.target.value })}
                      placeholder="contact@company.com"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-2 dark:focus:ring-cyan-500 dark:focus:border-transparent focus:border-transparent transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-teal-400 mb-1 transition-colors">Contact Phone</label>
                    <input
                      type="tel"
                      value={projectDetails.contactPhone}
                      onChange={(e) => setProjectDetails({ ...projectDetails, contactPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-2 dark:focus:ring-cyan-500 dark:focus:border-transparent focus:border-transparent transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-300 dark:via-teal-300 dark:to-emerald-300 border-b dark:border-slate-800 pb-2 transition-colors">Location Information</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-teal-400 mb-1 transition-colors">Location Name</label>
                  <input
                    type="text"
                    value={projectDetails.locationName}
                    onChange={(e) => setProjectDetails({ ...projectDetails, locationName: e.target.value })}
                    placeholder="e.g., Whitefield Industrial Area"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-2 dark:focus:ring-cyan-500 dark:focus:border-transparent focus:border-transparent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-teal-400 mb-1 transition-colors">Full Address</label>
                  <textarea
                    value={projectDetails.locationAddress}
                    onChange={(e) => setProjectDetails({ ...projectDetails, locationAddress: e.target.value })}
                    placeholder="Complete address with landmarks"
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-2 dark:focus:ring-cyan-500 dark:focus:border-transparent focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 border border-gray-300 dark:border-slate-700 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-teal-400 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:border-slate-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-green-600 dark:bg-gradient-to-r dark:from-cyan-600 dark:via-teal-600 dark:to-emerald-600 text-white rounded-lg hover:bg-green-700 dark:hover:from-cyan-500 dark:hover:via-teal-500 dark:hover:to-emerald-500 transition-all font-medium shadow-lg dark:shadow-cyan-500/20"
                >
                  Continue to Map →
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Map Drawing and Planning
  return (
    <main className="flex h-screen flex-col bg-white dark:bg-slate-950 transition-colors">
      {/* Header */}
      <header className="bg-agriplast-green-700 dark:bg-slate-900 text-white shadow-lg dark:border-b dark:border-slate-800 z-10 transition-colors">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{projectDetails.name}</h1>
            <p className="text-sm text-agriplast-green-100 mt-1">
              {projectDetails.customerCompanyName && `For ${projectDetails.customerCompanyName} • `}
              {planningResult ? 'Review and save your plan' : 'Draw your land boundary on the map'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {planningResult && !projectId && (
              <button
                onClick={handleSaveProject}
                disabled={loading}
                className="bg-white text-agriplast-green-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
              >
                Save Project
              </button>
            )}
            {!planningResult && (
              <button
                onClick={() => setCurrentStep('details')}
                className="text-white hover:text-gray-200 text-sm font-medium"
              >
                ← Edit Details
              </button>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white hover:text-gray-200 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </header>

      {/* GPS/KML Upload Options - Show only if no boundary drawn yet */}
      {!planningResult && landBoundary.length === 0 && (
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* GPS Link and KML Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GPS Link */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold mb-2 text-blue-900 flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Option 1: Paste GPS Link
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={gpsLink}
                    onChange={(e) => setGpsLink(e.target.value)}
                    placeholder="https://maps.google.com/@12.345,78.910..."
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={handleGPSLinkExtract}
                    disabled={extractingFromGPS || !gpsLink.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 whitespace-nowrap text-sm"
                  >
                    Extract
                  </button>
                </div>
              </div>

              {/* KML Upload */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="font-semibold mb-2 text-green-900 flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Option 2: Upload KML File
                </h3>
                <input
                  type="file"
                  accept=".kml"
                  onChange={handleKMLUpload}
                  disabled={extractingFromGPS}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-600 file:text-white hover:file:bg-green-700 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Manual Drawing Option */}
            <div className="bg-gray-100 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Option 3:</span> Or draw the boundary manually on the map below
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <div className="flex-1 relative">
          <MapComponent
            landBoundary={landBoundary}
            polyhouses={planningResult?.polyhouses || []}
            onBoundaryComplete={handleBoundaryComplete}
            loading={loading}
            terrainAnalysis={planningResult?.terrainAnalysis}
            regulatoryCompliance={planningResult?.regulatoryCompliance}
            editMode={editMode}
          />
        </div>

        {/* Continue Button - Shows when boundary is loaded but no plan yet */}
        {landBoundary.length > 0 && !planningResult && !loading && (
          <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between z-30 transition-colors">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Boundary loaded with {landBoundary.length} points. Ready to optimize polyhouse placement.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLandBoundary([])}
                className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-cyan-400 transition-colors font-medium"
              >
                Clear Boundary
              </button>
              <button
                onClick={() => setShowCropSelection(true)}
                className="px-6 py-3 bg-agriplast-green-600 dark:bg-gradient-to-r dark:from-cyan-600 dark:via-teal-600 dark:to-emerald-600 text-white rounded-lg hover:bg-agriplast-green-700 dark:hover:from-cyan-500 dark:hover:via-teal-500 dark:hover:to-emerald-500 transition-all font-semibold shadow-lg dark:shadow-cyan-500/20"
              >
                Continue with Optimization →
              </button>
            </div>
          </div>
        )}


        {/* Control panel overlay */}
        <div className="absolute top-4 left-4 z-10">
          <ControlPanel
            hasLandBoundary={landBoundary.length > 0}
            hasPlan={!!planningResult}
            onReset={handleReset}
            onToggleChat={() => setShowChat(!showChat)}
            onToggleQuotation={() => setShowQuotation(!showQuotation)}
            showChat={showChat}
            showQuotation={showQuotation}
            editMode={editMode}
            onToggleEditMode={() => setEditMode(!editMode)}
          />
        </div>

        {/* Terrain Info Panel */}
        {planningResult && (planningResult.terrainAnalysis || planningResult.regulatoryCompliance) && (
          <TerrainInfoPanel
            terrainAnalysis={planningResult.terrainAnalysis}
            regulatoryCompliance={planningResult.regulatoryCompliance}
          />
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-20 p-4">
            <div className="w-full max-w-3xl">
              <OptimizationLogs
                isLoading={loading}
                landAreaSize={landAreaSize}
              />
            </div>
          </div>
        )}

        {/* Quotation Panel */}
        {showQuotation && planningResult && (
          <div className="absolute top-20 right-4 w-96 max-h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-lg shadow-2xl dark:shadow-cyan-500/10 border border-gray-200 dark:border-slate-800 overflow-hidden z-20 flex flex-col transition-colors">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 transition-colors">
              <h3 className="font-semibold text-gray-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-teal-400 transition-colors">Quotation</h3>
              <button
                onClick={() => setShowQuotation(false)}
                className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-cyan-400 transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <QuotationPanel planningResult={planningResult} />
            </div>
          </div>
        )}

        {/* Chat Interface */}
        {showChat && planningResult && (
          <div className="absolute bottom-4 right-4 w-96 h-[600px] bg-white dark:bg-slate-900 rounded-lg shadow-2xl dark:shadow-cyan-500/10 border border-gray-200 dark:border-slate-800 overflow-hidden z-20 flex flex-col transition-colors">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-800 bg-agriplast-green-600 dark:bg-gradient-to-r dark:from-cyan-600 dark:via-teal-600 dark:to-emerald-600 text-white transition-colors shadow-lg">
              <h3 className="font-semibold">Chat Assistant</h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-white hover:text-cyan-100 transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <EnhancedChatInterface
                conversationHistory={conversationHistory}
                onSendMessage={handleChatMessage}
                planningResult={planningResult}
                onRestoreSnapshot={handleRestoreSnapshot}
              />
            </div>
          </div>
        )}

        {/* Customer Preferences Modal removed - now uses default sun-oriented optimization */}

        {/* Quick Selection Modal */}
        {showCropSelection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-800 p-6 max-w-md w-full transition-colors">
              {/* Structure Type */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                  Structure Type
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'polyhouse', label: 'Polyhouse' },
                    { value: 'cable_net', label: 'Cable Net' },
                    { value: 'fan_pad', label: 'Fan & Pad' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setStructureType(type.value as any)}
                      className={`px-3 py-2 text-xs border rounded-lg font-medium transition-all ${
                        structureType === type.value
                          ? 'border-green-600 bg-green-50 text-green-700 dark:border-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400'
                          : 'border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-400'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Crop Type */}
              <div className="mb-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                  Crop Type (Optional)
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'mixed', label: 'Mixed Crops' },
                    { value: 'tomato', label: 'Tomato' },
                    { value: 'cucumber', label: 'Cucumber' },
                    { value: 'capsicum', label: 'Capsicum' },
                    { value: 'lettuce', label: 'Lettuce' },
                    { value: 'strawberry', label: 'Strawberry' },
                    { value: 'rose', label: 'Rose' },
                    { value: 'other', label: 'Other' },
                  ].map((cropOption) => (
                    <button
                      key={cropOption.value}
                      onClick={() => startOptimization(cropOption.value)}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded-lg hover:border-green-500 dark:hover:border-cyan-500 hover:bg-green-50 dark:hover:bg-cyan-500/10 transition-all font-medium text-gray-900 dark:text-white"
                    >
                      {cropOption.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowCropSelection(false);
                  setLandBoundary([]);
                }}
                className="w-full px-4 py-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-cyan-400 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
