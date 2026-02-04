import { dbAdapter } from '@/lib/db';

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  modelId: string;
}

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'global.anthropic.claude-haiku-4-5-20251001-v1:0': { input: 0.00025, output: 0.00125 },
  'anthropic.claude-haiku-3-5-20240307-v1:0': { input: 0.00025, output: 0.00125 },
  'global.anthropic.claude-sonnet-4-5-20250514-v1:0': { input: 0.003, output: 0.015 },
  'anthropic.claude-sonnet-3-5-v2:0': { input: 0.003, output: 0.015 },
  'global.anthropic.claude-opus-4-5-20251101-v1:0': { input: 0.015, output: 0.075 },
};
const DEFAULT_PRICING = { input: 0.00025, output: 0.00125 };

export async function logUsage(params: {
  userId: string;
  projectId?: string;
  operationType: 'chat' | 'planning' | 'explanation' | 'optimization';
  usage: TokenUsage;
  requestDurationMs?: number;
  success?: boolean;
  errorMessage?: string;
}): Promise<void> {
  const pricing = MODEL_PRICING[params.usage.modelId] || DEFAULT_PRICING;
  const inputCost = (params.usage.inputTokens / 1000) * pricing.input;
  const outputCost = (params.usage.outputTokens / 1000) * pricing.output;
  try {
    await dbAdapter.insertLlmUsage({
      user_id: params.userId,
      project_id: params.projectId ?? null,
      operation_type: params.operationType,
      model_id: params.usage.modelId,
      input_tokens: params.usage.inputTokens,
      output_tokens: params.usage.outputTokens,
      input_cost: inputCost,
      output_cost: outputCost,
      request_duration_ms: params.requestDurationMs ?? null,
      success: params.success !== false,
      error_message: params.errorMessage ?? null,
    });
  } catch (err) {
    console.error('Failed to log LLM usage:', err);
  }
}
