-- Rollback Migration: Remove DSL columns
-- Date: 2026-02-07
-- Description: Rollback script for 001_add_dsl_columns.sql

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_update_learning_profile ON projects;
DROP FUNCTION IF EXISTS update_learning_profile_on_project_create();

-- Drop indexes
DROP INDEX IF EXISTS idx_projects_preferences_snapshot;
DROP INDEX IF EXISTS idx_user_settings_design_priority;
DROP INDEX IF EXISTS idx_user_settings_pricing_tier;

-- Remove columns from projects table
ALTER TABLE projects
DROP COLUMN IF EXISTS preferences_snapshot;

-- Remove columns from user_settings table
ALTER TABLE user_settings
DROP COLUMN IF EXISTS dsl_version,
DROP COLUMN IF EXISTS learning_profile,
DROP COLUMN IF EXISTS design_preferences,
DROP COLUMN IF EXISTS pricing_preferences;
