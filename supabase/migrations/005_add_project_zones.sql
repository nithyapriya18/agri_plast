-- Migration: Add support for multiple KML zones per project
-- Created: 2026-02-09
-- Purpose: Enable users to upload multiple KML files and classify them as inclusion or exclusion zones

-- Create project_zones table
CREATE TABLE IF NOT EXISTS project_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  zone_type TEXT NOT NULL CHECK (zone_type IN ('inclusion', 'exclusion')),
  name TEXT NOT NULL,
  coordinates JSONB NOT NULL,  -- Array of Coordinate objects {lat, lng}
  area_sqm REAL NOT NULL,
  file_name TEXT,
  color TEXT NOT NULL,  -- Hex color for map visualization
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_project_zones_project_id ON project_zones(project_id);
CREATE INDEX idx_project_zones_zone_type ON project_zones(zone_type);

-- Add RLS (Row Level Security) policies
ALTER TABLE project_zones ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view zones for projects they own
CREATE POLICY "Users can view their own project zones"
  ON project_zones
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert zones for projects they own
CREATE POLICY "Users can insert zones for their own projects"
  ON project_zones
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update zones for projects they own
CREATE POLICY "Users can update their own project zones"
  ON project_zones
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete zones for projects they own
CREATE POLICY "Users can delete their own project zones"
  ON project_zones
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_project_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_zones_updated_at
  BEFORE UPDATE ON project_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_project_zones_updated_at();

-- Create Supabase Storage bucket for zone KML files (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-zones', 'project-zones', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project-zones bucket
CREATE POLICY "Users can upload zone files for their projects"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'project-zones' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view zone files for their projects"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'project-zones' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete zone files for their projects"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'project-zones' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE user_id = auth.uid()
    )
  );
