import { NextRequest, NextResponse } from 'next/server';
import { dbAdapter } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    const onlyLatest = request.nextUrl.searchParams.get('onlyLatest') === 'true';
    const projects = onlyLatest
      ? await dbAdapter.getProjectsByUserIdLatest(userId)
      : await dbAdapter.getProjectsByUserId(userId);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.user_id;
    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    const project = await dbAdapter.insertProject({
      user_id: userId,
      name: body.name ?? 'Untitled',
      description: body.description ?? null,
      land_area_sqm: Number(body.land_area_sqm) || 0,
      land_boundary: body.land_boundary ?? [],
      polyhouse_count: Number(body.polyhouse_count) || 0,
      total_coverage_sqm: Number(body.total_coverage_sqm) || 0,
      utilization_percentage: Number(body.utilization_percentage) || 0,
      estimated_cost: Number(body.estimated_cost) || 0,
      polyhouses: body.polyhouses ?? [],
      quotation: body.quotation ?? {},
      configuration: body.configuration ?? {},
      status: body.status ?? 'draft',
    });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
