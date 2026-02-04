import { NextRequest, NextResponse } from 'next/server';
import { updateUserPricing } from '@/lib/server/pricingService';
import type { UserPricingSettings } from '@/lib/server/pricingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, updates } = body as { userId?: string; updates?: Partial<UserPricingSettings> };
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'updates object is required' }, { status: 400 });
    }
    const success = await updateUserPricing(userId, updates);
    if (success) {
      return NextResponse.json({ success: true, message: 'Pricing updated successfully' });
    }
    return NextResponse.json({ success: false, error: 'Failed to update pricing' }, { status: 500 });
  } catch (error) {
    console.error('Update pricing error:', error);
    return NextResponse.json(
      { error: 'Failed to update user pricing', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
