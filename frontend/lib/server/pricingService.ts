import { dbAdapter } from '@/lib/db';
import { DEFAULT_PRICING, type PricingConfiguration, type PricingTier } from '@/lib/server/data/pricingConfig';

export { DEFAULT_PRICING };

export interface UserPricingSettings {
  pricingTier: PricingTier;
  customPricing: Partial<PricingConfiguration> | null;
  serviceChargePercentage: number;
  profitMarginPercentage: number;
  gstPercentage: number;
  transportationCostPerKm: number;
  installationLaborRate: number;
}

function getDefaultSettings(): UserPricingSettings {
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

function mergePricing(base: PricingConfiguration, custom: Partial<PricingConfiguration>): PricingConfiguration {
  const merged = JSON.parse(JSON.stringify(base)) as PricingConfiguration;
  for (const [category, items] of Object.entries(custom)) {
    if (merged[category as keyof PricingConfiguration] && items && typeof items === 'object') {
      Object.assign(merged[category as keyof PricingConfiguration], items);
    }
  }
  return merged;
}

export async function getUserPricing(userId: string): Promise<{ pricing: PricingConfiguration; settings: UserPricingSettings }> {
  try {
    const data = await dbAdapter.getUserSettings(userId);
    if (!data) {
      return { pricing: DEFAULT_PRICING, settings: getDefaultSettings() };
    }
    const customPricing = (data.custom_pricing as Partial<PricingConfiguration>) ?? null;
    const mergedPricing = customPricing ? mergePricing(DEFAULT_PRICING, customPricing) : DEFAULT_PRICING;
    const settings: UserPricingSettings = {
      pricingTier: (data.pricing_tier as PricingTier) ?? 'standard',
      customPricing,
      serviceChargePercentage: data.service_charge_percentage ?? 12.0,
      profitMarginPercentage: data.profit_margin_percentage ?? 22.0,
      gstPercentage: data.gst_percentage ?? 18.0,
      transportationCostPerKm: data.transportation_cost_per_km ?? 18.0,
      installationLaborRate: data.installation_labor_rate ?? 75.0,
    };
    return { pricing: mergedPricing, settings };
  } catch {
    return { pricing: DEFAULT_PRICING, settings: getDefaultSettings() };
  }
}

export async function updateUserPricing(userId: string, updates: Partial<UserPricingSettings>): Promise<boolean> {
  try {
    const data: Record<string, unknown> = { user_id: userId };
    if (updates.pricingTier) data.pricing_tier = updates.pricingTier;
    if (updates.customPricing !== undefined) data.custom_pricing = updates.customPricing;
    if (updates.serviceChargePercentage !== undefined) data.service_charge_percentage = updates.serviceChargePercentage;
    if (updates.profitMarginPercentage !== undefined) data.profit_margin_percentage = updates.profitMarginPercentage;
    if (updates.gstPercentage !== undefined) data.gst_percentage = updates.gstPercentage;
    if (updates.transportationCostPerKm !== undefined) data.transportation_cost_per_km = updates.transportationCostPerKm;
    if (updates.installationLaborRate !== undefined) data.installation_labor_rate = updates.installationLaborRate;
    await dbAdapter.upsertUserSettings(userId, data as Parameters<typeof dbAdapter.upsertUserSettings>[1]);
    return true;
  } catch {
    return false;
  }
}

export async function resetToDefaults(userId: string): Promise<boolean> {
  try {
    await dbAdapter.upsertUserSettings(userId, {
      pricing_tier: 'standard',
      custom_pricing: null,
      service_charge_percentage: 12.0,
      profit_margin_percentage: 22.0,
      gst_percentage: 18.0,
      transportation_cost_per_km: 18.0,
      installation_labor_rate: 75.0,
    });
    return true;
  } catch {
    return false;
  }
}
