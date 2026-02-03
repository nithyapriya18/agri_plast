import { NextRequest, NextResponse } from 'next/server';
import { dbAdapter } from '@/lib/db';

const DEFAULT_SETTINGS = {
  polyhouse_gap: 2.0,
  max_side_length: 120.0,
  min_side_length: 8.0,
  min_corner_distance: 4.0,
  gutter_width: 2.0,
  block_width: 8.0,
  block_height: 4.0,
  safety_buffer: 1.0,
  max_land_area: 10000.0,
  placement_strategy: 'balanced',
  solar_orientation_enabled: true,
  avoid_water: true,
  consider_slope: false,
  max_slope: 15.0,
  land_leveling_override: false,
};

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    const row = await dbAdapter.getUserSettings(userId);
    const settings = row
      ? {
          polyhouse_gap: row.polyhouse_gap ?? DEFAULT_SETTINGS.polyhouse_gap,
          max_side_length: row.max_side_length ?? DEFAULT_SETTINGS.max_side_length,
          min_side_length: row.min_side_length ?? DEFAULT_SETTINGS.min_side_length,
          min_corner_distance: row.min_corner_distance ?? DEFAULT_SETTINGS.min_corner_distance,
          gutter_width: row.gutter_width ?? DEFAULT_SETTINGS.gutter_width,
          block_width: row.block_width ?? DEFAULT_SETTINGS.block_width,
          block_height: row.block_height ?? DEFAULT_SETTINGS.block_height,
          safety_buffer: row.safety_buffer ?? DEFAULT_SETTINGS.safety_buffer,
          max_land_area: row.max_land_area ?? DEFAULT_SETTINGS.max_land_area,
          placement_strategy: row.placement_strategy ?? DEFAULT_SETTINGS.placement_strategy,
          solar_orientation_enabled: row.solar_orientation_enabled ?? DEFAULT_SETTINGS.solar_orientation_enabled,
          avoid_water: row.avoid_water ?? DEFAULT_SETTINGS.avoid_water,
          consider_slope: row.consider_slope ?? DEFAULT_SETTINGS.consider_slope,
          max_slope: row.max_slope ?? DEFAULT_SETTINGS.max_slope,
          land_leveling_override: row.land_leveling_override ?? DEFAULT_SETTINGS.land_leveling_override,
        }
      : DEFAULT_SETTINGS;
    return NextResponse.json(settings);
  } catch (error) {
    console.error('User settings GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user settings', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...settings } = body as { userId?: string; [k: string]: unknown };
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    await dbAdapter.upsertUserSettings(userId, settings);
    return NextResponse.json({ success: true, settings: body });
  } catch (error) {
    console.error('User settings PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update user settings', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
