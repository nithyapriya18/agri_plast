'use client';

import { useEffect, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import ProjectFilesModal from '@/components/ProjectFilesModal';

interface Project {
  id: string;
  name: string;
  description: string | null;
  location_name: string | null;
  land_area_sqm: number;
  polyhouse_count: number;
  total_coverage_sqm: number;
  utilization_percentage: number;
  estimated_cost: number;
  status: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  created_at: string;
  updated_at: string;
  version_name?: string | null;
  version?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [projectVersions, setProjectVersions] = useState<Record<string, Project[]>>({});
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ projectId: string; field: string } | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [filesModalOpen, setFilesModalOpen] = useState(false);
  const [selectedProjectForFiles, setSelectedProjectForFiles] = useState<Project | null>(null);

  useEffect(() => {
    loadUserAndProjects();
  }, []);

  const loadUserAndProjects = async () => {
    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Load projects (only latest versions)
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_latest', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Projects already include version_name from the database
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('projects').delete().eq('id', projectId);

      if (error) throw error;

      // Reload projects
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  };

  const toggleSelectAll = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map(p => p.id)));
    }
  };

  const toggleSelectProject = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedProjects.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedProjects.size} project(s)?`)) return;

    try {
      const supabase = createClient();
      const deletePromises = Array.from(selectedProjects).map(id =>
        supabase.from('projects').delete().eq('id', id)
      );

      await Promise.all(deletePromises);

      // Reload projects
      setProjects(projects.filter((p) => !selectedProjects.has(p.id)));
      setSelectedProjects(new Set());
    } catch (error) {
      console.error('Error deleting projects:', error);
      alert('Failed to delete some projects');
    }
  };

  const handleStartEdit = (projectId: string, field: string, currentValue: any) => {
    setEditingField({ projectId, field });
    setEditValues({ ...editValues, [`${projectId}-${field}`]: currentValue || '' });
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValues({});
  };

  const handleSaveEdit = async (projectId: string, field: string) => {
    try {
      const supabase = createClient();
      const value = editValues[`${projectId}-${field}`];

      const { error } = await supabase
        .from('projects')
        .update({ [field]: value })
        .eq('id', projectId);

      if (error) throw error;

      // Update local state
      setProjects(projects.map(p =>
        p.id === projectId ? { ...p, [field]: value } : p
      ));

      setEditingField(null);
      setEditValues({});
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project');
    }
  };

  const handleBulkExport = async () => {
    if (selectedProjects.size === 0) return;

    try {
      const exportPromises = Array.from(selectedProjects).map(id => handleExportProject(id));
      await Promise.all(exportPromises);
      alert(`Successfully exported ${selectedProjects.size} project(s)`);
    } catch (error) {
      console.error('Error exporting projects:', error);
      alert('Failed to export some projects');
    }
  };

  const toggleProjectVersions = async (projectId: string) => {
    const newExpanded = new Set(expandedProjects);

    if (expandedProjects.has(projectId)) {
      // Collapse
      newExpanded.delete(projectId);
      setExpandedProjects(newExpanded);
    } else {
      // Expand and load versions
      newExpanded.add(projectId);
      setExpandedProjects(newExpanded);

      // Load versions from backend if not already loaded
      if (!projectVersions[projectId]) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/versions`
          );

          if (response.ok) {
            const data = await response.json();
            setProjectVersions(prev => ({
              ...prev,
              [projectId]: data.versions || [],
            }));
          }
        } catch (error) {
          console.error('Error loading versions:', error);
        }
      }
    }
  };

  const handleExportProject = async (projectId: string) => {
    try {
      const supabase = createClient();

      // Fetch full project data including polyhouses
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      if (!project) throw new Error('Project not found');

      // Validate required data
      if (!project.land_boundary || !project.polyhouses || project.polyhouses.length === 0) {
        alert('Project data is incomplete. Cannot generate technical drawing.');
        return;
      }

      // Generate both technical drawing and quotation PDFs
      const { generateProjectReports } = await import('@/lib/technicalDrawing');

      await generateProjectReports({
        projectName: project.name,
        customerName: project.contact_name || project.customer_company_name || 'Valued Customer',
        locationName: project.location_name || 'Not specified',
        landBoundary: project.land_boundary,
        landAreaSqm: project.land_area_sqm,
        polyhouses: project.polyhouses,
        polyhouseCount: project.polyhouse_count,
        totalCoverageSqm: project.total_coverage_sqm,
        utilizationPercentage: project.utilization_percentage,
        quotation: project.quotation || {},
        createdAt: project.created_at,
      });

      // Update project status to 'quoted' after successful export
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: 'quoted' })
        .eq('id', projectId);

      if (updateError) {
        console.warn('Failed to update project status:', updateError);
      } else {
        // Refresh projects list to show updated status
        loadProjects();
      }

      alert('Successfully generated 2 files:\n1. Technical Drawing\n2. Quotation Report');
    } catch (error) {
      console.error('Error exporting project:', error);
      alert(`Failed to export PDFs: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 transition-colors">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bulk Actions Bar - shown when items are selected */}
        {selectedProjects.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-4 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {selectedProjects.size} project{selectedProjects.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <button
                onClick={() => setSelectedProjects(new Set())}
                className="text-sm text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkExport}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Projects Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Your Projects</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors">
              {projects.length} project{projects.length !== 1 ? 's' : ''} • Click any project to view and modify
            </p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-agriplast-green-600 to-agriplast-green-700 hover:from-agriplast-green-700 hover:to-agriplast-green-800 text-white px-6 py-3 rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Link>
        </div>

        {/* Projects Table */}
        {projects.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-16 text-center transition-colors">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-agriplast-green-100 to-agriplast-green-200 dark:from-agriplast-green-900 dark:to-agriplast-green-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-agriplast-green-600 dark:text-agriplast-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 transition-colors">No Projects Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 transition-colors">Create your first polyhouse plan with AI-powered optimization</p>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-agriplast-green-600 to-agriplast-green-700 hover:from-agriplast-green-700 hover:to-agriplast-green-800 text-white px-8 py-4 rounded-xl transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Project
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto transition-colors">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900 transition-colors">
                <tr>
                  <th className="px-6 py-3 text-left w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedProjects.size === projects.length && projects.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-green-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:focus:ring-green-400 focus:ring-2 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[140px]">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[130px]">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[110px]">Land Area</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[90px]">Polyhouses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[95px]">Utilization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[120px]">Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[90px]">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[180px]">Version Notes</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[160px]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
                {projects.map((project) => (
                  <Fragment key={project.id}>
                    <tr className={`transition-colors ${selectedProjects.has(project.id) ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                      <td className="px-6 py-4 w-[50px]">
                        <input
                          type="checkbox"
                          checked={selectedProjects.has(project.id)}
                          onChange={() => toggleSelectProject(project.id)}
                          className="w-4 h-4 text-green-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:focus:ring-green-400 focus:ring-2 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 w-[140px]">
                        <div className="flex items-center gap-2">
                          {/* Only show expand button if there are multiple versions */}
                          {(project.version || 1) > 1 ? (
                            <button
                              onClick={() => toggleProjectVersions(project.id)}
                              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                              <svg
                                className={`w-5 h-5 transition-transform ${expandedProjects.has(project.id) ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          ) : (
                            <div className="w-5" /> /* Spacer to maintain alignment */
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900 dark:text-white transition-colors">{project.name}</div>
                              {(project.version || 1) > 1 && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full transition-colors">
                                  v{project.version || 1}
                                </span>
                              )}
                            </div>
                            {project.location_name && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{project.location_name}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Customer Column - Editable */}
                      <td className="px-6 py-4 text-sm w-[130px]">
                        {editingField?.projectId === project.id && editingField?.field === 'customer_name' ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={editValues[`${project.id}-customer_name`] || ''}
                              onChange={(e) => setEditValues({ ...editValues, [`${project.id}-customer_name`]: e.target.value })}
                              placeholder="Customer name"
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSaveEdit(project.id, 'customer_name')}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEdit(project.id, 'customer_name', project.customer_name)}
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 py-1 transition-colors group"
                            title="Click to edit customer name"
                          >
                            {project.customer_name ? (
                              <div>
                                <div className="text-gray-900 dark:text-gray-100 font-medium">{project.customer_name}</div>
                                {project.customer_email && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{project.customer_email}</div>
                                )}
                              </div>
                            ) : (
                              <div className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 italic text-xs">
                                + Add customer
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 transition-colors w-[110px]">
                      {project.land_area_sqm.toFixed(0)} m²
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 transition-colors w-[90px]">
                      {project.polyhouse_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 transition-colors w-[95px]">
                      {project.utilization_percentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 transition-colors w-[120px]">
                      ₹{project.estimated_cost.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap w-[90px]">
                      {getStatusBadge(project.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 transition-colors w-[180px]">
                      <div className="break-words">
                        {project.version_name || <span className="text-gray-400 dark:text-gray-500 italic">Initial version</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-[160px]">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 mr-4 transition-colors"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedProjectForFiles(project);
                          setFilesModalOpen(true);
                        }}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mr-4 transition-colors"
                      >
                        Files
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mr-4 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleExportProject(project.id)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        Export
                      </button>
                    </td>
                  </tr>

                  {/* Version Rows - shown when expanded */}
                  {expandedProjects.has(project.id) && projectVersions[project.id] && (
                    projectVersions[project.id]
                      .filter((version: any) => version.id !== project.id) // Don't show current version in expanded list
                      .map((version: any) => (
                      <tr
                        key={version.id}
                        className="bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-l-4 border-blue-400 dark:border-blue-600"
                      >
                        <td className="px-6 py-3 w-[50px]"></td>
                        <td className="px-6 py-3 min-w-[150px] pl-16">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-medium transition-colors">
                              v{version.version}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 transition-colors">
                              {new Date(version.created_at).toLocaleDateString()}
                            </span>
                            {version.version_name && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">• {version.version_name}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400 transition-colors min-w-[120px]">
                          {version.land_area_sqm?.toFixed(0) || 'N/A'} m²
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400 transition-colors min-w-[100px]">
                          {version.polyhouse_count || 0}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400 transition-colors min-w-[100px]">
                          {version.utilization_percentage?.toFixed(1) || '0.0'}%
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400 transition-colors min-w-[130px]">
                          ₹{version.estimated_cost?.toLocaleString('en-IN') || '0'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap min-w-[100px]">
                          <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors">
                            {version.status || 'draft'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400 transition-colors min-w-[200px]">
                          <span className="italic">Previous version</span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right text-xs font-medium min-w-[200px]">
                          <Link
                            href={`/projects/${version.id}`}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Project Files Modal */}
      {selectedProjectForFiles && (
        <ProjectFilesModal
          isOpen={filesModalOpen}
          onClose={() => {
            setFilesModalOpen(false);
            setSelectedProjectForFiles(null);
          }}
          projectId={selectedProjectForFiles.id}
          projectName={selectedProjectForFiles.name}
        />
      )}
    </div>
  );
}
