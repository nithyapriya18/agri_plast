import { NextResponse } from 'next/server';
import { DEFAULT_PRICING } from '@/lib/server/pricingService';

export async function GET() {
  try {
    return NextResponse.json({
      pricing: DEFAULT_PRICING,
      description: 'Default Agriplast pricing catalog with economy, standard, and premium tiers',
    });
  } catch (error) {
    console.error('Default pricing error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch default pricing', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
