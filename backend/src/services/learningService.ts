/**
 * Learning Profile Service
 * Tracks and learns user preferences over time for AI personalization
 */

import { supabase } from '../lib/supabase';
import { LearningProfile } from '@shared/types';

export class LearningService {
  /**
   * Get user's learning profile
   */
  async getLearningProfile(userId: string): Promise<LearningProfile> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('learning_profile, pricing_preferences, design_preferences')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found
        throw error;
      }

      if (!data || !data.learning_profile) {
        // Return default learning profile
        return this.getDefaultLearningProfile();
      }

      return {
        projectCount: data.learning_profile.projectCount || 0,
        commonPatterns: data.learning_profile.commonPatterns || [],
        lastModified: data.learning_profile.lastModified
          ? new Date(data.learning_profile.lastModified)
          : new Date(),
        conversationInsights: data.learning_profile.conversationInsights || [],
        preferredSettings: data.learning_profile.preferredSettings || undefined,
      };
    } catch (error) {
      console.error('Error loading learning profile:', error);
      return this.getDefaultLearningProfile();
    }
  }

  /**
   * Record a preference pattern
   */
  async recordPreference(
    userId: string,
    pattern: string,
    context?: {
      cropType?: string;
      placementStrategy?: string;
      pricingTier?: string;
    }
  ): Promise<void> {
    try {
      const profile = await this.getLearningProfile(userId);

      // Add pattern if not already in common patterns
      const patterns = new Set(profile.commonPatterns);
      patterns.add(pattern);

      // Add contextual insight
      let insight = pattern;
      if (context) {
        if (context.cropType) insight += ` for ${context.cropType}`;
        if (context.placementStrategy) insight += ` using ${context.placementStrategy} strategy`;
        if (context.pricingTier) insight += ` with ${context.pricingTier} tier`;
      }

      const insights = new Set(profile.conversationInsights);
      insights.add(insight);

      // Update learning profile
      await this.updateLearningProfile(userId, {
        ...profile,
        commonPatterns: Array.from(patterns),
        conversationInsights: Array.from(insights),
        lastModified: new Date(),
      });
    } catch (error) {
      console.error('Error recording preference:', error);
    }
  }

  /**
   * Extract patterns from conversation history
   */
  async extractPatternsFromConversation(
    userId: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<string[]> {
    const patterns: string[] = [];

    // Keywords to look for in user messages
    const keywords = {
      coverage: ['maximize', 'fill', 'coverage', 'space', 'utilize', 'more polyhouses'],
      quality: ['quality', 'premium', 'high-end', 'best', 'larger', 'spacing'],
      cost: ['cheap', 'economy', 'budget', 'cost', 'affordable', 'save money'],
      automation: ['automat', 'sensor', 'smart', 'iot', 'control'],
      crops: ['tomato', 'cucumber', 'flower', 'rose', 'lettuce', 'herb', 'vegetable'],
    };

    for (const msg of conversationHistory) {
      if (msg.role !== 'user') continue;

      const content = msg.content.toLowerCase();

      // Check for patterns
      if (keywords.coverage.some(kw => content.includes(kw))) {
        patterns.push('Prefers maximum coverage');
      }
      if (keywords.quality.some(kw => content.includes(kw))) {
        patterns.push('Values quality over quantity');
      }
      if (keywords.cost.some(kw => content.includes(kw))) {
        patterns.push('Cost-conscious');
      }
      if (keywords.automation.some(kw => content.includes(kw))) {
        patterns.push('Interested in automation');
      }

      // Extract crop mentions
      for (const crop of keywords.crops) {
        if (content.includes(crop)) {
          patterns.push(`Grows ${crop}s`);
        }
      }
    }

    // Record patterns
    for (const pattern of patterns) {
      await this.recordPreference(userId, pattern);
    }

    return [...new Set(patterns)]; // Remove duplicates
  }

  /**
   * Get AI-friendly summary of learning profile
   */
  async getLearningProfileSummary(userId: string): Promise<string> {
    const profile = await this.getLearningProfile(userId);

    if (profile.projectCount === 0) {
      return 'New user with no project history.';
    }

    let summary = `User has created ${profile.projectCount} project(s). `;

    if (profile.commonPatterns.length > 0) {
      summary += `Common preferences: ${profile.commonPatterns.slice(0, 5).join(', ')}. `;
    }

    if (profile.conversationInsights.length > 0) {
      summary += `Key insights: ${profile.conversationInsights.slice(0, 3).join(', ')}.`;
    }

    return summary;
  }

  /**
   * Apply learned preferences to a new project
   */
  async applyLearnedPreferences(userId: string): Promise<any> {
    const profile = await this.getLearningProfile(userId);

    if (!profile.preferredSettings) {
      return null; // No learned preferences yet
    }

    return profile.preferredSettings;
  }

  /**
   * Update learning profile
   */
  private async updateLearningProfile(
    userId: string,
    profile: LearningProfile
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: userId,
            learning_profile: {
              projectCount: profile.projectCount,
              commonPatterns: profile.commonPatterns,
              lastModified: profile.lastModified.toISOString(),
              conversationInsights: profile.conversationInsights,
              preferredSettings: profile.preferredSettings,
            },
          },
          {
            onConflict: 'user_id',
          }
        );

      if (error) throw error;
    } catch (error) {
      console.error('Error updating learning profile:', error);
      throw error;
    }
  }

  /**
   * Get default learning profile
   */
  private getDefaultLearningProfile(): LearningProfile {
    return {
      projectCount: 0,
      commonPatterns: [],
      lastModified: new Date(),
      conversationInsights: [],
      preferredSettings: undefined,
    };
  }

  /**
   * Increment project count (called automatically by trigger)
   * This is a manual method for cases where trigger doesn't fire
   */
  async incrementProjectCount(userId: string): Promise<void> {
    try {
      const profile = await this.getLearningProfile(userId);
      await this.updateLearningProfile(userId, {
        ...profile,
        projectCount: profile.projectCount + 1,
      });
    } catch (error) {
      console.error('Error incrementing project count:', error);
    }
  }
}

// Export singleton instance
export const learningService = new LearningService();
