'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PlanningResult, Polyhouse, ConversationMessage } from '@shared/types';
import ChatLayout from '@/components/ChatLayout';
import QuotationPanel from '@/components/QuotationPanel';
import EnhancedChatInterface from '@/components/EnhancedChatInterface';
import { DSLViewer, DSLQuickActions } from '@/components/DSLViewer';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Download, Save, Edit3, Trash2, Eye, EyeOff } from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Loader2 className="w-8 h-8 animate-spin text-agriplast-green-600" />
    </div>
  ),
});

interface Project {
  id: string;
  name: string;
  description: string | null;
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
  preferences_snapshot: any | null;
  created_at: string;
  updated_at: string;
}

export default function ProjectDetailPageSimplified({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [showQuotation, setShowQuotation] = useState(false);
  const [showDSL, setShowDSL] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Chat state
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [planningResultId, setPlanningResultId] = useState<string | null>(null);

  // Modification state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProject();
  }, [id]);

  // Auto-load chat messages on mount
  useEffect(() => {
    if (project) {
      loadChatMessages();
    }
  }, [project]);

  const loadProject = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setProject(data);
      setPlanningResultId(data.id);
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Failed to load project');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const messages: ConversationMessage[] = data.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
        setConversationHistory(messages);
      } else {
        // Add welcome message if no chat history
        const welcomeMessage: ConversationMessage = {
          role: 'assistant',
          content: `👋 Welcome back to **${project?.name}**!\n\n📊 **Current Status:**\n- ${project?.polyhouse_count} polyhouses\n- ${project?.utilization_percentage.toFixed(1)}% utilization\n- ₹${project?.estimated_cost.toLocaleString('en-IN')} estimated cost\n\n💬 I can help you:\n- Maximize coverage or adjust spacing\n- View detailed pricing and settings (click DSL button above)\n- Modify materials or configuration\n- Export to PDF\n- Create a new version with changes\n\nWhat would you like to do?`,
          timestamp: new Date(),
        };
        setConversationHistory([welcomeMessage]);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!planningResultId || !project) return;

    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setConversationHistory(prev => [...prev, userMessage]);

    try {
      // Build planning result from project data
      const planningResult: PlanningResult = {
        success: true,
        landArea: {
          id: project.id,
          name: project.name,
          coordinates: project.land_boundary?.coordinates || [],
          centroid: project.land_boundary?.centroid || { lat: 0, lng: 0 },
          area: project.land_area_sqm,
          createdAt: new Date(project.created_at),
        },
        polyhouses: project.polyhouses,
        configuration: project.configuration,
        quotation: project.quotation,
        warnings: [],
        errors: [],
        metadata: {
          numberOfPolyhouses: project.polyhouse_count,
          totalPolyhouseArea: project.total_coverage_sqm,
          totalLandArea: project.land_area_sqm,
          utilizationPercentage: project.utilization_percentage,
          computationTime: 0,
          unbuildableRegions: [],
          constraintViolations: [],
        },
        terrainAnalysis: project.terrain_analysis,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planningResultId,
          message,
          conversationHistory: [...conversationHistory, userMessage],
          projectId: project.id,
          customerPreferences: project.preferences_snapshot,
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

      // If layout was updated, mark as unsaved
      if (data.updatedPlanningResult) {
        setHasUnsavedChanges(true);
        // Update project with new planning result
        setProject(prev => prev ? {
          ...prev,
          polyhouses: data.updatedPlanningResult.polyhouses,
          polyhouse_count: data.updatedPlanningResult.polyhouses.length,
          total_coverage_sqm: data.updatedPlanningResult.metadata.totalPolyhouseArea,
          utilization_percentage: data.updatedPlanningResult.metadata.utilizationPercentage,
          quotation: data.updatedPlanningResult.quotation,
          estimated_cost: data.updatedPlanningResult.quotation.totalCost,
        } : null);
      }

      // Save chat message to database
      const supabase = createClient();
      await supabase.from('chat_messages').insert([
        { project_id: project.id, role: 'user', content: message },
        { project_id: project.id, role: 'assistant', content: data.response },
      ]);
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

  const handleSaveChanges = async () => {
    if (!project || !hasUnsavedChanges) return;

    setSaving(true);

    try {
      const supabase = createClient();

      // Create new version
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: project.id, // Will be updated with actual user_id
          name: project.name,
          description: `${project.description} (Modified)`,
          parent_project_id: project.id,
          land_boundary: project.land_boundary,
          land_area_sqm: project.land_area_sqm,
          polyhouse_count: project.polyhouse_count,
          total_coverage_sqm: project.total_coverage_sqm,
          utilization_percentage: project.utilization_percentage,
          estimated_cost: project.estimated_cost,
          configuration: project.configuration,
          polyhouses: project.polyhouses,
          quotation: project.quotation,
          status: 'draft',
          is_latest: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Mark old version as not latest
      await supabase
        .from('projects')
        .update({ is_latest: false })
        .eq('id', project.id);

      alert('Changes saved as new version!');
      setHasUnsavedChanges(false);
      router.push(`/projects/${data.id}`);
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${id}/export`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.name || 'project'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  };

  // Handle DSL quick actions
  const handleShowPricing = () => {
    setShowDSL(true);
    const message = 'Show me the current pricing tier and breakdown';
    handleSendMessage(message);
  };

  const handleShowSettings = () => {
    setShowDSL(true);
    const message = 'Show me the current design settings and configuration';
    handleSendMessage(message);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-agriplast-green-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {project.name}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {project.polyhouse_count} polyhouses • {project.utilization_percentage.toFixed(1)}% utilization • ₹{project.estimated_cost.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quotation Toggle */}
            <button
              onClick={() => setShowQuotation(!showQuotation)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150"
              title={showQuotation ? 'Hide Quotation' : 'Show Quotation'}
            >
              {showQuotation ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>

            {/* Edit Mode Toggle */}
            <button
              onClick={() => setEditMode(!editMode)}
              className={`p-2 rounded-lg transition-colors duration-150 ${
                editMode
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Edit Mode"
            >
              <Edit3 className="w-5 h-5" />
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-150 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>

            {/* Save Changes */}
            {hasUnsavedChanges && (
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="px-3 py-2 text-sm bg-agriplast-green-600 hover:bg-agriplast-green-700 text-white rounded-lg font-medium transition-colors duration-150 flex items-center gap-1 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Changes</span>
              </button>
            )}

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-150"
              title="Delete Project"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Layout (Map + Chat) */}
      <div className="flex-1 overflow-hidden">
        <ChatLayout
          mapContent={
            <div className="relative h-full">
              <MapComponent
                landBoundary={project.land_boundary?.coordinates || []}
                polyhouses={project.polyhouses}
                editMode={editMode}
                onBoundaryChange={(boundary) => {
                  setHasUnsavedChanges(true);
                  // Update project boundary
                }}
                centerOnLoad={true}
              />

              {/* Quotation Overlay */}
              {showQuotation && (
                <div className="absolute top-4 left-4 w-96 max-h-[80vh] overflow-auto">
                  <QuotationPanel quotation={project.quotation} />
                </div>
              )}
            </div>
          }
          chatContent={
            <div className="h-full flex flex-col">
              {/* DSL Quick Actions */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <DSLQuickActions
                  onShowPricing={handleShowPricing}
                  onShowSettings={handleShowSettings}
                  onExplainLayout={() => handleSendMessage('Explain why the polyhouses are placed this way')}
                />
              </div>

              {/* DSL Viewer (if shown) */}
              {showDSL && project.preferences_snapshot && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 max-h-64 overflow-auto">
                  <DSLViewer
                    data={project.preferences_snapshot}
                    title="Project Preferences (DSL)"
                    onAskAI={(prompt) => {
                      setShowDSL(false);
                      handleSendMessage(prompt);
                    }}
                    collapsible={true}
                    defaultCollapsed={false}
                    maxHeight="200px"
                  />
                  <button
                    onClick={() => setShowDSL(false)}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Hide DSL
                  </button>
                </div>
              )}

              {/* Chat Interface */}
              <div className="flex-1 overflow-hidden">
                <EnhancedChatInterface
                  conversationHistory={conversationHistory}
                  onSendMessage={handleSendMessage}
                  planningResult={{
                    success: true,
                    landArea: {
                      id: project.id,
                      name: project.name,
                      coordinates: project.land_boundary?.coordinates || [],
                      centroid: project.land_boundary?.centroid || { lat: 0, lng: 0 },
                      area: project.land_area_sqm,
                      createdAt: new Date(project.created_at),
                    },
                    polyhouses: project.polyhouses,
                    configuration: project.configuration,
                    quotation: project.quotation,
                    warnings: [],
                    errors: [],
                    metadata: {
                      numberOfPolyhouses: project.polyhouse_count,
                      totalPolyhouseArea: project.total_coverage_sqm,
                      totalLandArea: project.land_area_sqm,
                      utilizationPercentage: project.utilization_percentage,
                      computationTime: 0,
                      unbuildableRegions: [],
                      constraintViolations: [],
                    },
                    terrainAnalysis: project.terrain_analysis,
                  }}
                />
              </div>
            </div>
          }
          defaultMapWidth={60}
          showToggle={false}
        />
      </div>
    </div>
  );
}
