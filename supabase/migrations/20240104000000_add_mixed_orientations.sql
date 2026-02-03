-- Add allow_mixed_orientations column to user_settings table
-- This is safe to run multiple times (uses IF NOT EXISTS)

DO $$
BEGIN
  -- Add allow_mixed_orientations if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_settings' AND column_name='allow_mixed_orientations') THEN
    ALTER TABLE public.user_settings ADD COLUMN allow_mixed_orientations BOOLEAN DEFAULT false;
  END IF;
END $$;
