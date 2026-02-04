'use client';

import { Brain, Settings, Calculator, CheckCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export interface AgentStep {
  id: string;
  type: 'thinking' | 'dsl' | 'calculation' | 'result';
  title: string;
  content: string;
  data?: {
    totalBlocks?: number;
    totalGroups?: number;
    coveragePercent?: number;
    totalAreaSqm?: number;
  };
  completed: boolean;
}

interface AgentProgressProps {
  steps: AgentStep[];
  currentStep?: string;
  isLoading: boolean;
}

const StepIcon = ({ type, completed }: { type: AgentStep['type']; completed: boolean }) => {
  const iconClass = completed ? '' : 'opacity-50';

  switch (type) {
    case 'thinking':
      return <Brain size={16} className={`text-purple-500 ${iconClass}`} />;
    case 'dsl':
      return <Settings size={16} className={`text-blue-500 ${iconClass}`} />;
    case 'calculation':
      return <Calculator size={16} className={`text-orange-500 ${iconClass}`} />;
    case 'result':
      return <CheckCircle size={16} className={`text-green-500 ${iconClass}`} />;
  }
};

const AgentStepItem = ({ step }: { step: AgentStep }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      step.completed ? 'border-gray-200 bg-white' : 'border-gray-300 bg-gray-50'
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
        )}
        <StepIcon type={step.type} completed={step.completed} />
        <span className={`text-sm font-medium flex-1 ${
          step.completed ? 'text-gray-700' : 'text-gray-500'
        }`}>
          {step.title}
        </span>
        {step.completed && <CheckCircle size={14} className="text-green-500" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          {step.type === 'dsl' ? (
            <pre className="text-xs font-mono bg-gray-900 text-green-400 p-3 rounded overflow-x-auto whitespace-pre-wrap">
              {step.content}
            </pre>
          ) : (
            <div className="text-sm text-gray-600 whitespace-pre-wrap">
              {step.content}
            </div>
          )}
          {step.data && step.type === 'calculation' && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {step.data.totalBlocks !== undefined && (
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-xs text-gray-500">Blocks:</span>
                  <span className="ml-1 text-sm font-semibold text-gray-800">
                    {step.data.totalBlocks}
                  </span>
                </div>
              )}
              {step.data.totalGroups !== undefined && (
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-xs text-gray-500">Groups:</span>
                  <span className="ml-1 text-sm font-semibold text-gray-800">
                    {step.data.totalGroups}
                  </span>
                </div>
              )}
              {step.data.coveragePercent !== undefined && (
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-xs text-gray-500">Coverage:</span>
                  <span className="ml-1 text-sm font-semibold text-gray-800">
                    {step.data.coveragePercent.toFixed(1)}%
                  </span>
                </div>
              )}
              {step.data.totalAreaSqm !== undefined && (
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-xs text-gray-500">Area:</span>
                  <span className="ml-1 text-sm font-semibold text-gray-800">
                    {step.data.totalAreaSqm.toLocaleString()} m²
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function AgentProgress({ steps, currentStep, isLoading }: AgentProgressProps) {
  return (
    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-w-2xl w-full">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Brain size={20} className="text-purple-600" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-800">Agent Workflow</h3>
            {currentStep && (
              <p className="text-xs text-gray-600 mt-0.5">
                {currentStep}
              </p>
            )}
          </div>
          {isLoading && (
            <Loader2 size={18} className="animate-spin text-purple-600" />
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
        {steps.length === 0 && isLoading && (
          <div className="flex items-center gap-3 p-4 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            <span>Initializing agent workflow...</span>
          </div>
        )}
        {steps.map((step) => (
          <AgentStepItem key={step.id} step={step} />
        ))}
      </div>
    </div>
  );
}
