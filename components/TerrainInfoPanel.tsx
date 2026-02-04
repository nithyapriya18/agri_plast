'use client';

import { AlertTriangle, Mountain, Droplets, Trees, FileText, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';

interface TerrainInfoPanelProps {
  terrainAnalysis?: {
    buildableAreaPercentage: number;
    averageSlope: number;
    elevationRange: { min: number; max: number };
    restrictedZones: Array<{
      type: string;
      area: number;
      reason: string;
      severity: string;
    }>;
    warnings: string[];
  };
  regulatoryCompliance?: {
    compliant: boolean;
    region: string;
    country: string;
    violations: Array<{
      severity: string;
      category: string;
      description: string;
      resolution: string;
    }>;
    warnings: Array<{
      category: string;
      description: string;
      recommendation: string;
    }>;
    permitsRequired: Array<{
      permit_type: string;
      authority: string;
      estimated_duration_days: number;
      estimated_cost: number;
    }>;
    estimatedComplianceCost: number;
    estimatedTimelineDays: number;
  };
}

export default function TerrainInfoPanel({ terrainAnalysis, regulatoryCompliance }: TerrainInfoPanelProps) {
  if (!terrainAnalysis && !regulatoryCompliance) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 via-green-50 to-teal-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Mountain size={20} className="text-blue-600" />
          Site Analysis
        </h3>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {/* Terrain Analysis Section */}
        {terrainAnalysis && (
          <div className="p-4 border-b border-gray-100">
            <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
              <Mountain size={16} className="text-blue-600" />
              Terrain Conditions
            </h4>

            <div className="space-y-2">
              {/* Buildable Area */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Buildable Area</span>
                <span className={`text-sm font-semibold ${terrainAnalysis.buildableAreaPercentage >= 80 ? 'text-green-600' : terrainAnalysis.buildableAreaPercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {terrainAnalysis.buildableAreaPercentage.toFixed(1)}%
                </span>
              </div>

              {/* Slope */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Mountain size={14} />
                  Avg Slope
                </span>
                <span className={`text-sm font-semibold ${terrainAnalysis.averageSlope < 5 ? 'text-green-600' : terrainAnalysis.averageSlope < 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {terrainAnalysis.averageSlope.toFixed(1)}°
                </span>
              </div>

              {/* Elevation Range */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Elevation</span>
                <span className="text-sm text-gray-700">
                  {terrainAnalysis.elevationRange.min.toFixed(0)}m - {terrainAnalysis.elevationRange.max.toFixed(0)}m
                </span>
              </div>

              {/* Restricted Zones */}
              {terrainAnalysis.restrictedZones && terrainAnalysis.restrictedZones.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Restricted Zones:</div>
                  {terrainAnalysis.restrictedZones.map((zone, index) => (
                    <div key={index} className="flex items-start gap-2 mb-2">
                      {zone.type === 'water' && <Droplets size={14} className="text-blue-600 mt-0.5" />}
                      {zone.type === 'steep_slope' && <Mountain size={14} className="text-orange-600 mt-0.5" />}
                      {zone.type === 'forest' && <Trees size={14} className="text-green-600 mt-0.5" />}
                      {zone.type === 'vegetation' && <Trees size={14} className="text-lime-600 mt-0.5" />}
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-900 capitalize">{zone.type.replace('_', ' ')}</div>
                        <div className="text-xs text-gray-600">{zone.reason}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${zone.severity === 'prohibited' ? 'bg-red-100 text-red-700' : zone.severity === 'challenging' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                          {zone.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {terrainAnalysis.warnings && terrainAnalysis.warnings.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-yellow-600" />
                    <span className="text-xs font-semibold text-gray-700">Terrain Warnings:</span>
                  </div>
                  {terrainAnalysis.warnings.map((warning, index) => (
                    <div key={index} className="text-xs text-gray-600 ml-5 mb-1">
                      • {warning}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Regulatory Compliance Section - only show if we have real data */}
        {regulatoryCompliance && regulatoryCompliance.region !== 'TBD' && (
          <div className="p-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-purple-600" />
              Regulatory Compliance
            </h4>

            <div className="space-y-3">
              {/* Compliance Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`flex items-center gap-1 text-sm font-semibold ${regulatoryCompliance.compliant ? 'text-green-600' : 'text-red-600'}`}>
                  {regulatoryCompliance.compliant ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {regulatoryCompliance.compliant ? 'Compliant' : 'Non-Compliant'}
                </span>
              </div>

              {/* Location */}
              {regulatoryCompliance.region !== 'TBD' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Location</span>
                  <span className="text-sm text-gray-700">
                    {regulatoryCompliance.region}, {regulatoryCompliance.country}
                  </span>
                </div>
              )}

              {/* Required Permits */}
              {regulatoryCompliance.permitsRequired && regulatoryCompliance.permitsRequired.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Required Permits:</div>
                  {regulatoryCompliance.permitsRequired.map((permit, index) => (
                    <div key={index} className="mb-3 p-2 bg-purple-50 rounded-lg">
                      <div className="text-xs font-medium text-gray-900">{permit.permit_type}</div>
                      <div className="text-xs text-gray-600 mt-1">{permit.authority}</div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock size={12} />
                          {permit.estimated_duration_days} days
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <DollarSign size={12} />
                          {permit.estimated_cost.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cost & Timeline Summary */}
              {regulatoryCompliance.estimatedComplianceCost > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <DollarSign size={14} />
                      Total Cost
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {regulatoryCompliance.estimatedComplianceCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock size={14} />
                      Timeline
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {regulatoryCompliance.estimatedTimelineDays} days
                    </span>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {regulatoryCompliance.warnings && regulatoryCompliance.warnings.length > 0 && regulatoryCompliance.warnings.length <= 3 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-yellow-600" />
                    <span className="text-xs font-semibold text-gray-700">Compliance Notes:</span>
                  </div>
                  {regulatoryCompliance.warnings.slice(0, 2).map((warning, index) => (
                    <div key={index} className="text-xs text-gray-600 ml-5 mb-1">
                      • {warning.description}
                    </div>
                  ))}
                </div>
              )}

              {/* Violations */}
              {regulatoryCompliance.violations && regulatoryCompliance.violations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle size={14} className="text-red-600" />
                    <span className="text-xs font-semibold text-red-700">Violations:</span>
                  </div>
                  {regulatoryCompliance.violations.map((violation, index) => (
                    <div key={index} className="mb-2 p-2 bg-red-50 rounded">
                      <div className="text-xs font-medium text-red-900">{violation.description}</div>
                      <div className="text-xs text-gray-600 mt-1">Resolution: {violation.resolution}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
        <div className="text-xs font-semibold text-gray-700 mb-2">Map Legend:</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-300"></div>
            <span className="text-xs text-gray-600">Polyhouse Structure</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-600 border-2 border-white"></div>
            <span className="text-xs text-gray-600">Growing Blocks (8m×4m)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500"></div>
            <span className="text-xs text-gray-600">Land Boundary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-600 opacity-60 border-2 border-red-900" style={{ borderStyle: 'dashed' }}></div>
            <span className="text-xs text-gray-600">No-Build Zones</span>
          </div>
        </div>
        {terrainAnalysis && terrainAnalysis.restrictedZones && terrainAnalysis.restrictedZones.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-red-600 font-medium">
              ⚠️ {terrainAnalysis.restrictedZones.length} restricted area(s) detected
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Use chat to override and build on restricted areas
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
