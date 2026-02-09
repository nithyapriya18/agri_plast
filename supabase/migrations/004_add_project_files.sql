-- Add table for project file attachments
-- Files can be uploaded per project version via chat or dashboard

CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Supabase Storage bucket for project files
-- This will be created via Supabase dashboard or API

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_created_at ON project_files(created_at DESC);

-- Row Level Security Policies
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Users can view files for projects they own
CREATE POLICY "Users can view files for own projects" ON project_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can insert files for projects they own
CREATE POLICY "Users can insert files for own projects" ON project_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can delete files for projects they own
CREATE POLICY "Users can delete files for own projects" ON project_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Comment on table
COMMENT ON TABLE project_files IS 'File attachments for projects - can be uploaded via chat or dashboard';
COMMENT ON COLUMN project_files.file_name IS 'Original filename uploaded by user';
COMMENT ON COLUMN project_files.storage_path IS 'Path in Supabase Storage bucket';
COMMENT ON COLUMN project_files.file_url IS 'Public or signed URL to access the file';
