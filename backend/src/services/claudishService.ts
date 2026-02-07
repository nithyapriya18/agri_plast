/**
 * Claudish integration for DeepSeek AI
 * Claudish provides an OpenAI-compatible API adapter for DeepSeek models
 * Reference: https://www.reddit.com/r/ClaudeAI/comments/1p6wtfl/made_a_tool_to_run_claude_code_with_other_models/
 */

import { ConversationMessage, PlanningResult } from '@shared/types';
import { AIService, ConversationResponse, ExplanationResponse, TokenUsage } from './aiServiceTypes';
import axios, { AxiosInstance } from 'axios';

export class ClaudishService implements AIService {
  private client: AxiosInstance;
  private modelId: string;

  constructor() {
    const apiUrl = process.env.CLAUDISH_API_URL || 'http://localhost:8080/v1';
    const apiKey = process.env.CLAUDISH_API_KEY || '';

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 60000, // 60 second timeout
    });

    this.modelId = process.env.DEEPSEEK_MODEL_ID || 'deepseek-chat';

    console.log(`Claudish initialized with model: ${this.modelId} at ${apiUrl}`);
  }

  /**
   * Handle conversational interaction about polyhouse planning
   */
  async handleConversation(
    userMessage: string,
    conversationHistory: ConversationMessage[],
    currentPlan?: PlanningResult,
    customerPreferences?: any
  ): Promise<ConversationResponse> {
    // Build system prompt with context
    const systemPrompt = this.buildSystemPrompt(currentPlan, customerPreferences);

    // Build conversation messages in OpenAI format
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    try {
      // Invoke Claudish (OpenAI-compatible endpoint)
      const response = await this.invokeModel(messages);

      // Parse response to check if recalculation is needed
      const requiresRecalculation = this.checkIfRecalculationNeeded(response.text);

      // Extract any configuration changes
      const updatedConfig = this.extractConfigurationChanges(response.text, currentPlan);

      return {
        response: response.text,
        requiresRecalculation,
        updatedConfig,
        usage: response.usage,
      };
    } catch (error) {
      console.error('Claudish invocation error:', error);
      throw new Error('Failed to process conversation with Claudish');
    }
  }

  /**
   * Build system prompt with context (same logic as Bedrock)
   */
  private buildSystemPrompt(currentPlan?: PlanningResult, customerPreferences?: any): string {
    let prompt = `You're a helpful assistant for Agriplast, helping farmers plan their polyhouse (greenhouse) setups. Your tone is friendly, conversational, and action-oriented - like a knowledgeable colleague who gets things done.

Your job: Help users understand their design, answer questions, and make smart changes when they ask. You're here to help them maximize their land effectively.

HOW TO COMMUNICATE:

1. **Be conversational and helpful** - Talk like a real person, not a robot:
   ✅ "Let me fill those empty spaces for you..."
   ✅ "I'll angle those corner polyhouses to grab more area..."
   ✅ "Got it - optimizing for maximum coverage now..."
   ❌ "I will now proceed to recalculate the optimization parameters..."
   ❌ "The system will adjust the configuration based on your specifications..."

2. **Take action immediately** - Don't ask permission for obvious changes:
   ✅ "Filling those gaps now... [RECALCULATE:MAXIMIZE]"
   ❌ "Would you like me to fill those gaps for you?"

3. **Keep it short** - 1-2 sentences max. Users want results, not essays:
   ✅ "Maximizing coverage with smarter placement... [RECALCULATE:MAXIMIZE]"
   ❌ Long paragraph explaining algorithms, formulas, and technical details

4. **Be specific and clear**:
   ✅ "I'll angle those corner polyhouses to fill that space..."
   ❌ "I will optimize the spatial configuration parameters..."

Key concepts:
- **Land Area**: The agricultural space the user has mapped
- **Polyhouse**: A rectangular greenhouse structure made of composable blocks
- **Block**: A standard 8m x 4m unit that makes up a polyhouse
- **Gutter**: A 2m wide drainage channel around each polyhouse
- **Solar Orientation**: Polyhouses should face north-south for optimal sun exposure

Current planning rules:
- Blocks are 8m x 4m standard size
- 2m gutter around each polyhouse for drainage
- Minimum 2m gap between polyhouses
- Maximum side length: 100m
- Minimum side length: 16m
- Minimum blocks per polyhouse: ${currentPlan?.configuration?.minimumBlocksPerPolyhouse || 10} (user can change this by saying "set minimum blocks to X")
- Polyhouses oriented north-south (with latitude-based adjustments)

WHEN USERS REQUEST CHANGES - TAKE ACTION:

⚠️ **CRITICAL**: If a user asks to CHANGE, MODIFY, ADJUST, IMPROVE, ADD, REMOVE, or ALTER the polyhouse layout in ANY WAY, you MUST include a [RECALCULATE] tag. Without this tag, no changes will be applied!

**ANY Layout Change Request** (phrases like "change", "adjust", "modify", "improve", "make better", "add more", "reduce", "different"):
- IMMEDIATELY trigger "[RECALCULATE:MAXIMIZE]" (default to maximize unless they specify otherwise)
- Brief response: "Updating the layout now..."
- This ensures changes are actually applied to the map

**Maximum Coverage/Utilization** (phrases like "maximize", "fill space", "cover more", "use empty areas", "fill gaps"):
- IMMEDIATELY trigger "[RECALCULATE:MAXIMIZE]"
- Explain briefly: "Filling those spaces now..." or "Maximizing coverage..."
- The optimizer will intelligently place and angle polyhouses to grab every usable bit of land

**Uniform Orientation** (phrases like "align all same way", "all facing same direction", "make it look uniform"):
- IMMEDIATELY trigger "[RECALCULATE:UNIFORM_ORIENTATION]"
- Brief: "Aligning them uniformly..."
- WARNING: Tell them this might reduce utilization if the land has angled corners

Format material options and prices clearly using tables or lists.`;

    // Add customer preferences context if available
    if (customerPreferences) {
      const cropTypeMap: Record<string, string> = {
        flowers: 'Flowers (roses, gerberas, carnations)',
        leafy: 'Leafy vegetables (lettuce, spinach, herbs)',
        vine: 'Vine crops (tomatoes, cucumbers, peppers)',
        mixed: 'Mixed/Multiple crops'
      };

      prompt += `\n\nUSER'S INITIAL PREFERENCES (from form):
- Crop type: ${cropTypeMap[customerPreferences.cropType] || customerPreferences.cropType}
- Budget range: ${customerPreferences.budgetRange}
- Automation: ${customerPreferences.automation ? 'Yes' : 'No'}
- Priority: ${customerPreferences.priority}

The current design was generated based on these preferences. Don't ask the user to repeat this information.`;
    }

    if (currentPlan) {
      const { lat, lng } = currentPlan.landArea.centroid;
      prompt += `\n\nCURRENT PLAN DETAILS:
- Number of polyhouses: ${currentPlan.polyhouses.length}
- Total polyhouse area: ${currentPlan.metadata.totalPolyhouseArea.toFixed(2)} sqm
- Total land area: ${currentPlan.metadata.totalLandArea.toFixed(2)} sqm
- Space utilization: ${currentPlan.metadata.utilizationPercentage.toFixed(1)}%
- Total estimated cost: ₹${currentPlan.quotation.totalCost.toLocaleString('en-IN')}
- Location: ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E`;
    }

    return prompt;
  }

  /**
   * Invoke Claudish model (OpenAI-compatible API)
   */
  private async invokeModel(
    messages: Array<{ role: string; content: string }>
  ): Promise<{ text: string; usage: TokenUsage }> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.modelId,
        messages: messages,
        temperature: 0.3,
        max_tokens: 2000,
      });

      const data = response.data;

      // Extract token usage
      const usage: TokenUsage = {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        modelId: this.modelId,
      };

      return {
        text: data.choices[0].message.content,
        usage,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Claudish API error:', error.response?.data || error.message);
        throw new Error(`Claudish API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if response indicates recalculation is needed (same as Bedrock)
   */
  private checkIfRecalculationNeeded(response: string): boolean {
    const hasRecalculateTag = response.includes('[RECALCULATE]') ||
           response.includes('[RECALCULATE:MAXIMIZE]') ||
           response.includes('[RECALCULATE:IGNORE_RESTRICTIONS]') ||
           response.includes('[RECALCULATE:UNIFORM_ORIENTATION');

    const hasMinimumBlocksChange = /minimum\s+blocks?\s+(?:per\s+polyhouse\s+)?(?:to\s+)?(\d+)/i.test(response);

    const actionPhrases = [
      /updating\s+the\s+layout/i,
      /filling\s+(?:those\s+)?(?:spaces|gaps)/i,
      /maximizing\s+coverage/i,
      /angling\s+polyhouses/i,
      /aligning\s+them/i,
      /placing\s+(?:more\s+)?polyhouses/i,
      /adding\s+(?:more\s+)?polyhouses/i,
      /adjusting\s+the\s+design/i,
      /modifying\s+the\s+layout/i,
      /re-optimizing/i,
      /recalculating/i,
    ];

    const hasActionPhrase = actionPhrases.some(pattern => pattern.test(response));

    return hasRecalculateTag || hasMinimumBlocksChange || hasActionPhrase;
  }

  /**
   * Extract configuration changes from response (same as Bedrock)
   */
  private extractConfigurationChanges(response: string, currentPlan?: PlanningResult): any {
    if (!currentPlan) return null;

    const changes: any = {};

    // Check for MAXIMUM COVERAGE request
    if (response.includes('[RECALCULATE:MAXIMIZE]')) {
      console.log('🚀 User requested MAXIMUM COVERAGE');
      changes.polyhouseGap = 1.0;
      changes.minSideLength = 24;
      changes.minCornerDistance = 5;
      changes._maximizeCoverage = true;
      return changes;
    }

    // Check for IGNORE RESTRICTIONS override
    if (response.includes('[RECALCULATE:IGNORE_RESTRICTIONS]')) {
      console.log('⚠️  User requested to IGNORE RESTRICTED ZONES');
      changes.terrain = {
        ...currentPlan.configuration.terrain,
        ignoreRestrictedZones: true,
      };
      return changes;
    }

    // Check for UNIFORM ORIENTATION request
    if (response.includes('[RECALCULATE:UNIFORM_ORIENTATION')) {
      console.log('📐 User requested UNIFORM ORIENTATION');
      changes.optimization = {
        ...currentPlan.configuration.optimization,
        orientationStrategy: 'uniform',
      };
      changes.polyhouseGap = 0.5;
      changes.minSideLength = 16;
      changes.minCornerDistance = 3;
      changes._uniformOrientation = true;
      return changes;
    }

    // Check for minimum blocks per polyhouse changes
    const minimumBlocksMatch = response.match(/minimum\s+blocks?\s+(?:per\s+polyhouse\s+)?(?:to\s+)?(\d+)/i);
    if (minimumBlocksMatch) {
      const requestedMinBlocks = parseInt(minimumBlocksMatch[1]);
      if (requestedMinBlocks >= 1 && requestedMinBlocks <= 100) {
        console.log(`📦 User requested minimum blocks per polyhouse: ${requestedMinBlocks}`);
        changes.minimumBlocksPerPolyhouse = requestedMinBlocks;
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Generate explanation of polyhouse placement
   */
  async explainPlacement(planningResult: PlanningResult): Promise<ExplanationResponse> {
    const messages = [
      {
        role: 'system',
        content: `You are explaining the automated polyhouse placement algorithm to a user. Be clear and educational.`,
      },
      {
        role: 'user',
        content: `Explain why the polyhouses were placed the way they are, given:
- ${planningResult.polyhouses.length} polyhouses were placed
- Total land area: ${planningResult.metadata.totalLandArea.toFixed(2)} sqm
- Total polyhouse area: ${planningResult.metadata.totalPolyhouseArea.toFixed(2)} sqm
- Space utilization: ${planningResult.metadata.utilizationPercentage.toFixed(1)}%
- Configuration: Blocks are 8m x 4m, 2m gutter, 2m gap between polyhouses

Keep the explanation concise (2-3 paragraphs) and mention the key factors like solar orientation, spacing requirements, and maximizing space.`,
      },
    ];

    const response = await this.invokeModel(messages);
    return response;
  }
}
