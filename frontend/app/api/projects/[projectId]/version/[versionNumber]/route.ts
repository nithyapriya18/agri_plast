import { NextRequest, NextResponse } from 'next/server';
import { dbAdapter } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; versionNumber: string }> }
) {
  try {
    const { projectId, versionNumber } = await params;
    if (!projectId || !versionNumber) {
      return NextResponse.json({ error: 'Project ID and version number are required' }, { status: 400 });
    }
    const num = parseInt(versionNumber, 10);
    if (Number.isNaN(num)) {
      return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
    }
    const project = await dbAdapter.getProjectByVersion(projectId, num);
    if (!project) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error fetching project version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
