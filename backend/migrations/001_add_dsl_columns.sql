-- Migration: Add DSL columns for conversational-first redesign
-- Date: 2026-02-07
-- Description: Add JSONB columns for pricing preferences, design preferences, and learning profiles

-- Add new columns to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS pricing_preferences JSONB DEFAULT '{
  "tier": "standard",
  "customizations": [],
  "businessSettings": {
    "serviceChargePercent": 10,
    "profitMarginPercent": 15,
    "gstPercent": 18,
    "transportCostPerKmTon": 50,
    "installationLaborRate": 200
  }
}'::jsonb,
ADD COLUMN IF NOT EXISTS design_preferences JSONB DEFAULT '{
  "cropType": "mixed",
  "polyhouseSizePreference": "mixed",
  "automationRequired": false,
  "vehicleAccessRequired": false,
  "priority": "balanced",
  "orientationPreference": "optimized",
  "timeline": "planned"
}'::jsonb,
ADD COLUMN IF NOT EXISTS learning_profile JSONB DEFAULT '{
  "projectCount": 0,
  "commonPatterns": [],
  "conversationInsights": []
}'::jsonb,
ADD COLUMN IF NOT EXISTS dsl_version INTEGER DEFAULT 1;

-- Add indexes for JSON queries (improves performance)
CREATE INDEX IF NOT EXISTS idx_user_settings_pricing_tier
  ON user_settings ((pricing_preferences->>'tier'));

CREATE INDEX IF NOT EXISTS idx_user_settings_design_priority
  ON user_settings ((design_preferences->>'priority'));

-- Add comment for documentation
COMMENT ON COLUMN user_settings.pricing_preferences IS 'User pricing tier and customizations (DSL format)';
COMMENT ON COLUMN user_settings.design_preferences IS 'User design preferences extracted from conversations (DSL format)';
COMMENT ON COLUMN user_settings.learning_profile IS 'AI-learned user preferences and patterns (DSL format)';
COMMENT ON COLUMN user_settings.dsl_version IS 'DSL schema version for migrations';

-- Add new column to projects table for DSL snapshot
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS preferences_snapshot JSONB DEFAULT NULL;

-- Add index for projects preferences snapshot
CREATE INDEX IF NOT EXISTS idx_projects_preferences_snapshot
  ON projects USING GIN (preferences_snapshot);

-- Add comment for documentation
COMMENT ON COLUMN projects.preferences_snapshot IS 'Snapshot of UserPreferencesDSL at project creation time';

-- Create function to update learning profile on project creation
CREATE OR REPLACE FUNCTION update_learning_profile_on_project_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment project count in learning profile
  UPDATE user_settings
  SET learning_profile = jsonb_set(
    learning_profile,
    '{projectCount}',
    to_jsonb((learning_profile->>'projectCount')::int + 1)
  )
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update learning profile
DROP TRIGGER IF EXISTS trigger_update_learning_profile ON projects;
CREATE TRIGGER trigger_update_learning_profile
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_profile_on_project_create();

-- Grant necessary permissions (adjust role as needed)
-- GRANT SELECT, UPDATE ON user_settings TO authenticated;
-- GRANT SELECT, INSERT ON projects TO authenticated;
