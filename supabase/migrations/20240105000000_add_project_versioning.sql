-- Add project versioning support
-- Each save creates a new version, marking previous as not latest

-- Add version columns to projects table
DO $$
BEGIN
  -- Add version number column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='projects' AND column_name='version') THEN
    ALTER TABLE public.projects ADD COLUMN version INTEGER DEFAULT 1;
  END IF;

  -- Add parent project ID for version tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='projects' AND column_name='parent_project_id') THEN
    ALTER TABLE public.projects ADD COLUMN parent_project_id UUID;
    ALTER TABLE public.projects ADD CONSTRAINT fk_parent_project
      FOREIGN KEY (parent_project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  END IF;

  -- Add is_latest flag to quickly find latest version
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='projects' AND column_name='is_latest') THEN
    ALTER TABLE public.projects ADD COLUMN is_latest BOOLEAN DEFAULT true;
  END IF;

  -- Add version_name for user-friendly version labels
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='projects' AND column_name='version_name') THEN
    ALTER TABLE public.projects ADD COLUMN version_name TEXT;
  END IF;
END $$;

-- Create indexes for efficient version queries
CREATE INDEX IF NOT EXISTS idx_projects_parent_version
  ON public.projects(parent_project_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_projects_latest
  ON public.projects(user_id, is_latest)
  WHERE is_latest = true;

CREATE INDEX IF NOT EXISTS idx_projects_created
  ON public.projects(created_at DESC);

-- Update existing projects to have version 1
UPDATE public.projects
SET version = 1, is_latest = true
WHERE version IS NULL;

-- Add comment explaining the versioning system
COMMENT ON COLUMN public.projects.version IS 'Version number, increments with each save';
COMMENT ON COLUMN public.projects.parent_project_id IS 'Points to the first version of this project (NULL for v1)';
COMMENT ON COLUMN public.projects.is_latest IS 'True only for the most recent version';
COMMENT ON COLUMN public.projects.version_name IS 'Optional user-friendly version label';
