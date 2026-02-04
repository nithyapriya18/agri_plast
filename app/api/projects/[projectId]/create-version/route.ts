import { NextRequest, NextResponse } from 'next/server';
import { dbAdapter } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const { planningResult, quotation, versionName } = body;
    const project = await dbAdapter.createProjectVersion(projectId, {
      planningResult,
      quotation,
      versionName,
    });
    const version = (project as { version?: number }).version ?? 1;
    return NextResponse.json({
      project,
      version,
      message: `Saved as Version ${version}`,
    });
  } catch (error) {
    console.error('Error creating project version:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Project not found') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to create version', message },
      { status: 500 }
    );
  }
}
