'use client';

import React, { useState, useEffect } from 'react';
import { ProjectZone, Coordinate } from '@shared/types';

interface ZoneManagerModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onZonesUpdated: (zones: ProjectZone[]) => void;
}

const DEFAULT_COLORS = {
  inclusion: '#4CAF50', // Green
  exclusion: '#F44336', // Red
};

export default function ZoneManagerModal({
  projectId,
  isOpen,
  onClose,
  onZonesUpdated,
}: ZoneManagerModalProps) {
  const [zones, setZones] = useState<ProjectZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Fetch zones when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchZones();
    }
  }, [isOpen, projectId]);

  const fetchZones = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/zones/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch zones');
      }
      const data = await response.json();
      setZones(data.zones || []);
      onZonesUpdated(data.zones || []);
    } catch (err) {
      console.error('Error fetching zones:', err);
      setError(err instanceof Error ? err.message : 'Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.name.toLowerCase().endsWith('.kml')) {
      setError('Please upload a KML file');
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload and parse KML
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/zones/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload KML');
      }

      const uploadData = await uploadResponse.json();

      // Create zone as inclusion by default
      const createResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/zones/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zone_type: 'inclusion',
          name: uploadData.zone.name,
          coordinates: uploadData.zone.coordinates,
          file_name: uploadData.zone.file_name,
          color: DEFAULT_COLORS.inclusion,
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create zone');
      }

      // Refresh zones list
      await fetchZones();

      // Reset file input
      event.target.value = '';
    } catch (err) {
      console.error('Error uploading KML:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload KML');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleZoneType = async (zone: ProjectZone) => {
    try {
      const newType = zone.zone_type === 'inclusion' ? 'exclusion' : 'inclusion';
      const newColor = newType === 'inclusion' ? DEFAULT_COLORS.inclusion : DEFAULT_COLORS.exclusion;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/zones/${zone.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zone_type: newType,
          color: newColor,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update zone type');
      }

      await fetchZones();
    } catch (err) {
      console.error('Error toggling zone type:', err);
      setError(err instanceof Error ? err.message : 'Failed to update zone');
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm('Are you sure you want to delete this zone?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/zones/${zoneId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete zone');
      }

      await fetchZones();
    } catch (err) {
      console.error('Error deleting zone:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete zone');
    }
  };

  const handleStartEdit = (zone: ProjectZone) => {
    setEditingZoneId(zone.id);
    setEditingName(zone.name);
  };

  const handleSaveEdit = async (zoneId: string) => {
    if (!editingName.trim()) {
      setError('Zone name cannot be empty');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/zones/${zoneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update zone name');
      }

      setEditingZoneId(null);
      setEditingName('');
      await fetchZones();
    } catch (err) {
      console.error('Error updating zone name:', err);
      setError(err instanceof Error ? err.message : 'Failed to update zone name');
    }
  };

  const handleCancelEdit = () => {
    setEditingZoneId(null);
    setEditingName('');
  };

  // Calculate summary statistics
  const inclusionZones = zones.filter(z => z.zone_type === 'inclusion');
  const exclusionZones = zones.filter(z => z.zone_type === 'exclusion');
  const totalInclusionArea = inclusionZones.reduce((sum, z) => sum + z.area_sqm, 0);
  const totalExclusionArea = exclusionZones.reduce((sum, z) => sum + z.area_sqm, 0);
  const netBuildableArea = Math.max(0, totalInclusionArea - totalExclusionArea);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Manage Project Zones
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Upload Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload KML File
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".kml"
                onChange={handleFileUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
              />
              {uploading && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Uploading...
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Uploaded zones will be marked as <span className="text-green-600 dark:text-green-400 font-semibold">inclusion zones</span> by default. You can change the type after upload.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Summary Statistics */}
          {zones.length > 0 && (
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">Inclusion Zones</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{inclusionZones.length}</div>
                <div className="text-xs text-green-600 dark:text-green-400">{totalInclusionArea.toFixed(0)} m²</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-sm text-red-600 dark:text-red-400 font-medium">Exclusion Zones</div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{exclusionZones.length}</div>
                <div className="text-xs text-red-600 dark:text-red-400">{totalExclusionArea.toFixed(0)} m²</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Net Buildable</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{netBuildableArea.toFixed(0)} m²</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">{(netBuildableArea / 10000).toFixed(2)} hectares</div>
              </div>
            </div>
          )}

          {/* Zones List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading zones...</p>
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No zones uploaded yet. Upload a KML file to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Zone Name */}
                      {editingZoneId === zone.id ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(zone.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{zone.name}</h3>
                          <button
                            onClick={() => handleStartEdit(zone)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Zone Info */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: zone.color }}
                          ></div>
                          <span className="font-medium">
                            {zone.zone_type === 'inclusion' ? 'Inclusion Zone' : 'Exclusion Zone'}
                          </span>
                        </div>
                        <div>
                          Area: {zone.area_sqm.toFixed(0)} m²
                        </div>
                        {zone.file_name && (
                          <div className="text-xs">
                            File: {zone.file_name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleToggleZoneType(zone)}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          zone.zone_type === 'inclusion'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                        }`}
                      >
                        {zone.zone_type === 'inclusion' ? 'Mark as Exclusion' : 'Mark as Inclusion'}
                      </button>
                      <button
                        onClick={() => handleDeleteZone(zone.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">About Zones</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li><span className="text-green-600 dark:text-green-400 font-semibold">Inclusion zones</span> define where polyhouses can be placed (e.g., adjacent plots of land)</li>
              <li><span className="text-red-600 dark:text-red-400 font-semibold">Exclusion zones</span> define areas where building is prohibited (e.g., water bodies, roads)</li>
              <li>Multiple zones will be combined automatically during optimization</li>
              <li>Polyhouses will only be placed in the net buildable area (inclusions minus exclusions)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
