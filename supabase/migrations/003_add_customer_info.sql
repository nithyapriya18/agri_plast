-- Add customer information fields to projects table
-- These are optional fields that can be filled by the user

ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Add indexes for customer fields (for searching)
CREATE INDEX IF NOT EXISTS idx_projects_customer_name ON projects(customer_name);
CREATE INDEX IF NOT EXISTS idx_projects_customer_email ON projects(customer_email);

-- Comment on columns
COMMENT ON COLUMN projects.customer_name IS 'Optional: Customer/Client name for this project';
COMMENT ON COLUMN projects.customer_email IS 'Optional: Customer email address';
COMMENT ON COLUMN projects.customer_phone IS 'Optional: Customer contact phone number';
COMMENT ON COLUMN projects.customer_address IS 'Optional: Customer address or site location';
