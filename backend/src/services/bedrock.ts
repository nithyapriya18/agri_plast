/**
 * AWS Bedrock integration for conversational AI
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationMessage, PlanningResult } from '@shared/types';
import { AIService, ConversationResponse, ExplanationResponse, TokenUsage } from './aiServiceTypes';

export class BedrockService implements AIService {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor() {
    // Initialize Bedrock client
    // When AWS_PROFILE is set, credentials are automatically loaded from ~/.aws/credentials
    const clientConfig: any = {
      region: process.env.AWS_REGION || 'us-east-2',
    };

    // Only add explicit credentials if provided (not using AWS_PROFILE)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
      };
    }

    this.client = new BedrockRuntimeClient(clientConfig);

    // Use model from config (defaults to Claude Haiku 4.5 global profile)
    this.modelId = process.env.BEDROCK_MODEL_ID || 'global.anthropic.claude-haiku-4-5-20251001-v1:0';

    console.log(`Bedrock initialized with model: ${this.modelId} in region: ${clientConfig.region}`);
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
    // Build system prompt with context about the current plan and customer preferences
    const systemPrompt = this.buildSystemPrompt(currentPlan, customerPreferences);

    // Build conversation messages
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    try {
      // Invoke Bedrock
      const { text: response, usage } = await this.invokeModel(systemPrompt, messages);

      // Parse response to check if recalculation is needed
      const requiresRecalculation = this.checkIfRecalculationNeeded(response);

      // Extract any configuration changes
      const updatedConfig = this.extractConfigurationChanges(response, currentPlan);

      return {
        response,
        requiresRecalculation,
        updatedConfig,
        usage,
      };
    } catch (error) {
      console.error('Bedrock invocation error:', error);
      throw new Error('Failed to process conversation');
    }
  }

  /**
   * Build system prompt with context
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

OPTIMIZATION LEVELS - Users can request different space utilization strategies:

**Current (Balanced)**: ~50-60% utilization with quality polyhouses
- 1m gap between polyhouses
- Minimum width: 8m (2 blocks)
- Aspect ratio limit: 4:1 maximum
- Good drainage and access

**Maximum Coverage (Cost-Optimized)**: ~60-75% utilization with FEWER, LARGER polyhouses
- 1m gap between polyhouses (reasonable spacing for cost efficiency)
- Prioritizes LARGER polyhouses (lower cost per sqm to build)
- Minimum size: 24x16m (6 blocks) instead of single blocks
- Fewer polyhouses = lower infrastructure costs (foundations, gutters, entry points)

PRIMARY OPTIMIZATION GOALS (in order of importance):
1. **Maximum Space Utilization** - Fill as much usable land as possible
2. **Solar Orientation** - North-south alignment for optimal sun exposure (with latitude adjustments)
3. **Smart Angling** - In angled corners or irregular shapes, rotate polyhouses intelligently to fill space

IMPORTANT: Uniform orientation is NOT required. For irregular or angled land, polyhouses should rotate/angle to maximize coverage. A clean uniform look is nice, but ONLY if it doesn't sacrifice utilization.

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

**Large Polyhouses Only** (phrases like "only large polyhouses", "remove small ones", "just big polyhouses", "fewer larger polyhouses", "simplify layout", "only 1 hectare polyhouses"):
- IMMEDIATELY trigger "[RECALCULATE:LARGE_ONLY]"
- Brief: "Switching to large polyhouses only for simpler construction..."
- This disables placement of smaller polyhouses and keeps only large ones (8000-10000 sqm)
- Note: By default, the system fills gaps with medium/small polyhouses for maximum coverage

**Fill Angled Corners** (phrases like "fill those corners", "angle the polyhouses", "grab that corner space"):
- IMMEDIATELY trigger "[RECALCULATE:MAXIMIZE]"
- Brief: "Angling polyhouses to fill those corners..."
- The optimizer will rotate polyhouses intelligently to fit irregular shapes

**Natural Requests** ("this looks empty", "waste of space", "can we fit more?"):
- Interpret intent → they want more coverage
- IMMEDIATELY trigger "[RECALCULATE:MAXIMIZE]"
- Brief: "Let me fill those gaps for you..."

**Minimum Blocks per Polyhouse** (phrases like "set minimum blocks to X", "minimum X blocks per polyhouse", "don't create polyhouses with less than X blocks"):
- IMMEDIATELY trigger "[RECALCULATE]" with the extracted number
- Brief: "Setting minimum blocks per polyhouse to X..."
- This prevents creating very small polyhouses that might not be cost-effective
- Default is 10 blocks (80m² per polyhouse minimum)

**RESTRICTED ZONES (Water, Steep Slopes, etc.):**
By default, we do NOT build on restricted areas for safety and regulatory reasons.

If users want to BUILD ON RESTRICTED ZONES (override restrictions):
1. **WARN them strongly**: "⚠️ Building on [water/steep slopes/etc] is not recommended and may violate regulations, cause structural issues, or fail inspections. You take full responsibility."
2. Explain what they need to do: "You'll need to handle leveling, drainage, foundations, and permits yourself."
3. Include "[RECALCULATE:IGNORE_RESTRICTIONS]" in your response

If users ask about restricted zones but DON'T want to override:
- Just explain what the restrictions are and why they exist
- Don't include any [RECALCULATE] tags

Format material options and prices clearly using tables or lists.`;

    // Add customer preferences context if available
    if (customerPreferences) {
      const cropTypeMap: Record<string, string> = {
        flowers: 'Flowers (roses, gerberas, carnations)',
        leafy: 'Leafy vegetables (lettuce, spinach, herbs)',
        vine: 'Vine crops (tomatoes, cucumbers, peppers)',
        mixed: 'Mixed/Multiple crops'
      };

      const polyhouseSizeMap: Record<string, string> = {
        large: 'Large polyhouses (maximize individual size)',
        mixed: 'Mixed sizes (variety of polyhouse sizes)',
        small: 'Smaller polyhouses (more units, easier management)'
      };

      const budgetMap: Record<string, string> = {
        economy: 'Economy (cost-effective materials)',
        standard: 'Standard (balanced quality and cost)',
        premium: 'Premium (high-quality materials)'
      };

      const priorityMap: Record<string, string> = {
        coverage: 'Maximum coverage (fill as much land as possible)',
        quality: 'Quality (larger, well-spaced polyhouses)',
        balanced: 'Balanced (mix of coverage and quality)'
      };

      const orientationMap: Record<string, string> = {
        uniform: 'Uniform orientation (all polyhouses same direction)',
        varied: 'Varied orientation (adapt to land shape)',
        optimized: 'Solar-optimized (best for sun exposure)'
      };

      const timelineMap: Record<string, string> = {
        urgent: 'Urgent (construction ASAP)',
        planned: 'Planned (flexible timeline)'
      };

      prompt += `\n\nUSER'S INITIAL PREFERENCES (from form):
- Crop type: ${cropTypeMap[customerPreferences.cropType] || customerPreferences.cropType}
- Polyhouse size preference: ${polyhouseSizeMap[customerPreferences.polyhouseSize] || customerPreferences.polyhouseSize}
- Budget range: ${budgetMap[customerPreferences.budgetRange] || customerPreferences.budgetRange}
- Automation: ${customerPreferences.automation ? 'Yes (wants automated systems)' : 'No (manual operation)'}
- Vehicle access required: ${customerPreferences.vehicleAccess ? 'Yes (needs wider spacing for vehicles)' : 'No'}
- Priority: ${priorityMap[customerPreferences.priority] || customerPreferences.priority}
- Orientation preference: ${orientationMap[customerPreferences.orientationPreference] || customerPreferences.orientationPreference}
- Timeline: ${timelineMap[customerPreferences.timeline] || customerPreferences.timeline}

The current design was generated based on these preferences. Don't ask the user to repeat this information.`;
    }

    if (currentPlan) {
      // Extract location and climate information
      const { lat, lng } = currentPlan.landArea.centroid;
      const climateZone = this.getClimateZone(lat);
      const solarOrientation = this.getSolarOrientationAdvice(lat);

      prompt += `\n\nLOCATION & CLIMATE CONTEXT:
- Land coordinates: ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E
- Climate zone: ${climateZone}
- Solar orientation: ${solarOrientation}

CURRENT PLAN DETAILS:
- Number of polyhouses: ${currentPlan.polyhouses.length}
- Total polyhouse area: ${currentPlan.metadata.totalPolyhouseArea.toFixed(2)} sqm
- Total land area: ${currentPlan.metadata.totalLandArea.toFixed(2)} sqm
- Space utilization: ${currentPlan.metadata.utilizationPercentage.toFixed(1)}%
- Total estimated cost: ₹${currentPlan.quotation.totalCost.toLocaleString('en-IN')}
${currentPlan.terrainAnalysis ? `
TERRAIN & RESTRICTIONS:
- Buildable area: ${(currentPlan.terrainAnalysis.buildableAreaPercentage || 0).toFixed(1)}%
- Average slope: ${(currentPlan.terrainAnalysis.averageSlope || 0).toFixed(1)}°
${currentPlan.terrainAnalysis.restrictedZones && currentPlan.terrainAnalysis.restrictedZones.length > 0 ? `- ⚠️ ${currentPlan.terrainAnalysis.restrictedZones.length} restricted zone(s) detected: ${currentPlan.terrainAnalysis.restrictedZones.map((z: any) => z.type).join(', ')}
- Currently avoiding restricted zones (user can override via chat)` : ''}
${currentPlan.terrainAnalysis.warnings && currentPlan.terrainAnalysis.warnings.length > 0 ? `- Warnings: ${currentPlan.terrainAnalysis.warnings.slice(0, 2).join('; ')}` : ''}` : ''}

The user can see a visual map of the polyhouses with restricted zones marked in RED and a detailed quotation breakdown.

When answering questions, consider the local climate and latitude when giving advice about:
- Crop recommendations for this climate zone
- Seasonal considerations
- Temperature management strategies
- Water requirements based on local conditions`;
    }

    return prompt;
  }

  /**
   * Determine climate zone based on latitude
   */
  private getClimateZone(lat: number): string {
    const absLat = Math.abs(lat);

    if (absLat >= 0 && absLat < 15) {
      return 'Tropical (hot and humid year-round, high rainfall)';
    } else if (absLat >= 15 && absLat < 25) {
      return 'Subtropical (warm summers, mild winters, moderate rainfall)';
    } else if (absLat >= 25 && absLat < 35) {
      return 'Warm temperate (hot summers, cool winters, seasonal variation)';
    } else if (absLat >= 35 && absLat < 50) {
      return 'Cool temperate (moderate summers, cold winters, four distinct seasons)';
    } else {
      return 'Cold/Polar (short cool summers, long cold winters)';
    }
  }

  /**
   * Get solar orientation advice based on latitude
   */
  private getSolarOrientationAdvice(lat: number): string {
    const absLat = Math.abs(lat);

    if (absLat < 15) {
      return 'Near equator - polyhouses should run north-south for even sunlight distribution';
    } else if (absLat < 30) {
      return 'Low to mid latitude - north-south orientation optimal with slight east-west tolerance';
    } else {
      return 'Higher latitude - north-south orientation critical for maximizing winter sun exposure';
    }
  }

  /**
   * Invoke Bedrock model
   */
  private async invokeModel(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<{ text: string; usage: TokenUsage }> {
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      system: systemPrompt,
      messages: messages,
      temperature: 0.3, // Lower temperature for more decisive, less questioning behavior
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract token usage from response
    const usage: TokenUsage = {
      inputTokens: responseBody.usage?.input_tokens || 0,
      outputTokens: responseBody.usage?.output_tokens || 0,
      modelId: this.modelId,
    };

    return {
      text: responseBody.content[0].text,
      usage,
    };
  }

  /**
   * Check if response indicates recalculation is needed
   */
  private checkIfRecalculationNeeded(response: string): boolean {
    // Check for explicit recalculate tags
    const hasRecalculateTag = response.includes('[RECALCULATE]') ||
           response.includes('[RECALCULATE:MAXIMIZE]') ||
           response.includes('[RECALCULATE:IGNORE_RESTRICTIONS]') ||
           response.includes('[RECALCULATE:UNIFORM_ORIENTATION') ||
           response.includes('[RECALCULATE:FILL_GAPS]') ||
           response.includes('[RECALCULATE:LARGE_ONLY]');

    // Check for minimum blocks changes
    const hasMinimumBlocksChange = /minimum\s+blocks?\s+(?:per\s+polyhouse\s+)?(?:to\s+)?(\d+)/i.test(response);

    // Check for action phrases that indicate layout changes
    const actionPhrases = [
      /updating\s+the\s+layout/i,
      /filling\s+(?:those\s+)?(?:spaces|gaps)/i,
      /maximizing\s+coverage/i,
      /angling\s+polyhouses/i,
      /aligning\s+them/i,
      /placing\s+(?:more\s+)?polyhouses/i,
      /adding\s+(?:more\s+)?polyhouses/i,
      /adding\s+smaller\s+polyhouses/i,
      /adjusting\s+the\s+design/i,
      /modifying\s+the\s+layout/i,
      /re-optimizing/i,
      /recalculating/i,
    ];

    const hasActionPhrase = actionPhrases.some(pattern => pattern.test(response));

    return hasRecalculateTag || hasMinimumBlocksChange || hasActionPhrase;
  }

  /**
   * Extract configuration changes from response
   */
  private extractConfigurationChanges(response: string, currentPlan?: PlanningResult): any {
    // Look for structured configuration changes in the response

    if (!currentPlan) return null;

    const changes: any = {};

    // Check for MAXIMUM COVERAGE request
    if (response.includes('[RECALCULATE:MAXIMIZE]')) {
      console.log('🚀 User requested MAXIMUM COVERAGE - optimizing for LARGER polyhouses and LOWER COST');

      // Apply COST-OPTIMIZED settings: fewer, larger polyhouses
      changes.polyhouseGap = 1.0;    // Reasonable spacing (not too tight)
      changes.minSideLength = 24;    // Minimum 3x2 blocks (24x16m) - no tiny polyhouses
      changes.minCornerDistance = 5; // Prefer simpler shapes

      // Mark this as a maximize request
      changes._maximizeCoverage = true;

      return changes;
    }

    // Check for IGNORE RESTRICTIONS override
    if (response.includes('[RECALCULATE:IGNORE_RESTRICTIONS]')) {
      console.log('⚠️  User requested to IGNORE RESTRICTED ZONES - building on restricted areas');

      // Override terrain restrictions (user takes responsibility)
      changes.terrain = {
        ...currentPlan.configuration.terrain,
        ignoreRestrictedZones: true,
      };

      return changes;
    }

    // Check for UNIFORM ORIENTATION request
    if (response.includes('[RECALCULATE:UNIFORM_ORIENTATION')) {
      console.log('📐 User requested UNIFORM ORIENTATION - aligning all polyhouses consistently');

      // Force uniform north-south orientation for maximum coverage and simplicity
      changes.optimization = {
        ...currentPlan.configuration.optimization,
        orientationStrategy: 'uniform', // Use uniform orientation strategy
      };

      // Optimize spacing for uniform layout
      changes.polyhouseGap = 0.5;    // Tighter spacing possible with uniform orientation
      changes.minSideLength = 16;    // Allow varied sizes for better space filling
      changes.minCornerDistance = 3;  // Allow more complex shapes for efficiency

      // Mark this as uniform orientation request
      changes._uniformOrientation = true;

      return changes;
    }

    // Check for FILL GAPS request (re-enable if disabled)
    if (response.includes('[RECALCULATE:FILL_GAPS]')) {
      console.log('🏗️  User requested to FILL GAPS with smaller polyhouses');

      // Enable gap-filling with smaller polyhouses
      changes.optimization = {
        ...currentPlan.configuration.optimization,
        fillGapsWithSmallerPolyhouses: true,
      };

      return changes;
    }

    // Check for LARGE ONLY request (disable gap-filling)
    if (response.includes('[RECALCULATE:LARGE_ONLY]')) {
      console.log('🏢 User requested LARGE POLYHOUSES ONLY - disabling gap-filling');

      // Disable gap-filling, only place large polyhouses
      changes.optimization = {
        ...currentPlan.configuration.optimization,
        fillGapsWithSmallerPolyhouses: false,
      };

      return changes;
    }

    // Check for minimum blocks per polyhouse changes
    // Support both [RECALCULATE:NUMBER] format and natural language
    const recalculateWithNumberMatch = response.match(/\[RECALCULATE:(\d+)\]/);
    const minimumBlocksMatch = response.match(/minimum\s+blocks?\s+(?:per\s+polyhouse\s+)?(?:to\s+)?(\d+)/i);

    if (recalculateWithNumberMatch) {
      const requestedMinBlocks = parseInt(recalculateWithNumberMatch[1]);
      if (requestedMinBlocks >= 1 && requestedMinBlocks <= 100) {
        console.log(`📦 User requested minimum blocks per polyhouse: ${requestedMinBlocks} (from tag)`);
        changes.minimumBlocksPerPolyhouse = requestedMinBlocks;
      }
    } else if (minimumBlocksMatch) {
      const requestedMinBlocks = parseInt(minimumBlocksMatch[1]);
      if (requestedMinBlocks >= 1 && requestedMinBlocks <= 100) {
        console.log(`📦 User requested minimum blocks per polyhouse: ${requestedMinBlocks}`);
        changes.minimumBlocksPerPolyhouse = requestedMinBlocks;
      }
    }

    // Check for other specific changes
    if (response.toLowerCase().includes('cheaper material') ||
        response.toLowerCase().includes('change material')) {
      // Material changes would be handled separately
      // For now, we don't modify configuration for material changes
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Generate explanation of why polyhouses were placed in a certain way
   */
  async explainPlacement(planningResult: PlanningResult): Promise<ExplanationResponse> {
    const systemPrompt = `You are explaining the automated polyhouse placement algorithm to a user. Be clear and educational.`;

    const userPrompt = `Explain why the polyhouses were placed the way they are, given:
- ${planningResult.polyhouses.length} polyhouses were placed
- Total land area: ${planningResult.metadata.totalLandArea.toFixed(2)} sqm
- Total polyhouse area: ${planningResult.metadata.totalPolyhouseArea.toFixed(2)} sqm
- Space utilization: ${planningResult.metadata.utilizationPercentage.toFixed(1)}%
- Configuration: Blocks are 8m x 4m, 2m gutter, 2m gap between polyhouses

Keep the explanation concise (2-3 paragraphs) and mention the key factors like solar orientation, spacing requirements, and maximizing space.`;

    return await this.invokeModel(systemPrompt, [
      { role: 'user', content: userPrompt },
    ]);
  }
}
