-- User settings (DSL defaults). user_id references users(id).

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  polyhouse_gap REAL DEFAULT 2.0,
  max_side_length REAL DEFAULT 120.0,
  min_side_length REAL DEFAULT 8.0,
  min_corner_distance REAL DEFAULT 4.0,
  gutter_width REAL DEFAULT 2.0,
  block_width REAL DEFAULT 8.0,
  block_height REAL DEFAULT 4.0,
  solar_orientation_enabled BOOLEAN DEFAULT true,
  avoid_water BOOLEAN DEFAULT true,
  consider_slope BOOLEAN DEFAULT false,
  max_slope REAL DEFAULT 15.0,
  company_name TEXT,
  phone TEXT,
  max_land_area REAL DEFAULT 10000.0,
  land_leveling_override BOOLEAN DEFAULT false,
  safety_buffer REAL DEFAULT 1.0,
  placement_strategy TEXT DEFAULT 'balanced'
    CHECK (placement_strategy IN ('maximize_blocks', 'maximize_coverage', 'balanced', 'equal_area')),
  pricing_tier TEXT DEFAULT 'standard' CHECK (pricing_tier IN ('economy', 'standard', 'premium')),
  custom_pricing JSONB DEFAULT NULL,
  service_charge_percentage REAL DEFAULT 12.0,
  profit_margin_percentage REAL DEFAULT 22.0,
  gst_percentage REAL DEFAULT 18.0,
  transportation_cost_per_km REAL DEFAULT 18.0,
  installation_labor_rate REAL DEFAULT 75.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
