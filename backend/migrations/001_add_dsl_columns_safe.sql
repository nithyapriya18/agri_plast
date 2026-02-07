-- Migration: Add DSL columns for conversational-first redesign (SAFE VERSION)
-- Date: 2026-02-07
-- Description: Add JSONB columns for pricing preferences, design preferences, and learning profiles
-- This version handles existing constraints and columns gracefully

-- Add new columns to user_settings table (IF NOT EXISTS handles existing columns)
DO $$
BEGIN
    -- Add pricing_preferences if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings' AND column_name = 'pricing_preferences'
    ) THEN
        ALTER TABLE user_settings
        ADD COLUMN pricing_preferences JSONB DEFAULT '{
          "tier": "standard",
          "customizations": [],
          "businessSettings": {
            "serviceChargePercent": 10,
            "profitMarginPercent": 15,
            "gstPercent": 18,
            "transportCostPerKmTon": 50,
            "installationLaborRate": 200
          }
        }'::jsonb;
    END IF;

    -- Add design_preferences if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings' AND column_name = 'design_preferences'
    ) THEN
        ALTER TABLE user_settings
        ADD COLUMN design_preferences JSONB DEFAULT '{
          "cropType": "mixed",
          "polyhouseSizePreference": "mixed",
          "automationRequired": false,
          "vehicleAccessRequired": false,
          "priority": "balanced",
          "orientationPreference": "optimized",
          "timeline": "planned"
        }'::jsonb;
    END IF;

    -- Add learning_profile if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings' AND column_name = 'learning_profile'
    ) THEN
        ALTER TABLE user_settings
        ADD COLUMN learning_profile JSONB DEFAULT '{
          "projectCount": 0,
          "commonPatterns": [],
          "conversationInsights": []
        }'::jsonb;
    END IF;

    -- Add dsl_version if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_settings' AND column_name = 'dsl_version'
    ) THEN
        ALTER TABLE user_settings
        ADD COLUMN dsl_version INTEGER DEFAULT 1;
    END IF;
END $$;

-- Add indexes for JSON queries (IF NOT EXISTS handles existing indexes)
CREATE INDEX IF NOT EXISTS idx_user_settings_pricing_tier
  ON user_settings ((pricing_preferences->>'tier'));

CREATE INDEX IF NOT EXISTS idx_user_settings_design_priority
  ON user_settings ((design_preferences->>'priority'));

-- Add comments for documentation
DO $$
BEGIN
    EXECUTE 'COMMENT ON COLUMN user_settings.pricing_preferences IS ''User pricing tier and customizations (DSL format)''';
    EXECUTE 'COMMENT ON COLUMN user_settings.design_preferences IS ''User design preferences extracted from conversations (DSL format)''';
    EXECUTE 'COMMENT ON COLUMN user_settings.learning_profile IS ''AI-learned user preferences and patterns (DSL format)''';
    EXECUTE 'COMMENT ON COLUMN user_settings.dsl_version IS ''DSL schema version for migrations''';
EXCEPTION
    WHEN undefined_column THEN
        NULL; -- Column doesn't exist yet, skip comment
END $$;

-- Add new column to projects table for DSL snapshot
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'preferences_snapshot'
    ) THEN
        ALTER TABLE projects
        ADD COLUMN preferences_snapshot JSONB DEFAULT NULL;
    END IF;
END $$;

-- Add index for projects preferences snapshot
CREATE INDEX IF NOT EXISTS idx_projects_preferences_snapshot
  ON projects USING GIN (preferences_snapshot);

-- Add comment for documentation
DO $$
BEGIN
    EXECUTE 'COMMENT ON COLUMN projects.preferences_snapshot IS ''Snapshot of UserPreferencesDSL at project creation time''';
EXCEPTION
    WHEN undefined_column THEN
        NULL; -- Column doesn't exist yet, skip comment
END $$;

-- Create function to update learning profile on project creation
CREATE OR REPLACE FUNCTION update_learning_profile_on_project_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment project count in learning profile
  UPDATE user_settings
  SET learning_profile = jsonb_set(
    COALESCE(learning_profile, '{}'::jsonb),
    '{projectCount}',
    to_jsonb(COALESCE((learning_profile->>'projectCount')::int, 0) + 1)
  )
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update learning profile (safe drop and create)
DROP TRIGGER IF EXISTS trigger_update_learning_profile ON projects;
CREATE TRIGGER trigger_update_learning_profile
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_profile_on_project_create();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully! DSL columns added.';
END $$;
