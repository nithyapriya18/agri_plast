-- Projects (saved plans). user_id references users(id).

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  customer_company_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  location_name TEXT,
  location_address TEXT,
  land_area_sqm REAL NOT NULL,
  land_boundary JSONB NOT NULL,
  polyhouse_count INTEGER NOT NULL,
  total_coverage_sqm REAL NOT NULL,
  utilization_percentage REAL NOT NULL,
  estimated_cost REAL NOT NULL,
  polyhouses JSONB NOT NULL,
  quotation JSONB NOT NULL,
  terrain_analysis JSONB,
  regulatory_compliance JSONB,
  configuration JSONB NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'quoted', 'approved', 'installed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
