'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface VersionNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
  title?: string;
  placeholder?: string;
  saving?: boolean;
}

export default function VersionNotesModal({
  isOpen,
  onClose,
  onSave,
  title = 'Save Version',
  placeholder = 'Describe what changed in this version... (optional)',
  saving = false,
}: VersionNotesModalProps) {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(notes);
    setNotes(''); // Clear for next time
  };

  const handleSkip = () => {
    onSave(''); // Save with empty notes
    setNotes('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors">
            {title}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 transition-colors">
          Add notes to describe what changed in this version. This helps you track your project's evolution.
        </p>

        {/* Text Area */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={placeholder}
          disabled={saving}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-agriplast-green-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none text-sm"
        />

        {/* Helper Text */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors">
          Examples: "Increased polyhouses by 20%", "Changed orientation to maximize coverage", "Adjusted spacing requirements"
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={handleSkip}
            disabled={saving}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-agriplast-green-600 dark:bg-agriplast-green-700 text-white rounded-lg hover:bg-agriplast-green-700 dark:hover:bg-agriplast-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Version'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
