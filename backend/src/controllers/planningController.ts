import { Request, Response } from 'express';
import { PolyhouseOptimizerV3 } from '../services/optimizerV3';
import { generateQuotation } from '../services/quotation';
import {
  LandArea,
  PolyhouseConfiguration,
  PlanningResult,
  CreatePlanRequest,
  UpdatePlanRequest,
} from '@shared/types';
import { calculatePolygonArea } from '../utils/geo';
import * as turf from '@turf/turf';
import { supabase } from '../lib/supabase';
import { TerrainAnalysisService } from '../services/terrainAnalysis';
import { RegulatoryComplianceService } from '../services/regulatoryCompliance';
import { reverseGeocode } from '../utils/geocoding';
import { jobQueueService } from '../services/jobQueue';

// In-memory storage (replace with database in production)
const planningResults = new Map<string, PlanningResult>();

// Export for chat controller
export { planningResults };

/**
 * Create a new polyhouse plan
 */
export async function createPlan(req: Request, res: Response) {
  try {
    const { landArea: landAreaInput, configuration: configInput, userId } = req.body as CreatePlanRequest & { userId?: string };

    // Validate input
    if (!landAreaInput || !landAreaInput.coordinates || landAreaInput.coordinates.length < 3) {
      return res.status(400).json({ error: 'Invalid land area. At least 3 coordinates required.' });
    }

    // Ensure polygon is closed (first and last coordinates must be the same)
    let inputCoordinates = [...landAreaInput.coordinates];
    const firstCoord = inputCoordinates[0];
    const lastCoord = inputCoordinates[inputCoordinates.length - 1];

    // If polygon is not closed, add the first coordinate at the end
    if (firstCoord.lat !== lastCoord.lat || firstCoord.lng !== lastCoord.lng) {
      inputCoordinates.push({ ...firstCoord });
    }

    // Convert coordinates to GeoJSON format [lng, lat]
    const coordinates = inputCoordinates.map(c => [c.lng, c.lat]);

    // Calculate centroid and area
    const polygon = turf.polygon([coordinates]);
    const centroid = turf.centroid(polygon);
    const area = turf.area(polygon);

    // Reverse geocode to get location name
    console.log('🌍 Identifying location...');
    const locationInfo = await reverseGeocode(inputCoordinates);

    // Create land area object with closed coordinates and location name
    const landArea: LandArea = {
      id: `land-${Date.now()}`,
      name: locationInfo.formatted || landAreaInput.name,
      coordinates: inputCoordinates,
      centroid: {
        lat: centroid.geometry.coordinates[1],
        lng: centroid.geometry.coordinates[0],
      },
      area,
      createdAt: new Date(),
    };

    // Get latitude for solar calculations
    const latitude = landArea.centroid.lat;

    // Load user settings from Supabase if userId provided
    let userSettings = null;
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          userSettings = data;
          console.log('Loaded user settings from Supabase for user:', userId);
        } else {
          console.log('No user settings found, using defaults');
        }
      } catch (error) {
        console.warn('Could not load user settings:', error);
      }
    }

    // Build configuration with defaults (see CONFIGURATION_GUIDE.md to adjust based on field data)
    const configuration: PolyhouseConfiguration = {
      blockDimensions: {
        width: userSettings?.block_width ?? 8,  // meters - Standard unit size
        height: userSettings?.block_height ?? 4, // meters - Standard unit size
      },
      gutterWidth: userSettings?.gutter_width ?? 2, // meters - Standard drainage gutter
      polyhouseGap: userSettings?.polyhouse_gap ?? 2, // meters - 2m standard corridor between polyhouses
      safetyBuffer: configInput?.safetyBuffer ?? userSettings?.safety_buffer ?? 0.3, // meters - Minimal safety buffer for maximum utilization
      maxSideLength: userSettings?.max_side_length ?? 120, // meters - Industry standard maximum (allows longer polyhouses)
      minSideLength: userSettings?.min_side_length ?? 8, // meters - Single block minimum
      minCornerDistance: userSettings?.min_corner_distance ?? 4, // meters - Default = block width (configurable: 4m to 100m)
      minimumBlocksPerPolyhouse: configInput?.minimumBlocksPerPolyhouse ?? userSettings?.minimum_blocks_per_polyhouse ?? 10, // blocks - Minimum blocks per polyhouse (default: 10)
      maxLandArea: configInput?.maxLandArea ?? userSettings?.max_land_area ?? 10000, // sqm - Single polyhouse size limit (configurable)
      solarOrientation: {
        enabled: configInput?.solarOrientation?.enabled ?? userSettings?.solar_orientation_enabled ?? true, // ENABLED by default - ensures proper sunlight for gutters
        latitudeDegrees: latitude,
        allowedDeviationDegrees: configInput?.solarOrientation?.allowedDeviationDegrees ?? 0, // Calculated dynamically based on latitude (0 = auto-calculate)
      },
      terrain: {
        considerSlope: userSettings?.consider_slope ?? true, // ENABLED by default - analyze terrain slopes
        maxSlope: userSettings?.max_slope ?? 15, // 15 degrees max slope (safer default than 90)
        landLevelingOverride: configInput?.terrain?.landLevelingOverride ?? userSettings?.land_leveling_override ?? false, // User can override to allow building on slopes
        avoidWater: configInput?.terrain?.avoidWater ?? userSettings?.avoid_water ?? true, // ENABLED by default - avoid water bodies
        ignoreRestrictedZones: configInput?.terrain?.ignoreRestrictedZones ?? false,
      },
      optimization: {
        placementStrategy: configInput?.optimization?.placementStrategy ?? userSettings?.placement_strategy ?? 'balanced',
        minimizeCost: configInput?.optimization?.minimizeCost ?? true,
        preferLargerPolyhouses: configInput?.optimization?.preferLargerPolyhouses ?? true,
        orientationStrategy: configInput?.optimization?.orientationStrategy ?? 'optimized',
      },
      ...configInput, // Complete override via API
    };

    // Create job for async processing
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job = jobQueueService.createJob(jobId);

    // Return immediately with job ID
    res.json({
      jobId,
      status: 'processing',
      message: 'Optimization started. Poll /api/planning/status/:jobId for progress.',
      estimatedTime: Math.ceil(landArea.area / 10000) * 15, // Estimate: 15 seconds per hectare
    });

    // Process optimization in background (don't await)
    processOptimizationAsync(jobId, landArea, configuration, userId).catch(error => {
      console.error('Background optimization failed:', error);
      jobQueueService.failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
    });

  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({
      error: 'Failed to create plan',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Background processing function for optimization
 */
async function processOptimizationAsync(
  jobId: string,
  landArea: LandArea,
  configuration: PolyhouseConfiguration,
  userId?: string
) {
  try {
    jobQueueService.updateProgress(jobId, 10);

    // CRITICAL: Perform terrain analysis BEFORE optimization
    // This allows optimizer to avoid water bodies and restricted zones
    console.log('Starting terrain analysis...');
    let terrainData = null;
    let complianceData = null;

    if (configuration.terrain?.avoidWater || configuration.terrain?.considerSlope) {
      try {
        jobQueueService.updateProgress(jobId, 20);
        const terrainService = new TerrainAnalysisService();
        terrainData = await terrainService.analyzeTerrain(landArea.coordinates, {
          resolution: 'medium',
          includeVegetation: true,
          includeWaterBodies: configuration.terrain?.avoidWater ?? true,
          slopeThreshold: configuration.terrain?.maxSlope ?? 15,
        });
        console.log(`✓ Terrain analysis complete: ${terrainData.restrictedAreas?.length || 0} restricted zones found`);
        jobQueueService.updateProgress(jobId, 40);

        // Check if area is buildable
        const buildablePercentage = (terrainData.buildableArea / landArea.area) * 100;
        console.log(`  Buildable area: ${buildablePercentage.toFixed(1)}% (${terrainData.buildableArea.toFixed(0)} sqm)`);

        if (buildablePercentage < 10) {
          throw new Error(`Area is ${buildablePercentage.toFixed(1)}% buildable. Cannot build on water bodies or heavily restricted zones.`);
        }
      } catch (error) {
        console.error('Terrain analysis failed:', error);
        throw error; // Make this BLOCKING - don't build on unknown terrain
      }
    } else {
      console.log('⊘ Terrain analysis skipped (disabled in configuration)');
    }

    // Run optimization with V2 optimizer (proven to work)
    console.log('Starting V2 polyhouse optimization...');
    jobQueueService.updateProgress(jobId, 50);
    const startTime = Date.now();

    const { PolyhouseOptimizerV2 } = await import('../services/optimizerV2');
    const optimizer = new PolyhouseOptimizerV2(landArea, configuration, terrainData);
    const polyhouses = await optimizer.optimize();

    const computationTime = Date.now() - startTime;
    console.log(`Optimization completed in ${computationTime}ms`);
    jobQueueService.updateProgress(jobId, 70);

    // Run regulatory compliance check after optimization
    if (terrainData) {
      try {
        const complianceService = new RegulatoryComplianceService();
        complianceData = await complianceService.checkCompliance(
          landArea.coordinates,
          polyhouses.map(p => {
            // Calculate perimeter from bounds
            const perimeter = p.bounds.reduce((sum, point, i) => {
              const nextPoint = p.bounds[(i + 1) % p.bounds.length];
              const dx = nextPoint.x - point.x;
              const dy = nextPoint.y - point.y;
              return sum + Math.sqrt(dx * dx + dy * dy) * 111320; // Convert to meters approximately
            }, 0);

            return {
              area: p.area,
              perimeter,
              height: 4, // Standard polyhouse height
              purpose: 'Agriculture - Polyhouse'
            };
          })
        );
        console.log(`✓ Regulatory compliance check complete`);
      } catch (error) {
        console.warn('Regulatory compliance check failed (non-blocking):', error);
      }
    }

    // Generate quotation
    jobQueueService.updateProgress(jobId, 85);
    const quotation = await generateQuotation(polyhouses, configuration, landArea.id);

    // Calculate metadata
    jobQueueService.updateProgress(jobId, 95);
    // Use total area (including gutters) for utilization since gutters are required space
    const totalPolyhouseInnerArea = polyhouses.reduce((sum, p) => sum + p.innerArea, 0);
    const totalPolyhouseAreaWithGutters = polyhouses.reduce((sum, p) => sum + p.area, 0);
    const utilizationPercentage = (totalPolyhouseAreaWithGutters / landArea.area) * 100;

    // Debug logging for coverage calculation
    console.log('📊 Coverage calculation:');
    console.log(`  Land area: ${landArea.area.toFixed(2)} sqm`);
    console.log(`  Total polyhouse area (with gutters): ${totalPolyhouseAreaWithGutters.toFixed(2)} sqm`);
    console.log(`  Total polyhouse inner area: ${totalPolyhouseInnerArea.toFixed(2)} sqm`);
    console.log(`  Number of polyhouses: ${polyhouses.length}`);
    console.log(`  Average polyhouse size: ${(totalPolyhouseAreaWithGutters / polyhouses.length).toFixed(2)} sqm`);
    console.log(`  Utilization: ${utilizationPercentage.toFixed(2)}%`);
    if (polyhouses.length > 0) {
      console.log(`  Sample polyhouse #1:`, {
        innerArea: polyhouses[0].innerArea,
        totalArea: polyhouses[0].area,
        blocks: polyhouses[0].blocks.length,
      });
    }

    // Create planning result
    const planningResult: PlanningResult = {
      success: true,
      landArea,
      polyhouses,
      configuration,
      quotation,
      warnings: [],
      errors: [],
      metadata: {
        numberOfPolyhouses: polyhouses.length,
        totalPolyhouseArea: totalPolyhouseInnerArea,
        totalPolyhouseAreaWithGutters,
        totalLandArea: landArea.area,
        utilizationPercentage,
        computationTime,
        unbuildableRegions: [
          // Calculate safety buffer area
          {
            reason: 'Safety buffer from land boundary',
            affectedArea: Math.round(landArea.area * 0.05), // Estimate 5% for safety buffer
            locationSample: landArea.coordinates[0], // First coordinate as sample
          },
          // If utilization is low, add explanation for uncovered area
          ...(utilizationPercentage < 70 ? [{
            reason: 'Irregular polygon shape and spacing constraints',
            affectedArea: Math.round(landArea.area - totalPolyhouseAreaWithGutters - (landArea.area * 0.05)),
            locationSample: undefined,
          }] : []),
        ],
        constraintViolations: [], // Will be populated by optimizer if violations occur
      },
      // Include terrain analysis if available
      terrainAnalysis: terrainData ? ({
        buildableAreaPercentage: (terrainData.buildableArea / landArea.area) * 100,
        restrictedZones: terrainData.restrictedAreas.map(zone => ({
          type: zone.type,
          coordinates: zone.coordinates,
          area: zone.area,
          reason: zone.reason,
          severity: zone.severity,
        })),
        averageSlope: terrainData.averageSlope,
        elevationRange: terrainData.elevationRange,
        warnings: terrainData.warnings,
      }) : undefined,
      // Include regulatory compliance if available
      regulatoryCompliance: complianceData ? {
        compliant: complianceData.compliant,
        region: complianceData.region,
        country: complianceData.country,
        violations: complianceData.violations.map(v => ({
          severity: v.severity,
          category: v.category,
          description: v.description,
          resolution: v.resolution,
        })),
        warnings: complianceData.warnings.map(w => ({
          category: w.category,
          description: w.description,
          recommendation: w.recommendation || 'Review compliance requirements',
        })),
        permitsRequired: complianceData.permits_required.map(p => ({
          permit_type: p.permit_type,
          authority: p.authority,
          estimated_duration_days: p.typical_duration_days,
          estimated_cost: p.estimated_cost,
        })),
        estimatedComplianceCost: complianceData.estimated_compliance_cost,
        estimatedTimelineDays: complianceData.estimated_timeline_days,
      } : undefined,
    };

    // Add warnings if utilization is low
    if (utilizationPercentage < 30) {
      planningResult.warnings.push(
        'Low space utilization. Consider adjusting constraints or land shape for better coverage.'
      );
    }

    // Add terrain-specific warnings if terrain analysis was performed
    if (terrainData && terrainData.restrictedAreas && terrainData.restrictedAreas.length > 0) {
      const waterZones = terrainData.restrictedAreas.filter(z => z.type === 'water' || z.type === 'wetland');
      const forestZones = terrainData.restrictedAreas.filter(z => z.type === 'forest');
      const slopeZones = terrainData.restrictedAreas.filter(z => z.type === 'steep_slope');
      const roadZones = terrainData.restrictedAreas.filter(z => z.type === 'road');

      if (waterZones.length > 0) {
        planningResult.warnings.push(`${waterZones.length} water body zone(s) detected and avoided`);
      }
      if (forestZones.length > 0) {
        planningResult.warnings.push(`${forestZones.length} forest zone(s) detected and avoided`);
      }
      if (slopeZones.length > 0) {
        planningResult.warnings.push(`${slopeZones.length} steep slope zone(s) detected`);
      }
      if (roadZones.length > 0) {
        planningResult.warnings.push(`${roadZones.length} road(s) detected and avoided`);
      }
    }

    if (polyhouses.length === 0) {
      planningResult.errors.push(
        'No polyhouses could be placed. The land area may be too small or constraints too restrictive.'
      );
    }

    // V2 optimizer doesn't support terrain/compliance yet
    // These features will be added in a future iteration

    // Store result
    const resultId = `result-${Date.now()}`;
    planningResults.set(resultId, planningResult);

    // Mark job as completed
    jobQueueService.completeJob(jobId, planningResult);
    console.log(`✓ Optimization job ${jobId} completed successfully`);

  } catch (error) {
    console.error('Background optimization error:', error);
    jobQueueService.failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Get job status (for polling async optimization)
 */
export async function getJobStatus(req: Request, res: Response) {
  try {
    const jobId = req.params.jobId as string;

    const job = jobQueueService.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress || 0,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update an existing plan
 */
export async function updatePlan(req: Request, res: Response) {
  try {
    const { planningResultId, configuration: configUpdate, materialSelections } = req.body as UpdatePlanRequest;

    // Get existing plan
    const existingPlan = planningResults.get(planningResultId);
    if (!existingPlan) {
      return res.status(404).json({ error: 'Planning result not found' });
    }

    // Update configuration
    const updatedConfiguration: PolyhouseConfiguration = {
      ...existingPlan.configuration,
      ...configUpdate,
    };

    // Re-run optimization if configuration changed (using V2)
    const { PolyhouseOptimizerV2 } = await import('../services/optimizerV2');
    const optimizer = new PolyhouseOptimizerV2(existingPlan.landArea, updatedConfiguration);
    const polyhouses = await optimizer.optimize();

    // Generate new quotation
    const quotation = await generateQuotation(
      polyhouses,
      updatedConfiguration,
      existingPlan.landArea.id,
      materialSelections
    );

    // Calculate metadata
    // Use total area (including gutters) for utilization since gutters are required space
    const totalPolyhouseInnerArea = polyhouses.reduce((sum, p) => sum + p.innerArea, 0);
    const totalPolyhouseAreaWithGutters = polyhouses.reduce((sum, p) => sum + p.area, 0);
    const utilizationPercentage = (totalPolyhouseAreaWithGutters / existingPlan.landArea.area) * 100;

    // Create updated planning result
    const updatedPlanningResult: PlanningResult = {
      ...existingPlan,
      polyhouses,
      configuration: updatedConfiguration,
      quotation,
      metadata: {
        ...existingPlan.metadata,
        numberOfPolyhouses: polyhouses.length,
        totalPolyhouseArea: totalPolyhouseInnerArea,
        totalPolyhouseAreaWithGutters,
        utilizationPercentage,
      },
    };

    // Update stored result
    planningResults.set(planningResultId, updatedPlanningResult);

    res.json({
      planningResult: updatedPlanningResult,
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({
      error: 'Failed to update plan',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Load an existing planning result into memory for chat
 * This is used when opening a saved project so users can chat about it
 */
export async function loadPlanIntoMemory(req: Request, res: Response) {
  try {
    const { planningResultId, planningResult } = req.body;

    if (!planningResultId || !planningResult) {
      return res.status(400).json({ error: 'Missing planningResultId or planningResult' });
    }

    // Store the planning result in memory
    planningResults.set(planningResultId, planningResult);

    console.log(`Loaded planning result ${planningResultId} into memory for chat`);

    res.json({
      success: true,
      message: 'Planning result loaded into memory',
    });
  } catch (error) {
    console.error('Error loading planning result:', error);
    res.status(500).json({
      error: 'Failed to load planning result',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
