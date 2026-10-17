import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import { hazardApi } from '../api';
import { FindingItem, EvidenceRecordItem } from '../types';

interface Props {
  lat: number;
  lon: number;
  locationName?: string;
  onSelectEvidence?: (ev: EvidenceRecordItem) => void;
}

const STARTER_QUESTIONS = [
  {
    label: 'Wave & Douglas Sea State',
    query: 'What are the significant wave height, swell period, and Douglas sea state off Karnataka shelf?',
  },
  {
    label: 'Active GDACS Alerts',
    query: 'Are there any active GDACS tropical cyclone warnings in regional waters?',
  },
  {
    label: 'Historical Precedent (Tauktae)',
    query: 'Show historical cyclone track and maximum intensity benchmarks for Cyclone Tauktae in Arabian Sea.',
  },
  {
    label: 'Vessel Operational Safety',
    query: 'Evaluate operational safety window for small motorized fiber boats over the next 24 hours.',
  },
];

interface MessageTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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
  findings?: FindingItem[];
  evidence?: EvidenceRecordItem[];
  limitations?: string[];
}

export const HazardSpecialistChat: React.FC<Props> = ({
  lat,
  lon,
  locationName = 'Karnataka Coastal Shelf',
  onSelectEvidence,
}) => {
  const [messages, setMessages] = useState<MessageTurn[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        `Welcome to the **Marine Hazard & Forecast Specialist Agent**. I autonomously analyze real-time marine wave spectra, evaluate Douglas Sea State categories, query official GDACS disaster alerts, and cross-reference NOAA IBTrACS historical storm tracks for the **${locationName}** sector.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      providerUsed: 'Groq',
      modelUsed: 'openai/gpt-oss-120b',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToolsIndex, setShowToolsIndex] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only scroll internally inside the chat panel when the user actively interacts
    if (messages.length > 1 || loading) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [messages.length, loading]);

  const handleSend = async (userPrompt: string) => {
    const text = userPrompt.trim();
    if (!text || loading) return;

    const userTurn: MessageTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userTurn]);
    setInput('');
    setLoading(true);

    try {
      const response = await hazardApi.chatWithHazardAgent({
        message: text,
        location: locationName,
        latitude: lat,
        longitude: lon,
      });

      const assistantTurn: MessageTurn = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        providerUsed: response.provider_used,
        modelUsed: response.model_used,
        isFallback: response.is_fallback,
        toolExecutions: response.tool_executions,
        findings: response.findings,
        evidence: response.evidence,
        limitations: response.limitations,
      };

      setMessages((prev) => [...prev, assistantTurn]);
    } catch (err: any) {
      const fallbackTurn: MessageTurn = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error communicating with Marine Hazard Agent: ${err.message || 'Service temporarily unreachable.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFallback: true,
      };
      setMessages((prev) => [...prev, fallbackTurn]);
    } finally {
      setLoading(false);
    }
  };

  const activeAssistantTurn = [...messages].reverse().find((m) => m.role === 'assistant' && m.modelUsed);
  const modelDisplay = activeAssistantTurn
    ? `${activeAssistantTurn.providerUsed ? `${activeAssistantTurn.providerUsed} ` : ''}${activeAssistantTurn.modelUsed}`
    : 'Marine Specialist Agent';

  return (
    <div className="rounded-2xl bg-white border border-[#d8e4f0] shadow-xs flex flex-col h-[520px] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-xl shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0a1628] flex items-center gap-2">
              <span>Specialist Marine Hazard Agent</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Tool-Calling Active</span>
              </span>
            </h3>
            <p className="text-[10.5px] text-slate-500">
              Autonomous reasoning over PostgreSQL hazard records and live marine APIs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
          <Cpu className="w-3 h-3 text-orange-500" />
          <span>{modelDisplay}</span>
        </div>
      </div>

      {/* Message Body */}
      <div ref={messagesContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-2xs ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-[#f8fafc] text-slate-800 border border-slate-200/80 rounded-tl-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>

                {/* Tool Executions Trace */}
                {m.toolExecutions && m.toolExecutions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() =>
                        setShowToolsIndex(showToolsIndex === m.id ? null : m.id)
                      }
                      className="text-[10.5px] font-semibold text-orange-700 hover:text-orange-900 flex items-center gap-1 cursor-pointer"
                    >
                      {showToolsIndex === m.id ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      <span>
                        Executed {m.toolExecutions.length} Autonomous Tool{m.toolExecutions.length > 1 ? 's' : ''}
                      </span>
                    </button>

                    {showToolsIndex === m.id && (
                      <div className="mt-1.5 space-y-1 pl-2 border-l-2 border-orange-300">
                        {m.toolExecutions.map((t, idx) => (
                          <div
                            key={idx}
                            className="text-[10px] font-mono bg-white p-1.5 rounded border border-slate-200"
                          >
                            <span className="font-bold text-blue-700">{t.tool}</span>
                            <span className="text-slate-400">({JSON.stringify(t.arguments)})</span>
                            <span className="ml-1 text-emerald-600 font-semibold">[{t.status}]</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Evidence citations */}
                {m.evidence && m.evidence.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400">Cited Evidence:</span>
                    {m.evidence.slice(0, 4).map((ev, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSelectEvidence?.(ev)}
                        className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono text-[9.5px] border border-blue-200 transition cursor-pointer"
                        title={ev.source_name}
                      >
                        {ev.id}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400">
                <span>{m.timestamp}</span>
                {m.providerUsed && (
                  <span>• {m.providerUsed}</span>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
            <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
            <span className="italic">Specialist agent is selecting tools and analyzing hazard evidence...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompt Pills */}
      <div className="px-4 py-2 border-t border-slate-100 bg-[#f8fafc] flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-orange-500" />
          Quick Inquiries:
        </span>
        {STARTER_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q.query)}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-900 border border-slate-200 text-[10.5px] font-medium transition cursor-pointer disabled:opacity-50"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask Marine Hazard Agent about storms, swell, or warnings near ${locationName}...`}
          disabled={loading}
          className="flex-1 text-xs px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
          title="Send inquiry"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
