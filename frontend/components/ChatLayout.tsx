'use client';

import { useState, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

interface ChatLayoutProps {
  mapContent: ReactNode;
  chatContent: ReactNode;
  defaultMapWidth?: number; // Percentage (0-100)
  showToggle?: boolean;
  className?: string;
}

/**
 * ChatLayout - Split-screen layout for conversational interface
 *
 * Features:
 * - Split screen: Map (left) + Chat (right)
 * - Responsive: Tabs on mobile, split-screen on desktop
 * - Resizable panels
 * - Collapsible chat panel
 * - Always-visible chat (unless explicitly collapsed)
 */
export default function ChatLayout({
  mapContent,
  chatContent,
  defaultMapWidth = 60,
  showToggle = true,
  className = '',
}: ChatLayoutProps) {
  const [mapWidth, setMapWidth] = useState(defaultMapWidth);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'chat'>('map'); // For mobile
  const [isResizing, setIsResizing] = useState(false);

  // Handle mouse resize
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const container = document.getElementById('chat-layout-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newMapWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Constrain between 30% and 80%
    setMapWidth(Math.min(80, Math.max(30, newMapWidth)));
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Add/remove mouse event listeners
  useState(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  });

  const chatWidth = 100 - mapWidth;

  return (
    <>
      {/* Desktop Layout: Split Screen */}
      <div
        id="chat-layout-container"
        className={`hidden md:flex h-full w-full ${className}`}
        style={{ overflow: 'hidden' }}
      >
        {/* Map Panel */}
        <div
          className="h-full relative"
          style={{ width: isChatCollapsed ? '100%' : `${mapWidth}%` }}
        >
          {mapContent}

          {/* Toggle Chat Button (Desktop) */}
          {showToggle && (
            <button
              onClick={() => setIsChatCollapsed(!isChatCollapsed)}
              className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700"
              title={isChatCollapsed ? 'Show Chat' : 'Hide Chat'}
            >
              {isChatCollapsed ? (
                <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          )}
        </div>

        {/* Resizer Handle */}
        {!isChatCollapsed && (
          <div
            className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-agriplast-green-500 cursor-col-resize transition-colors duration-150 relative group"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-400 dark:bg-gray-600 group-hover:bg-agriplast-green-500 rounded-full w-6 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex flex-col gap-1">
                <div className="w-0.5 h-1 bg-white rounded-full"></div>
                <div className="w-0.5 h-1 bg-white rounded-full"></div>
                <div className="w-0.5 h-1 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Panel */}
        {!isChatCollapsed && (
          <div
            className="h-full"
            style={{ width: `${chatWidth}%` }}
          >
            {chatContent}
          </div>
        )}
      </div>

      {/* Mobile Layout: Tabs */}
      <div className="md:hidden flex flex-col h-full w-full">
        {/* Tab Bar */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors duration-200 ${
              activeTab === 'map'
                ? 'text-agriplast-green-600 dark:text-agriplast-green-400 border-b-2 border-agriplast-green-600 dark:border-agriplast-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Maximize2 className="w-4 h-4" />
              <span>Map</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors duration-200 ${
              activeTab === 'chat'
                ? 'text-agriplast-green-600 dark:text-agriplast-green-400 border-b-2 border-agriplast-green-600 dark:border-agriplast-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Minimize2 className="w-4 h-4" />
              <span>Chat</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'map' && <div className="h-full">{mapContent}</div>}
          {activeTab === 'chat' && <div className="h-full">{chatContent}</div>}
        </div>
      </div>
    </>
  );
}
