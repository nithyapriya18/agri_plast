'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export interface CustomerPreferences {
  structureType: 'polyhouse' | 'cablenet' | 'fanpad';
  cropType: 'flowers' | 'leafy' | 'vine' | 'mixed' | 'strawberries' | 'blueberries';
  polyhouseSize: 'large' | 'mixed' | 'small';
  budgetRange: 'economy' | 'standard' | 'premium';
  automation: boolean;
  vehicleAccess: boolean;
  priority: 'coverage' | 'quality' | 'balanced';
  orientationPreference: 'uniform' | 'varied' | 'optimized';
  timeline: 'urgent' | 'planned';
}

interface CustomerPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (preferences: CustomerPreferences) => void;
}

export default function CustomerPreferencesModal({
  isOpen,
  onClose,
  onSubmit,
}: CustomerPreferencesModalProps) {
  const [preferences, setPreferences] = useState<CustomerPreferences>({
    structureType: 'polyhouse',
    cropType: 'mixed',
    polyhouseSize: 'large', // Default: Fewer, larger polyhouses
    budgetRange: 'standard',
    automation: false,
    vehicleAccess: false,
    priority: 'coverage', // Default: Maximum utilization
    orientationPreference: 'optimized',
    timeline: 'planned',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(preferences);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-agriplast-green-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Customer Requirements</h2>
            <p className="text-sm text-agriplast-green-100 mt-1">
              Help us optimize your polyhouse layout
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Structure Type - MOST IMPORTANT */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border-2 border-green-200">
            <label className="block text-sm font-bold text-gray-900 mb-3">
              🏗️ 1. What type of structure do you need?
            </label>
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  value: 'polyhouse',
                  label: 'Polyhouse (NVPH)',
                  desc: 'Naturally Ventilated - Most Popular (80-90% of projects)',
                  details: 'Best for tomatoes, peppers, cucumbers, leafy greens'
                },
                {
                  value: 'cablenet',
                  label: 'Cable Net House',
                  desc: 'Low-cost greenhouse with net covering',
                  details: 'Good for basic protection, cost-effective'
                },
                {
                  value: 'fanpad',
                  label: 'Fan & Pad Structure',
                  desc: 'Climate controlled for high-value crops (<15-20°C)',
                  details: 'Perfect for strawberries, blueberries, premium leafy greens'
                },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, structureType: option.value as any })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    preferences.structureType === option.value
                      ? 'border-green-600 bg-green-50 shadow-md'
                      : 'border-gray-200 hover:border-green-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-gray-900 text-lg">{option.label}</div>
                  <div className="text-sm text-gray-700 mt-1 font-medium">{option.desc}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.details}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Crop Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              2. What crops will you primarily grow?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'vine', label: 'Vine Crops', desc: 'Tomatoes, cucumbers, peppers' },
                { value: 'leafy', label: 'Leafy Vegetables', desc: 'Lettuce, spinach, herbs' },
                { value: 'flowers', label: 'Flowers', desc: 'Roses, gerberas, carnations' },
                { value: 'strawberries', label: 'Strawberries', desc: 'Requires climate control' },
                { value: 'blueberries', label: 'Blueberries', desc: 'Premium, cool climate' },
                { value: 'mixed', label: 'Mixed/Experimental', desc: 'Multiple crop types' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, cropType: option.value as any })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    preferences.cropType === option.value
                      ? 'border-agriplast-green-600 bg-agriplast-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Budget Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              3. What's your budget range per square meter?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'economy', label: 'Economy', desc: '₹200-300/sqm', icon: '💰' },
                { value: 'standard', label: 'Standard', desc: '₹350-500/sqm', icon: '⭐' },
                { value: 'premium', label: 'Premium', desc: '₹600+/sqm', icon: '💎' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, budgetRange: option.value as any })}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    preferences.budgetRange === option.value
                      ? 'border-agriplast-green-600 bg-agriplast-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Automation */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              4. Will you use automation systems?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: true, label: 'Yes, automated', desc: 'Drip irrigation, climate control' },
                { value: false, label: 'No, manual', desc: 'Traditional methods' },
              ].map((option) => (
                <button
                  key={option.value.toString()}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, automation: option.value })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    preferences.automation === option.value
                      ? 'border-agriplast-green-600 bg-agriplast-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Access */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              5. Do you need vehicle access between structures?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: true, label: 'Yes, vehicles', desc: 'Tractors, trucks (3-4m gaps)' },
                { value: false, label: 'Walking only', desc: 'Pedestrian access (1-2m)' },
              ].map((option) => (
                <button
                  key={option.value.toString()}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, vehicleAccess: option.value })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    preferences.vehicleAccess === option.value
                      ? 'border-agriplast-green-600 bg-agriplast-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Orientation Preference */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              6. How should structures be oriented?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'uniform', label: 'Uniform', desc: 'All same direction (90°), professional look', icon: '📐' },
                { value: 'varied', label: 'Varied', desc: 'Two angles (90° + variant), balanced', icon: '📊' },
                { value: 'optimized', label: 'Optimized', desc: 'Multiple angles (60°-120°), max coverage', icon: '🎯' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, orientationPreference: option.value as any })}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    preferences.orientationPreference === option.value
                      ? 'border-agriplast-green-600 bg-agriplast-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-900">
                <strong>Note:</strong> All angles respect solar requirements (gutters get sunlight).
                Uniform gives the most professional appearance, while Optimized fits more polyhouses.
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              7. What's your project timeline?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'urgent', label: 'Urgent (2-3 months)', desc: 'Fast-track, simpler design' },
                { value: 'planned', label: 'Planned (6+ months)', desc: 'Full compliance, permits' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, timeline: option.value as any })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    preferences.timeline === option.value
                      ? 'border-agriplast-green-600 bg-agriplast-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                // Use default preferences (balanced, standard setup)
                const defaultPreferences: CustomerPreferences = {
                  structureType: 'polyhouse',
                  cropType: 'mixed',
                  polyhouseSize: 'large', // Fewer, larger polyhouses
                  budgetRange: 'standard',
                  automation: false,
                  vehicleAccess: false,
                  priority: 'coverage', // Maximum utilization
                  orientationPreference: 'optimized',
                  timeline: 'planned',
                };
                onSubmit(defaultPreferences);
              }}
              className="flex-1 px-4 py-3 border-2 border-agriplast-green-600 text-agriplast-green-600 rounded-lg hover:bg-agriplast-green-50 transition-colors font-medium"
            >
              Skip & Use Defaults
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-agriplast-green-600 text-white rounded-lg hover:bg-agriplast-green-700 transition-colors font-medium"
            >
              Generate Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
