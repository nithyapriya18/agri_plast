# Quick Start: Dark Mode & Versioning

## ✅ What's Already Done

1. **Dark Mode**:
   - ThemeProvider added to root layout
   - ThemeToggle component created
   - Tailwind configured for dark mode

2. **Versioning**:
   - Database migration created
   - Backend API routes created (`/api/projects/:id/versions`, etc.)
   - VersionHistory component created
   - Backend routes registered in index.ts

## 🚀 Quick Setup (15 minutes)

### Step 1: Run Database Migration (2 min)

Go to Supabase SQL Editor and run:
```sql
-- File: supabase/migrations/20240105000000_add_project_versioning.sql
-- (Copy the entire file content and run it)
```

### Step 2: Restart Backend (1 min)

```bash
cd backend
npm run dev
```

### Step 3: Add Dark Mode to Dashboard (Example - 5 min)

The pages need dark mode classes added. Here's a quick example for dashboard:

**Find these patterns and add dark: variants:**

```tsx
// BEFORE:
<div className="bg-white p-4 rounded-lg">

// AFTER:
<div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
```

Common patterns:
- `bg-gray-50` → add `dark:bg-gray-900`
- `bg-white` → add `dark:bg-gray-800`
- `text-gray-900` → add `dark:text-gray-100`
- `text-gray-600` → add `dark:text-gray-400`
- `border-gray-200` → add `dark:border-gray-700`

### Step 4: Add Theme Toggle to Header (2 min per page)

```tsx
import { ThemeToggle } from '@/components/ThemeToggle';

// In your header:
<header className="...">
  <div className="flex items-center gap-4">
    <h1>Dashboard</h1>
    <ThemeToggle />  {/* Add this */}
  </div>
</header>
```

### Step 5: Test Versioning (5 min)

The backend is ready! To use it in your project view:

```tsx
// 1. Import component
import { VersionHistory } from '@/components/VersionHistory';

// 2. Add state
const [currentVersion, setCurrentVersion] = useState(1);

// 3. Add to UI
<VersionHistory
  projectId={projectId}
  currentVersion={currentVersion}
  onSelectVersion={(versionId) => {
    // Load and display selected version
    router.push(`/projects/${versionId}`);
  }}
/>

// 4. Update save button to create version
const handleSave = async () => {
  const res = await fetch(`/api/projects/${projectId}/create-version`, {
    method: 'POST',
    body: JSON.stringify({ planningResult, quotation }),
  });
  const { version } = await res.json();
  setCurrentVersion(version);
  // Stay on page - don't navigate away!
};
```

## 📝 Pages That Need Dark Mode

Run these commands to see which files need updating:

```bash
cd frontend/app
grep -r "bg-white" --include="*.tsx" | wc -l  # Shows how many instances
```

Priority pages:
1. `dashboard/page.tsx` - Main landing page
2. `settings/page.tsx` - Settings page
3. `settings/pricing/page.tsx` - Pricing config
4. `projects/[id]/page.tsx` - Project view
5. `projects/new/page.tsx` - New project

## 🎨 Dark Mode Class Reference

```tsx
// Backgrounds
bg-gray-50 → bg-gray-50 dark:bg-gray-900    // Page background
bg-white → bg-white dark:bg-gray-800        // Cards/sections
bg-gray-100 → bg-gray-100 dark:bg-gray-700  // Secondary bg

// Text
text-gray-900 → text-gray-900 dark:text-gray-100    // Headings
text-gray-600 → text-gray-600 dark:text-gray-400    // Body text
text-gray-500 → text-gray-500 dark:text-gray-500    // Muted text

// Borders
border-gray-200 → border-gray-200 dark:border-gray-700
border-gray-300 → border-gray-300 dark:border-gray-600

// Inputs
className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"

// Buttons (keep green as-is, it works in both modes)
bg-green-600 text-white  // No change needed
```

## ✨ How Versioning Works

1. **Save**: Creates new version, marks as latest
2. **Version History**: Click to see all versions
3. **Select Version**: Loads that version (read-only or editable)
4. **Save Again**: Creates new version from current state
5. **Dashboard**: Shows latest version by default

## 🧪 Testing

1. **Dark Mode**:
   - Click theme toggle
   - Check all pages look good
   - Verify inputs are readable

2. **Versioning**:
   - Open a project
   - Make changes and save
   - Click "Version History"
   - Select an old version
   - Make changes and save again (creates new branch)

## ⚡ Pro Tips

- Use VSCode search/replace for bulk dark mode updates:
  - Find: `bg-white"`
  - Replace: `bg-white dark:bg-gray-800"`

- Test dark mode with:
  ```bash
  # In browser console:
  document.documentElement.classList.toggle('dark')
  ```

- Version names are optional but helpful:
  ```tsx
  onSave({ versionName: "Before major redesign" })
  ```

That's it! You now have dark mode foundation and full versioning system ready.
