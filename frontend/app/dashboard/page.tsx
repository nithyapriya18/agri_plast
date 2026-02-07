'use client';

import { useEffect, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 transition-colors">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Agriplast</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Project Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/usage"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Usage
            </Link>

            <Link
              href="/settings/pricing"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pricing
            </Link>

            <Link
              href="/settings"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>

            <ThemeToggle />

            <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors">{user?.email}</span>

            <button
              onClick={handleLogout}
              className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Start Banner - Conversational First */}
        <div className="bg-gradient-to-r from-agriplast-green-600 via-agriplast-green-700 to-agriplast-green-800 rounded-2xl shadow-xl p-8 mb-8 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Start
              </h2>
              <p className="text-green-50 text-lg mb-4">
                Create a new polyhouse plan in <span className="font-bold text-white">~3 clicks</span> with AI guidance
              </p>
              <div className="flex items-center gap-2 text-green-100 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Conversational interface • Smart defaults • Real-time chat guidance</span>
              </div>
            </div>

            <Link
              href="/projects/new"
              className="group relative bg-white hover:bg-gray-50 text-agriplast-green-700 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all duration-200 flex items-center gap-3 hover:scale-105 active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Start New Project</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Projects Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Your Projects</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors">
              {projects.length} project{projects.length !== 1 ? 's' : ''} • Click any project to view and modify
            </p>
          </div>
        </div>

        {/* Projects Table */}
        {projects.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-16 text-center transition-colors">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-agriplast-green-100 to-agriplast-green-200 dark:from-agriplast-green-900 dark:to-agriplast-green-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-agriplast-green-600 dark:text-agriplast-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 transition-colors">Ready to Start?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2 transition-colors">Create your first polyhouse plan with our conversational AI</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-8 transition-colors">
                ✨ Just 3 clicks • 💬 Chat-guided • ⚡ Smart defaults
              </p>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-agriplast-green-600 to-agriplast-green-700 hover:from-agriplast-green-700 hover:to-agriplast-green-800 text-white px-8 py-4 rounded-xl transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Start Your First Project
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto transition-colors">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900 transition-colors">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[140px]">Project</th>
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
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
      </main>
    </div>
  );
}
