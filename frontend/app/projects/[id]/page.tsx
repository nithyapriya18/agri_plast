'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PlanningResult, Polyhouse, ConversationMessage, ProjectZone } from '@shared/types';
import ChatLayout from '@/components/ChatLayout';
import QuotationModal from '@/components/QuotationModal';
import ZoneManagerModal from '@/components/ZoneManagerModal';
import EnhancedChatInterface from '@/components/EnhancedChatInterface';
import DSLViewer, { DSLQuickActions } from '@/components/DSLViewer';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Download, Save, Edit3, Trash2, X, Map } from 'lucide-react';

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
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  created_at: string;
  updated_at: string;
  parent_project_id?: string | null;
  version?: number;
  version_name?: string | null;
  is_latest?: boolean;
}

export default function ProjectDetailPageSimplified({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showZoneManager, setShowZoneManager] = useState(false);
  const [zones, setZones] = useState<ProjectZone[]>([]);
  const [nextZoneType, setNextZoneType] = useState<'inclusion' | 'exclusion'>('inclusion');
  const [showDSL, setShowDSL] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Auto-disable edit mode when polyhouses are loaded
  useEffect(() => {
    if (project?.polyhouses && project.polyhouses.length > 0) {
      setEditMode(false);
    }
  }, [project?.polyhouses]);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitNote, setCommitNote] = useState('');
  const [isEditingProjectInfo, setIsEditingProjectInfo] = useState(false);
  const [editedProjectName, setEditedProjectName] = useState('');
  const [editedProjectDescription, setEditedProjectDescription] = useState('');

  // Chat state
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [planningResultId, setPlanningResultId] = useState<string | null>(null);
  const [isChatThinking, setIsChatThinking] = useState(false);

  // Modification state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProject();
  }, [id]);

  // Auto-load chat messages on mount (only when project ID changes, not when project data changes)
  useEffect(() => {
    if (project?.id) {
      loadChatMessages();
    }
  }, [project?.id]);

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

      // Load project zones
      const { data: zonesData } = await supabase
        .from('project_zones')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: true });

      if (zonesData) {
        setZones(zonesData);
      }

      // Load planning result into backend memory for chat functionality
      await loadPlanningResultIntoMemory(data);
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Failed to load project');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadPlanningResultIntoMemory = async (projectData: any) => {
    try {
      // Default configuration with all required properties
      const defaultConfiguration = {
        blockDimensions: {
          width: 8,
          height: 4,
        },
        polyhouseGap: 3,
        safetyBuffer: 1,
        maxSideLength: 100,
        minSideLength: 16,
        minCornerDistance: 20,
        minimumBlocksPerPolyhouse: 10,
        maxLandArea: 1000,
        solarOrientation: {
          enabled: true,
          latitudeDegrees: projectData.land_boundary?.coordinates?.[0]?.lat || 0,
          allowedDeviationDegrees: 15,
        },
        terrain: {
          considerSlope: true,
          maxSlope: 5,
          landLevelingOverride: false,
          avoidWater: true,
          ignoreRestrictedZones: false,
        },
        optimization: {
          placementStrategy: 'balanced' as const,
          minimizeCost: true,
          preferLargerPolyhouses: true,
          orientationStrategy: 'optimized' as const,
        },
      };

      // Merge with saved configuration, ensuring optimization property exists
      const configuration = {
        ...defaultConfiguration,
        ...projectData.configuration,
        optimization: {
          ...defaultConfiguration.optimization,
          ...(projectData.configuration?.optimization || {}),
        },
        solarOrientation: {
          ...defaultConfiguration.solarOrientation,
          ...(projectData.configuration?.solarOrientation || {}),
        },
        terrain: {
          ...defaultConfiguration.terrain,
          ...(projectData.configuration?.terrain || {}),
        },
      };

      // Reconstruct planning result from project data
      const planningResult = {
        success: true,
        landArea: {
          id: projectData.id,
          name: projectData.name,
          coordinates: projectData.land_boundary?.coordinates || [],
          centroid: projectData.land_boundary?.coordinates?.[0] || { lat: 0, lng: 0 },
          area: projectData.land_area_sqm,
          createdAt: new Date(projectData.created_at),
        },
        polyhouses: projectData.polyhouses || [],
        configuration,
        quotation: projectData.quotation || {
          id: projectData.id,
          landAreaId: projectData.id,
          polyhouses: projectData.polyhouses || [],
          configuration,
          items: [],
          totalCost: projectData.estimated_cost,
          totalArea: projectData.total_coverage_sqm,
          createdAt: new Date(projectData.created_at),
        },
        warnings: [],
        errors: [],
        metadata: {
          numberOfPolyhouses: projectData.polyhouse_count,
          totalPolyhouseArea: projectData.total_coverage_sqm,
          totalLandArea: projectData.land_area_sqm,
          utilizationPercentage: projectData.utilization_percentage,
          computationTime: 0,
          unbuildableRegions: [],
          constraintViolations: [],
        },
        terrainAnalysis: projectData.terrain_analysis,
        regulatoryCompliance: (projectData as any).regulatory_compliance,
      };

      // Send to backend to load into memory
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/planning/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planningResultId: projectData.id,
          planningResult,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to load planning result into backend memory:', errorData);
        throw new Error('Could not load project for chat. Please try refreshing the page.');
      } else {
        console.log('✓ Planning result loaded into backend memory successfully');
      }
    } catch (error) {
      console.error('Error loading planning result into memory:', error);
      // Show error to user since chat won't work without this
      alert('Warning: Could not initialize chat functionality. Please refresh the page to enable chat.');
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
          content: `Welcome back to **${project?.name}**!\n\n**Current Status:**\n- ${project?.polyhouse_count} polyhouses\n- ${project?.utilization_percentage.toFixed(1)}% utilization\n- **Estimated Cost: ₹${project?.estimated_cost.toLocaleString('en-IN')}** [View Quotation](#quotation)\n\nI can help you:\n- Maximize coverage or adjust spacing\n- Modify materials or configuration\n- Export documents\n- Create a new version with changes\n\nWhat would you like to do?`,
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

    // Check if user wants to change zone type for next upload
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('next zone') && lowerMessage.includes('exclusion')) {
      setNextZoneType('exclusion');
      const confirmMessage: ConversationMessage = {
        role: 'assistant',
        content: '🔴 Got it! The next KML file(s) you upload will be marked as **exclusion zones** (red, non-buildable areas).\n\nJust drag & drop or click the paperclip to upload.',
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, confirmMessage]);
      return;
    } else if (lowerMessage.includes('next zone') && lowerMessage.includes('inclusion')) {
      setNextZoneType('inclusion');
      const confirmMessage: ConversationMessage = {
        role: 'assistant',
        content: '🟢 Got it! The next KML file(s) you upload will be marked as **inclusion zones** (colored, buildable areas).\n\nJust drag & drop or click the paperclip to upload.',
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, confirmMessage]);
      return;
    }

    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setConversationHistory(prev => [...prev, userMessage]);
    setIsChatThinking(true);

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
        console.error('Chat API error:', {
          status: response.status,
          error: data.error,
          message: data.message,
          fullResponse: data
        });
        // Show detailed error message to help debug
        const errorMsg = data.message ? `${data.error}: ${data.message}` : (data.error || 'Failed to process chat');
        throw new Error(errorMsg);
      }

      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setConversationHistory(prev => [...prev, assistantMessage]);

      // If layout was updated, mark as unsaved and generate commit note
      if (data.updatedPlanningResult) {
        setHasUnsavedChanges(true);

        // Generate auto-filled commit note based on changes
        const oldCount = project.polyhouse_count;
        const newCount = data.updatedPlanningResult.polyhouses.length;
        const oldUtil = project.utilization_percentage;
        const newUtil = data.updatedPlanningResult.metadata.utilizationPercentage;

        let autoNote = 'Modified polyhouse layout via chat';
        if (newCount !== oldCount) {
          autoNote = `Changed polyhouse count from ${oldCount} to ${newCount}`;
        } else if (Math.abs(newUtil - oldUtil) > 1) {
          autoNote = `Adjusted layout - utilization changed from ${oldUtil.toFixed(1)}% to ${newUtil.toFixed(1)}%`;
        }
        setCommitNote(autoNote);

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

        // Automatically show quotation modal when quotation is updated
        setShowQuotationModal(true);
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
    } finally {
      setIsChatThinking(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!project) return;

    try {
      const supabase = createClient();

      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if it's a KML file
      const isKML = file.name.toLowerCase().endsWith('.kml');

      if (isKML) {
        // Handle KML file as a zone
        const formData = new FormData();
        formData.append('file', file);

        // Upload and parse KML
        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/zones/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload KML');
        }

        const uploadData = await uploadResponse.json();

        // Determine color based on zone type and count
        let zoneColor: string;
        if (nextZoneType === 'exclusion') {
          zoneColor = '#F44336'; // Red for exclusion
        } else {
          // Different colors for each inclusion zone
          const inclusionColors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#FFEB3B'];
          const currentInclusionCount = zones.filter(z => z.zone_type === 'inclusion').length;
          zoneColor = inclusionColors[currentInclusionCount % inclusionColors.length];
        }

        // Create zone with determined type and color
        const createResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/zones/${project.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            zone_type: nextZoneType,
            name: uploadData.zone.name,
            coordinates: uploadData.zone.coordinates,
            file_name: uploadData.zone.file_name,
            color: zoneColor,
          }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create zone');
        }

        // Reload zones
        const { data: zonesData } = await supabase
          .from('project_zones')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: true });

        if (zonesData) {
          setZones(zonesData);
        }

        // Reset to inclusion for next upload
        const wasExclusion = nextZoneType === 'exclusion';
        setNextZoneType('inclusion');

        // Add success message to chat
        const isInclusion = !wasExclusion;
        const successMessage: ConversationMessage = {
          role: 'assistant',
          content: `✅ KML file **${file.name}** uploaded successfully as ${isInclusion ? 'an **inclusion zone**' : 'an **exclusion zone**'}!\n\n📍 Area: ${uploadData.zone.area_sqm.toFixed(0)} m² (${(uploadData.zone.area_sqm / 10000).toFixed(2)} ha)\n${isInclusion ? '🟢' : '🔴'} **Color**: ${isInclusion ? 'Visible on map' : 'Red (non-buildable area)'}\n\nYou can:\n- View it on the map with its unique color\n- ${isInclusion ? 'Change it to an exclusion zone' : 'Change it to an inclusion zone'} via the **Zones** button\n- Upload more zones (tell me "next zone is exclusion" to upload exclusion zones)\n- Re-optimize the layout when ready\n\nWould you like to upload more zones or re-optimize now?`,
          timestamp: new Date(),
        };
        setConversationHistory(prev => [...prev, successMessage]);

        // Save message to database
        await supabase.from('chat_messages').insert([
          { project_id: project.id, role: 'assistant', content: successMessage.content },
        ]);
      } else {
        // Handle non-KML files as generic project files
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${project.id}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(fileName);

        // Save file metadata to database
        const { error: dbError } = await supabase.from('project_files').insert({
          project_id: project.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: publicUrl,
          storage_path: fileName,
          uploaded_by: user.id,
        });

        if (dbError) throw dbError;

        // Add success message to chat
        const successMessage: ConversationMessage = {
          role: 'assistant',
          content: `✅ File **${file.name}** uploaded successfully! You can view and manage all project files from the dashboard.`,
          timestamp: new Date(),
        };
        setConversationHistory(prev => [...prev, successMessage]);

        // Save message to database
        await supabase.from('chat_messages').insert([
          { project_id: project.id, role: 'assistant', content: successMessage.content },
        ]);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage: ConversationMessage = {
        role: 'assistant',
        content: `❌ Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, errorMessage]);
    }
  };

  const handleSaveChanges = () => {
    if (!project || !hasUnsavedChanges) return;
    setShowCommitModal(true);
  };

  const handleConfirmSave = async () => {
    if (!project || !commitNote.trim()) return;

    setSaving(true);
    setShowCommitModal(false);

    try {
      const supabase = createClient();

      // Get actual authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Calculate version info
      const rootId = project.parent_project_id || project.id;
      const newVersion = (project.version || 1) + 1;

      // Mark all versions in this project chain as not latest
      await supabase
        .from('projects')
        .update({ is_latest: false })
        .or(`id.eq.${rootId},parent_project_id.eq.${rootId}`);

      // Create new version
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: project.name,
          description: commitNote.trim(),
          parent_project_id: rootId,
          version: newVersion,
          version_name: commitNote.trim(),
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
          terrain_analysis: project.terrain_analysis,
          customer_name: project.customer_name,
          customer_email: project.customer_email,
          customer_phone: project.customer_phone,
          customer_address: project.customer_address,
        })
        .select()
        .single();

      if (error) throw error;

      setHasUnsavedChanges(false);

      // Redirect to the new version's URL
      router.push(`/projects/${data.id}`);

      // Ask for customer info in chat if not provided
      if (!data.customer_name || !data.customer_email) {
        const assistantMessage: ConversationMessage = {
          role: 'assistant',
          content: '✅ Version saved successfully!\n\nWould you like to add customer information for this project?\n\nI can help you set:\n- Customer name\n- Email address\n- Phone number\n- Site address\n\nJust let me know the details, or you can skip this for now.',
          timestamp: new Date(),
        };
        setConversationHistory(prev => [...prev, assistantMessage]);

        // Save this message to database
        await supabase.from('chat_messages').insert({
          project_id: data.id,
          role: 'assistant',
          content: assistantMessage.content,
        });
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (type: 'quotation' | 'cad' | 'both') => {
    if (!project) {
      console.error('Project data not available');
      return;
    }

    try {
      // Create planning result from project data
      const planningResult = project as any;

      if (type === 'both') {
        // Generate both PDFs
        const { generateProjectReports } = await import('@/lib/technicalDrawing');
        await generateProjectReports({
          projectName: project.name,
          customerName: project.customer_name || 'Valued Customer',
          locationName: project.location_name || 'Unknown Location',
          landBoundary: project.land_boundary,
          landAreaSqm: project.land_area_sqm,
          polyhouseCount: project.polyhouse_count,
          totalCoverageSqm: project.total_coverage_sqm,
          utilizationPercentage: project.utilization_percentage,
          polyhouses: planningResult.polyhouses || [],
          quotation: planningResult.quotation || {},
          createdAt: project.created_at,
        });
      } else if (type === 'cad') {
        // Generate only technical drawing
        const { generateTechnicalDrawing } = await import('@/lib/technicalDrawing');
        const blob = await generateTechnicalDrawing({
          projectName: project.name,
          customerName: project.customer_name || 'Valued Customer',
          locationName: project.location_name || 'Unknown Location',
          landBoundary: project.land_boundary,
          landAreaSqm: project.land_area_sqm,
          polyhouseCount: project.polyhouse_count,
          totalCoverageSqm: project.total_coverage_sqm,
          utilizationPercentage: project.utilization_percentage,
          polyhouses: planningResult.polyhouses || [],
          createdAt: project.created_at,
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/\s+/g, '_')}_Technical_Drawing.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (type === 'quotation') {
        // Generate only quotation
        const { generateProjectPDF } = await import('@/lib/pdfExport');
        await generateProjectPDF({
          projectName: project.name,
          customerName: project.customer_name ?? undefined,
          customerEmail: project.customer_email ?? undefined,
          locationName: project.location_name || 'Unknown Location',
          landAreaSqm: project.land_area_sqm,
          polyhouseCount: project.polyhouse_count,
          totalCoverageSqm: project.total_coverage_sqm,
          utilizationPercentage: project.utilization_percentage,
          estimatedCost: project.estimated_cost,
          polyhouses: planningResult.polyhouses || [],
          quotation: planningResult.quotation || {},
          createdAt: project.created_at,
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
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

  const handleStartEditingProjectInfo = () => {
    if (!project) return;
    setEditedProjectName(project.name);
    setEditedProjectDescription(project.description || '');
    setIsEditingProjectInfo(true);
  };

  const handleCancelEditingProjectInfo = () => {
    setIsEditingProjectInfo(false);
    setEditedProjectName('');
    setEditedProjectDescription('');
  };

  const handleSaveProjectInfo = async () => {
    if (!project || !editedProjectName.trim()) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('projects')
        .update({
          name: editedProjectName.trim(),
          description: editedProjectDescription.trim() || null,
        })
        .eq('id', project.id);

      if (error) throw error;

      // Update local state
      setProject(prev => prev ? {
        ...prev,
        name: editedProjectName.trim(),
        description: editedProjectDescription.trim() || null,
      } : null);

      setIsEditingProjectInfo(false);
    } catch (error) {
      console.error('Error updating project info:', error);
      alert('Failed to update project information');
    }
  };

  // Handle zone updates
  const handleZonesUpdated = (updatedZones: ProjectZone[]) => {
    setZones(updatedZones);
    // Trigger re-optimization if zones changed significantly
    if (updatedZones.length > 0) {
      const message = 'Zones have been updated. Please re-optimize the layout with the new zones.';
      handleSendMessage(message);
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-agriplast-green-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {isEditingProjectInfo ? (
              <div className="space-y-2 pr-4">
                <input
                  type="text"
                  value={editedProjectName}
                  onChange={(e) => setEditedProjectName(e.target.value)}
                  className="w-full px-2 py-1 text-lg font-bold border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-agriplast-green-500"
                  placeholder="Project name"
                  autoFocus
                />
                <input
                  type="text"
                  value={editedProjectDescription}
                  onChange={(e) => setEditedProjectDescription(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-agriplast-green-500"
                  placeholder="Description (optional)"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProjectInfo}
                    className="px-3 py-1 text-xs bg-agriplast-green-600 hover:bg-agriplast-green-700 text-white rounded font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditingProjectInfo}
                    className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {project.name}
                  </h1>
                  {project.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {project.polyhouse_count} polyhouses • {project.utilization_percentage.toFixed(1)}% utilization • ₹{project.estimated_cost.toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  onClick={handleStartEditingProjectInfo}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Edit project name and description"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Close Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150"
              title="Close and return to dashboard"
            >
              <X className="w-5 h-5" />
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

            {/* Manage Zones */}
            <button
              onClick={() => setShowZoneManager(true)}
              className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors duration-150 flex items-center gap-1"
              title="Manage project zones (inclusion/exclusion)"
            >
              <Map className="w-4 h-4" />
              <span>Zones</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-150 flex items-center gap-1">
                <Download className="w-4 h-4" />
                <span>Export ▾</span>
              </button>
              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <button
                  onClick={() => handleExport('cad')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors rounded-t-md"
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
            <div id="project-map-container" className="relative h-full">
              <MapComponent
                landBoundary={project.land_boundary?.coordinates || []}
                polyhouses={project.polyhouses}
                zones={zones}
                editMode={editMode}
                loading={false}
                onBoundaryComplete={(boundary) => {
                  setHasUnsavedChanges(true);
                  // Update project boundary
                }}
              />
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
                  isThinking={isChatThinking}
                  onFileUpload={handleFileUpload}
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
                  onLinkClick={(href) => {
                    if (href === '#quotation') {
                      setShowQuotationModal(true);
                    }
                  }}
                />
              </div>
            </div>
          }
          defaultMapWidth={60}
          showToggle={false}
        />
      </div>

      {/* Quotation Modal */}
      {project && (
        <QuotationModal
          isOpen={showQuotationModal}
          onClose={() => setShowQuotationModal(false)}
          planningResult={{
            success: true,
            landArea: {
              id: project.id,
              name: project.name,
              coordinates: project.land_boundary?.coordinates || [],
              centroid: project.land_boundary?.coordinates?.[0] || { lat: 0, lng: 0 },
              area: project.land_area_sqm,
              createdAt: new Date(project.created_at),
            },
            polyhouses: project.polyhouses || [],
            configuration: (project as any).configuration || {},
            quotation: (project as any).quotation || {
              id: project.id,
              landAreaId: project.id,
              polyhouses: project.polyhouses || [],
              configuration: (project as any).configuration || {},
              items: [],
              totalCost: project.estimated_cost,
              totalArea: project.total_coverage_sqm,
              createdAt: new Date(project.created_at),
            },
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
            regulatoryCompliance: (project as any).regulatory_compliance,
          }}
        />
      )}

      {/* Commit Note Modal */}
      {showCommitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Save Version
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Add a note to describe the changes made in this version
            </p>
            <textarea
              value={commitNote}
              onChange={(e) => setCommitNote(e.target.value)}
              placeholder="e.g., Increased polyhouse count to maximize coverage"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-agriplast-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              rows={3}
              autoFocus
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setShowCommitModal(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={!commitNote.trim() || saving}
                className="px-4 py-2 text-sm bg-agriplast-green-600 hover:bg-agriplast-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Version</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone Manager Modal */}
      {project && (
        <ZoneManagerModal
          projectId={project.id}
          isOpen={showZoneManager}
          onClose={() => setShowZoneManager(false)}
          onZonesUpdated={handleZonesUpdated}
        />
      )}
    </div>
  );
}
