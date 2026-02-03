import { NextRequest, NextResponse } from 'next/server';
import { resetToDefaults } from '@/lib/server/pricingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body?.userId;
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    const success = await resetToDefaults(userId);
    if (success) {
      return NextResponse.json({ success: true, message: 'Pricing reset to defaults successfully' });
    }
    return NextResponse.json({ success: false, error: 'Failed to reset pricing' }, { status: 500 });
  } catch (error) {
    console.error('Reset pricing error:', error);
    return NextResponse.json(
      { error: 'Failed to reset pricing', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
