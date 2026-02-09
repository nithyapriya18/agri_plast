-- Add fill_gaps_with_smaller_polyhouses setting to user_settings
-- This controls whether the optimizer should add smaller polyhouses to fill remaining gaps
-- Default: true (maximize coverage with medium and small polyhouses)

ALTER TABLE user_settings
ADD COLUMN fill_gaps_with_smaller_polyhouses BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN user_settings.fill_gaps_with_smaller_polyhouses IS
'When true (default), optimizer will add smaller polyhouses (500-4000 sqm) to fill gaps after placing large ones for maximum coverage. When false, only large polyhouses (8000-10000 sqm) are placed for lower cost and simpler construction.';
