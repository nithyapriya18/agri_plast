import { NextRequest, NextResponse } from 'next/server';
import { dbAdapter } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    const startDate = request.nextUrl.searchParams.get('startDate');
    const endDate = request.nextUrl.searchParams.get('endDate');
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const summary = await dbAdapter.getLlmUsageSummary(userId, start, end);
    const logs = await dbAdapter.getLlmUsageLogs(userId, { startDate: start, endDate: end });

    const totalInputTokens = logs.reduce((s, u) => s + u.input_tokens, 0);
    const totalOutputTokens = logs.reduce((s, u) => s + u.output_tokens, 0);
    const totalCost = logs.reduce((s, u) => s + u.input_cost + u.output_cost, 0);
    const withDuration = logs.filter((u) => u.request_duration_ms != null);
    const avgRequestDuration = withDuration.length
      ? withDuration.reduce((s, u) => s + (u.request_duration_ms ?? 0), 0) / withDuration.length
      : 0;

    const byOperation: Record<string, { requests: number; tokens: number; cost: number }> = {};
    logs.forEach((u) => {
      if (!byOperation[u.operation_type]) {
        byOperation[u.operation_type] = { requests: 0, tokens: 0, cost: 0 };
      }
      byOperation[u.operation_type].requests++;
      byOperation[u.operation_type].tokens += u.input_tokens + u.output_tokens;
      byOperation[u.operation_type].cost += u.input_cost + u.output_cost;
    });

    return NextResponse.json({
      totalRequests: summary.requestCount,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: summary.totalTokens,
      totalCost: summary.totalCost,
      avgRequestDuration,
      byOperation,
    });
  } catch (error) {
    console.error('Usage summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage summary', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
