import { NextResponse } from 'next/server';
import { materialsCatalog } from '@/lib/server/data/materials';

export async function GET() {
  try {
    return NextResponse.json({ materials: materialsCatalog });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch materials', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
