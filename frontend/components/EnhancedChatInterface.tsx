'use client';

import { useState, useRef, useEffect } from 'react';
import { ConversationMessage, PlanningResult } from '@shared/types';
import { Send, Bot, User, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, RotateCcw, Brain, Settings, Mic, MicOff, Paperclip, X } from 'lucide-react';
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
  onClose?: () => void;
  onLinkClick?: (href: string) => void;
  onFileUpload?: (file: File) => void;
  isThinking?: boolean;
}

export default function EnhancedChatInterface({
  conversationHistory,
  onSendMessage,
  planningResult,
  onRestoreSnapshot,
  onClose,
  onLinkClick,
  onFileUpload,
  isThinking = false,
}: EnhancedChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [expandedWorkflow, setExpandedWorkflow] = useState<Set<string>>(new Set());
  const [messageFeedback, setMessageFeedback] = useState<Map<string, 'up' | 'down' | null>>(new Map());
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

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

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputMessage]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');

          setInputMessage(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setVoiceError(`Voice recognition error: ${event.error}`);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      } else {
        setVoiceSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

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

  const startVoiceRecording = () => {
    if (!voiceSupported) {
      setVoiceError('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (!recognitionRef.current) {
      setVoiceError('Voice recognition not initialized.');
      return;
    }

    try {
      setVoiceError(null);
      setIsRecording(true);
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setVoiceError('Failed to start voice recognition.');
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !sending) {
      // Pass file to parent for processing
      if (onFileUpload) {
        onFileUpload(file);
        // Clean up file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !sending) {
      // Pass file to parent for processing
      if (onFileUpload) {
        onFileUpload(file);
        // Clean up file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setInputMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      <div className="bg-gradient-to-r from-agriplast-green-600 to-agriplast-green-500 dark:from-agriplast-green-700 dark:to-agriplast-green-600 text-white p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-md"></div>
              <div className="relative bg-white/10 p-2 rounded-full backdrop-blur-sm">
                <Bot className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">AI Assistant</h2>
              <p className="text-xs text-green-50 mt-0.5 font-medium">
                {isThinking ? 'Thinking...' : 'Ready to help'}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 p-2 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {/* Welcome message when chat is empty */}
        {enhancedMessages.length === 0 && (
          <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-agriplast-green-100 dark:bg-agriplast-green-900 flex items-center justify-center">
              <Bot className="w-4 h-4 text-agriplast-green-700 dark:text-agriplast-green-300" />
            </div>
            <div className="max-w-[85%] flex flex-col items-start">
              <div className="rounded-2xl p-4 shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="prose prose-sm max-w-none prose-gray dark:prose-invert">
                  <p className="text-sm mb-3">
                    Hi! I'm your AI planning assistant. I can help you with:
                  </p>
                  <ul className="text-sm space-y-1 mb-3">
                    <li>Adjusting polyhouse placement and configuration</li>
                    <li>Explaining material choices and costs</li>
                    <li>Optimizing space utilization</li>
                    <li>Answering questions about your plan</li>
                  </ul>
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                      Your detailed quotation is available! Click on <span className="font-bold">"Show Quotation"</span> button at the top to view pricing and materials.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-agriplast-green-100 dark:bg-agriplast-green-900 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-agriplast-green-700 dark:text-agriplast-green-300" />
                </div>
              )}

              <div className={`max-w-[85%] flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}>
                {/* Message bubble */}
                <div
                  className={`rounded-2xl p-4 shadow-md select-text transition-all duration-200 ${
                    isAssistant
                      ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      : 'bg-agriplast-green-600 text-white'
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
                  <div className={`${isAssistant ? 'text-gray-800 dark:text-gray-200' : 'text-white'}`}>
                    {isAssistant ? (
                      <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown
                          components={{
                            a: ({ node, href, children, ...props }) => (
                              <a
                                href={href}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (onLinkClick && href) {
                                    onLinkClick(href);
                                  }
                                }}
                                className="text-agriplast-green-600 dark:text-agriplast-green-400 hover:underline cursor-pointer font-medium"
                                {...props}
                              >
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>

                  {/* Timestamp and feedback */}
                  <div className={`flex items-center justify-between mt-2 ${isAssistant ? '' : ''}`}>
                    <p className={`text-xs ${isAssistant ? 'text-gray-400 dark:text-gray-500' : 'text-white/60'}`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {isAssistant && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(message.id, 'up');
                          }}
                          className={`p-1.5 rounded-lg transition-all duration-200 ${
                            message.feedback === 'up'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          <ThumbsUp size={12} fill={message.feedback === 'up' ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(message.id, 'down');
                          }}
                          className={`p-1.5 rounded-lg transition-all duration-200 ${
                            message.feedback === 'down'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          <ThumbsDown size={12} fill={message.feedback === 'down' ? 'currentColor' : 'none'} />
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
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-agriplast-green-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          );
        })}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-agriplast-green-100 dark:bg-agriplast-green-900 flex items-center justify-center">
              <Bot className="w-4 h-4 text-agriplast-green-700 dark:text-agriplast-green-300" />
            </div>
            <div className="max-w-[85%] flex flex-col items-start">
              <div className="rounded-2xl p-4 shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-agriplast-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-agriplast-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-agriplast-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Analyzing your request...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-2xl">
        {voiceError && (
          <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
            {voiceError}
          </div>
        )}

        {/* File upload preview */}
        {uploadedFile && (
          <div className="mb-2 p-2 bg-agriplast-green-50 dark:bg-agriplast-green-900/20 border border-agriplast-green-200 dark:border-agriplast-green-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-agriplast-green-600 dark:text-agriplast-green-400" />
              <span className="text-sm text-agriplast-green-800 dark:text-agriplast-green-200">{uploadedFile.name}</span>
            </div>
            <button
              onClick={removeFile}
              className="p-1 hover:bg-agriplast-green-100 dark:hover:bg-agriplast-green-900/40 rounded transition-colors"
            >
              <X className="w-4 h-4 text-agriplast-green-600 dark:text-agriplast-green-400" />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              placeholder={isRecording ? "Listening..." : isDragging ? "Drop file here..." : "Ask anything about your plan..."}
              disabled={sending || isRecording}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-agriplast-green-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none text-sm overflow-hidden ${
                isDragging ? 'border-agriplast-green-500 border-2 bg-agriplast-green-50 dark:bg-agriplast-green-900/20' : 'border-gray-300 dark:border-gray-600'
              }`}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".kml,.kmz"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="px-4 h-[44px] bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg active:scale-95"
            title="Upload KML file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          {voiceSupported && (
            <button
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={sending}
              className={`px-4 h-[44px] rounded-xl disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg active:scale-95 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || sending}
            className="px-4 h-[44px] bg-gradient-to-r from-agriplast-green-600 to-agriplast-green-700 hover:from-agriplast-green-700 hover:to-agriplast-green-800 text-white rounded-xl disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg active:scale-95"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
