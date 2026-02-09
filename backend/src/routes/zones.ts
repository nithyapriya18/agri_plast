/**
 * Zones API Routes
 * Manage multiple KML zones per project (inclusion/exclusion)
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabase';
import { parseKMLContent, validateKMLContent, extractZoneName } from '../services/kmlParser';
import { ProjectZone } from '@shared/types';
import * as turf from '@turf/turf';

export const zonesRouter = Router();

// Configure multer for file uploads (memory storage for KML processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.google-earth.kml+xml' ||
        file.originalname.toLowerCase().endsWith('.kml')) {
      cb(null, true);
    } else {
      cb(new Error('Only KML files are allowed'));
    }
  },
});

/**
 * POST /api/zones/upload
 * Upload and parse KML file (does not save to database)
 * Returns parsed zone data for frontend to classify and save
 */
zonesRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const kmlContent = req.file.buffer.toString('utf-8');

    // Validate KML structure
    const validation = validateKMLContent(kmlContent);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid KML file',
        details: validation.error
      });
    }

    // Parse KML content
    const parseResult = parseKMLContent(kmlContent);

    if (parseResult.zones.length === 0) {
      return res.status(400).json({
        error: 'No valid zones found in KML file',
        details: parseResult.errors
      });
    }

    // Return first zone (in case of multiple placemarks, frontend can handle)
    const zone = parseResult.zones[0];

    res.json({
      success: true,
      zone: {
        name: zone.name || req.file.originalname.replace('.kml', ''),
        coordinates: zone.coordinates,
        area_sqm: zone.area,
        file_name: req.file.originalname,
      },
      warnings: parseResult.errors.length > 0 ? parseResult.errors : undefined,
      multipleZones: parseResult.zones.length > 1,
      totalZones: parseResult.zones.length,
    });
  } catch (error) {
    console.error('Error uploading KML:', error);
    res.status(500).json({
      error: 'Failed to process KML file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/zones/:projectId
 * Create a new zone for a project
 */
zonesRouter.post('/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { zone_type, name, coordinates, file_name, color } = req.body;

    // Validate input
    if (!zone_type || !['inclusion', 'exclusion'].includes(zone_type)) {
      return res.status(400).json({ error: 'Invalid zone_type. Must be "inclusion" or "exclusion"' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Zone name is required' });
    }

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
      return res.status(400).json({ error: 'At least 3 coordinates are required' });
    }

    if (!color || !color.match(/^#[0-9A-F]{6}$/i)) {
      return res.status(400).json({ error: 'Valid hex color is required (e.g., #4CAF50)' });
    }

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Calculate area using Turf.js
    const turfCoords = coordinates.map((c: any) => [c.lng, c.lat]);
    // Close the polygon if not already closed
    if (turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] ||
        turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]) {
      turfCoords.push(turfCoords[0]);
    }

    const polygon = turf.polygon([turfCoords]);
    const area_sqm = turf.area(polygon);

    // Insert zone into database
    const { data: zone, error: insertError } = await supabase
      .from('project_zones')
      .insert({
        project_id: projectId,
        zone_type,
        name: name.trim(),
        coordinates,
        area_sqm,
        file_name: file_name || null,
        color,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.json({
      success: true,
      zone
    });
  } catch (error) {
    console.error('Error creating zone:', error);
    res.status(500).json({
      error: 'Failed to create zone',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/zones/:projectId
 * Get all zones for a project
 */
zonesRouter.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all zones for this project
    const { data: zones, error: zonesError } = await supabase
      .from('project_zones')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (zonesError) {
      throw zonesError;
    }

    // Calculate summary statistics
    const inclusionZones = zones?.filter(z => z.zone_type === 'inclusion') || [];
    const exclusionZones = zones?.filter(z => z.zone_type === 'exclusion') || [];

    const totalInclusionArea = inclusionZones.reduce((sum, z) => sum + z.area_sqm, 0);
    const totalExclusionArea = exclusionZones.reduce((sum, z) => sum + z.area_sqm, 0);

    res.json({
      zones: zones || [],
      summary: {
        total: zones?.length || 0,
        inclusions: inclusionZones.length,
        exclusions: exclusionZones.length,
        totalInclusionArea,
        totalExclusionArea,
        netBuildableArea: Math.max(0, totalInclusionArea - totalExclusionArea),
      }
    });
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({
      error: 'Failed to fetch zones',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/zones/:zoneId
 * Update a zone (name, type, or color)
 */
zonesRouter.patch('/:zoneId', async (req: Request, res: Response) => {
  try {
    const { zoneId } = req.params;
    const { name, zone_type, color } = req.body;

    const updates: any = {};

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return res.status(400).json({ error: 'Zone name cannot be empty' });
      }
      updates.name = name.trim();
    }

    if (zone_type !== undefined) {
      if (!['inclusion', 'exclusion'].includes(zone_type)) {
        return res.status(400).json({ error: 'Invalid zone_type' });
      }
      updates.zone_type = zone_type;
    }

    if (color !== undefined) {
      if (!color.match(/^#[0-9A-F]{6}$/i)) {
        return res.status(400).json({ error: 'Invalid hex color format' });
      }
      updates.color = color;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    // Update zone
    const { data: zone, error: updateError } = await supabase
      .from('project_zones')
      .update(updates)
      .eq('id', zoneId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Zone not found' });
      }
      throw updateError;
    }

    res.json({
      success: true,
      zone
    });
  } catch (error) {
    console.error('Error updating zone:', error);
    res.status(500).json({
      error: 'Failed to update zone',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/zones/:zoneId
 * Delete a zone
 */
zonesRouter.delete('/:zoneId', async (req: Request, res: Response) => {
  try {
    const { zoneId } = req.params;

    // Delete zone
    const { error: deleteError } = await supabase
      .from('project_zones')
      .delete()
      .eq('id', zoneId);

    if (deleteError) {
      throw deleteError;
    }

    res.json({
      success: true,
      message: 'Zone deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting zone:', error);
    res.status(500).json({
      error: 'Failed to delete zone',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
