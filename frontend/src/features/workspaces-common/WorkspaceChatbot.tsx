import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Send,
  Sparkles,
  ExternalLink,
  X,
  Maximize2,
  Minimize2,
  Clock,
  Layers,
  ChevronDown,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import { hazardApi } from '../marine-hazard/api';

/**
 * Strips raw markdown formatting symbols (asterisks, header hashes, code fences, etc.)
 * to ensure 100% clean, human-readable plain text answers.
 */
export const cleanTextOnly = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(?<!\w)_([^_]+)_(?!\w)/g, '$1')
    .replace(/```[a-zA-Z]*\n?([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .trim();
};

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  providerUsed?: string;
  modelUsed?: string;
  isFallback?: boolean;
  toolExecutions?: Array<{
    tool: string;
    arguments: Record<string, any>;
    status: string;
    summary?: any;
  }>;
  evidence?: any[];
  findings?: any[];
  investigationId?: string;
}

interface Props {
  workspace: string;
  workspaceTitle: string;
  quickPrompts: string[];
  latitude?: number;
  longitude?: number;
  locationName?: string;
  onAnalysisGenerated?: (investigationId: string, query: string) => void;
}

export const WorkspaceChatbot: React.FC<Props> = ({
  workspace,
  workspaceTitle,
  quickPrompts,
  latitude = 13.85,
  longitude = 74.50,
  locationName = 'Karnataka Coastal Shelf',
  onAnalysisGenerated,
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToolsIndex, setShowToolsIndex] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your ORCA ${workspaceTitle} AI Copilot. Ask any operational questions, request live wave & swell forecasts, cyclone risk assessments, or coastal data inquiries for ${locationName}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      providerUsed: 'Groq',
      modelUsed: 'openai/gpt-oss-120b',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Connect to the autonomous Groq-powered AI Specialist Engine
      const res = await hazardApi.chatWithHazardAgent({
        message: q,
        conversation_id: conversationId,
        location: locationName,
        latitude,
        longitude,
        workspace,
        persona: workspaceTitle,
      });

      if (res.conversation_id) {
        setConversationId(res.conversation_id);
      }

      const cleanAnswer = cleanTextOnly(res.message);

      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: cleanAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        providerUsed: res.provider_used || 'Groq',
        modelUsed: res.model_used || 'llama-3.3-70b-versatile',
        isFallback: res.is_fallback,
        toolExecutions: res.tool_executions,
        evidence: res.evidence,
        findings: res.findings,
      };

      setMessages(prev => [...prev, botMsg]);

      if (onAnalysisGenerated && res.conversation_id) {
        onAnalysisGenerated(res.conversation_id, q);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `Error communicating with AI Copilot: ${err?.message || 'Server connection failed.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFallback: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const openOrchestratorGraph = (invId: string) => {
    navigate(`/agents/orchestrator?id=${invId}`);
  };

  const activeAssistantTurn = [...messages].reverse().find(m => m.sender === 'assistant' && m.modelUsed);
  const activeModelDisplay = activeAssistantTurn
    ? `${activeAssistantTurn.providerUsed ? `${activeAssistantTurn.providerUsed} ` : ''}${activeAssistantTurn.modelUsed}`
    : 'Groq Live';

  return (
    <>
      {/* Floating Toggle Button Bottom-Right */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white font-bold text-xs shadow-xl hover:shadow-indigo-500/25 hover:scale-105 transition-all cursor-pointer border border-indigo-400/30"
          >
            <Bot className="w-4 h-4 animate-bounce" />
            <span>AI {workspaceTitle} Copilot</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        ) : null}
      </div>

      {/* Floating Chatbot Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl bg-white border border-[#d8e4f0] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
            isExpanded
              ? 'w-[780px] h-[780px] max-w-[calc(100vw-2.5rem)] max-h-[calc(100vh-3.5rem)]'
              : 'w-96 max-w-[calc(100vw-2rem)] h-[550px]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>ORCA Intelligence Copilot</span>
                  <span className="px-1.5 py-0.2 rounded text-[9.5px] bg-emerald-500/20 text-emerald-300 font-mono">
                    GROQ LIVE
                  </span>
                </h3>
                <p className="text-[10.5px] text-slate-300 capitalize">{workspaceTitle} Persona</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Option to increase / decrease size of the chatbot */}
              <button
                type="button"
                onClick={() => setIsExpanded(prev => !prev)}
                title={isExpanded ? 'Collapse to standard size' : 'Increase size of chatbot'}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Model info banner */}
          <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200/80 flex items-center justify-between text-[10.5px] text-slate-600">
            <div className="flex items-center gap-1 font-medium truncate">
              <Cpu className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
              <span className="truncate">{activeModelDisplay}</span>
            </div>
            <span className="text-[10px] text-slate-500">{locationName}</span>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200/60 flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">
              Quick AI Prompts:
            </span>
            <div className={`grid gap-1 ${isExpanded ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {quickPrompts.slice(0, 4).map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="text-left text-[11px] text-indigo-700 bg-white hover:bg-indigo-50/80 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors truncate cursor-pointer disabled:opacity-50"
                >
                  ⚡ {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#fbfcfd]">
            {messages.map(msg => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div
                    className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                        : 'bg-white border border-[#d8e4f0] text-slate-800 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div className="space-y-2 text-xs text-[#1e293b]">
                        {/* Pure text rendering without raw markdown */}
                        <p className="whitespace-pre-wrap leading-relaxed text-[#1e293b] select-text">
                          {cleanTextOnly(msg.text)}
                        </p>

                        {/* Tool Executions Trace (Just like Images 4 & 5) */}
                        {msg.toolExecutions && msg.toolExecutions.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() =>
                                setShowToolsIndex(showToolsIndex === msg.id ? null : msg.id)
                              }
                              className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                            >
                              {showToolsIndex === msg.id ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                              <span>
                                Executed {msg.toolExecutions.length} Specialist Tool{msg.toolExecutions.length > 1 ? 's' : ''}
                              </span>
                            </button>

                            {showToolsIndex === msg.id && (
                              <div className="mt-1.5 space-y-1 pl-2 border-l-2 border-indigo-300">
                                {msg.toolExecutions.map((t, idx) => (
                                  <div
                                    key={idx}
                                    className="text-[10px] font-mono bg-slate-50 p-1.5 rounded border border-slate-200"
                                  >
                                    <span className="font-bold text-blue-700">{t.tool}</span>
                                    <span className="text-slate-500"> ({JSON.stringify(t.arguments)})</span>
                                    <span className="ml-1 text-emerald-600 font-semibold">[{t.status}]</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Cited Evidence Pills */}
                        {msg.evidence && msg.evidence.length > 0 && (
                          <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-wrap items-center gap-1">
                            <span className="text-[9.5px] font-bold text-slate-400">Cited Evidence:</span>
                            {msg.evidence.slice(0, 4).map((ev: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[9px] border border-blue-200"
                                title={ev.source_name || ev.dataset_id}
                              >
                                {ev.id || ev.evidence_id}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Optional graph link if investigation ID exists */}
                        {msg.investigationId && (
                          <div className="mt-2 pt-1.5 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => openOrchestratorGraph(msg.investigationId!)}
                              className="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] border border-indigo-200 transition-all cursor-pointer"
                            >
                              <Layers className="w-3 h-3" />
                              <span>Open Multi-Agent Execution Graph</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 font-mono px-1">
                    <span>{msg.timestamp}</span>
                    {msg.providerUsed && <span>• {msg.providerUsed}</span>}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-700 text-xs animate-pulse">
                <Clock className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Generating live operational intelligence via Groq...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-2.5 border-t border-slate-200 bg-white flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={`Ask AI ${workspaceTitle} Copilot...`}
              disabled={loading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-xs transition-colors cursor-pointer"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
