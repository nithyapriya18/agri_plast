# Dark Mode & Project Versioning Implementation

## Features to Implement

### 1. Dark Mode (Global)
- Toggle available in all pages
- Persists across sessions
- Applies to: Dashboard, Settings, Pricing, Project views

### 2. Project Versioning
- Auto-save creates new version (doesn't leave page)
- Each project has multiple versions
- Latest version shown by default
- Can navigate between versions
- Dashboard shows versions (nested/expandable)

## Database Schema Changes Needed

```sql
-- Add version tracking to projects table
ALTER TABLE projects ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE projects ADD COLUMN parent_project_id UUID REFERENCES projects(id);
ALTER TABLE projects ADD COLUMN is_latest BOOLEAN DEFAULT true;

-- Create index for version queries
CREATE INDEX idx_projects_parent_version ON projects(parent_project_id, version);
CREATE INDEX idx_projects_latest ON projects(user_id, is_latest) WHERE is_latest = true;
```

## Implementation Plan

1. **Dark Mode**: Add dark: classes to all pages
2. **Version Save**: Modify save logic to create new version
3. **Version History**: Add UI component to show/navigate versions
4. **Dashboard Update**: Show versions in expandable rows
