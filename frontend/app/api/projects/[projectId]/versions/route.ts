import { NextRequest, NextResponse } from 'next/server';
import { dbAdapter } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    const versions = await dbAdapter.getProjectVersions(projectId);
    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching project versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
