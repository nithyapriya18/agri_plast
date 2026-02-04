import { NextRequest, NextResponse } from 'next/server';
import { loadPlanIntoMemory } from '@/lib/server/planningHandlers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await loadPlanIntoMemory(body);
    return NextResponse.json(result.json, { status: result.status });
  } catch (error) {
    console.error('Planning load error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
