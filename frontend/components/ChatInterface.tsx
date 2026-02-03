'use client';

import { useState, useRef, useEffect } from 'react';
import { ConversationMessage } from '@/lib/shared/types';
import { Send, Bot, User } from 'lucide-react';

interface ChatInterfaceProps {
  conversationHistory: ConversationMessage[];
  onSendMessage: (message: string) => void;
}

export default function ChatInterface({
  conversationHistory,
  onSendMessage,
}: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  const handleSend = async () => {
    if (!inputMessage.trim() || sending) return;

    setSending(true);
    setInputMessage('');

    try {
      await onSendMessage(inputMessage);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-agriplast-green-700 text-white p-4 shadow">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Assistant
        </h2>
        <p className="text-xs text-agriplast-green-100 mt-1">
          Ask questions about your polyhouse plan
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationHistory.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-agriplast-green-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-agriplast-green-700" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-agriplast-green-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-agriplast-green-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about materials, costs, or make changes..."
            disabled={sending}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agriplast-green-500 disabled:bg-gray-100"
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || sending}
            className="px-4 py-2 bg-agriplast-green-600 text-white rounded-lg hover:bg-agriplast-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Try: "Why did you place the polyhouses this way?" or "Use cheaper materials"
        </p>
      </div>
    </div>
  );
}
