'use client';

import { useState, useRef, useEffect } from 'react';
import { ConversationMessage, PlanningResult } from '@shared/types';
import { Send, Bot, User, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, RotateCcw, Brain, Settings } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface EnhancedMessage extends ConversationMessage {
  id: string;
  snapshot?: {
    planningResult: PlanningResult;
  };
  feedback?: 'up' | 'down' | null;
  workflow?: {
    thinking?: string;
    configuration?: any;
    error?: string;
  };
}

interface EnhancedChatInterfaceProps {
  conversationHistory: ConversationMessage[];
  onSendMessage: (message: string) => void;
  planningResult?: PlanningResult | null;
  onRestoreSnapshot?: (snapshot: PlanningResult) => void;
}

export default function EnhancedChatInterface({
  conversationHistory,
  onSendMessage,
  planningResult,
  onRestoreSnapshot,
}: EnhancedChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [expandedWorkflow, setExpandedWorkflow] = useState<Set<string>>(new Set());
  const [messageFeedback, setMessageFeedback] = useState<Map<string, 'up' | 'down' | null>>(new Map());
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Convert ConversationMessage to EnhancedMessage with IDs and snapshots
  const enhancedMessages: EnhancedMessage[] = conversationHistory.map((msg, index) => ({
    ...msg,
    id: `msg-${index}`,
    snapshot: planningResult ? { planningResult } : undefined,
    feedback: messageFeedback.get(`msg-${index}`) || null,
  }));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  const handleSend = async () => {
    if (!inputMessage.trim() || sending) return;

    setSending(true);
    setIsTyping(true);
    setInputMessage('');

    try {
      await onSendMessage(inputMessage);
    } finally {
      setSending(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const toggleWorkflowExpansion = (messageId: string) => {
    setExpandedWorkflow(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleFeedback = (messageId: string, feedback: 'up' | 'down') => {
    setMessageFeedback(prev => {
      const next = new Map(prev);
      const current = next.get(messageId);
      next.set(messageId, current === feedback ? null : feedback);
      return next;
    });
  };

  const handleRestoreClick = (message: EnhancedMessage) => {
    if (message.snapshot && onRestoreSnapshot) {
      onRestoreSnapshot(message.snapshot.planningResult);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 transition-all duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-agriplast-green-600 to-agriplast-green-500 dark:from-agriplast-green-700 dark:to-agriplast-green-600 text-white p-6 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-md"></div>
            <div className="relative bg-white/10 p-2 rounded-full backdrop-blur-sm">
              <Bot className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">AI Assistant</h2>
            <p className="text-xs text-green-50 mt-0.5 font-medium">
              {isTyping ? 'Thinking...' : 'Ready to help with your polyhouse planning'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {enhancedMessages.map((message) => {
          const isExpanded = expandedMessages.has(message.id);
          const isWorkflowExpanded = expandedWorkflow.has(message.id);
          const isAssistant = message.role === 'assistant';

          return (
            <div
              key={message.id}
              className={`flex gap-3 ${
                isAssistant ? 'justify-start' : 'justify-end'
              } animate-in fade-in slide-in-from-bottom-4 duration-500`}
            >
              {isAssistant && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 flex items-center justify-center shadow-lg ring-4 ring-purple-100 dark:ring-purple-900/30">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              <div className={`max-w-[85%] flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}>
                {/* Message bubble */}
                <div
                  className={`rounded-2xl p-5 shadow-xl select-text transition-all duration-300 hover:shadow-2xl ${
                    isAssistant
                      ? 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                      : 'bg-gradient-to-br from-agriplast-green-600 via-agriplast-green-600 to-agriplast-green-700 text-white shadow-green-500/20'
                  }`}
                >
                  {/* Restore button */}
                  {isAssistant && message.snapshot && onRestoreSnapshot && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreClick(message);
                      }}
                      className="flex items-center gap-1.5 text-xs text-agriplast-green-600 hover:text-agriplast-green-700 bg-agriplast-green-50 hover:bg-agriplast-green-100 dark:bg-agriplast-green-900/20 dark:hover:bg-agriplast-green-900/30 px-3 py-1.5 rounded-lg mb-3 transition-all duration-200 font-medium shadow-sm hover:shadow"
                    >
                      <RotateCcw size={13} />
                      <span>Restore this state</span>
                    </button>
                  )}

                  {/* Content */}
                  <div className={`prose prose-sm max-w-none ${isAssistant ? 'prose-gray dark:prose-invert' : 'prose-invert'}`}>
                    {isAssistant ? (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>

                  {/* Timestamp and feedback */}
                  <div className={`flex items-center justify-between mt-3 pt-3 border-t ${isAssistant ? 'border-gray-100 dark:border-gray-700' : 'border-white/20'}`}>
                    <p className={`text-xs ${isAssistant ? 'text-gray-500 dark:text-gray-400' : 'text-white/70'}`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {isAssistant && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(message.id, 'up');
                          }}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            message.feedback === 'up'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 shadow-sm'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:scale-110'
                          }`}
                        >
                          <ThumbsUp size={14} fill={message.feedback === 'up' ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(message.id, 'down');
                          }}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            message.feedback === 'down'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:scale-110'
                          }`}
                        >
                          <ThumbsDown size={14} fill={message.feedback === 'down' ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Workflow expansion */}
                  {isAssistant && message.workflow && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWorkflowExpansion(message.id);
                        }}
                        className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 font-medium hover:gap-3"
                      >
                        {isWorkflowExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        <Settings size={15} className="text-blue-500 dark:text-blue-400" />
                        <span>Agent Workflow</span>
                      </button>
                      {isWorkflowExpanded && (
                        <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          {message.workflow.thinking && (
                            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <Brain size={15} className="text-purple-600 dark:text-purple-400" />
                                <span className="text-xs font-bold text-purple-900 dark:text-purple-200">Reasoning</span>
                              </div>
                              <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">{message.workflow.thinking}</p>
                            </div>
                          )}
                          {message.workflow.configuration && (
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <Settings size={15} className="text-blue-600 dark:text-blue-400" />
                                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">Configuration</span>
                              </div>
                              <pre className="text-xs text-blue-800 dark:text-blue-300 overflow-x-auto leading-relaxed">
                                {JSON.stringify(message.workflow.configuration, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Context dropdown for user messages */}
                {!isAssistant && message.snapshot && (
                  <button
                    onClick={() => toggleMessageExpansion(message.id)}
                    className="mt-3 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1.5 font-medium transition-all duration-200 hover:gap-2"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? 'Hide context' : 'Show context sent'}
                  </button>
                )}
                {!isAssistant && isExpanded && message.snapshot && (
                  <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg text-xs text-gray-600 dark:text-gray-300 max-w-full animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="font-semibold mb-2 dark:text-gray-200 text-sm">Context sent with this message:</p>
                    <div className="space-y-1">
                      <p>• {message.snapshot.planningResult.polyhouses.length} polyhouses</p>
                      <p>• {message.snapshot.planningResult.metadata.totalPolyhouseArea.toFixed(0)} m² area</p>
                      <p>• {message.snapshot.planningResult.metadata.utilizationPercentage.toFixed(1)}% utilization</p>
                    </div>
                  </div>
                )}
              </div>

              {!isAssistant && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-agriplast-green-600 via-agriplast-green-600 to-agriplast-green-700 flex items-center justify-center shadow-lg ring-4 ring-green-100 dark:ring-green-900/30">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 flex items-center justify-center shadow-lg ring-4 ring-purple-100 dark:ring-purple-900/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="max-w-[85%] flex flex-col items-start">
              <div className="rounded-2xl p-5 shadow-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 animate-pulse">AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-2xl">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about materials, costs, or request changes..."
              disabled={sending}
              className="w-full px-5 py-4 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-agriplast-green-500 focus:border-agriplast-green-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm hover:shadow-md"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || sending}
            className="px-6 py-4 bg-gradient-to-r from-agriplast-green-600 to-agriplast-green-700 hover:from-agriplast-green-700 hover:to-agriplast-green-800 text-white rounded-2xl hover:shadow-xl disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 font-semibold min-w-[120px] justify-center shadow-lg hover:scale-105 active:scale-95"
          >
            {sending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Try: "Maximize my space utilization" or "Set minimum blocks to 15"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
