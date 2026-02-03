# Dark Mode & Project Versioning - Implementation Guide

## ✅ Already Completed

### 1. Dark Mode Foundation
- ✓ Installed `next-themes` package
- ✓ Created `ThemeProvider` component
- ✓ Created `ThemeToggle` component
- ✓ Updated root layout with theme support
- ✓ Configured Tailwind for dark mode (`darkMode: 'class'`)

### 2. Versioning Foundation
- ✓ Created database migration (`20240105000000_add_project_versioning.sql`)
- ✓ Created `VersionHistory` component
- ✓ Added columns: `version`, `parent_project_id`, `is_latest`, `version_name`

## 🔨 Next Steps

### Step 1: Run Database Migration

In Supabase SQL Editor, run:
```sql
-- See: supabase/migrations/20240105000000_add_project_versioning.sql
```

This adds:
- `version` (INTEGER) - Version number
- `parent_project_id` (UUID) - Links to first version
- `is_latest` (BOOLEAN) - Marks latest version
- `version_name` (TEXT) - Optional user label

### Step 2: Add Dark Mode to Pages

For each page, add dark mode variants to className:

**Pattern**:
```tsx
// Before
className="bg-white text-gray-900 border-gray-200"

// After
className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700"
```

**Common Replacements**:
- `bg-gray-50` → `bg-gray-50 dark:bg-gray-900`
- `bg-white` → `bg-white dark:bg-gray-800`
- `text-gray-900` → `text-gray-900 dark:text-gray-100`
- `text-gray-600` → `text-gray-600 dark:text-gray-400`
- `border-gray-200` → `border-gray-200 dark:border-gray-700`
- Input fields: `bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600`

**Pages to Update**:
1. `/app/dashboard/page.tsx`
2. `/app/settings/page.tsx`
3. `/app/settings/pricing/page.tsx`
4. `/app/projects/[id]/page.tsx`
5. `/app/projects/new/page.tsx`

### Step 3: Add Theme Toggle to Headers

Add to each page header (after title/logo):

```tsx
import { ThemeToggle } from '@/components/ThemeToggle';

// In header section:
<div className="flex items-center gap-4">
  <ThemeToggle />
  {/* existing header content */}
</div>
```

### Step 4: Add Versioning Backend Routes

Create `/backend/src/routes/versions.ts`:

```typescript
import { Router } from 'express';
import { supabase } from '../lib/supabase';

export const versionsRouter = Router();

// Get all versions of a project
versionsRouter.get('/:projectId/versions', async (req, res) => {
  const { projectId } = req.params;

  // Get parent_project_id (or use projectId if it's v1)
  const { data: project } = await supabase
    .from('projects')
    .select('id, parent_project_id')
    .eq('id', projectId)
    .single();

  const rootId = project?.parent_project_id || projectId;

  // Get all versions
  const { data: versions } = await supabase
    .from('projects')
    .select('id, version, version_name, created_at, is_latest')
    .or(`id.eq.${rootId},parent_project_id.eq.${rootId}`)
    .order('version', { ascending: false });

  res.json({ versions });
});

// Create new version (on save)
versionsRouter.post('/:projectId/create-version', async (req, res) => {
  const { projectId } = req.params;
  const { planningResult, quotation } = req.body;

  // Get current project
  const { data: currentProject } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  const rootId = currentProject.parent_project_id || currentProject.id;
  const newVersion = currentProject.version + 1;

  // Mark all versions as not latest
  await supabase
    .from('projects')
    .update({ is_latest: false })
    .or(`id.eq.${rootId},parent_project_id.eq.${rootId}`);

  // Create new version
  const { data: newVersionProject } = await supabase
    .from('projects')
    .insert({
      ...currentProject,
      id: undefined, // Let DB generate new ID
      parent_project_id: rootId,
      version: newVersion,
      is_latest: true,
      planning_result: planningResult,
      quotation,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  res.json({ project: newVersionProject, version: newVersion });
});
```

Register in `backend/src/index.ts`:
```typescript
import { versionsRouter } from './routes/versions';
app.use('/api/projects', versionsRouter);
```

### Step 5: Update Project Save Logic

In `/app/projects/[id]/page.tsx`:

```tsx
const handleSave = async () => {
  setSaving(true);
  try {
    // Create new version instead of updating
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/create-version`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planningResult: project.planningResult,
          quotation: project.quotation,
        }),
      }
    );

    if (response.ok) {
      const { project: newVersion, version } = await response.json();

      // Update UI to show new version (DON'T navigate away)
      setProject(newVersion);
      setCurrentVersion(version);

      alert(`Saved as Version ${version}`);
    }
  } catch (error) {
    console.error('Error saving:', error);
    alert('Failed to save project');
  } finally {
    setSaving(false);
  }
};
```

### Step 6: Add Version History to Project View

In `/app/projects/[id]/page.tsx`:

```tsx
import { VersionHistory } from '@/components/VersionHistory';

// In the component:
const [currentVersion, setCurrentVersion] = useState(1);

const handleSelectVersion = async (versionId: string) => {
  // Load selected version
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${versionId}`);
  if (response.ok) {
    const data = await response.json();
    setProject(data.project);
    setCurrentVersion(data.project.version);
  }
};

// In the UI (header/toolbar):
<div className="flex items-center gap-3">
  <VersionHistory
    projectId={projectId}
    currentVersion={currentVersion}
    onSelectVersion={handleSelectVersion}
  />
  <button onClick={handleSave}>Save</button>
</div>
```

### Step 7: Update Dashboard to Show Versions

In `/app/dashboard/page.tsx`:

```tsx
// Expandable rows to show version history
const [expandedProject, setExpandedProject] = useState<string | null>(null);

{projects.map((project) => (
  <React.Fragment key={project.id}>
    <tr>
      <td>{project.name}</td>
      <td>Version {project.version}</td>
      <td>
        <button onClick={() => setExpandedProject(
          expandedProject === project.id ? null : project.id
        )}>
          {expandedProject === project.id ? '▼' : '▶'} Show Versions
        </button>
      </td>
    </tr>
    {expandedProject === project.id && (
      <tr>
        <td colSpan={3}>
          <div className="pl-8 py-2">
            {/* Load and show version history here */}
          </div>
        </td>
      </tr>
    )}
  </React.Fragment>
))}
```

## 📋 Summary

### What's Working:
1. Theme toggle appears (but pages need dark mode classes)
2. Version database schema ready (need to run migration)
3. VersionHistory component ready (need to integrate)

### What You Need to Do:
1. **Run migration in Supabase** (5 min)
2. **Add dark mode classes to pages** (30 min per page)
3. **Add ThemeToggle to headers** (5 min per page)
4. **Create version routes** (20 min)
5. **Update save logic** (15 min)
6. **Add version history UI** (20 min)

### Total Time: ~3-4 hours

Would you like me to implement any specific part first, or would you prefer to tackle them in order?
