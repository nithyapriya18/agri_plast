'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PlanningResult, Polyhouse, ConversationMessage } from '@/lib/shared/types';
import QuotationPanel from '@/components/QuotationPanel';
import EnhancedChatInterface from '@/components/EnhancedChatInterface';
import OptimizationFactorsPanel from '@/components/OptimizationFactorsPanel';
import { VersionHistory } from '@/components/VersionHistory';
import { getUserSession } from '@/lib/utils/userStorage';
import { Loader2, Download } from 'lucide-react';
import { generateProjectPDF } from '@/lib/pdfExport';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <Loader2 className="w-8 h-8 animate-spin text-agriplast-green-600" />
    </div>
  ),
});

interface Project {
  id: string;
  name: string;
  location_name: string | null;
  land_boundary: any;
  land_area_sqm: number;
  polyhouse_count: number;
  total_coverage_sqm: number;
  utilization_percentage: number;
  estimated_cost: number;
  configuration: any;
  polyhouses: Polyhouse[];
  quotation: any;
  terrain_analysis: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuotation, setShowQuotation] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modifiedBoundary, setModifiedBoundary] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [planningResultId, setPlanningResultId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number>(1);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      const session = getUserSession();
      if (!session) {
        router.push('/login?redirectTo=/projects/' + id);
        return;
      }

      const base = process.env.NEXT_PUBLIC_API_URL ?? '';
      const res = await fetch(`${base}/api/projects/${id}`);
      if (!res.ok) throw new Error('Project not found');
      const data = await res.json();

      // CRITICAL FIX: Ensure polyhouses is always an array
      if (data && (!data.polyhouses || !Array.isArray(data.polyhouses))) {
        data.polyhouses = [];
      }

      // Load version number
      if (data && data.version) {
        setCurrentVersion(data.version);
      }

      // FIX: Regenerate corners for blocks that don't have them
      if (data?.polyhouses && data.polyhouses.length > 0) {
        let needsRegeneration = false;
        data.polyhouses.forEach((polyhouse: any) => {
          if (!polyhouse.blocks || polyhouse.blocks.length === 0) return;

          // Check if any block is missing corners
          const hasMissingCorners = polyhouse.blocks.some((block: any) =>
            !block.corners || block.corners.length === 0
          );

          if (hasMissingCorners) {
            needsRegeneration = true;

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
              }
            });
          }
        });
      }

      setProject(data);

      // Load the project into the backend's planningResults Map for chat
      // This is necessary because the chat API expects the planning result to be in memory
      try {
        const planningResultForChat: PlanningResult = {
          success: true,
          landArea: {
            id: data.id,
            name: data.location_name || 'Unnamed',
            coordinates: data.land_boundary || [],
            centroid: (() => {
              if (data.land_boundary && data.land_boundary.length > 0) {
                const lat = data.land_boundary.reduce((sum: number, c: any) => sum + c.lat, 0) / data.land_boundary.length;
                const lng = data.land_boundary.reduce((sum: number, c: any) => sum + c.lng, 0) / data.land_boundary.length;
                return { lat, lng };
              }
              return { lat: 0, lng: 0 };
            })(),
            area: data.land_area_sqm,
            createdAt: new Date(data.created_at),
          },
          polyhouses: Array.isArray(data.polyhouses) ? data.polyhouses : [],
          configuration: data.configuration,
          quotation: data.quotation,
          warnings: [],
          errors: [],
          metadata: {
            numberOfPolyhouses: data.polyhouse_count,
            totalPolyhouseArea: data.total_coverage_sqm,
            totalPolyhouseAreaWithGutters: data.total_coverage_sqm,
            totalLandArea: data.land_area_sqm,
            utilizationPercentage: data.utilization_percentage,
            computationTime: 0,
            unbuildableRegions: [],
            constraintViolations: [],
          },
          terrainAnalysis: data.terrain_analysis,
          regulatoryCompliance: undefined,
        };

        // Store this in the backend's planningResults Map by making a POST request
        // We'll use the project ID as the planning result ID
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/planning/load`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planningResultId: data.id,
            planningResult: planningResultForChat,
          }),
        });

        if (response.ok) {
          setPlanningResultId(data.id);
        } else {
          setPlanningResultId(data.id); // Still set it, user can try chatting
        }
      } catch (loadError) {
        setPlanningResultId(data.id); // Still set it, user can try chatting
      }
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Failed to load project');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!project) return;
    setStatusUpdating(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? '';
      const res = await fetch(`${base}/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Update failed');
      setProject({ ...project, status: newStatus });
      alert('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? '';
      const res = await fetch(`${base}/api/projects/${project.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      alert('Project deleted successfully');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  };

  const handleChatMessage = async (message: string) => {
    if (!project || !planningResultId) {
      alert('Unable to process chat. Please try refreshing the page.');
      return;
    }

    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setConversationHistory(prev => [...prev, userMessage]);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planningResultId: planningResultId,
          message,
          conversationHistory: [...conversationHistory, userMessage],
        }),
      });

      const data = await response.json();

      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, assistantMessage]);

      // If the backend returns an updated planning result, update the project and mark as having changes
      if (data.updatedPlanningResult) {
        // Regenerate corners for blocks that don't have them (CRITICAL FIX for rendering bug)
        const polyhousesWithCorners = data.updatedPlanningResult.polyhouses.map((polyhouse: any) => {
          if (!polyhouse.blocks || polyhouse.blocks.length === 0) return polyhouse;

          // Check if any block is missing corners
          const hasMissingCorners = polyhouse.blocks.some((block: any) =>
            !block.corners || block.corners.length === 0
          );

          if (hasMissingCorners) {
            // Calculate polyhouse center from bounds (geographic coordinates)
            if (!polyhouse.bounds || polyhouse.bounds.length === 0) {
              console.error(`  ❌ Cannot regenerate corners: polyhouse ${polyhouse.id} has no bounds`);
              return polyhouse;
            }

            const centerLng = polyhouse.bounds.reduce((sum: number, p: any) => sum + p.x, 0) / polyhouse.bounds.length;
            const centerLat = polyhouse.bounds.reduce((sum: number, p: any) => sum + p.y, 0) / polyhouse.bounds.length;

            // Regenerate corners for each block
            const blocksWithCorners = polyhouse.blocks.map((block: any) => {
              if (block.corners && block.corners.length > 0) return block; // Already has corners

              const angleRad = (block.rotation || 0) * Math.PI / 180;
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
              const geoCorners = rotatedLocalCorners.map((corner: any) => {
                const cornerLat = centerLat + corner.y / 111320;
                const cornerLng = centerLng + corner.x / (111320 * Math.cos(centerLat * Math.PI / 180));

                return {
                  x: cornerLng,
                  y: cornerLat,
                };
              });

              return {
                ...block,
                corners: geoCorners,
              };
            });

            return {
              ...polyhouse,
              blocks: blocksWithCorners,
            };
          }

          return polyhouse;
        });

        // UPDATE LOCAL STATE IMMEDIATELY - Map updates instantly without any delay!
        const updatedProject = {
          ...project,
          polyhouses: polyhousesWithCorners,
          configuration: data.updatedPlanningResult.configuration,
          quotation: data.updatedPlanningResult.quotation,
          polyhouse_count: data.updatedPlanningResult.polyhouses.length,
          total_coverage_sqm: data.updatedPlanningResult.metadata.totalPolyhouseAreaWithGutters,
          utilization_percentage: data.updatedPlanningResult.metadata.utilizationPercentage,
          estimated_cost: data.updatedPlanningResult.quotation.totalCost,
        };

        setProject(updatedProject);

        // Save to database in background (async, non-blocking)
        setHasUnsavedChanges(true);
        const base = process.env.NEXT_PUBLIC_API_URL ?? '';
        fetch(`${base}/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            polyhouses: polyhousesWithCorners,
            configuration: data.updatedPlanningResult.configuration,
            quotation: data.updatedPlanningResult.quotation,
            polyhouse_count: data.updatedPlanningResult.polyhouses.length,
            total_coverage_sqm: data.updatedPlanningResult.metadata.totalPolyhouseAreaWithGutters,
            utilization_percentage: data.updatedPlanningResult.metadata.utilizationPercentage,
            estimated_cost: data.updatedPlanningResult.quotation.totalCost,
          }),
        })
          .then((res) => {
            if (res.ok) {
              setHasUnsavedChanges(false);
            }
          })
          .catch((err) => console.error('Background save failed:', err));
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

  const handleRestoreSnapshot = (snapshot: PlanningResult) => {
    // For existing projects, we'd need to save the snapshot to the database
    alert('Snapshot restore is not yet supported for saved projects. Please use the chat to request changes.');
  };

  const handleSelectVersion = (versionId: string) => {
    // Navigate to the selected version
    router.push(`/projects/${versionId}`);
  };

  const handleExportPDF = async () => {
    if (!project || !planningResult) {
      alert('Unable to export. Project data is not available.');
      return;
    }

    try {
      await generateProjectPDF({
        projectName: project.name,
        locationName: project.location_name || 'Not specified',
        landAreaSqm: project.land_area_sqm,
        polyhouseCount: project.polyhouse_count,
        totalCoverageSqm: project.total_coverage_sqm,
        utilizationPercentage: project.utilization_percentage,
        estimatedCost: project.estimated_cost,
        polyhouses: planningResult.polyhouses,
        quotation: project.quotation,
        createdAt: project.created_at,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleBoundaryComplete = (boundary: any) => {
    if (editMode) {
      setModifiedBoundary(boundary);
      setHasUnsavedChanges(true);
    }
  };

  const handleCloseProject = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirmation(true);
    } else {
      router.push('/dashboard');
    }
  };

  const handleConfirmClose = async (saveChanges: boolean) => {
    if (saveChanges) {
      await handleSave(false);
    }
    setShowCloseConfirmation(false);
    router.push('/dashboard');
  };

  const handleSave = async (saveAsNew: boolean) => {
    if (!project) return;
    if (!modifiedBoundary && !saveAsNew) {
      alert('No changes detected');
      return;
    }

    setSaving(true);
    try {
      const boundaryToUse = modifiedBoundary || project.land_boundary;

      // Trigger re-optimization with the new boundary
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/planning/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landArea: {
            name: project.location_name || 'Land Area',
            coordinates: boundaryToUse,
          },
          configuration: project.configuration,
        }),
      });

      if (!response.ok) throw new Error('Optimization failed');
      const optimizationResult = await response.json();

      if (saveAsNew) {
        const session = getUserSession();
        if (!session) throw new Error('User not authenticated');
        const base = process.env.NEXT_PUBLIC_API_URL ?? '';
        const createRes = await fetch(`${base}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: session.userId,
            name: `${project.name} (Copy)`,
            land_boundary: boundaryToUse,
            land_area_sqm: optimizationResult.metadata?.totalLandArea ?? 0,
            polyhouse_count: optimizationResult.polyhouses?.length ?? 0,
            total_coverage_sqm: optimizationResult.metadata?.totalPolyhouseArea ?? 0,
            utilization_percentage: optimizationResult.metadata?.utilizationPercentage ?? 0,
            estimated_cost: optimizationResult.quotation?.totalCost ?? 0,
            configuration: project.configuration,
            polyhouses: optimizationResult.polyhouses ?? [],
            quotation: optimizationResult.quotation ?? {},
            status: 'draft',
          }),
        });
        if (!createRes.ok) throw new Error('Failed to create project');
        const data = await createRes.json();
        alert('New project created successfully. Redirecting to new project...');
        router.push(`/projects/${data.id}`);
      } else {
        // Create new version (don't leave the page, stay on the same project with new version)
        const versionResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/projects/${project.id}/create-version`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planningResult: {
                landArea: {
                  name: project.location_name || 'Land Area',
                  coordinates: boundaryToUse,
                  area: optimizationResult.metadata.totalLandArea,
                },
                polyhouses: optimizationResult.polyhouses,
                configuration: project.configuration,
                quotation: optimizationResult.quotation,
                metadata: optimizationResult.metadata,
                terrainAnalysis: optimizationResult.terrainAnalysis,
              },
              quotation: optimizationResult.quotation,
              versionName: `Modified boundary - ${new Date().toLocaleString()}`,
            }),
          }
        );

        if (!versionResponse.ok) {
          const errorData = await versionResponse.json();
          throw new Error(errorData.error || 'Failed to create version');
        }

        const versionData = await versionResponse.json();

        // Update current version number and navigate to the new version
        setCurrentVersion(versionData.version);
        alert(`Saved as Version ${versionData.version}`);

        // Navigate to the new version (this will reload the project with the new version)
        router.push(`/projects/${versionData.project.id}`);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      quoted: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
      approved: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
      installed: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Create PlanningResult object for components that need it
  const planningResult: PlanningResult | null = project ? {
    success: true,
    landArea: {
      id: project.id,
      name: project.location_name || 'Unnamed',
      coordinates: project.land_boundary || [],
      centroid: (() => {
        // Calculate centroid from coordinates
        if (project.land_boundary && project.land_boundary.length > 0) {
          const lat = project.land_boundary.reduce((sum: number, c: any) => sum + c.lat, 0) / project.land_boundary.length;
          const lng = project.land_boundary.reduce((sum: number, c: any) => sum + c.lng, 0) / project.land_boundary.length;
          return { lat, lng };
        }
        return { lat: 0, lng: 0 };
      })(),
      area: project.land_area_sqm,
      createdAt: new Date(project.created_at),
    },
    polyhouses: Array.isArray(project.polyhouses) ? project.polyhouses : [],
    configuration: project.configuration,
    quotation: project.quotation,
    warnings: [],
    errors: [],
    metadata: {
      numberOfPolyhouses: project.polyhouse_count,
      totalPolyhouseArea: project.total_coverage_sqm,
      totalPolyhouseAreaWithGutters: project.total_coverage_sqm,
      totalLandArea: project.land_area_sqm,
      utilizationPercentage: project.utilization_percentage,
      computationTime: 0,
            unbuildableRegions: [],
            constraintViolations: [],
    },
    terrainAnalysis: project.terrain_analysis,
    regulatoryCompliance: undefined,
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 transition-colors">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project || !planningResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 transition-colors">Project not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-white dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 z-10 transition-colors">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">{project.name}</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                    {project.location_name} • Created {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {getStatusBadge(project.status)}

              <VersionHistory
                projectId={project.id}
                currentVersion={currentVersion}
                onSelectVersion={handleSelectVersion}
              />

              <button
                onClick={() => setShowQuotation(!showQuotation)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                {showQuotation ? 'Hide' : 'Show'} Quotation
              </button>

              <button
                onClick={handleCloseProject}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close Project
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 transition-colors">
              <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Land Area</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 transition-colors">{project.land_area_sqm.toFixed(0)} m²</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 transition-colors">
              <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Polyhouses</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 transition-colors">{project.polyhouse_count}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 transition-colors">
              <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Utilization</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 transition-colors">{project.utilization_percentage.toFixed(1)}%</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 transition-colors">
              <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Estimated Cost</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 transition-colors">₹{project.estimated_cost.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden" id="project-map-container">
        <MapComponent
          landBoundary={planningResult.landArea.coordinates}
          polyhouses={planningResult.polyhouses}
          onBoundaryComplete={handleBoundaryComplete}
          loading={false}
          terrainAnalysis={planningResult.terrainAnalysis}
          regulatoryCompliance={planningResult.regulatoryCompliance}
          editMode={editMode}
        />

        {/* Optimization Factors Panel */}
        <div className="absolute top-4 left-4 z-10 max-w-md max-h-[calc(100vh-8rem)] overflow-y-auto">
          <OptimizationFactorsPanel
            configuration={planningResult.configuration}
            metadata={planningResult.metadata}
            terrainAnalysis={planningResult.terrainAnalysis}
            regulatoryCompliance={planningResult.regulatoryCompliance}
          />
        </div>

        {/* Actions Overlay - moved to bottom-right to avoid overlap with Optimization Factors Panel */}
        <div className="absolute bottom-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 w-64 transition-colors">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 transition-colors">Actions</h3>

          {!editMode ? (
            <>
              <button
                onClick={() => setShowChat(!showChat)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {showChat ? 'Hide Chat' : 'Chat Assistant'}
              </button>

              <button
                onClick={handleExportPDF}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Export PDF
              </button>

              <button
                onClick={() => setEditMode(true)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Edit Project
              </button>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2 transition-colors">Update Status</label>
                <select
                  value={project.status}
                  onChange={(e) => handleStatusUpdate(e.target.value)}
                  disabled={statusUpdating}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent text-sm transition-colors"
                >
                  <option value="draft">Draft</option>
                  <option value="quoted">Quoted</option>
                  <option value="approved">Approved</option>
                  <option value="installed">Installed</option>
                </select>
              </div>

              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                Delete Project
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 transition-colors">Edit mode enabled. Modify the land boundary on the map.</p>

              <button
                onClick={() => setEditMode(false)}
                disabled={saving}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>

              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save as New Project'}
              </button>
            </>
          )}
        </div>

        {/* Quotation Panel */}
        {showQuotation && (
          <div className="absolute top-4 right-4 w-96 max-h-[calc(100vh-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20 flex flex-col transition-colors">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 transition-colors">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 transition-colors">Quotation</h3>
              <button
                onClick={() => setShowQuotation(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
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
          <div className="absolute bottom-4 right-4 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20 flex flex-col transition-colors">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-green-600 dark:bg-green-700 text-white transition-colors">
              <h3 className="font-semibold">Chat Assistant</h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-white hover:text-gray-200 dark:hover:text-gray-300 transition-colors"
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

        {/* Close Confirmation Modal */}
        {showCloseConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 transition-colors">Unsaved Changes</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 transition-colors">
                You have unsaved changes. Do you want to save them before closing?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCloseConfirmation(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmClose(false)}
                  className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors font-medium"
                >
                  Discard
                </button>
                <button
                  onClick={() => handleConfirmClose(true)}
                  className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
