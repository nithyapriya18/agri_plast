'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserSession } from '@/lib/utils/userStorage';
import { Download, Upload } from 'lucide-react';
import ExcelJS from 'exceljs';
import { ThemeToggle } from '@/components/ThemeToggle';

type PricingTier = 'economy' | 'standard' | 'premium';

interface MaterialPrice {
  economy: number;
  standard: number;
  premium: number;
  unit: string;
  description: string;
}

interface PricingSettings {
  pricingTier: PricingTier;
  serviceChargePercentage: number;
  profitMarginPercentage: number;
  gstPercentage: number;
  transportationCostPerKm: number;
  installationLaborRate: number;
}

export default function PricingConfigPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PricingSettings>({
    pricingTier: 'standard',
    serviceChargePercentage: 12,
    profitMarginPercentage: 22,
    gstPercentage: 18,
    transportationCostPerKm: 18,
    installationLaborRate: 75,
  });
  const [defaultPricing, setDefaultPricing] = useState<any>(null);
  const [customPricing, setCustomPricing] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>('business');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const session = getUserSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const currentUser = { id: session.userId, email: session.email };
      setUser(currentUser);

      const userPricingResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/pricing/user?userId=${currentUser.id}`
      );

      if (userPricingResponse.ok) {
        const userData = await userPricingResponse.json();
        setSettings(userData.settings);
        setCustomPricing(userData.customPricing || {});
      }

      // Load default pricing catalog
      const defaultPricingResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/pricing/defaults`
      );

      if (defaultPricingResponse.ok) {
        const defaultData = await defaultPricingResponse.json();
        setDefaultPricing(defaultData.pricing);
        // Initialize custom pricing with defaults if empty
        if (!customPricing || Object.keys(customPricing).length === 0) {
          setCustomPricing(JSON.parse(JSON.stringify(defaultData.pricing)));
        }
      }
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/pricing/user/update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            updates: {
              ...settings,
              customPricing,
            },
          }),
        }
      );

      if (response.ok) {
        alert('Pricing configuration saved successfully!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving pricing:', error);
      alert('Failed to save pricing configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!user) return;
    if (!confirm('Reset all pricing to defaults? This cannot be undone.')) return;

    setSaving(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/pricing/user/reset`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        }
      );

      if (response.ok) {
        await loadData();
        alert('Pricing reset to defaults successfully!');
      } else {
        throw new Error('Failed to reset');
      }
    } catch (error) {
      console.error('Error resetting pricing:', error);
      alert('Failed to reset pricing');
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const pricingToExport = customPricing || defaultPricing;

      if (!pricingToExport) {
        alert('No pricing data available to export');
        return;
      }

      // Create a worksheet for each category
      categories.forEach((category) => {
        if (category.id === 'business') return; // Skip business settings

        const worksheet = workbook.addWorksheet(category.name);

        // Add header row
        worksheet.addRow(['Item Key', 'Description', 'Economy (₹)', 'Standard (₹)', 'Premium (₹)', 'Unit']);

        // Style header
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF16A34A' }, // Green
        };

        // Add data rows
        const categoryData = pricingToExport[category.id];
        if (categoryData) {
          Object.entries(categoryData).forEach(([key, value]: [string, any]) => {
            worksheet.addRow([
              key,
              value.description,
              value.economy,
              value.standard,
              value.premium,
              value.unit,
            ]);
          });
        }

        // Auto-fit columns
        worksheet.columns = [
          { width: 25 },
          { width: 50 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
          { width: 15 },
        ];
      });

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agriplast-pricing-template-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      alert('Excel template exported successfully!');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel template');
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const updatedPricing = { ...customPricing };
      let importedSheets = 0;

      // Read each worksheet
      workbook.eachSheet((worksheet) => {
        const categoryName = worksheet.name;
        const category = categories.find((c) => c.name === categoryName);

        if (!category || category.id === 'business') return;

        const categoryData: any = {};

        // Skip header row, read data rows
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header

          const key = row.getCell(1).value as string;
          const description = row.getCell(2).value as string;
          const economy = Number(row.getCell(3).value);
          const standard = Number(row.getCell(4).value);
          const premium = Number(row.getCell(5).value);
          const unit = row.getCell(6).value as string;

          if (key && !isNaN(economy) && !isNaN(standard) && !isNaN(premium)) {
            categoryData[key] = {
              description,
              economy,
              standard,
              premium,
              unit,
            };
          }
        });

        if (Object.keys(categoryData).length > 0) {
          updatedPricing[category.id] = categoryData;
          importedSheets++;
        }
      });

      setCustomPricing(updatedPricing);
      alert(`Successfully imported pricing from ${importedSheets} sheet(s). Click "Save Configuration" to apply changes.`);

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error importing Excel:', error);
      alert('Failed to import Excel file. Please ensure it matches the template format.');
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const handlePriceChange = (categoryId: string, itemKey: string, tier: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCustomPricing({
      ...customPricing,
      [categoryId]: {
        ...customPricing[categoryId],
        [itemKey]: {
          ...customPricing[categoryId][itemKey],
          [tier]: numValue,
        },
      },
    });
  };

  const categories = [
    { id: 'business', name: 'Business Settings' },
    { id: 'structure', name: 'Structure Materials' },
    { id: 'covering', name: 'Covering Materials' },
    { id: 'climateControl', name: 'Climate Control' },
    { id: 'irrigation', name: 'Irrigation Systems' },
    { id: 'flooring', name: 'Flooring & Internal' },
    { id: 'access', name: 'Doors & Access' },
    { id: 'automation', name: 'Automation' },
    { id: 'labor', name: 'Labor & Services' },
    { id: 'logistics', name: 'Transportation' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 transition-colors">Loading pricing configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="p-2 bg-green-600 dark:bg-green-700 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Pricing Configuration</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Manage materials, labor, and service costs</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Upload size={16} />
              Import Excel
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <Download size={16} />
              Export Template
            </button>
            <Link
              href="/dashboard"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Dashboard
            </Link>
            <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors">{user?.email}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 transition-colors">Categories</h3>
              <nav className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeCategory === category.id
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>{category.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {/* Business Settings */}
            {activeCategory === 'business' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 transition-colors">Business Settings</h2>

                {/* Pricing Tier Selection */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 transition-colors">
                    Default Pricing Tier
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['economy', 'standard', 'premium'] as const).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setSettings({ ...settings, pricingTier: tier })}
                        className={`p-4 rounded-lg border-2 text-center transition-all ${
                          settings.pricingTier === tier
                            ? 'border-green-600 bg-green-50 dark:bg-green-900/30 dark:border-green-500'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 dark:text-gray-100 capitalize mb-1 transition-colors">{tier}</div>
                        <div className="text-xs text-gray-500">
                          {tier === 'economy' && 'Cost-effective materials'}
                          {tier === 'standard' && 'Balanced quality & cost'}
                          {tier === 'premium' && 'High-end materials'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Business Percentages */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                      Service Charge (%)
                      <span className="ml-2 text-xs text-gray-500">Applied to material cost</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.serviceChargePercentage}
                      onChange={(e) =>
                        setSettings({ ...settings, serviceChargePercentage: parseFloat(e.target.value) })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                      Profit Margin (%)
                      <span className="ml-2 text-xs text-gray-500">Applied to subtotal</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.profitMarginPercentage}
                      onChange={(e) =>
                        setSettings({ ...settings, profitMarginPercentage: parseFloat(e.target.value) })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                      GST (%)
                      <span className="ml-2 text-xs text-gray-500">Goods and Services Tax</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.gstPercentage}
                      onChange={(e) =>
                        setSettings({ ...settings, gstPercentage: parseFloat(e.target.value) })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                      Transportation Cost (₹/km/ton)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={settings.transportationCostPerKm}
                      onChange={(e) =>
                        setSettings({ ...settings, transportationCostPerKm: parseFloat(e.target.value) })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                      Installation Labor Rate (₹/sqm)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={settings.installationLaborRate}
                      onChange={(e) =>
                        setSettings({ ...settings, installationLaborRate: parseFloat(e.target.value) })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Material Categories - NOW EDITABLE */}
            {activeCategory !== 'business' && customPricing && customPricing[activeCategory] && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 capitalize transition-colors">
                  {categories.find((c) => c.id === activeCategory)?.name}
                </h2>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 transition-colors">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase transition-colors">Item</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase transition-colors">Economy</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase transition-colors">Standard</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase transition-colors">Premium</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase transition-colors">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
                      {Object.entries(customPricing[activeCategory]).map(([key, value]: [string, any]) => (
                        <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">{value.description}</div>
                            <div className="text-xs text-gray-500 mt-1">{key}</div>
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              step="0.01"
                              value={value.economy}
                              onChange={(e) => handlePriceChange(activeCategory, key, 'economy', e.target.value)}
                              className="w-full px-2 py-1 text-right text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 transition-colors"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              step="0.01"
                              value={value.standard}
                              onChange={(e) => handlePriceChange(activeCategory, key, 'standard', e.target.value)}
                              className="w-full px-2 py-1 text-right text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 transition-colors font-medium"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              step="0.01"
                              value={value.premium}
                              onChange={(e) => handlePriceChange(activeCategory, key, 'premium', e.target.value)}
                              className="w-full px-2 py-1 text-right text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 transition-colors"
                            />
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 transition-colors">{value.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg transition-colors">
                  <p className="text-sm text-green-800 dark:text-green-300 transition-colors">
                    <strong>✓ All values are now editable!</strong> You can modify prices directly here, or export to Excel, make changes, and import back.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-6 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
          >
            Reset to Defaults
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
