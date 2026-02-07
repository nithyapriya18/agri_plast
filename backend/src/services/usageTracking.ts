/**
 * LLM Usage Tracking Service
 * Logs token usage and costs to the database for monitoring
 */

import { supabase } from '../lib/supabase';
import { TokenUsage } from './aiServiceTypes';

// Pricing per 1K tokens (in USD) for different models
// Source: AWS Bedrock pricing (as of 2025)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Claude Haiku 4.5
  'global.anthropic.claude-haiku-4-5-20251001-v1:0': {
    input: 0.00025,  // $0.25 per 1M tokens = $0.00025 per 1K tokens
    output: 0.00125, // $1.25 per 1M tokens = $0.00125 per 1K tokens
  },
  'anthropic.claude-haiku-3-5-20240307-v1:0': {
    input: 0.00025,
    output: 0.00125,
  },
  // Claude Sonnet 4.5
  'global.anthropic.claude-sonnet-4-5-20250514-v1:0': {
    input: 0.003,    // $3 per 1M tokens
    output: 0.015,   // $15 per 1M tokens
  },
  'anthropic.claude-sonnet-3-5-v2:0': {
    input: 0.003,
    output: 0.015,
  },
  // Claude Opus 4.5
  'global.anthropic.claude-opus-4-5-20251101-v1:0': {
    input: 0.015,    // $15 per 1M tokens
    output: 0.075,   // $75 per 1M tokens
  },
};

// Default pricing if model not found
const DEFAULT_PRICING = {
  input: 0.00025,
  output: 0.00125,
};

export interface UsageLogParams {
  userId: string;
  projectId?: string;
  operationType: 'chat' | 'planning' | 'explanation' | 'optimization';
  usage: TokenUsage;
  requestDurationMs?: number;
  success?: boolean;
  errorMessage?: string;
}

export class UsageTrackingService {
  /**
   * Calculate cost based on token usage and model
   */
  private calculateCost(usage: TokenUsage): { inputCost: number; outputCost: number } {
    const pricing = MODEL_PRICING[usage.modelId] || DEFAULT_PRICING;

    // Calculate cost: (tokens / 1000) * price_per_1k_tokens
    const inputCost = (usage.inputTokens / 1000) * pricing.input;
    const outputCost = (usage.outputTokens / 1000) * pricing.output;

    return { inputCost, outputCost };
  }

  /**
   * Log usage to database
   */
  async logUsage(params: UsageLogParams): Promise<void> {
    const { inputCost, outputCost } = this.calculateCost(params.usage);

    try {
      const { error } = await supabase
        .from('llm_usage')
        .insert({
          user_id: params.userId,
          project_id: params.projectId || null,
          operation_type: params.operationType,
          model_id: params.usage.modelId,
          input_tokens: params.usage.inputTokens,
          output_tokens: params.usage.outputTokens,
          input_cost: inputCost,
          output_cost: outputCost,
          request_duration_ms: params.requestDurationMs || null,
          success: params.success !== false, // default to true
          error_message: params.errorMessage || null,
        });

      if (error) {
        console.error('Failed to log LLM usage:', error);
        // Don't throw - logging failures shouldn't break the main flow
      }
    } catch (error) {
      console.error('Error logging usage:', error);
    }
  }

  /**
   * Get usage statistics for a user
   */
  async getUserUsage(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      projectId?: string;
      operationType?: string;
    }
  ) {
    let query = supabase
      .from('llm_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('success', true)
      .order('created_at', { ascending: false });

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    if (options?.projectId) {
      query = query.eq('project_id', options.projectId);
    }

    if (options?.operationType) {
      query = query.eq('operation_type', options.operationType);
    }

    const { data, error } = await query.limit(1000);

    if (error) {
      console.error('Failed to fetch user usage:', error);
      throw new Error('Failed to fetch usage statistics');
    }

    return data;
  }

  /**
   * Get aggregated usage statistics
   */
  async getAggregatedStats(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      groupBy?: 'day' | 'project' | 'operation';
    }
  ) {
    let query = supabase
      .from('llm_usage_stats')
      .select('*')
      .eq('user_id', userId);

    if (options?.startDate) {
      query = query.gte('usage_date', options.startDate.toISOString().split('T')[0]);
    }

    if (options?.endDate) {
      query = query.lte('usage_date', options.endDate.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch aggregated stats:', error);
      throw new Error('Failed to fetch aggregated statistics');
    }

    return data;
  }

  /**
   * Get total usage summary for a user
   */
  async getTotalUsage(userId: string, startDate?: Date, endDate?: Date) {
    const usage = await this.getUserUsage(userId, { startDate, endDate });

    const summary = {
      totalRequests: usage.length,
      totalInputTokens: usage.reduce((sum, u) => sum + u.input_tokens, 0),
      totalOutputTokens: usage.reduce((sum, u) => sum + u.output_tokens, 0),
      totalTokens: usage.reduce((sum, u) => sum + u.input_tokens + u.output_tokens, 0),
      totalCost: usage.reduce((sum, u) => sum + u.total_cost, 0),
      avgRequestDuration: usage.filter(u => u.request_duration_ms).length > 0
        ? usage.reduce((sum, u) => sum + (u.request_duration_ms || 0), 0) / usage.filter(u => u.request_duration_ms).length
        : 0,
      byOperation: {} as Record<string, { requests: number; tokens: number; cost: number }>,
    };

    // Group by operation type
    usage.forEach(u => {
      if (!summary.byOperation[u.operation_type]) {
        summary.byOperation[u.operation_type] = { requests: 0, tokens: 0, cost: 0 };
      }
      summary.byOperation[u.operation_type].requests++;
      summary.byOperation[u.operation_type].tokens += u.input_tokens + u.output_tokens;
      summary.byOperation[u.operation_type].cost += u.total_cost;
    });

    return summary;
  }
}

export const usageTrackingService = new UsageTrackingService();
