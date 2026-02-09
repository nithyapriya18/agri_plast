import { Request, Response } from 'express';
import { getAIService } from '../services/aiServiceFactory';
import { planningResults } from './planningController';
import { ChatRequest, ConversationMessage } from '@shared/types';
import { PolyhouseOptimizerV3 } from '../services/optimizerV3';
import { generateQuotation } from '../services/quotation';
import { usageTrackingService } from '../services/usageTracking';

/**
 * Handle conversational chat about polyhouse planning
 */
export async function handleChat(req: Request, res: Response) {
  const startTime = Date.now();

  try {
    const { planningResultId, message, conversationHistory, userId, projectId, customerPreferences } = req.body as ChatRequest & { userId?: string; projectId?: string; customerPreferences?: any };

    // Get current planning result
    const currentPlan = planningResults.get(planningResultId);
    if (!currentPlan) {
      return res.status(404).json({ error: 'Planning result not found' });
    }

    // Process conversation with AI service (including customer preferences for context)
    const result = await getAIService().handleConversation(
      message,
      conversationHistory,
      currentPlan,
      customerPreferences
    );

    // Log usage if userId is provided
    if (userId && result.usage) {
      const requestDuration = Date.now() - startTime;
      await usageTrackingService.logUsage({
        userId,
        projectId,
        operationType: 'chat',
        usage: result.usage,
        requestDurationMs: requestDuration,
        success: true,
      });
    }

    // If recalculation is needed, re-optimize
    let updatedPlanningResult = currentPlan;

    if (result.requiresRecalculation && result.updatedConfig) {
      console.log('Recalculating plan based on user request...');

      // Merge configuration changes
      const updatedConfiguration = {
        ...currentPlan.configuration,
        ...result.updatedConfig,
      };

      let polyhouses;

      // Check if user wants to maintain current polyhouse count (not asking for more/maximum coverage)
      const maintainCurrentCount =
        !message.toLowerCase().includes('add') &&
        !message.toLowerCase().includes('more') &&
        !message.toLowerCase().includes('maximum') &&
        !message.toLowerCase().includes('max') &&
        !message.toLowerCase().includes('fill') &&
        currentPlan.polyhouses.length > 0;

      if (maintainCurrentCount) {
        console.log(`User wants to modify existing ${currentPlan.polyhouses.length} polyhouses, not re-optimize`);
        // Keep the current polyhouses - user just wants to modify orientation or other properties
        polyhouses = currentPlan.polyhouses;
      } else {
        console.log('Re-running full optimization');
        // Re-run optimization with V2 (maximum-sized polyhouses)
        const { PolyhouseOptimizerV2 } = await import('../services/optimizerV2');
        const optimizer = new PolyhouseOptimizerV2(currentPlan.landArea, updatedConfiguration);
        polyhouses = await optimizer.optimize();
      }

      // Generate new quotation
      const quotation = await generateQuotation(
        polyhouses,
        updatedConfiguration,
        currentPlan.landArea.id
      );

      // Calculate metadata
      // Use total area (including gutters) for utilization since gutters are required space
      const totalPolyhouseInnerArea = polyhouses.reduce((sum, p) => sum + p.innerArea, 0);
      const totalPolyhouseAreaWithGutters = polyhouses.reduce((sum, p) => sum + p.area, 0);
      const utilizationPercentage = (totalPolyhouseAreaWithGutters / currentPlan.landArea.area) * 100;

      // Update planning result
      updatedPlanningResult = {
        ...currentPlan,
        polyhouses,
        configuration: updatedConfiguration,
        quotation,
        metadata: {
          ...currentPlan.metadata,
          numberOfPolyhouses: polyhouses.length,
          totalPolyhouseArea: totalPolyhouseInnerArea,
          totalPolyhouseAreaWithGutters,
          utilizationPercentage,
        },
      };

      // Store updated result
      planningResults.set(planningResultId, updatedPlanningResult);
    }

    // Clean up response by removing control flags
    const cleanResponse = result.response
      .replace(/\[RECALCULATE:UNIFORM_ORIENTATION[^\]]*\]/g, '')
      .replace('[RECALCULATE:MAXIMIZE]', '')
      .replace('[RECALCULATE:IGNORE_RESTRICTIONS]', '')
      .replace('[RECALCULATE:FILL_GAPS]', '')
      .replace('[RECALCULATE:LARGE_ONLY]', '')
      .replace('[RECALCULATE]', '')
      .trim();

    res.json({
      response: cleanResponse,
      updatedPlanningResult: result.requiresRecalculation ? updatedPlanningResult : undefined,
    });
  } catch (error) {
    console.error('Error handling chat:', error);

    // Log failed request if userId is provided
    const { userId, projectId } = req.body as { userId?: string; projectId?: string };
    if (userId) {
      const requestDuration = Date.now() - startTime;
      await usageTrackingService.logUsage({
        userId,
        projectId,
        operationType: 'chat',
        usage: { inputTokens: 0, outputTokens: 0, modelId: 'unknown' },
        requestDurationMs: requestDuration,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }).catch(err => console.error('Failed to log error usage:', err));
    }

    res.status(500).json({
      error: 'Failed to process chat',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
