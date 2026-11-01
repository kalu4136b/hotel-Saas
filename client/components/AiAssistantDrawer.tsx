'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Bot,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Plus,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Square,
  ChevronDown,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { aiAssistantApi, authStorage } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  detectedLanguage?: string;
  inputModality?: 'text' | 'voice';
  createdAt?: string;
  suggestedFollowUps?: string[];
  pendingAction?: {
    confirmationId: string;
    actionType: string;
    previewSummary: string;
    parameters: any;
    expiresAt: string | Date;
    confirmButtonText: string;
    cancelButtonText: string;
    status?: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXECUTED' | 'EXPIRED';
  };
  toolResult?: {
    toolName: string;
    success: boolean;
    data: any;
    summary: string;
  };
}

export default function AiAssistantDrawer() {
  const pathname = usePathname();

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<'AUTO' | 'EN' | 'SI'>('AUTO');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [contextSuggestions, setContextSuggestions] = useState<string[]>([]);
  const [conversationsList, setConversationsList] = useState<any[]>([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, interimTranscript]);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
      loadSuggestions();
      loadConversations();
    } else {
      stopSpeaking();
      stopRecording();
    }
  }, [isOpen, pathname]);

  // Load contextual suggestions based on current route
  const loadSuggestions = useCallback(async () => {
    try {
      const res = await aiAssistantApi.getSuggestions(pathname);
      if (res?.suggestions?.length) {
        setContextSuggestions(res.suggestions);
      }
    } catch {
      // Fallback default suggestions
      setContextSuggestions([
        'Show today\'s scheduled arrivals',
        'Show dirty rooms needing turnaround',
        'Check inventory items low on stock',
        'What is our channel sync health?',
      ]);
    }
  }, [pathname]);

  // Load previous conversations
  const loadConversations = async () => {
    try {
      const res = await aiAssistantApi.getConversations();
      if (Array.isArray(res)) {
        setConversationsList(res);
      }
    } catch {
      // Ignore
    }
  };

  // Speech Recognition (Web Speech API)
  const startRecording = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      stopSpeaking();
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = preferredLanguage === 'SI' ? 'si-LK' : 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInterimTranscript(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (interimTranscript.trim()) {
          setInputText(interimTranscript.trim());
          setInterimTranscript('');
          // Auto submit dictated speech
          handleSendMessage(interimTranscript.trim(), 'voice');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  // Text to Speech (TTS)
  const speakText = (text: string, lang = 'EN') => {
    if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();

      // Clean text of markdown formatting for speech
      const cleanText = text
        .replace(/\|[^\n]+\|/g, '') // remove markdown tables
        .replace(/[*#`_~>\[\]\(\)]/g, '') // remove symbols
        .replace(/\n\s*\n/g, '. ')
        .slice(0, 350); // speak summary of first ~350 chars

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang === 'SI' ? 'si-LK' : 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current = window.speechSynthesis;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('TTS playback error:', err);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Send message
  const handleSendMessage = async (textToSend?: string, modality: 'text' | 'voice' = 'text') => {
    const messageContent = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!messageContent || isLoading) return;

    stopSpeaking();
    setInputText('');
    setInterimTranscript('');

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageContent,
      inputModality: modality,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const response: any = await aiAssistantApi.sendMessage({
        message: messageContent,
        conversationId: activeConversationId || undefined,
        inputModality: modality,
        currentPage: pathname,
      });

      if (response) {
        if (!activeConversationId && response.conversationId) {
          setActiveConversationId(response.conversationId);
          loadConversations();
        }

        const assistantMsg: Message = {
          id: response.messageId || `asst-${Date.now()}`,
          role: 'assistant',
          content: response.content,
          detectedLanguage: response.detectedLanguage,
          suggestedFollowUps: response.suggestedFollowUps,
          pendingAction: response.pendingAction,
          toolResult: response.toolResult,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Speak aloud if enabled
        if (ttsEnabled && response.content) {
          speakText(response.content, response.detectedLanguage);
        }
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Connection Error**: ${err?.message || 'Unable to communicate with Hotel Operations Engine. Please check your network or try again.'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm or Reject Action
  const handleConfirmAction = async (confirmationId: string, decision: 'CONFIRM' | 'REJECT') => {
    setActionLoadingId(confirmationId);
    try {
      const res: any = await aiAssistantApi.confirmAction(confirmationId, decision);

      // Update message state
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.pendingAction?.confirmationId === confirmationId) {
            return {
              ...msg,
              pendingAction: {
                ...msg.pendingAction,
                status: decision === 'CONFIRM' ? 'EXECUTED' : 'REJECTED',
              },
            };
          }
          return msg;
        })
      );

      // Add assistant feedback message
      const feedbackText =
        decision === 'CONFIRM'
          ? `✅ **Action Executed Successfully**\n${res?.message || 'The operation was processed and updated in the system.'}`
          : `❌ **Action Cancelled**\nThe proposed change was cancelled by user request.`;

      setMessages((prev) => [
        ...prev,
        {
          id: `feedback-${Date.now()}`,
          role: 'assistant',
          content: feedbackText,
          createdAt: new Date().toISOString(),
        },
      ]);

      if (ttsEnabled) {
        speakText(feedbackText);
      }
    } catch (err: any) {
      alert(`Action error: ${err?.message || 'Failed to execute action'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Start new conversation
  const handleNewConversation = () => {
    stopSpeaking();
    setActiveConversationId(null);
    setMessages([]);
    setShowHistoryDropdown(false);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  // Load conversation history
  const handleSelectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    setShowHistoryDropdown(false);
    setIsLoading(true);
    try {
      const msgs = await aiAssistantApi.getMessages(convId);
      if (Array.isArray(msgs)) {
        setMessages(
          msgs.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            detectedLanguage: m.language,
            createdAt: m.createdAt,
            pendingAction: m.actionConfirmation
              ? {
                  confirmationId: m.actionConfirmation.id,
                  actionType: m.actionConfirmation.actionType,
                  previewSummary: m.actionConfirmation.previewSummary,
                  parameters: m.actionConfirmation.parameters,
                  expiresAt: m.actionConfirmation.expiresAt,
                  confirmButtonText: 'Confirm & Execute',
                  cancelButtonText: 'Cancel',
                  status: m.actionConfirmation.status,
                }
              : undefined,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Render markdown-like simple formatting (bold, tables, lists, alerts)
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];

    const flushTable = () => {
      if (tableBuffer.length > 0) {
        const rows = tableBuffer.map((line) =>
          line
            .split('|')
            .map((c) => c.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        );

        if (rows.length >= 2) {
          const headers = rows[0];
          const dataRows = rows.slice(2); // Skip separator row

          elements.push(
            <div key={`table-${elements.length}`} className="my-2.5 overflow-x-auto rounded-lg border border-[#E2E8F0]">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#E2E8F0]">
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="px-2.5 py-1.5 whitespace-nowrap">
                        {h.replace(/\*\*/g, '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {dataRows.map((r, ri) => (
                    <tr key={ri} className="hover:bg-[#F8FAFC]/70">
                      {r.map((cell, ci) => (
                        <td key={ci} className="px-2.5 py-1.5 whitespace-nowrap text-[#1E293B]">
                          {cell.replace(/\*\*/g, '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        tableBuffer = [];
      }
    };

    lines.forEach((line, idx) => {
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        tableBuffer.push(line.trim());
      } else {
        flushTable();

        if (line.startsWith('### ')) {
          elements.push(
            <h4 key={idx} className="text-xs font-bold text-[#0F172A] mt-2 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C]"></span>
              {line.replace('### ', '')}
            </h4>
          );
        } else if (line.startsWith('> ⚠️ ') || line.startsWith('> ')) {
          elements.push(
            <div
              key={idx}
              className="my-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>{line.replace(/^>\s*(⚠️\s*)?/, '')}</span>
            </div>
          );
        } else if (line.startsWith('- ') || line.startsWith('• ')) {
          elements.push(
            <li key={idx} className="ml-3 list-disc text-xs text-[#334155] leading-relaxed my-0.5">
              {formatInlineText(line.replace(/^[-•]\s*/, ''))}
            </li>
          );
        } else if (line.trim()) {
          elements.push(
            <p key={idx} className="text-xs text-[#334155] leading-relaxed my-1">
              {formatInlineText(line)}
            </p>
          );
        }
      }
    });

    flushTable();
    return elements;
  };

  // Helper for **bold** and `code` inline formatting
  const formatInlineText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-[#0F172A]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1 py-0.5 rounded bg-[#F1F5F9] font-mono text-[11px] text-[#0F172A]">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const property = authStorage.getProperty();

  return (
    <>
      {/* 1. FLOATING ACTION TRIGGER WIDGET */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        {!isOpen && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur shadow-lg border border-[#E2E8F0] text-[11px] font-medium text-[#475569] animate-fade-in pointer-events-none">
            <Sparkles className="w-3 h-3 text-[#00C48C]" />
            <span>AI Operations</span>
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-[#F1F5F9] text-[#64748B] rounded border border-[#E2E8F0]">
              Ctrl+K
            </kbd>
          </div>
        )}

        <button
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Toggle AI Hotel Assistant"
          className={`relative group p-3.5 rounded-2xl shadow-xl transition-all duration-300 flex items-center justify-center ${
            isOpen
              ? 'bg-[#0F172A] text-white rotate-90 scale-95 shadow-[#0F172A]/20'
              : 'bg-gradient-to-tr from-[#00C48C] via-[#00A877] to-[#10B981] text-white hover:scale-105 shadow-[#00C48C]/30 hover:shadow-2xl'
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <Bot className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
              {/* Pulsing ring indicator */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white border-2 border-[#00C48C]"></span>
              </span>
            </>
          )}
        </button>
      </div>

      {/* 2. SLIDE-OVER ASSISTANT DRAWER */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[520px] bg-white shadow-2xl border-l border-[#E2E8F0] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* DRAWER HEADER */}
        <div className="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00C48C] to-[#10B981] flex items-center justify-center text-white shadow-md shadow-[#00C48C]/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">Hotel AI Co-Pilot</h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#00C48C]/20 text-[#00C48C] border border-[#00C48C]/30">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                {property?.name || 'Grand Horizon Hotel'} • Multilingual Ops
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* New Conversation Button */}
            <button
              onClick={handleNewConversation}
              title="New Chat Session"
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Conversation History Dropdown Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowHistoryDropdown((prev) => !prev)}
                title="Recent Sessions"
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
              >
                <History className="w-4 h-4" />
              </button>

              {showHistoryDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-[#E2E8F0] text-[#0F172A] py-2 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#F1F5F9]">
                    Recent Conversations
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {conversationsList.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-[#94A3B8] text-center">No past sessions</p>
                    ) : (
                      conversationsList.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectConversation(c.id)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-[#F8FAFC] truncate transition-colors flex items-center justify-between ${
                            c.id === activeConversationId ? 'bg-emerald-50 text-[#00A877] font-semibold' : ''
                          }`}
                        >
                          <span className="truncate">{c.title || 'Session'}</span>
                          <span className="text-[10px] text-[#94A3B8]">
                            {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Voice Audio Read-Aloud Toggle */}
            <button
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setTtsEnabled((prev) => !prev);
              }}
              title={ttsEnabled ? 'Mute Voice Responses' : 'Enable Voice Responses'}
              className={`p-1.5 rounded-lg transition-colors ${
                ttsEnabled ? 'text-[#00C48C] hover:bg-[#1E293B]' : 'text-[#64748B] hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SUBHEADER: Language Selector & Speech Status */}
        <div className="px-5 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#64748B]">Language:</span>
            <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-white p-0.5">
              {(['AUTO', 'EN', 'SI'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setPreferredLanguage(lang)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                    preferredLanguage === lang
                      ? 'bg-[#00C48C] text-white shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {lang === 'AUTO' ? 'Auto' : lang === 'EN' ? 'English' : 'සිංහල'}
                </button>
              ))}
            </div>
          </div>

          {isSpeaking && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#00C48C] font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#00C48C]"></span>
              <span>Speaking response...</span>
              <button
                onClick={stopSpeaking}
                className="p-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A]"
                title="Stop speaking"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
              </button>
            </div>
          )}
        </div>

        {/* CHAT MESSAGES STREAM */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gradient-to-b from-white to-[#F8FAFC]/50">
          {messages.length === 0 ? (
            /* WELCOME & QUICK SUGGESTIONS VIEW */
            <div className="h-full flex flex-col justify-center items-center text-center px-4 py-8">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#00C48C] mb-4 shadow-sm">
                <Bot className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-[#0F172A] mb-1">
                Hotel Operations Assistant
              </h4>
              <p className="text-xs text-[#64748B] max-w-sm mb-6 leading-relaxed">
                Ask questions about guests, reservations, dirty rooms, low stock, bar inventory, or channel bookings in <strong>English</strong> or <strong>සිංහල / Singlish</strong>.
              </p>

              {/* Contextual Suggestion Pills */}
              <div className="w-full space-y-2 text-left">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block px-1">
                  Contextual Suggestions for this page:
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {contextSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(suggestion, 'text')}
                      className="group w-full p-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#00C48C] hover:bg-emerald-50/50 text-left transition-all flex items-center justify-between text-xs font-medium text-[#334155]"
                    >
                      <span className="truncate">{suggestion}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#00C48C] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* CONVERSATION HISTORY STREAM */
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
              >
                {/* ROLE BADGE / SENDER INFO */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[#94A3B8]">
                  {msg.role === 'assistant' ? (
                    <>
                      <Bot className="w-3 h-3 text-[#00C48C]" />
                      <span className="font-semibold text-[#475569]">AI Co-Pilot</span>
                      {msg.detectedLanguage && (
                        <span className="px-1 py-0.2 rounded bg-[#F1F5F9] font-mono text-[9px] text-[#64748B]">
                          {msg.detectedLanguage}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span>You</span>
                      {msg.inputModality === 'voice' && (
                        <Mic className="w-2.5 h-2.5 text-[#00C48C]" />
                      )}
                    </>
                  )}
                </div>

                {/* MESSAGE BUBBLE */}
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#0F172A] text-white rounded-tr-none'
                      : 'bg-white border border-[#E2E8F0] text-[#1E293B] rounded-tl-none'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div>{renderFormattedContent(msg.content)}</div>
                  )}

                  {/* 2-STEP CONFIRMATION CARD FOR WRITE OPERATIONS */}
                  {msg.pendingAction && (
                    <div className="mt-3 p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 text-[#0F172A]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                          <ShieldCheck className="w-3 h-3" />
                          Confirmation Required
                        </span>
                        <span className="text-[10px] text-amber-800 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          5 min window
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-[#0F172A] mb-1.5">
                        {msg.pendingAction.previewSummary}
                      </p>

                      {/* Display parameters if available */}
                      {msg.pendingAction.parameters && (
                        <div className="my-2 p-2 rounded-lg bg-white/80 border border-amber-200 text-[11px] font-mono space-y-0.5">
                          {Object.entries(msg.pendingAction.parameters).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="text-[#64748B]">{k}:</span>
                              <span className="font-semibold text-[#0F172A]">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action status or interactive buttons */}
                      {msg.pendingAction.status === 'EXECUTED' ? (
                        <div className="mt-2.5 py-1.5 px-3 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Action executed successfully
                        </div>
                      ) : msg.pendingAction.status === 'REJECTED' ? (
                        <div className="mt-2.5 py-1.5 px-3 rounded-lg bg-rose-100 text-rose-800 text-[11px] font-bold flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-rose-600" />
                          Action cancelled by user
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleConfirmAction(msg.pendingAction!.confirmationId, 'CONFIRM')
                            }
                            disabled={actionLoadingId === msg.pendingAction.confirmationId}
                            className="flex-1 py-2 px-3 rounded-lg bg-[#00C48C] hover:bg-[#00A877] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {actionLoadingId === msg.pendingAction.confirmationId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            {msg.pendingAction.confirmButtonText || 'Confirm & Execute'}
                          </button>

                          <button
                            onClick={() =>
                              handleConfirmAction(msg.pendingAction!.confirmationId, 'REJECT')
                            }
                            disabled={actionLoadingId === msg.pendingAction.confirmationId}
                            className="py-2 px-3 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-bold text-[#475569] transition-all disabled:opacity-50"
                          >
                            {msg.pendingAction.cancelButtonText || 'Cancel'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Play audio button for assistant responses */}
                  {msg.role === 'assistant' && (
                    <div className="mt-2 pt-1 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#94A3B8]">
                      <span>Hotel Ops Engine</span>
                      <button
                        onClick={() => speakText(msg.content, msg.detectedLanguage)}
                        title="Replay Voice"
                        className="p-1 rounded hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#00C48C] transition-colors"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Suggested follow-up prompt chips */}
                {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                    {msg.suggestedFollowUps.map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleSendMessage(prompt, 'text')}
                        className="px-2.5 py-1 rounded-full bg-white border border-[#E2E8F0] hover:border-[#00C48C] text-[11px] font-medium text-[#475569] hover:text-[#00A877] shadow-sm transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {/* LOADING / TYPING INDICATOR */}
          {isLoading && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-[#E2E8F0] w-28 text-[#64748B] animate-pulse">
              <Bot className="w-3.5 h-3.5 text-[#00C48C]" />
              <span className="text-[11px] font-medium">Thinking...</span>
            </div>
          )}

          {/* INTERIM RECORDING TEXT PREVIEW */}
          {isRecording && interimTranscript && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 italic animate-pulse">
              Dictating: &quot;{interimTranscript}&quot;
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ACTIVE VOICE RECORDING BANNER */}
        {isRecording && (
          <div className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between text-xs shadow-inner animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
              <span className="font-semibold">Listening to speech...</span>
            </div>
            <button
              onClick={stopRecording}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold"
            >
              Finish & Send
            </button>
          </div>
        )}

        {/* CHAT INPUT AREA */}
        <div className="p-4 bg-white border-t border-[#E2E8F0]">
          <div className="relative flex items-end gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-2 focus-within:border-[#00C48C] focus-within:bg-white transition-all">
            {/* Auto-resizing textarea */}
            <textarea
              ref={inputRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask anything or dictation (e.g. 'Show today arrivals' / 'Ada bookings keeyakda?')..."
              className="flex-1 bg-transparent resize-none border-0 p-1 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
            />

            <div className="flex items-center gap-1.5 pb-0.5">
              {/* Push-to-Talk / Dictation Button */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                title={isRecording ? 'Stop Recording' : 'Start Voice Dictation'}
                className={`p-2 rounded-xl transition-all ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-bounce'
                    : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#00C48C] hover:border-[#00C48C]'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                className="p-2 rounded-xl bg-[#00C48C] hover:bg-[#00A877] text-white transition-all disabled:opacity-40 disabled:hover:bg-[#00C48C] shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] text-[#94A3B8] px-1">
            <span>Press <strong>Enter</strong> to send • <strong>Shift+Enter</strong> for newline</span>
            <span>Multilingual • Safe Execution</span>
          </div>
        </div>
      </div>
    </>
  );
}
