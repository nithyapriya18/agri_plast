import { NextRequest, NextResponse } from 'next/server';
import { BedrockService } from '@/lib/server/services/bedrock';
import { dbAdapter } from '@/lib/db';
import { logUsage } from '@/lib/server/usageLogger';
import { generateQuotation } from '@/lib/server/services/quotation';
import type { ChatRequest, PlanningResult } from '@/lib/shared/types';

const bedrockService = new BedrockService();

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let body: (ChatRequest & { userId?: string; projectId?: string; customerPreferences?: unknown }) | null = null;
  try {
    body = (await request.json()) as ChatRequest & { userId?: string; projectId?: string; customerPreferences?: unknown };
    const { planningResultId, message, conversationHistory, userId, projectId, customerPreferences } = body;

    const currentPlan = (await dbAdapter.getPlanningResult(planningResultId ?? '')) as PlanningResult | null;
    if (!currentPlan) {
      return NextResponse.json({ error: 'Planning result not found' }, { status: 404 });
    }

    const result = await bedrockService.handleConversation(
      message,
      conversationHistory ?? [],
      currentPlan,
      customerPreferences
    );

    if (userId && result.usage) {
      await logUsage({
        userId,
        projectId,
        operationType: 'chat',
        usage: result.usage,
        requestDurationMs: Date.now() - startTime,
        success: true,
      });
    }

    let updatedPlanningResult: PlanningResult | undefined;
    if (result.requiresRecalculation && result.updatedConfig) {
      const { PolyhouseOptimizerV2 } = await import('@/lib/server/services/optimizerV2');
      const updatedConfiguration = { ...currentPlan.configuration, ...result.updatedConfig };
      const optimizer = new PolyhouseOptimizerV2(currentPlan.landArea, updatedConfiguration, undefined);
      const polyhouses = await optimizer.optimize();
      const quotation = await generateQuotation(polyhouses, updatedConfiguration, currentPlan.landArea.id);
      const totalPolyhouseAreaWithGutters = polyhouses.reduce((sum, p) => sum + p.area, 0);
      const utilizationPercentage = (totalPolyhouseAreaWithGutters / currentPlan.landArea.area) * 100;
      updatedPlanningResult = {
        ...currentPlan,
        polyhouses,
        configuration: updatedConfiguration,
        quotation,
        metadata: {
          ...currentPlan.metadata,
          numberOfPolyhouses: polyhouses.length,
          totalPolyhouseArea: polyhouses.reduce((s, p) => s + p.innerArea, 0),
          totalPolyhouseAreaWithGutters,
          utilizationPercentage,
        },
      };
      await dbAdapter.setPlanningResult(planningResultId!, updatedPlanningResult);
    }

    const cleanResponse = (result.response ?? '')
      .replace(/\[RECALCULATE:UNIFORM_ORIENTATION[^\]]*\]/g, '')
      .replace('[RECALCULATE:MAXIMIZE]', '')
      .replace('[RECALCULATE:IGNORE_RESTRICTIONS]', '')
      .replace('[RECALCULATE]', '')
      .trim();

    return NextResponse.json({
      response: cleanResponse,
      updatedPlanningResult: result.requiresRecalculation ? updatedPlanningResult : undefined,
    });
  } catch (error) {
    console.error('Chat error:', error);
    if (body?.userId) {
      await logUsage({
        userId: body.userId,
        projectId: body.projectId,
        operationType: 'chat',
        usage: { inputTokens: 0, outputTokens: 0, modelId: 'unknown' },
        requestDurationMs: Date.now() - startTime,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }).catch(() => {});
    }
    return NextResponse.json(
      { error: 'Failed to process chat', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
