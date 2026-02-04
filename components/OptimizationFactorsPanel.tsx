'use client';

import { Info, Sun, Compass, Layers, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface OptimizationFactor {
  name: string;
  status: 'applied' | 'disabled' | 'warning';
  description: string;
  details?: string;
  icon: React.ReactNode;
}

interface OptimizationFactorsPanelProps {
  configuration: any;
  metadata?: any;
  terrainAnalysis?: any;
  regulatoryCompliance?: any;
}

export default function OptimizationFactorsPanel({
  configuration,
  metadata,
  terrainAnalysis,
  regulatoryCompliance,
}: OptimizationFactorsPanelProps) {

  // Calculate solar orientation info
  const getSolarInfo = () => {
    if (!configuration?.solarOrientation?.enabled) {
      return {
        status: 'disabled' as const,
        description: 'Solar orientation constraints disabled',
        details: 'Polyhouses can be placed in any orientation for maximum coverage',
      };
    }

    const latitude = configuration.solarOrientation.latitudeDegrees || 0;
    const SOLAR_DECLINATION = 23.5;
    const latitudeRad = (latitude * Math.PI) / 180;
    const declinationRad = (SOLAR_DECLINATION * Math.PI) / 180;
    const cosA = Math.sin(declinationRad) / Math.cos(latitudeRad);

    let allowedDeviation = 0;
    if (Math.abs(cosA) <= 1) {
      allowedDeviation = Math.acos(cosA) * (180 / Math.PI);
    }

    return {
      status: 'applied' as const,
      description: 'Solar-optimized orientation',
      details: `Latitude: ${latitude.toFixed(1)}°, Allowed deviation: ±${allowedDeviation.toFixed(1)}° from north-south axis. Ensures gutters get sunlight year-round.`,
    };
  };

  const getTerrainInfo = () => {
    if (!configuration?.terrain?.enabled || !terrainAnalysis) {
      return {
        status: 'disabled' as const,
        description: 'Terrain analysis not applied',
        details: 'Polyhouses placed without terrain restrictions',
      };
    }

    const buildable = terrainAnalysis.buildableArea ? (terrainAnalysis.buildableArea * 100).toFixed(1) : 'N/A';
    const avgSlope = terrainAnalysis.averageSlope?.toFixed(1) || 'N/A';
    const restricted = terrainAnalysis.restrictedAreas?.length || 0;

    return {
      status: restricted > 0 ? 'warning' as const : 'applied' as const,
      description: 'Terrain analysis applied',
      details: `Buildable area: ${buildable}%, Average slope: ${avgSlope}°, Restricted zones: ${restricted}`,
    };
  };

  const getSpacingInfo = () => {
    const gutter = configuration?.spacing?.gutterWidth || 2;
    const gap = configuration?.spacing?.polyhouseGap || 2;
    const buffer = configuration?.spacing?.edgeBuffer || 1;

    return {
      status: 'applied' as const,
      description: 'Spacing rules enforced',
      details: `Gutter: ${gutter}m around polyhouses, Gap: ${gap}m between structures, Edge buffer: ${buffer}m from boundaries`,
    };
  };

  const getRegulatoryInfo = () => {
    if (!regulatoryCompliance?.checksPerformed) {
      return {
        status: 'disabled' as const,
        description: 'Regulatory compliance not checked',
        details: 'No regulatory constraints applied',
      };
    }

    const passed = regulatoryCompliance.compliant;
    const issues = regulatoryCompliance.issues?.length || 0;

    return {
      status: passed ? 'applied' as const : 'warning' as const,
      description: passed ? 'Regulatory compliant' : 'Regulatory warnings',
      details: passed
        ? 'All regulatory requirements met'
        : `${issues} issue(s) detected - check regulatory panel`,
    };
  };

  const factors: OptimizationFactor[] = [
    {
      name: 'Solar Orientation',
      icon: <Sun className="w-5 h-5" />,
      ...getSolarInfo(),
    },
    {
      name: 'Terrain Analysis',
      icon: <Layers className="w-5 h-5" />,
      ...getTerrainInfo(),
    },
    {
      name: 'Spacing & Safety',
      icon: <Compass className="w-5 h-5" />,
      ...getSpacingInfo(),
    },
    {
      name: 'Regulatory Compliance',
      icon: <AlertTriangle className="w-5 h-5" />,
      ...getRegulatoryInfo(),
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'disabled':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'border-l-green-500 bg-green-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'disabled':
        return 'border-l-gray-300 bg-gray-50';
      default:
        return 'border-l-gray-300 bg-white';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Optimization Factors</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        The following factors were considered when placing polyhouses:
      </p>

      <div className="space-y-3">
        {factors.map((factor) => (
          <div
            key={factor.name}
            className={`border-l-4 ${getStatusColor(factor.status)} p-4 rounded-r-lg`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">{factor.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{factor.name}</h4>
                    {getStatusIcon(factor.status)}
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{factor.description}</p>
                  {factor.details && (
                    <p className="text-xs text-gray-600">{factor.details}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-800">
            <strong>How it works:</strong> The optimizer uses these factors to determine the best placement,
            size, and orientation for each polyhouse. You can modify these settings in the chat by asking
            for changes (e.g., "ignore terrain restrictions" or "maximize coverage").
          </p>
        </div>
      </div>
    </div>
  );
}
