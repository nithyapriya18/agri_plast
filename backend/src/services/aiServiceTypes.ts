/**
 * AI Service abstraction - Common types and interfaces
 * Supports multiple AI providers (Bedrock, Claudish/DeepSeek, etc.)
 */

import { ConversationMessage, PlanningResult } from '@shared/types';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  modelId: string;
}

export interface ConversationResponse {
  response: string;
  requiresRecalculation: boolean;
  updatedConfig?: any;
  usage?: TokenUsage;
}

export interface ExplanationResponse {
  text: string;
  usage: TokenUsage;
}

/**
 * Base interface for all AI services
 */
export interface AIService {
  /**
   * Handle conversational interaction about polyhouse planning
   */
  handleConversation(
    userMessage: string,
    conversationHistory: ConversationMessage[],
    currentPlan?: PlanningResult,
    customerPreferences?: any
  ): Promise<ConversationResponse>;

  /**
   * Generate explanation of polyhouse placement
   */
  explainPlacement(planningResult: PlanningResult): Promise<ExplanationResponse>;
}

/**
 * Configuration for AI service
 */
export interface AIServiceConfig {
  type: 'bedrock' | 'claudish';
  modelId?: string;
  apiUrl?: string;
  apiKey?: string;
  region?: string;
}
