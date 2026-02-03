-- Add pricing configuration columns to user_settings table
-- This is safe to run multiple times (uses IF NOT EXISTS)

DO $$
BEGIN
  -- Add pricing_tier if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_settings' AND column_name='pricing_tier') THEN
    ALTER TABLE public.user_settings ADD COLUMN pricing_tier TEXT DEFAULT 'standard';
  END IF;

  -- Add custom_pricing if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_settings' AND column_name='custom_pricing') THEN
    ALTER TABLE public.user_settings ADD COLUMN custom_pricing JSONB;
  END IF;

  -- Add service_charge_percentage if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_settings' AND column_name='service_charge_percentage') THEN
    ALTER TABLE public.user_settings ADD COLUMN service_charge_percentage REAL DEFAULT 12.0;
  END IF;

  -- Add profit_margin_percentage if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_settings' AND column_name='profit_margin_percentage') THEN
    ALTER TABLE public.user_settings ADD COLUMN profit_margin_percentage REAL DEFAULT 22.0;
  END IF;

  -- Add gst_percentage if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_settings' AND column_name='gst_percentage') THEN
    ALTER TABLE public.user_settings ADD COLUMN gst_percentage REAL DEFAULT 18.0;
  END IF;

  -- Add transportation_cost_per_km if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_settings' AND column_name='transportation_cost_per_km') THEN
    ALTER TABLE public.user_settings ADD COLUMN transportation_cost_per_km REAL DEFAULT 18.0;
  END IF;

  -- Add installation_labor_rate if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_settings' AND column_name='installation_labor_rate') THEN
    ALTER TABLE public.user_settings ADD COLUMN installation_labor_rate REAL DEFAULT 75.0;
  END IF;
END $$;
