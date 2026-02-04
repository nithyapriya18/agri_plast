'use client';

import { MessageSquare, Receipt, RotateCcw, Eye, EyeOff, Edit3, Lock } from 'lucide-react';

interface ControlPanelProps {
  hasLandBoundary: boolean;
  hasPlan: boolean;
  onReset: () => void;
  onToggleChat: () => void;
  onToggleQuotation: () => void;
  showChat: boolean;
  showQuotation: boolean;
  editMode: boolean;
  onToggleEditMode: () => void;
}

export default function ControlPanel({
  hasLandBoundary,
  hasPlan,
  onReset,
  onToggleChat,
  onToggleQuotation,
  showChat,
  showQuotation,
  editMode,
  onToggleEditMode,
}: ControlPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-2 space-y-2">
      {hasLandBoundary && (
        <button
          onClick={onToggleEditMode}
          className={`w-full flex items-center gap-2 px-4 py-2 rounded transition-colors ${
            editMode
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={editMode ? "Click to lock area (prevent editing)" : "Click to edit area"}
        >
          {editMode ? <Edit3 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          <span className="text-sm font-medium">{editMode ? 'Edit Mode ON' : 'Area Locked'}</span>
        </button>
      )}

      {hasPlan && (
        <>
          <button
            onClick={onToggleQuotation}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              showQuotation
                ? 'bg-agriplast-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Toggle Quotation Panel"
          >
            <Receipt className="w-4 h-4" />
            <span className="text-sm font-medium">Quotation</span>
            {showQuotation ? (
              <EyeOff className="w-4 h-4 ml-auto" />
            ) : (
              <Eye className="w-4 h-4 ml-auto" />
            )}
          </button>

          <button
            onClick={onToggleChat}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              showChat
                ? 'bg-agriplast-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Toggle Chat Panel"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-medium">Chat</span>
            {showChat ? (
              <EyeOff className="w-4 h-4 ml-auto" />
            ) : (
              <Eye className="w-4 h-4 ml-auto" />
            )}
          </button>
        </>
      )}

      {hasLandBoundary && (
        <button
          onClick={onReset}
          className="w-full flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          title="Reset and Start Over"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm font-medium">Reset</span>
        </button>
      )}
    </div>
  );
}
