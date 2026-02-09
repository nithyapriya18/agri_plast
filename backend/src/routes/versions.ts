import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

export const versionsRouter = Router();

/**
 * Get all versions of a project
 */
versionsRouter.get('/:projectId/versions', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Get the current project to find root
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, parent_project_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Root ID is either the parent or this project itself (if it's v1)
    const rootId = project.parent_project_id || projectId;

    // Get all versions (root + all children) with all necessary fields for display
    const { data: versions, error: versionsError } = await supabase
      .from('projects')
      .select('id, version, version_name, created_at, is_latest, land_area_sqm, polyhouse_count, utilization_percentage, estimated_cost, status')
      .or(`id.eq.${rootId},parent_project_id.eq.${rootId}`)
      .order('version', { ascending: false });

    if (versionsError) {
      throw versionsError;
    }

    res.json({ versions: versions || [] });
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

/**
 * Create a new version of a project (on save)
 */
versionsRouter.post('/:projectId/create-version', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { planningResult, quotation, versionName } = req.body;

    // Get current project
    const { data: currentProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !currentProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const rootId = currentProject.parent_project_id || currentProject.id;
    const newVersion = currentProject.version + 1;

    // Mark all versions as not latest
    await supabase
      .from('projects')
      .update({ is_latest: false })
      .or(`id.eq.${rootId},parent_project_id.eq.${rootId}`);

    // Create new version (copy everything except id and timestamps)
    const { data: newVersionProject, error: insertError } = await supabase
      .from('projects')
      .insert({
        user_id: currentProject.user_id,
        name: currentProject.name,
        location_name: currentProject.location_name,
        land_boundary: planningResult?.landArea?.coordinates || currentProject.land_boundary,
        land_area_sqm: planningResult?.landArea?.area || currentProject.land_area_sqm,
        polyhouses: planningResult?.polyhouses || currentProject.polyhouses,
        polyhouse_count: planningResult?.polyhouses?.length || currentProject.polyhouse_count,
        total_coverage_sqm: planningResult?.metadata?.totalPolyhouseAreaWithGutters || currentProject.total_coverage_sqm,
        utilization_percentage: planningResult?.metadata?.utilizationPercentage || currentProject.utilization_percentage,
        estimated_cost: quotation?.totalCost || currentProject.estimated_cost,
        configuration: planningResult?.configuration || currentProject.configuration,
        quotation: quotation || currentProject.quotation,
        terrain_analysis: planningResult?.terrainAnalysis || currentProject.terrain_analysis,
        status: currentProject.status,
        parent_project_id: rootId,
        version: newVersion,
        version_name: versionName || null,
        is_latest: true,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.json({
      project: newVersionProject,
      version: newVersion,
      message: `Saved as Version ${newVersion}`,
    });
  } catch (error) {
    console.error('Error creating version:', error);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

/**
 * Get a specific version
 */
versionsRouter.get('/:projectId/version/:versionNumber', async (req: Request, res: Response) => {
  try {
    const { projectId, versionNumber } = req.params;

    // Get root project
    const { data: project } = await supabase
      .from('projects')
      .select('id, parent_project_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const rootId = project.parent_project_id || projectId;

    // Get specific version
    const { data: versionProject, error } = await supabase
      .from('projects')
      .select('*')
      .or(`id.eq.${rootId},parent_project_id.eq.${rootId}`)
      .eq('version', parseInt(String(versionNumber)))
      .single();

    if (error || !versionProject) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json({ project: versionProject });
  } catch (error) {
    console.error('Error fetching version:', error);
    res.status(500).json({ error: 'Failed to fetch version' });
  }
});
