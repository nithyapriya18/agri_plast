-- Add minimum_blocks_per_polyhouse setting to user_settings table
-- This setting controls the minimum number of blocks a polyhouse must have

DO $$
BEGIN
  -- Add minimum_blocks_per_polyhouse if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_settings' AND column_name='minimum_blocks_per_polyhouse') THEN
    ALTER TABLE public.user_settings ADD COLUMN minimum_blocks_per_polyhouse INTEGER DEFAULT 10;
  END IF;
END $$;

-- Add constraint to ensure the value is at least 1
ALTER TABLE public.user_settings
  ADD CONSTRAINT minimum_blocks_per_polyhouse_positive
  CHECK (minimum_blocks_per_polyhouse >= 1);

-- Update any NULL values to default of 10
UPDATE public.user_settings SET minimum_blocks_per_polyhouse = 10 WHERE minimum_blocks_per_polyhouse IS NULL;
