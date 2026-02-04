import { NextRequest, NextResponse } from 'next/server';
import { updatePlan } from '@/lib/server/planningHandlers';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await updatePlan(body);
    return NextResponse.json(result.json, { status: result.status });
  } catch (error) {
    console.error('Planning update error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
