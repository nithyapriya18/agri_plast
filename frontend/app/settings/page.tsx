'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserSession } from '@/lib/utils/userStorage';
import { ThemeToggle } from '@/components/ThemeToggle';

interface UserSettings {
  polyhouse_gap: number;
  max_side_length: number;
  min_side_length: number;
  min_corner_distance: number;
  gutter_width: number;
  block_width: number;
  block_height: number;
  safety_buffer: number;
  max_land_area: number;
  minimum_blocks_per_polyhouse: number;
  placement_strategy: 'maximize_blocks' | 'maximize_coverage' | 'balanced' | 'equal_area';
  solar_orientation_enabled: boolean;
  allow_mixed_orientations: boolean;
  avoid_water: boolean;
  consider_slope: boolean;
  max_slope: number;
  land_leveling_override: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>({
    polyhouse_gap: 2.0,
    max_side_length: 100.0,
    min_side_length: 8.0,
    min_corner_distance: 4.0,
    gutter_width: 2.0,
    block_width: 8.0,
    block_height: 4.0,
    safety_buffer: 1.0,
    max_land_area: 10000.0,
    minimum_blocks_per_polyhouse: 10,
    placement_strategy: 'balanced',
    solar_orientation_enabled: true,
    allow_mixed_orientations: false,
    avoid_water: true,
    consider_slope: false,
    max_slope: 15.0,
    land_leveling_override: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const session = getUserSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser({ id: session.userId, email: session.email });

      const base = process.env.NEXT_PUBLIC_API_URL ?? '';
      const res = await fetch(`${base}/api/user_settings?userId=${session.userId}`);
      if (res.ok) {
        const data = await res.json();
        setSettings({
          polyhouse_gap: data.polyhouse_gap ?? 2.0,
          max_side_length: data.max_side_length ?? 100.0,
          min_side_length: data.min_side_length ?? 8.0,
          min_corner_distance: data.min_corner_distance ?? 4.0,
          gutter_width: data.gutter_width ?? 2.0,
          block_width: data.block_width ?? 8.0,
          block_height: data.block_height ?? 4.0,
          safety_buffer: data.safety_buffer ?? 1.0,
          max_land_area: data.max_land_area ?? 10000.0,
          minimum_blocks_per_polyhouse: data.minimum_blocks_per_polyhouse ?? 10,
          placement_strategy: data.placement_strategy ?? 'balanced',
          solar_orientation_enabled: data.solar_orientation_enabled ?? true,
          allow_mixed_orientations: data.allow_mixed_orientations ?? false,
          avoid_water: data.avoid_water ?? true,
          consider_slope: data.consider_slope ?? false,
          max_slope: data.max_slope ?? 15.0,
          land_leveling_override: data.land_leveling_override ?? false,
        });
      }
    } catch (error) {
      console.warn('Error loading settings, using defaults:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? '';
      const res = await fetch(`${base}/api/user_settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...settings }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to save settings');
      }
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof UserSettings, value: any) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleReset = () => {
    if (!confirm('Reset all settings to defaults?')) return;

    setSettings({
      polyhouse_gap: 2.0,
      max_side_length: 100.0,
      min_side_length: 8.0,
      min_corner_distance: 4.0,
      gutter_width: 2.0,
      block_width: 8.0,
      block_height: 4.0,
      safety_buffer: 1.0,
      max_land_area: 10000.0,
      placement_strategy: 'balanced',
      solar_orientation_enabled: true,
      allow_mixed_orientations: false,
      avoid_water: true,
      consider_slope: false,
      max_slope: 15.0,
      land_leveling_override: false,
      minimum_blocks_per_polyhouse: 10,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 transition-colors">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Settings</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Configure default DSL parameters</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg transition-colors ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Polyhouse Dimensions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 transition-colors">Polyhouse Dimensions</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Block Width (meters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.block_width}
                  onChange={(e) => handleChange('block_width', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Standard: 8m</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Block Height (meters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.block_height}
                  onChange={(e) => handleChange('block_height', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Standard: 4m</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Gutter Width (meters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.gutter_width}
                  onChange={(e) => handleChange('gutter_width', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Drainage gutter on east-west sides</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Polyhouse Gap (meters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="2"
                  value={settings.polyhouse_gap}
                  onChange={(e) => handleChange('polyhouse_gap', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Minimum: 2m, affects access and density</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Safety Buffer (meters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={settings.safety_buffer}
                  onChange={(e) => handleChange('safety_buffer', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Distance from land boundary (0-5m)</p>
              </div>
            </div>
          </div>

          {/* Size Constraints */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 transition-colors">Size Constraints</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Min Side Length (meters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.min_side_length}
                  onChange={(e) => handleChange('min_side_length', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Minimum polyhouse dimension</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Max Side Length (meters)
                </label>
                <input
                  type="number"
                  step="1"
                  value={settings.max_side_length}
                  onChange={(e) => handleChange('max_side_length', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Maximum structural limit</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Min Corner Distance (meters)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.min_corner_distance}
                  onChange={(e) => handleChange('min_corner_distance', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Controls L-shapes complexity</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Max Land Area per Polyhouse (sqm)
                </label>
                <input
                  type="number"
                  step="100"
                  value={settings.max_land_area}
                  onChange={(e) => handleChange('max_land_area', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Maximum size for a single polyhouse</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Minimum Blocks per Polyhouse
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={settings.minimum_blocks_per_polyhouse}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 1 : parseInt(e.target.value);
                    handleChange('minimum_blocks_per_polyhouse', isNaN(value) ? 1 : value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Minimum number of 8x4m blocks per polyhouse (default: 10)</p>
              </div>
            </div>
          </div>

          {/* Placement Strategy */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 transition-colors">Placement Strategy</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Optimization Goal
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleChange('placement_strategy', 'balanced')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    settings.placement_strategy === 'balanced'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/30 dark:border-green-500'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100 transition-colors">Balanced (Recommended)</div>
                  <div className="text-xs text-gray-500 mt-1">Mix of coverage and efficiency</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('placement_strategy', 'maximize_coverage')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    settings.placement_strategy === 'maximize_coverage'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/30 dark:border-green-500'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100 transition-colors">Maximize Coverage</div>
                  <div className="text-xs text-gray-500 mt-1">Fill as much land as possible</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('placement_strategy', 'maximize_blocks')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    settings.placement_strategy === 'maximize_blocks'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/30 dark:border-green-500'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100 transition-colors">Maximize Blocks</div>
                  <div className="text-xs text-gray-500 mt-1">Place as many blocks as possible</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('placement_strategy', 'equal_area')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    settings.placement_strategy === 'equal_area'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/30 dark:border-green-500'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100 transition-colors">Equal Area</div>
                  <div className="text-xs text-gray-500 mt-1">Make polyhouses similar size</div>
                </button>
              </div>
            </div>
          </div>

          {/* Terrain Constraints */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 transition-colors">Terrain Constraints</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">Solar Orientation</label>
                  <p className="text-xs text-gray-500">Mandatory for plant growth (gutters need sunlight)</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.solar_orientation_enabled}
                  onChange={(e) => handleChange('solar_orientation_enabled', e.target.checked)}
                  className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">Allow Different Directions</label>
                  <p className="text-xs text-gray-500">Each polyhouse can face different directions to fill more space. May affect access road layout.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allow_mixed_orientations}
                  onChange={(e) => handleChange('allow_mixed_orientations', e.target.checked)}
                  className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">Avoid Water Bodies</label>
                  <p className="text-xs text-gray-500">Detect and avoid building on water (Copernicus types 80, 200, 210)</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.avoid_water}
                  onChange={(e) => handleChange('avoid_water', e.target.checked)}
                  className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">Consider Slope</label>
                  <p className="text-xs text-gray-500">Avoid steep slopes (configurable threshold below)</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.consider_slope}
                  onChange={(e) => handleChange('consider_slope', e.target.checked)}
                  className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
              </div>

              {settings.consider_slope && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                    Max Slope (degrees)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.max_slope}
                    onChange={(e) => handleChange('max_slope', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent transition-colors"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">Slopes steeper than this will be avoided</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">Land Leveling Override</label>
                  <p className="text-xs text-gray-500">User undertakes to level the land - allows building on slopes</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.land_leveling_override}
                  onChange={(e) => handleChange('land_leveling_override', e.target.checked)}
                  className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Reset to Defaults
            </button>

            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
