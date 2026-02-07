'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PlanningResult, ConversationMessage, Coordinate } from '@shared/types';
import EnhancedChatInterface from '@/components/EnhancedChatInterface';
import ChatLayout from '@/components/ChatLayout';
import QuotationPanel from '@/components/QuotationPanel';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Sparkles, Zap, ArrowRight, Upload } from 'lucide-react';

// Dynamic import for MapComponent to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-slate-950 transition-colors">
      <Loader2 className="w-8 h-8 animate-spin text-agriplast-green-600 dark:text-cyan-400" />
    </div>
  ),
});

type FlowStep = 'form' | 'map-chat' | 'optimizing';

export default function NewProjectPageSimplified() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>('form');

  // Form state (simplified to 3 fields)
  const [projectName, setProjectName] = useState('');
  const [locationInput, setLocationInput] = useState(''); // GPS link, address, or KML
  const [description, setDescription] = useState('');
  const [useQuickStart, setUseQuickStart] = useState<boolean | null>(null);
  const [kmlFile, setKmlFile] = useState<File | null>(null);

  // Map state
  const [landBoundary, setLandBoundary] = useState<Coordinate[]>([]);
  const [planningResult, setPlanningResult] = useState<PlanningResult | null>(null);
  const [planningResultId, setPlanningResultId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Chat state
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [showQuotation, setShowQuotation] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState<number>(0);
  const [optimizationStatus, setOptimizationStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [extractingBoundary, setExtractingBoundary] = useState(false);

  useEffect(() => {
    checkAuth();
    autoGenerateProjectName();
  }, []);

  // Auto-start chat with onboarding message
  useEffect(() => {
    if (flowStep === 'map-chat' && conversationHistory.length === 0) {
      const onboardingMessage: ConversationMessage = {
        role: 'assistant',
        content: useQuickStart
          ? `Great! I've set up default settings optimized for your land. Let me guide you through the map setup.\n\n**Next steps:**\n1. ${locationInput ? 'I\'ll extract your land boundary from the location you provided' : 'Draw your land boundary on the map, upload a KML file, or paste a GPS link'}\n2. Once I have the boundary, I'll optimize the polyhouse placement\n3. You can review and adjust the plan\n\nHow would you like to define your land boundary?`
          : `Perfect! I'm here to help you customize every detail.\n\n**Let's start with your land:**\nHow would you like to define your land boundary?\n- Paste a Google Maps GPS link\n- Upload a KML file\n- Draw directly on the map\n\nOnce we have the boundary, I'll ask about your preferences for crops, spacing, and materials.`,
        timestamp: new Date(),
      };
      setConversationHistory([onboardingMessage]);
    }
  }, [flowStep, useQuickStart]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setUser(user);
  };

  const autoGenerateProjectName = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Get user's project count
      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching project count:', error);
      }

      const projectNumber = (count || 0) + 1;
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD format
      const generatedName = `Project${projectNumber}_${timestamp}`;

      setProjectName(generatedName);
    } catch (error) {
      console.error('Error auto-generating project name:', error);
      setProjectName('Project1_' + new Date().toISOString().split('T')[0].replace(/-/g, ''));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setKmlFile(file);
    setLocationInput(`KML file: ${file.name}`);

    // Parse KML file
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      // Extract coordinates from KML
      const coordinates = xmlDoc.getElementsByTagName('coordinates')[0]?.textContent?.trim();

      if (coordinates) {
        // Parse KML coordinates (lng,lat,alt format)
        const points = coordinates.split(/\s+/).map(coord => {
          const [lng, lat] = coord.split(',').map(Number);
          return { lat, lng };
        }).filter(point => !isNaN(point.lat) && !isNaN(point.lng));

        if (points.length >= 3) {
          setLandBoundary(points);

          const message: ConversationMessage = {
            role: 'assistant',
            content: `✅ KML file loaded successfully! I've extracted ${points.length} boundary points from "${file.name}". The boundary is now visible on the map.`,
            timestamp: new Date(),
          };
          setConversationHistory(prev => [...prev, message]);
        }
      }
    } catch (error) {
      console.error('Error parsing KML file:', error);
      alert('Failed to parse KML file. Please ensure it\'s a valid KML format.');
    }
  };

  const handleQuickStart = () => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    setUseQuickStart(true);
    setFlowStep('map-chat');

    // Auto-extract boundary if location provided
    if (locationInput.trim()) {
      extractBoundaryFromLocation();
    }
  };

  const handleCustomize = () => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    setUseQuickStart(false);
    setFlowStep('map-chat');
  };

  const extractBoundaryFromLocation = async () => {
    setExtractingBoundary(true);

    try {
      // Check if it's a GPS link
      if (locationInput.includes('google.com/maps') || locationInput.includes('@')) {
        // Extract coordinates from GPS link
        const match = locationInput.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);

          // Create a small square boundary around the point (temporary)
          const offset = 0.001; // ~100m
          const boundary: Coordinate[] = [
            { lat: lat - offset, lng: lng - offset },
            { lat: lat - offset, lng: lng + offset },
            { lat: lat + offset, lng: lng + offset },
            { lat: lat + offset, lng: lng - offset },
          ];

          setLandBoundary(boundary);

          // Add message to chat
          const message: ConversationMessage = {
            role: 'assistant',
            content: `I've placed a marker at your location. Please adjust the boundary by dragging the corners on the map to match your actual land area.`,
            timestamp: new Date(),
          };
          setConversationHistory(prev => [...prev, message]);
        }
      }
      // TODO: Add geocoding for address input
      // TODO: Add KML file parsing

    } catch (error) {
      console.error('Error extracting boundary:', error);
    } finally {
      setExtractingBoundary(false);
    }
  };

  const handleOptimizeClick = async () => {
    if (landBoundary.length < 3) {
      alert('Please define a land boundary with at least 3 points');
      return;
    }

    setFlowStep('optimizing');
    setOptimizationStatus('processing');
    setLoading(true);

    try {
      // Create planning request with default or custom settings
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/planning/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landArea: {
            name: projectName,
            coordinates: landBoundary,
          },
          configuration: useQuickStart ? {} : undefined, // Use defaults for quick start
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create plan');
      }

      // Handle async job
      if (data.jobId) {
        const result = await pollJobStatus(data.jobId);
        handleOptimizationComplete(result);
      } else if (data.planningResult) {
        handleOptimizationComplete(data.planningResult);
      }
    } catch (error) {
      console.error('Error creating plan:', error);
      setOptimizationStatus('failed');
      alert('Failed to optimize: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = async (jobId: string): Promise<any> => {
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/planning/status/${jobId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check job status');
        }

        setOptimizationProgress(data.progress || 0);

        if (data.status === 'completed' && data.result) {
          return data.result;
        }

        if (data.status === 'failed') {
          throw new Error(data.error || 'Optimization failed');
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        throw error;
      }
    }

    throw new Error('Optimization timeout');
  };

  const handleOptimizationComplete = (result: PlanningResult) => {
    setPlanningResult(result);
    setPlanningResultId(result.landArea.id);
    setOptimizationStatus('completed');
    setFlowStep('map-chat');
    setShowQuotation(true);

    // Add success message to chat
    const successMessage: ConversationMessage = {
      role: 'assistant',
      content: `✅ **Optimization Complete!**\n\n📊 **Results:**\n- ${result.polyhouses.length} polyhouses placed\n- ${result.metadata.totalPolyhouseArea.toFixed(0)} m² total area\n- ${result.metadata.utilizationPercentage.toFixed(1)}% space utilization\n- ₹${result.quotation.totalCost.toLocaleString('en-IN')} estimated cost\n\n💬 You can now ask me to:\n- Maximize coverage\n- Adjust spacing\n- View detailed pricing\n- Export to PDF\n- Save the project`,
      timestamp: new Date(),
    };
    setConversationHistory(prev => [...prev, successMessage]);
  };

  const handleSendMessage = async (message: string) => {
    if (!planningResultId) return;

    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setConversationHistory(prev => [...prev, userMessage]);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planningResultId,
          message,
          conversationHistory: [...conversationHistory, userMessage],
          userId: user?.id,
          projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setConversationHistory(prev => [...prev, assistantMessage]);

      if (data.updatedPlanningResult) {
        setPlanningResult(data.updatedPlanningResult);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ConversationMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, errorMessage]);
    }
  };

  const handleSaveProject = async () => {
    if (!planningResult || !user) return;

    try {
      const supabase = createClient();

      // Save project to database
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectName,
          description,
          land_area: planningResult.landArea.area,
          polyhouse_count: planningResult.polyhouses.length,
          utilization_percentage: planningResult.metadata.utilizationPercentage,
          estimated_cost: planningResult.quotation.totalCost,
          planning_result: planningResult,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      alert('Project saved successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project');
    }
  };

  // Render form step
  if (flowStep === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Create New Project
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Let's start with the basics. I'll guide you through the rest conversationally.
            </p>
          </div>

          {/* Simplified Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
            <div className="space-y-6">
              {/* Project Name - Required */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Tomato Polyhouse Farm 2026"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-agriplast-green-500 dark:bg-gray-700 dark:text-white"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Auto-generated name (you can edit it)
                </p>
              </div>

              {/* Location Input - Optional but helpful */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Location (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="Paste GPS link or address"
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-agriplast-green-500 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors duration-150"
                    title="Upload KML file"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Upload KML</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".kml,.kmz"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You can also draw on the map in the next step
                </p>
              </div>

              {/* Description - Optional */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-agriplast-green-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Quick Start Button */}
            <button
              onClick={handleQuickStart}
              disabled={!projectName.trim()}
              className="group relative overflow-hidden bg-gradient-to-r from-agriplast-green-600 to-agriplast-green-700 hover:from-agriplast-green-700 hover:to-agriplast-green-800 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-6 h-6" />
                  <span className="text-lg font-bold">Quick Start</span>
                </div>
                <p className="text-sm text-green-100">
                  Use smart defaults, get started in seconds
                </p>
                <div className="flex items-center justify-center gap-1 mt-3 text-xs text-green-200">
                  <span>~3 clicks to complete</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200" />
            </button>

            {/* Customize Button */}
            <button
              onClick={handleCustomize}
              disabled={!projectName.trim()}
              className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-6 h-6" />
                  <span className="text-lg font-bold">Customize via Chat</span>
                </div>
                <p className="text-sm text-blue-100">
                  Talk to AI, customize everything
                </p>
                <div className="flex items-center justify-center gap-1 mt-3 text-xs text-blue-200">
                  <span>Full control & guidance</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200" />
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>💡 Don't worry, you can always modify settings later via chat</p>
          </div>
        </div>
      </div>
    );
  }

  // Render optimizing step
  if (flowStep === 'optimizing') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-agriplast-green-600 dark:text-cyan-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Optimizing Your Plan
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Analyzing terrain, placing polyhouses, calculating costs...
          </p>
          <div className="w-64 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-agriplast-green-600 dark:bg-cyan-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${optimizationProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {optimizationProgress}% complete
          </p>
        </div>
      </div>
    );
  }

  // Render map-chat step (split screen)
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            {projectName}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {useQuickStart ? 'Quick Start Mode' : 'Customization Mode'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {planningResult && (
            <>
              <button
                onClick={() => setShowQuotation(!showQuotation)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-150"
              >
                {showQuotation ? 'Hide' : 'Show'} Quotation
              </button>
              <button
                onClick={handleSaveProject}
                className="px-4 py-2 bg-agriplast-green-600 hover:bg-agriplast-green-700 text-white rounded-lg text-sm font-medium transition-colors duration-150"
              >
                Save Project
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chat Layout (Map + Chat) */}
      <div className="flex-1 overflow-hidden">
        <ChatLayout
          mapContent={
            <div className="relative h-full">
              <MapComponent
                landBoundary={landBoundary}
                onBoundaryChange={setLandBoundary}
                polyhouses={planningResult?.polyhouses || []}
                editMode={!planningResult}
                centerOnLoad={landBoundary.length > 0}
              />

              {/* Quotation Overlay */}
              {showQuotation && planningResult && (
                <div className="absolute top-4 left-4 w-96 max-h-[80vh] overflow-auto">
                  <QuotationPanel quotation={planningResult.quotation} />
                </div>
              )}

              {/* Optimize Button (before optimization) */}
              {!planningResult && landBoundary.length >= 3 && (
                <button
                  onClick={handleOptimizeClick}
                  disabled={loading}
                  className="absolute bottom-6 left-1/2 transform -translate-x-1/2 px-8 py-4 bg-agriplast-green-600 hover:bg-agriplast-green-700 text-white rounded-xl text-lg font-bold shadow-2xl transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Optimizing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Optimize Layout</span>
                    </>
                  )}
                </button>
              )}
            </div>
          }
          chatContent={
            <EnhancedChatInterface
              conversationHistory={conversationHistory}
              onSendMessage={handleSendMessage}
              planningResult={planningResult}
            />
          }
          defaultMapWidth={60}
          showToggle={false}
        />
      </div>
    </div>
  );
}
