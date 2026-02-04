/**
 * Planning API handlers - replicate backend logic using dbAdapter and Neon planning_result_cache.
 * Does not modify backend folder.
 */

import * as turf from '@turf/turf';
import type { LandArea, PolyhouseConfiguration, PlanningResult, CreatePlanRequest, UpdatePlanRequest } from '@/lib/shared/types';
import { dbAdapter } from '@/lib/db';
import { PolyhouseOptimizerV2 } from '@/lib/server/services/optimizerV2';
import { generateQuotation } from '@/lib/server/services/quotation';

export async function createPlan(body: CreatePlanRequest & { userId?: string }): Promise<{ status: number; json: object }> {
  try {
    const { landArea: landAreaInput, configuration: configInput, userId } = body;
    if (!landAreaInput?.coordinates || landAreaInput.coordinates.length < 3) {
      return { status: 400, json: { error: 'Invalid land area. At least 3 coordinates required.' } };
    }

    let inputCoordinates = [...landAreaInput.coordinates];
    const firstCoord = inputCoordinates[0];
    const lastCoord = inputCoordinates[inputCoordinates.length - 1];
    if (firstCoord.lat !== lastCoord.lat || firstCoord.lng !== lastCoord.lng) {
      inputCoordinates.push({ ...firstCoord });
    }

    const coordinates = inputCoordinates.map((c) => [c.lng, c.lat] as [number, number]);
    const polygon = turf.polygon([coordinates]);
    const centroid = turf.centroid(polygon);
    const area = turf.area(polygon);

    const landArea: LandArea = {
      id: `land-${Date.now()}`,
      name: landAreaInput.name ?? '',
      coordinates: inputCoordinates,
      centroid: { lat: centroid.geometry.coordinates[1], lng: centroid.geometry.coordinates[0] },
      area,
      createdAt: new Date(),
    };

    const latitude = landArea.centroid.lat;
    let userSettings: Record<string, unknown> | null = null;
    if (userId) {
      try {
        userSettings = await dbAdapter.getUserSettings(userId) as unknown as Record<string, unknown>;
      } catch {
        // use defaults
      }
    }

    const configuration: PolyhouseConfiguration = {
      blockDimensions: {
        width: (userSettings?.block_width as number) ?? 8,
        height: (userSettings?.block_height as number) ?? 4,
      },
      gutterWidth: (userSettings?.gutter_width as number) ?? 2,
      polyhouseGap: (userSettings?.polyhouse_gap as number) ?? 2,
      safetyBuffer: configInput?.safetyBuffer ?? (userSettings?.safety_buffer as number) ?? 0.3,
      maxSideLength: (userSettings?.max_side_length as number) ?? 120,
      minSideLength: (userSettings?.min_side_length as number) ?? 8,
      minCornerDistance: (userSettings?.min_corner_distance as number) ?? 4,
      minimumBlocksPerPolyhouse: configInput?.minimumBlocksPerPolyhouse ?? (userSettings?.minimum_blocks_per_polyhouse as number) ?? 10,
      maxLandArea: configInput?.maxLandArea ?? (userSettings?.max_land_area as number) ?? 10000,
      solarOrientation: {
        enabled: configInput?.solarOrientation?.enabled ?? (userSettings?.solar_orientation_enabled as boolean) ?? true,
        latitudeDegrees: latitude,
        allowedDeviationDegrees: configInput?.solarOrientation?.allowedDeviationDegrees ?? 0,
      },
      terrain: {
        considerSlope: (userSettings?.consider_slope as boolean) ?? false,
        maxSlope: (userSettings?.max_slope as number) ?? 15,
        landLevelingOverride: configInput?.terrain?.landLevelingOverride ?? (userSettings?.land_leveling_override as boolean) ?? false,
        avoidWater: configInput?.terrain?.avoidWater ?? (userSettings?.avoid_water as boolean) ?? true,
        ignoreRestrictedZones: configInput?.terrain?.ignoreRestrictedZones ?? false,
      },
      optimization: {
        placementStrategy: (configInput?.optimization?.placementStrategy ?? (userSettings?.placement_strategy as string) ?? 'balanced') as 'maximize_blocks' | 'maximize_coverage' | 'balanced' | 'equal_area',
        minimizeCost: configInput?.optimization?.minimizeCost ?? true,
        preferLargerPolyhouses: configInput?.optimization?.preferLargerPolyhouses ?? true,
        orientationStrategy: configInput?.optimization?.orientationStrategy ?? 'optimized',
        allowMixedOrientations: configInput?.optimization?.allowMixedOrientations ?? (userSettings?.allow_mixed_orientations as boolean) ?? false,
      },
      ...configInput,
    };

    const startTime = Date.now();
    const optimizer = new PolyhouseOptimizerV2(landArea, configuration, undefined);
    const polyhouses = await optimizer.optimize();
    const computationTime = Date.now() - startTime;

    const quotation = await generateQuotation(polyhouses, configuration, landArea.id);
    const totalPolyhouseInnerArea = polyhouses.reduce((sum, p) => sum + p.innerArea, 0);
    const totalPolyhouseAreaWithGutters = polyhouses.reduce((sum, p) => sum + p.area, 0);
    const utilizationPercentage = (totalPolyhouseAreaWithGutters / landArea.area) * 100;

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
          { reason: 'Safety buffer from land boundary', affectedArea: Math.round(landArea.area * 0.05), locationSample: landArea.coordinates[0] },
          ...(utilizationPercentage < 70 ? [{ reason: 'Irregular polygon shape and spacing constraints', affectedArea: Math.round(landArea.area - totalPolyhouseAreaWithGutters - landArea.area * 0.05), locationSample: undefined }] : []),
        ],
        constraintViolations: [],
      },
      terrainAnalysis: undefined,
      regulatoryCompliance: undefined,
    };

    if (utilizationPercentage < 30) {
      planningResult.warnings.push('Low space utilization. Consider adjusting constraints or land shape for better coverage.');
    }
    if (polyhouses.length === 0) {
      planningResult.errors.push('No polyhouses could be placed. The land area may be too small or constraints too restrictive.');
    }

    const resultId = `result-${Date.now()}`;
    await dbAdapter.setPlanningResult(resultId, planningResult);

    return { status: 200, json: { planningResult, resultId } };
  } catch (error) {
    console.error('Error creating plan:', error);
    return {
      status: 500,
      json: { error: 'Failed to create plan', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

export async function updatePlan(body: UpdatePlanRequest): Promise<{ status: number; json: object }> {
  try {
    const { planningResultId, configuration: configUpdate, materialSelections } = body;
    const existingPlan = (await dbAdapter.getPlanningResult(planningResultId)) as PlanningResult | null;
    if (!existingPlan) {
      return { status: 404, json: { error: 'Planning result not found' } };
    }

    const updatedConfiguration: PolyhouseConfiguration = {
      ...existingPlan.configuration,
      ...configUpdate,
    };

    const { PolyhouseOptimizerV2 } = await import('@/lib/server/services/optimizerV2');
    const optimizer = new PolyhouseOptimizerV2(existingPlan.landArea, updatedConfiguration, undefined);
    const polyhouses = await optimizer.optimize();
    const quotation = await generateQuotation(polyhouses, updatedConfiguration, existingPlan.landArea.id, materialSelections);

    const totalPolyhouseInnerArea = polyhouses.reduce((sum, p) => sum + p.innerArea, 0);
    const totalPolyhouseAreaWithGutters = polyhouses.reduce((sum, p) => sum + p.area, 0);
    const utilizationPercentage = (totalPolyhouseAreaWithGutters / existingPlan.landArea.area) * 100;

    const updatedPlanningResult: PlanningResult = {
      ...existingPlan,
      polyhouses,
      configuration: updatedConfiguration,
      quotation,
      metadata: {
        ...existingPlan.metadata,
        numberOfPolyhouses: polyhouses.length,
        totalPolyhouseArea: totalPolyhouseInnerArea,
        totalPolyhouseAreaWithGutters: totalPolyhouseAreaWithGutters,
        utilizationPercentage,
      },
    };

    await dbAdapter.setPlanningResult(planningResultId, updatedPlanningResult);
    return { status: 200, json: { planningResult: updatedPlanningResult } };
  } catch (error) {
    console.error('Error updating plan:', error);
    return {
      status: 500,
      json: { error: 'Failed to update plan', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

export async function loadPlanIntoMemory(body: { planningResultId?: string; planningResult?: PlanningResult }): Promise<{ status: number; json: object }> {
  try {
    const { planningResultId, planningResult } = body;
    if (!planningResultId || !planningResult) {
      return { status: 400, json: { error: 'Missing planningResultId or planningResult' } };
    }
    await dbAdapter.setPlanningResult(planningResultId, planningResult);
    return { status: 200, json: { success: true, message: 'Planning result loaded into memory for chat' } };
  } catch (error) {
    console.error('Error loading planning result:', error);
    return {
      status: 500,
      json: { error: 'Failed to load planning result', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}
