'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Version {
  id: string;
  version: number;
  version_name: string | null;
  created_at: string;
  is_latest: boolean;
}

interface VersionHistoryProps {
  projectId: string;
  currentVersion: number;
  onSelectVersion: (versionId: string) => void;
}

export function VersionHistory({ projectId, currentVersion, onSelectVersion }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadVersions = async () => {
    if (versions.length > 0) {
      setIsOpen(!isOpen);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/projects/${projectId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={loadVersions}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Version History ({currentVersion})
        {loading && <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-600 border-t-transparent"></div>}
      </button>

      {isOpen && versions.length > 0 && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Version History</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{versions.length} versions</p>
          </div>
          <div className="p-2">
            {versions.map((version) => (
              <button
                key={version.id}
                onClick={() => {
                  onSelectVersion(version.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  version.version === currentVersion
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        Version {version.version}
                      </span>
                      {version.is_latest && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                          Latest
                        </span>
                      )}
                    </div>
                    {version.version_name && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{version.version_name}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {version.version === currentVersion && (
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
