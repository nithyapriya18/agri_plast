import { NextRequest, NextResponse } from 'next/server';
import { createPlan } from '@/lib/server/planningHandlers';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createPlan(body);
    return NextResponse.json(result.json, { status: result.status });
  } catch (error) {
    console.error('Planning create error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
