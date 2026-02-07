'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, Edit3, MessageSquare } from 'lucide-react';

interface DSLViewerProps {
  data: any;
  title?: string;
  onAskAI?: (prompt: string) => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  maxHeight?: string;
}

/**
 * DSLViewer - Display formatted DSL (JSON) with syntax highlighting
 *
 * Features:
 * - Syntax highlighting for JSON
 * - Collapsible sections
 * - Copy to clipboard
 * - "Ask AI to change this" integration
 * - Responsive layout
 */
export default function DSLViewer({
  data,
  title = 'Configuration',
  onAskAI,
  collapsible = true,
  defaultCollapsed = false,
  maxHeight = '500px',
}: DSLViewerProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isCopied, setIsCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleAskAI = () => {
    if (onAskAI) {
      onAskAI(`I'd like to modify the ${title.toLowerCase()} settings. Here's the current configuration:\n\n\`\`\`json\n${jsonString}\n\`\`\``);
    }
  };

  // Syntax highlight JSON
  const highlightJSON = (json: string) => {
    return json
      .replace(/(".*?"):/g, '<span class="text-blue-600 dark:text-blue-400">$1</span>:')
      .replace(/:\s*(".*?")/g, ': <span class="text-green-600 dark:text-green-400">$1</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-orange-600 dark:text-orange-400">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="text-purple-600 dark:text-purple-400">$1</span>');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-150"
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          )}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all duration-150"
            title="Copy to clipboard"
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Ask AI Button */}
          {onAskAI && (
            <button
              onClick={handleAskAI}
              className="p-2 text-gray-500 hover:text-agriplast-green-600 dark:text-gray-400 dark:hover:text-agriplast-green-400 hover:bg-agriplast-green-50 dark:hover:bg-agriplast-green-900/20 rounded-lg transition-all duration-150 flex items-center gap-1"
              title="Ask AI to change this"
            >
              <MessageSquare className="w-4 h-4" />
              <Edit3 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div
          className="overflow-auto"
          style={{ maxHeight }}
        >
          <pre className="p-4 text-xs leading-relaxed font-mono">
            <code
              dangerouslySetInnerHTML={{ __html: highlightJSON(jsonString) }}
            />
          </pre>
        </div>
      )}

      {/* Collapsed State Hint */}
      {isCollapsed && (
        <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
          Click to expand {title.toLowerCase()}
        </div>
      )}
    </div>
  );
}

/**
 * DSLSection - Wrapper for organizing multiple DSL viewers
 */
export function DSLSection({
  children,
  title,
  className = '',
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

/**
 * Quick action buttons for common DSL operations
 */
export function DSLQuickActions({
  onShowPricing,
  onShowSettings,
  onShowLearning,
  onExplainLayout,
}: {
  onShowPricing?: () => void;
  onShowSettings?: () => void;
  onShowLearning?: () => void;
  onExplainLayout?: () => void;
}) {
  const actions = [
    { label: 'Show Pricing', onClick: onShowPricing, icon: '💰' },
    { label: 'View Settings', onClick: onShowSettings, icon: '⚙️' },
    { label: 'My Preferences', onClick: onShowLearning, icon: '🧠' },
    { label: 'Explain Layout', onClick: onExplainLayout, icon: '📐' },
  ].filter(action => action.onClick);

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={action.onClick}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-all duration-150 flex items-center gap-2 border border-gray-200 dark:border-gray-700"
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
