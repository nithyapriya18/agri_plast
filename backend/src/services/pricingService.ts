/**
 * Pricing Configuration Service
 * Manages user-specific pricing configurations and provides pricing data
 */

import { supabase } from '../lib/supabase';
import { DEFAULT_PRICING, PricingConfiguration, PricingTier } from '../data/pricingConfig';

export interface UserPricingSettings {
  pricingTier: PricingTier;
  customPricing: Partial<PricingConfiguration> | null;
  serviceChargePercentage: number;
  profitMarginPercentage: number;
  gstPercentage: number;
  transportationCostPerKm: number;
  installationLaborRate: number;
}

export class PricingService {
  /**
   * Get user's pricing configuration (custom or default)
   */
  async getUserPricing(userId: string): Promise<{
    pricing: PricingConfiguration;
    settings: UserPricingSettings;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('pricing_tier, custom_pricing, service_charge_percentage, profit_margin_percentage, gst_percentage, transportation_cost_per_km, installation_labor_rate')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.warn('Failed to load user pricing, using defaults:', error);
        return {
          pricing: DEFAULT_PRICING,
          settings: this.getDefaultSettings(),
        };
      }

      // Merge custom pricing with defaults
      const basePricing = DEFAULT_PRICING;
      const customPricing = data?.custom_pricing as Partial<PricingConfiguration> || null;

      const mergedPricing = customPricing
        ? this.mergePricing(basePricing, customPricing)
        : basePricing;

      const settings: UserPricingSettings = {
        pricingTier: (data?.pricing_tier as PricingTier) || 'standard',
        customPricing: customPricing,
        serviceChargePercentage: data?.service_charge_percentage || 12.0,
        profitMarginPercentage: data?.profit_margin_percentage || 22.0,
        gstPercentage: data?.gst_percentage || 18.0,
        transportationCostPerKm: data?.transportation_cost_per_km || 18.0,
        installationLaborRate: data?.installation_labor_rate || 75.0,
      };

      return { pricing: mergedPricing, settings };
    } catch (error) {
      console.error('Error fetching user pricing:', error);
      return {
        pricing: DEFAULT_PRICING,
        settings: this.getDefaultSettings(),
      };
    }
  }

  /**
   * Update user's pricing configuration
   */
  async updateUserPricing(
    userId: string,
    updates: Partial<UserPricingSettings>
  ): Promise<boolean> {
    try {
      const updateData: any = { user_id: userId };

      if (updates.pricingTier) updateData.pricing_tier = updates.pricingTier;
      if (updates.customPricing !== undefined) updateData.custom_pricing = updates.customPricing;
      if (updates.serviceChargePercentage !== undefined) updateData.service_charge_percentage = updates.serviceChargePercentage;
      if (updates.profitMarginPercentage !== undefined) updateData.profit_margin_percentage = updates.profitMarginPercentage;
      if (updates.gstPercentage !== undefined) updateData.gst_percentage = updates.gstPercentage;
      if (updates.transportationCostPerKm !== undefined) updateData.transportation_cost_per_km = updates.transportationCostPerKm;
      if (updates.installationLaborRate !== undefined) updateData.installation_labor_rate = updates.installationLaborRate;

      const { error } = await supabase
        .from('user_settings')
        .upsert(updateData, { onConflict: 'user_id' });

      if (error) {
        console.error('Failed to update user pricing:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating user pricing:', error);
      return false;
    }
  }

  /**
   * Reset user pricing to defaults
   */
  async resetToDefaults(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          pricing_tier: 'standard',
          custom_pricing: null,
          service_charge_percentage: 12.0,
          profit_margin_percentage: 22.0,
          gst_percentage: 18.0,
          transportation_cost_per_km: 18.0,
          installation_labor_rate: 75.0,
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Failed to reset pricing:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error resetting pricing:', error);
      return false;
    }
  }

  /**
   * Get default pricing settings
   */
  private getDefaultSettings(): UserPricingSettings {
    return {
      pricingTier: 'standard',
      customPricing: null,
      serviceChargePercentage: 12.0,
      profitMarginPercentage: 22.0,
      gstPercentage: 18.0,
      transportationCostPerKm: 18.0,
      installationLaborRate: 75.0,
    };
  }

  /**
   * Deep merge custom pricing with default pricing
   */
  private mergePricing(
    base: PricingConfiguration,
    custom: Partial<PricingConfiguration>
  ): PricingConfiguration {
    const merged = JSON.parse(JSON.stringify(base)) as PricingConfiguration;

    for (const [category, items] of Object.entries(custom)) {
      if (merged[category as keyof PricingConfiguration]) {
        Object.assign(
          merged[category as keyof PricingConfiguration],
          items
        );
      }
    }

    return merged;
  }

  /**
   * Get pricing for a specific item at a tier
   */
  getPriceForItem(
    pricing: PricingConfiguration,
    category: keyof PricingConfiguration,
    item: string,
    tier: PricingTier
  ): number {
    const categoryPricing = pricing[category] as any;
    const itemPricing = categoryPricing?.[item];

    if (!itemPricing || typeof itemPricing[tier] !== 'number') {
      return 0;
    }

    return itemPricing[tier];
  }
}

export const pricingService = new PricingService();
