import { NextRequest, NextResponse } from 'next/server';
import { getUserPricing } from '@/lib/server/pricingService';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    const { pricing, settings } = await getUserPricing(userId);
    return NextResponse.json({
      pricing,
      settings: {
        pricingTier: settings.pricingTier,
        serviceChargePercentage: settings.serviceChargePercentage,
        profitMarginPercentage: settings.profitMarginPercentage,
        gstPercentage: settings.gstPercentage,
        transportationCostPerKm: settings.transportationCostPerKm,
        installationLaborRate: settings.installationLaborRate,
      },
      customPricing: settings.customPricing ?? pricing,
    });
  } catch (error) {
    console.error('User pricing error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user pricing', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
