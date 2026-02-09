'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PlanningResult, ConversationMessage, Coordinate } from '@shared/types';
import EnhancedChatInterface from '@/components/EnhancedChatInterface';
import ChatLayout from '@/components/ChatLayout';
import QuotationModal from '@/components/QuotationModal';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Download } from 'lucide-react';

// Dynamic import for MapComponent to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors">
      <Loader2 className="w-8 h-8 animate-spin text-green-600" />
    </div>
  ),
});

export default function NewProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  // Project metadata
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');

  // Map state
  const [landBoundary, setLandBoundary] = useState<Coordinate[]>([]);
  const [planningResult, setPlanningResult] = useState<PlanningResult | null>(null);
  const [planningResultId, setPlanningResultId] = useState<string | null>(null);

  // Chat state
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

  // Loading states
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState<number>(0);
  const [optimizationStatus, setOptimizationStatus] = useState('');

  // UI state
  const [showQuotationModal, setShowQuotationModal] = useState(false);

  useEffect(() => {
    checkAuth();
    autoGenerateProjectName();
    initializeChat();
  }, []);

  // Auto-trigger optimization when boundary is set
  useEffect(() => {
    if (landBoundary.length >= 3 && !planningResult && !optimizing) {
      handleOptimize();
    }
  }, [landBoundary]);

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

      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) console.error('Error fetching project count:', error);

      const projectNumber = (count || 0) + 1;
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const generatedName = `Project ${projectNumber} - ${timestamp}`;

      setProjectName(generatedName);
    } catch (error) {
      console.error('Error auto-generating project name:', error);
      setProjectName('Project 1 - ' + new Date().toISOString().split('T')[0].replace(/-/g, ''));
    }
  };

  const initializeChat = () => {
    const welcomeMessage: ConversationMessage = {
      role: 'assistant',
      content: `Welcome! I'll help you create your polyhouse plan.\n\nTo get started, please provide your land boundary using one of these methods:\n\n1. Upload a KML file\n2. Paste a Google Maps GPS link\n3. Draw directly on the map\n\nOnce I have your land boundary, I'll automatically optimize the polyhouse placement for you.`,
      timestamp: new Date(),
    };
    setConversationHistory([welcomeMessage]);
  };

  const handleOptimize = async () => {
    if (landBoundary.length < 3 || optimizing) return;

    setOptimizing(true);
    setOptimizationStatus('Analyzing land boundary...');
    setOptimizationProgress(5);

    try {
      // Simulate progress for better UX
      setTimeout(() => {
        setOptimizationStatus('Calculating terrain features...');
        setOptimizationProgress(15);
      }, 300);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/planning/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landArea: {
            name: projectName,
            coordinates: landBoundary,
          },
          configuration: {},
        }),
      });

      setOptimizationStatus('Processing optimization request...');
      setOptimizationProgress(25);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create plan');
      }

      if (data.jobId) {
        const result = await pollJobStatus(data.jobId);
        handleOptimizationComplete(result);
      } else if (data.planningResult) {
        setOptimizationStatus('Finalizing polyhouse layout...');
        setOptimizationProgress(95);
        await new Promise(resolve => setTimeout(resolve, 500));
        handleOptimizationComplete(data.planningResult);
      }
    } catch (error) {
      console.error('Error optimizing:', error);
      setOptimizationStatus('');
      setOptimizationProgress(0);

      const errorMessage: ConversationMessage = {
        role: 'assistant',
        content: `Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or adjust your land boundary.`,
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, errorMessage]);
    } finally {
      setOptimizing(false);
    }
  };

  const pollJobStatus = async (jobId: string): Promise<any> => {
    const maxAttempts = 120;
    let attempts = 0;

    // Status messages based on progress ranges
    const getStatusMessage = (progress: number): string => {
      if (progress < 20) return 'Analyzing land boundary...';
      if (progress < 35) return 'Calculating buildable area...';
      if (progress < 50) return 'Planning polyhouse placement...';
      if (progress < 65) return 'Optimizing layout configuration...';
      if (progress < 80) return 'Calculating materials and costs...';
      if (progress < 95) return 'Finalizing design...';
      return 'Generating quotation...';
    };

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/planning/status/${jobId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check job status');
        }

        const progress = data.progress || 0;
        setOptimizationProgress(progress);
        setOptimizationStatus(data.statusMessage || getStatusMessage(progress));

        if (data.status === 'completed' && data.result) {
          setOptimizationProgress(100);
          setOptimizationStatus('Complete!');
          await new Promise(resolve => setTimeout(resolve, 300));
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
    setOptimizationStatus('');
    setOptimizationProgress(100);

    const successMessage: ConversationMessage = {
      role: 'assistant',
      content: `Optimization Complete!\n\nResults:\n- ${result.polyhouses.length} polyhouses placed\n- ${result.metadata.totalPolyhouseArea.toFixed(0)} m² total area\n- ${result.metadata.utilizationPercentage.toFixed(1)}% space utilization\n- Total cost: ₹${result.quotation.totalCost.toLocaleString('en-IN')}\n\n[View Quotation](#quotation)\n\nYou can now:\n- Adjust the layout\n- Modify settings\n- Export the design\n- Save the project`,
      timestamp: new Date(),
    };
    setConversationHistory(prev => [...prev, successMessage]);
  };

  const handleResetBoundary = () => {
    if (!confirm('This will clear all polyhouses and allow you to redraw the boundary. Continue?')) {
      return;
    }

    setPlanningResult(null);
    setPlanningResultId(null);
    setLandBoundary([]);

    const message: ConversationMessage = {
      role: 'assistant',
      content: 'Boundary cleared. You can now draw a new boundary on the map.',
      timestamp: new Date(),
    };
    setConversationHistory(prev => [...prev, message]);
  };

  const handleSendMessage = async (message: string) => {
    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setConversationHistory(prev => [...prev, userMessage]);

    // Handle special commands
    if (message.toLowerCase().includes('kml') || message.toLowerCase().includes('upload')) {
      fileInputRef.current?.click();
      return;
    }

    // Handle redraw/change boundary request
    if (message.toLowerCase().includes('redraw') || message.toLowerCase().includes('change boundary') || message.toLowerCase().includes('edit boundary') || message.toLowerCase().includes('reset boundary')) {
      handleResetBoundary();
      return;
    }

    // Handle GPS link
    if (message.includes('google.com/maps') || message.includes('@')) {
      handleGPSLink(message);
      return;
    }

    // Regular chat message
    if (!planningResultId) {
      const response: ConversationMessage = {
        role: 'assistant',
        content: 'Please provide your land boundary first before I can assist with modifications.',
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, response]);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planningResultId,
          message,
          conversationHistory: [...conversationHistory, userMessage],
          userId: user?.id,
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

  const handleGPSLink = (message: string) => {
    const match = message.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      const offset = 0.001;
      const boundary: Coordinate[] = [
        { lat: lat - offset, lng: lng - offset },
        { lat: lat - offset, lng: lng + offset },
        { lat: lat + offset, lng: lng + offset },
        { lat: lat + offset, lng: lng - offset },
      ];

      setLandBoundary(boundary);

      const response: ConversationMessage = {
        role: 'assistant',
        content: 'Location received. Please adjust the boundary on the map to match your actual land area. I\'ll automatically optimize once you\'re done.',
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, response]);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processKMLFile(file);
  };

  const processKMLFile = async (file: File) => {
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      const coordinates = xmlDoc.getElementsByTagName('coordinates')[0]?.textContent?.trim();

      if (coordinates) {
        const points = coordinates.split(/\s+/).map(coord => {
          const [lng, lat] = coord.split(',').map(Number);
          return { lat, lng };
        }).filter(point => !isNaN(point.lat) && !isNaN(point.lng));

        if (points.length >= 3) {
          setLandBoundary(points);

          const message: ConversationMessage = {
            role: 'assistant',
            content: `KML file loaded successfully. I've extracted ${points.length} boundary points from "${file.name}". Starting optimization...`,
            timestamp: new Date(),
          };
          setConversationHistory(prev => [...prev, message]);
        } else {
          throw new Error('No valid coordinates found in KML file');
        }
      } else {
        throw new Error('No coordinates found in KML file');
      }
    } catch (error) {
      console.error('Error parsing KML file:', error);
      const errorMsg: ConversationMessage = {
        role: 'assistant',
        content: `Failed to parse KML file: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure it's a valid KML format.`,
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, errorMsg]);
    }
  };

  const handleSaveProject = async () => {
    if (!planningResult || !user) return;

    try {
      const supabase = createClient();

      // Calculate total coverage
      const totalCoverage = planningResult.polyhouses.reduce((sum, ph) => sum + ph.area, 0);

      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectName,
          description,
          land_area_sqm: planningResult.landArea.area,
          polyhouse_count: planningResult.polyhouses.length,
          total_coverage_sqm: totalCoverage,
          utilization_percentage: planningResult.metadata.utilizationPercentage,
          estimated_cost: planningResult.quotation.totalCost,
          land_boundary: {
            type: 'Polygon',
            coordinates: landBoundary
          },
          polyhouses: planningResult.polyhouses,
          quotation: planningResult.quotation,
          terrain_analysis: planningResult.terrainAnalysis || null,
          regulatory_compliance: planningResult.regulatoryCompliance || null,
          configuration: planningResult.metadata || {},
          status: 'draft',
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        });
        throw error;
      }

      const successMsg: ConversationMessage = {
        role: 'assistant',
        content: 'Project saved successfully! Redirecting to dashboard...',
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, successMsg]);

      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (error: any) {
      console.error('Error saving project:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', error ? Object.keys(error) : 'null');
      console.error('Error stringified:', JSON.stringify(error, null, 2));

      let errorDetails = 'Unknown error';
      if (error?.message) {
        errorDetails = error.message;
      } else if (error?.details) {
        errorDetails = error.details;
      } else if (typeof error === 'string') {
        errorDetails = error;
      }

      const errorMsg: ConversationMessage = {
        role: 'assistant',
        content: `Failed to save project: ${errorDetails}. Please try again.`,
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, errorMsg]);
    }
  };

  const handleExport = async (type: 'quotation' | 'cad' | 'both') => {
    if (!planningResult) {
      console.error('Please create a plan first');
      return;
    }

    try {
      if (type === 'both') {
        // Generate both PDFs
        const { generateProjectReports } = await import('@/lib/technicalDrawing');
        await generateProjectReports({
          projectName: projectName,
          locationName: 'New Location',
          landBoundary: planningResult.landArea.coordinates,
          landAreaSqm: planningResult.landArea.area,
          polyhouseCount: planningResult.polyhouses.length,
          totalCoverageSqm: planningResult.metadata.totalPolyhouseArea,
          utilizationPercentage: planningResult.metadata.utilizationPercentage,
          polyhouses: planningResult.polyhouses,
          quotation: planningResult.quotation,
          createdAt: new Date().toISOString(),
        });
      } else if (type === 'cad') {
        // Generate only technical drawing
        const { generateTechnicalDrawing } = await import('@/lib/technicalDrawing');
        const blob = await generateTechnicalDrawing({
          projectName: projectName,
          locationName: 'New Location',
          landBoundary: planningResult.landArea.coordinates,
          landAreaSqm: planningResult.landArea.area,
          polyhouseCount: planningResult.polyhouses.length,
          totalCoverageSqm: planningResult.metadata.totalPolyhouseArea,
          utilizationPercentage: planningResult.metadata.utilizationPercentage,
          polyhouses: planningResult.polyhouses,
          createdAt: new Date().toISOString(),
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName.replace(/\s+/g, '_')}_Technical_Drawing.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (type === 'quotation') {
        // Generate only quotation
        const { generateProjectPDF } = await import('@/lib/pdfExport');
        await generateProjectPDF({
          projectName: projectName,
          locationName: 'New Location',
          landAreaSqm: planningResult.landArea.area,
          polyhouseCount: planningResult.polyhouses.length,
          totalCoverageSqm: planningResult.metadata.totalPolyhouseArea,
          utilizationPercentage: planningResult.metadata.utilizationPercentage,
          estimatedCost: planningResult.quotation.totalCost,
          polyhouses: planningResult.polyhouses,
          quotation: planningResult.quotation,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Hidden file input for KML upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".kml,.kmz"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Bar - Project Name & Description */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex-1">
          {isEditingName ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="text-lg font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-green-500 focus:outline-none"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                {projectName}
              </h1>
              <button
                onClick={() => setIsEditingName(true)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
          {isEditingDescription ? (
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setIsEditingDescription(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingDescription(false)}
              placeholder="Add description"
              className="text-sm text-gray-600 dark:text-gray-400 bg-transparent border-b border-green-500 focus:outline-none"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {description || 'Add description'}
              </p>
              <button
                onClick={() => setIsEditingDescription(true)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {planningResult && (
            <>
              {/* Redraw Boundary Button */}
              <button
                onClick={handleResetBoundary}
                className="px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors duration-150 flex items-center gap-1"
                title="Clear polyhouses and redraw boundary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Redraw</span>
              </button>

              {/* Export Dropdown */}
              <div className="relative group">
                <button className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-150 flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  <span>Export ▾</span>
                </button>
                <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <button
                    onClick={() => handleExport('cad')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    CAD
                  </button>
                  <button
                    onClick={() => handleExport('quotation')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    Quotation
                  </button>
                  <button
                    onClick={() => handleExport('both')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors rounded-b-md"
                  >
                    Both
                  </button>
                </div>
              </div>

              <button
                onClick={handleSaveProject}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
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
            <div id="project-map-container" className="relative h-full">
              <MapComponent
                landBoundary={landBoundary}
                onBoundaryComplete={setLandBoundary}
                polyhouses={planningResult?.polyhouses || []}
                loading={optimizing}
                loadingProgress={optimizationProgress}
                loadingStatus={optimizationStatus}
                editMode={!planningResult}
              />
            </div>
          }
          chatContent={
            <EnhancedChatInterface
              conversationHistory={conversationHistory}
              onSendMessage={handleSendMessage}
              planningResult={planningResult}
              onFileUpload={processKMLFile}
              onLinkClick={(href) => {
                if (href === '#quotation') {
                  setShowQuotationModal(true);
                }
              }}
            />
          }
          defaultMapWidth={60}
          showToggle={false}
        />
      </div>

      {/* Quotation Modal */}
      {planningResult && (
        <QuotationModal
          isOpen={showQuotationModal}
          onClose={() => setShowQuotationModal(false)}
          planningResult={planningResult}
        />
      )}
    </div>
  );
}
