'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'progress';
  message: string;
  icon?: 'terrain' | 'regulatory' | 'optimization' | 'complete';
}

interface OptimizationLogsProps {
  isLoading: boolean;
  landAreaSize?: number;
  locationName?: string;
}

export default function OptimizationLogs({ isLoading, landAreaSize = 10000, locationName }: OptimizationLogsProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!isLoading) {
      setLogs([]);
      return;
    }

    // Simulate the backend optimization logs in real-time
    const logEntries: LogEntry[] = [
      { id: '1', timestamp: 0, type: 'info', message: 'Starting polyhouse optimization (DSL V3 - Independent Rotation + Terrain + Regulatory)...', icon: 'optimization' },
      { id: '2', timestamp: 800, type: 'info', message: 'Starting terrain analysis (medium resolution)...', icon: 'terrain' },
      { id: '3', timestamp: 2000, type: 'progress', message: `  Analyzing ${Math.floor(landAreaSize / 625)} terrain points...` },
      { id: '4', timestamp: 4000, type: 'progress', message: '  Fetching elevation data from Copernicus DEM...' },
      { id: '5', timestamp: 6000, type: 'progress', message: '  Fetching land cover data from Copernicus WorldCover...' },
      { id: '6', timestamp: 8000, type: 'success', message: '  Fetched elevation and land cover data' },
      { id: '7', timestamp: 9000, type: 'info', message: '  Identifying restricted zones (water bodies, forests, roads)...' },
      { id: '8', timestamp: 10000, type: 'success', message: '  Terrain analysis complete' },
      { id: '9', timestamp: 10500, type: 'success', message: '  Buildable area: 95-100%' },
      { id: '10', timestamp: 11000, type: 'success', message: '  Average slope: 0-2°' },
      { id: '11', timestamp: 11500, type: 'info', message: '  Only restricted: water bodies, forests, and roads (buildings can be demolished)' },
      { id: '12', timestamp: 12000, type: 'info', message: 'Checking regulatory requirements...', icon: 'regulatory' },
      { id: '13', timestamp: 13000, type: 'progress', message: '  Identifying region from coordinates...' },
      { id: '14', timestamp: 14500, type: 'success', message: '  Waiting for location data...' },
      { id: '15', timestamp: 15500, type: 'info', message: '  Agricultural structures permitted in region' },
      { id: '16', timestamp: 16500, type: 'info', message: 'Solar orientation enabled for optimal sunlight exposure', icon: 'optimization' },
      { id: '17', timestamp: 17500, type: 'info', message: '  Calculating optimal solar angles for location...' },
      { id: '18', timestamp: 18500, type: 'success', message: '  Solar angle range calculated: 60-120° (±30° deviation)' },
      { id: '19', timestamp: 19000, type: 'info', message: 'Starting polyhouse placement optimization', icon: 'optimization' },
      { id: '20', timestamp: 19500, type: 'info', message: `  Target area: ${Math.floor(landAreaSize)} sqm` },
      { id: '21', timestamp: 20000, type: 'progress', message: '  Pass 1: Placing large polyhouses at optimal orientations...' },
      { id: '22', timestamp: 24000, type: 'success', message: '  Pass 1 complete: 8-15 polyhouses, 40-55% coverage' },
      { id: '23', timestamp: 25000, type: 'progress', message: '  Pass 2: Filling gaps with medium polyhouses...' },
      { id: '24', timestamp: 29000, type: 'success', message: '  Pass 2 complete: 18-30 polyhouses, 60-75% coverage' },
      { id: '25', timestamp: 30000, type: 'progress', message: '  Pass 3: Placing small polyhouses in remaining gaps...' },
      { id: '26', timestamp: 34000, type: 'success', message: '  Pass 3 complete: 25-45 polyhouses, 70-85% coverage' },
      { id: '27', timestamp: 35000, type: 'success', message: 'Optimization completed', icon: 'complete' },
      { id: '28', timestamp: 36000, type: 'progress', message: '  Computing final statistics...' },
      { id: '29', timestamp: 37000, type: 'progress', message: '  Generating quotation with material costs...' },
      { id: '30', timestamp: 38000, type: 'progress', message: '  Preparing visualization data...' },
    ];

    const timeouts: NodeJS.Timeout[] = [];

    // Schedule each log entry based on its timestamp
    logEntries.forEach((logEntry) => {
      const timeout = setTimeout(() => {
        setLogs((prevLogs) => [...prevLogs, logEntry]);

        // Auto-scroll to bottom
        setTimeout(() => {
          logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }, logEntry.timestamp);

      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [isLoading, landAreaSize]);

  // Update the region identification log when locationName becomes available
  useEffect(() => {
    if (locationName && logs.length > 0) {
      setLogs(prevLogs => prevLogs.map(log =>
        log.id === '14'
          ? { ...log, message: `  ✓ Region identified: ${locationName}`, type: 'success' as const }
          : log
      ));

      // Scroll to show the updated log
      setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [locationName, logs.length]);

  if (!isLoading && logs.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center gap-2">
        <Terminal size={16} className="text-green-400" />
        <span className="text-sm font-mono text-gray-300">Optimization Console</span>
        {isLoading && (
          <Loader2 size={14} className="text-green-400 animate-spin ml-auto" />
        )}
      </div>

      {/* Logs */}
      <div className="h-64 overflow-y-auto p-4 font-mono text-xs bg-gray-900">
        {logs.map((log) => {
          // Highlight the location identification log
          const isLocationLog = log.id === '14' && locationName;
          const className = `mb-1 flex items-start gap-2 ${
            isLocationLog ? 'text-green-300 font-bold text-sm' : // Make location log bigger and bolder
            log.type === 'success' ? 'text-green-400' :
            log.type === 'warning' ? 'text-yellow-400' :
            log.type === 'progress' ? 'text-blue-400' :
            'text-gray-300'
          }`;

          return (
            <div key={log.id} className={className}>
              {log.type === 'success' && <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" />}
              {log.type === 'warning' && <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />}
              {log.type === 'progress' && <Loader2 size={12} className="mt-0.5 flex-shrink-0 animate-spin" />}

              <span className="flex-1">{log.message}</span>
            </div>
          );
        })}
        <div ref={logsEndRef} />
      </div>

      {/* Footer */}
      {isLoading && (
        <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              <span>Processing optimization...</span>
            </div>
            <div className="text-xs text-gray-500">
              {logs.length === 0 && 'Starting...'}
              {logs.length > 0 && logs.length < 12 && 'Analyzing terrain...'}
              {logs.length >= 12 && logs.length < 20 && 'Checking compliance...'}
              {logs.length >= 20 && logs.length < 27 && 'Optimizing layout...'}
              {logs.length >= 27 && logs.length < 30 && 'Finalizing results...'}
              {logs.length >= 30 && 'Completing...'}
            </div>
          </div>
          {/* Progress bar - cap at 95% until actually complete */}
          <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(95, (logs.length / 30) * 95)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
