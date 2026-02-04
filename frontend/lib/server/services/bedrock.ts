/**
 * AWS Bedrock integration for conversational AI
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationMessage, PlanningResult } from '@/lib/shared/types';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  modelId: string;
}

export class BedrockService {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-2';
    const clientConfig: Record<string, unknown> = { region };
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (accessKey && secretKey) {
      (clientConfig as Record<string, unknown>).credentials = {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      };
    } else {
      console.warn(
        '[Bedrock] AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY missing; chat will fail unless default credential chain is used.'
      );
    }
    this.client = new BedrockRuntimeClient(clientConfig as never);
    this.modelId = process.env.BEDROCK_MODEL_ID || 'global.anthropic.claude-haiku-4-5-20251001-v1:0';
    console.log(`Bedrock initialized with model: ${this.modelId} in region: ${region}`);
  }

  async handleConversation(
    userMessage: string,
    conversationHistory: ConversationMessage[],
    currentPlan?: PlanningResult,
    customerPreferences?: unknown
  ): Promise<{ response: string; requiresRecalculation: boolean; updatedConfig?: unknown; usage?: TokenUsage }> {
    const systemPrompt = this.buildSystemPrompt(currentPlan, customerPreferences);
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];
    try {
      const { text: response, usage } = await this.invokeModel(systemPrompt, messages);
      const requiresRecalculation = this.checkIfRecalculationNeeded(response);
      const updatedConfig = this.extractConfigurationChanges(response, currentPlan);
      return { response, requiresRecalculation, updatedConfig, usage };
    } catch (error) {
      console.error('Bedrock invocation error:', error);
      throw new Error('Failed to process conversation');
    }
  }

  private buildSystemPrompt(currentPlan?: PlanningResult, customerPreferences?: unknown): string {
    let prompt = `You're a helpful assistant for Agriplast, helping farmers plan their polyhouse (greenhouse) setups. Your tone is friendly, conversational, and action-oriented - like a knowledgeable colleague who gets things done.

Your job: Help users understand their design, answer questions, and make smart changes when they ask. You're here to help them maximize their land effectively.

HOW TO COMMUNICATE:
1. **Be conversational and helpful** - Talk like a real person, not a robot.
2. **Take action immediately** - Don't ask permission for obvious changes.
3. **Keep it short** - 1-2 sentences max. Users want results, not essays.
4. **Be specific and clear**.

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
- Maximum side length: 100m, Minimum side length: 16m
- Minimum blocks per polyhouse: ${currentPlan?.configuration?.minimumBlocksPerPolyhouse || 10}
- Polyhouses oriented north-south (with latitude-based adjustments)

WHEN USERS REQUEST CHANGES - TAKE ACTION:
**Maximum Coverage/Utilization**: IMMEDIATELY trigger "[RECALCULATE:MAXIMIZE]"
**Uniform Orientation**: IMMEDIATELY trigger "[RECALCULATE:UNIFORM_ORIENTATION]"
**Fill Angled Corners**: IMMEDIATELY trigger "[RECALCULATE:MAXIMIZE]"
**Minimum Blocks per Polyhouse**: trigger "[RECALCULATE]" with the extracted number
**RESTRICTED ZONES**: If users want to BUILD ON RESTRICTED ZONES, WARN them and include "[RECALCULATE:IGNORE_RESTRICTIONS]"

Format material options and prices clearly using tables or lists.`;

    if (customerPreferences && typeof customerPreferences === 'object') {
      const prefs = customerPreferences as Record<string, unknown>;
      const cropTypeMap: Record<string, string> = { flowers: 'Flowers', leafy: 'Leafy vegetables', vine: 'Vine crops', mixed: 'Mixed/Multiple crops' };
      const polyhouseSizeMap: Record<string, string> = { large: 'Large polyhouses', mixed: 'Mixed sizes', small: 'Smaller polyhouses' };
      const budgetMap: Record<string, string> = { economy: 'Economy', standard: 'Standard', premium: 'Premium' };
      const priorityMap: Record<string, string> = { coverage: 'Maximum coverage', quality: 'Quality', balanced: 'Balanced' };
      const orientationMap: Record<string, string> = { uniform: 'Uniform orientation', varied: 'Varied orientation', optimized: 'Solar-optimized' };
      const timelineMap: Record<string, string> = { urgent: 'Urgent', planned: 'Planned' };
      prompt += `\n\nUSER'S INITIAL PREFERENCES (from form):
- Crop type: ${cropTypeMap[String(prefs.cropType)] || prefs.cropType}
- Polyhouse size: ${polyhouseSizeMap[String(prefs.polyhouseSize)] || prefs.polyhouseSize}
- Budget: ${budgetMap[String(prefs.budgetRange)] || prefs.budgetRange}
- Automation: ${prefs.automation ? 'Yes' : 'No'}
- Vehicle access: ${prefs.vehicleAccess ? 'Yes' : 'No'}
- Priority: ${priorityMap[String(prefs.priority)] || prefs.priority}
- Orientation: ${orientationMap[String(prefs.orientationPreference)] || prefs.orientationPreference}
- Timeline: ${timelineMap[String(prefs.timeline)] || prefs.timeline}
Don't ask the user to repeat this information.`;
    }

    if (currentPlan) {
      const { lat, lng } = currentPlan.landArea.centroid;
      const climateZone = this.getClimateZone(lat);
      const solarOrientation = this.getSolarOrientationAdvice(lat);
      prompt += `\n\nLOCATION & CLIMATE:
- Land coordinates: ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E
- Climate zone: ${climateZone}
- Solar orientation: ${solarOrientation}

CURRENT PLAN:
- Polyhouses: ${currentPlan.polyhouses.length}
- Total polyhouse area: ${currentPlan.metadata.totalPolyhouseArea.toFixed(2)} sqm
- Total land area: ${currentPlan.metadata.totalLandArea.toFixed(2)} sqm
- Utilization: ${currentPlan.metadata.utilizationPercentage.toFixed(1)}%
- Total cost: ₹${currentPlan.quotation.totalCost.toLocaleString('en-IN')}
${currentPlan.terrainAnalysis ? `- Buildable area: ${(currentPlan.terrainAnalysis.buildableAreaPercentage || 0).toFixed(1)}%` : ''}

Consider local climate and latitude for crop recommendations, seasonal advice, and water requirements.`;
    }
    return prompt;
  }

  private getClimateZone(lat: number): string {
    const absLat = Math.abs(lat);
    if (absLat < 15) return 'Tropical (hot and humid year-round, high rainfall)';
    if (absLat < 25) return 'Subtropical (warm summers, mild winters)';
    if (absLat < 35) return 'Warm temperate (hot summers, cool winters)';
    if (absLat < 50) return 'Cool temperate (four distinct seasons)';
    return 'Cold/Polar (short cool summers, long cold winters)';
  }

  private getSolarOrientationAdvice(lat: number): string {
    const absLat = Math.abs(lat);
    if (absLat < 15) return 'Near equator - north-south for even sunlight';
    if (absLat < 30) return 'Low to mid latitude - north-south optimal';
    return 'Higher latitude - north-south critical for winter sun';
  }

  private async invokeModel(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<{ text: string; usage: TokenUsage }> {
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      system: systemPrompt,
      messages,
      temperature: 0.3,
    };
    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });
    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const usage: TokenUsage = {
      inputTokens: responseBody.usage?.input_tokens || 0,
      outputTokens: responseBody.usage?.output_tokens || 0,
      modelId: this.modelId,
    };
    return { text: responseBody.content[0].text, usage };
  }

  private checkIfRecalculationNeeded(response: string): boolean {
    return (
      response.includes('[RECALCULATE]') ||
      response.includes('[RECALCULATE:MAXIMIZE]') ||
      response.includes('[RECALCULATE:IGNORE_RESTRICTIONS]') ||
      response.includes('[RECALCULATE:UNIFORM_ORIENTATION') ||
      /minimum\s+blocks?\s+(?:per\s+polyhouse\s+)?(?:to\s+)?(\d+)/i.test(response)
    );
  }

  private extractConfigurationChanges(response: string, currentPlan?: PlanningResult): unknown {
    if (!currentPlan) return null;
    const changes: Record<string, unknown> = {};
    if (response.includes('[RECALCULATE:MAXIMIZE]')) {
      changes.polyhouseGap = 1.0;
      changes.minSideLength = 24;
      changes.minCornerDistance = 5;
      changes._maximizeCoverage = true;
      return changes;
    }
    if (response.includes('[RECALCULATE:IGNORE_RESTRICTIONS]')) {
      changes.terrain = { ...currentPlan.configuration.terrain, ignoreRestrictedZones: true };
      return changes;
    }
    if (response.includes('[RECALCULATE:UNIFORM_ORIENTATION')) {
      changes.optimization = { ...currentPlan.configuration.optimization, orientationStrategy: 'uniform' };
      changes.polyhouseGap = 0.5;
      changes.minSideLength = 16;
      changes.minCornerDistance = 3;
      changes._uniformOrientation = true;
      return changes;
    }
    const minimumBlocksMatch = response.match(/minimum\s+blocks?\s+(?:per\s+polyhouse\s+)?(?:to\s+)?(\d+)/i);
    if (minimumBlocksMatch) {
      const requestedMinBlocks = parseInt(minimumBlocksMatch[1]);
      if (requestedMinBlocks >= 1 && requestedMinBlocks <= 100) {
        changes.minimumBlocksPerPolyhouse = requestedMinBlocks;
      }
    }
    return Object.keys(changes).length > 0 ? changes : null;
  }

  async explainPlacement(planningResult: PlanningResult): Promise<{ text: string; usage: TokenUsage }> {
    const systemPrompt = `You are explaining the automated polyhouse placement algorithm to a user. Be clear and educational.`;
    const userPrompt = `Explain why the polyhouses were placed the way they are, given:
- ${planningResult.polyhouses.length} polyhouses were placed
- Total land area: ${planningResult.metadata.totalLandArea.toFixed(2)} sqm
- Total polyhouse area: ${planningResult.metadata.totalPolyhouseArea.toFixed(2)} sqm
- Space utilization: ${planningResult.metadata.utilizationPercentage.toFixed(1)}%
- Configuration: Blocks are 8m x 4m, 2m gutter, 2m gap between polyhouses
Keep the explanation concise (2-3 paragraphs).`;
    return await this.invokeModel(systemPrompt, [{ role: 'user', content: userPrompt }]);
  }
}
