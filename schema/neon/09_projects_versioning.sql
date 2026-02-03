-- Optional versioning for projects (replicate backend /api/projects behavior).
-- Run after 03_projects.sql. Existing rows get version=1, is_latest=true.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_name TEXT,
  ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true;

UPDATE projects
SET parent_project_id = COALESCE(parent_project_id, id), version = COALESCE(version, 1), is_latest = COALESCE(is_latest, true)
WHERE parent_project_id IS NULL OR version IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_parent_project_id ON projects(parent_project_id);
CREATE INDEX IF NOT EXISTS idx_projects_version ON projects(parent_project_id, version DESC);
