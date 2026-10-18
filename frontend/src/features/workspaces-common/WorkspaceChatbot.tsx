import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Send,
  Sparkles,
  ExternalLink,
  X,
  ShieldCheck,
  Clock,
  Layers,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  investigationId?: string;
  findingsCount?: number;
  plannedAgents?: string[];
  status?: string;
}

interface Props {
  workspace: string;
  workspaceTitle: string;
  quickPrompts: string[];
  onAnalysisGenerated?: (investigationId: string, query: string) => void;
}

export const WorkspaceChatbot: React.FC<Props> = ({
  workspace,
  workspaceTitle,
  quickPrompts,
  onAnalysisGenerated,
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your ORCA ${workspaceTitle} AI Copilot. Ask any operational questions, request historical cyclone simulations, or trigger a multi-agent investigation.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
  }, [messages, isOpen]);

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
      // Dispatch multi-agent investigation to backend Orchestrator & Groq LLM
      const res = await apiClient.createInvestigation({
        workspace: workspace as any,
        query: q,
      });

      const invId = res.investigation_id;

      // Fetch enriched details
      let detailAnswer = res.final_answer;
      let findingsCount = res.findings_count || 0;
      let plannedAgents = res.planned_agents || [];

      try {
        const fullDetail = await apiClient.getInvestigation(invId);
        if (fullDetail.final_answer) {
          detailAnswer = fullDetail.final_answer;
        }
        if (fullDetail.findings) {
          findingsCount = fullDetail.findings.length;
        }
      } catch (e) {
        // Fallback to initial response
      }

      // Format complete operational answer for chat bubble
      let cleanSummary = '';
      if (detailAnswer) {
        // 1. Extract Section 1 (Operational Assessment & Decision Guidance)
        const sec1Match = detailAnswer.match(/####\s+1\.\s+Operational Assessment[\s\S]*?(?=####\s+2\.|$)/i);
        if (sec1Match) {
          const sec1Content = sec1Match[0]
            .replace(/^####\s+1\.\s+[^\n]+\n+/, '')
            .replace(/^-\s+/gm, '• ')
            .trim();
          cleanSummary += sec1Content;
        } else {
          // Fallback: strip title header and query
          const rawStripped = detailAnswer
            .replace(/^###\s+[^\n]+\n+/, '')
            .replace(/\*\*Query:\*\*[^\n]+\n+/, '')
            .split(/####\s+\d+\.\s+Evidence/)[0]
            .trim();
          cleanSummary += rawStripped;
        }

        // 2. Extract top 2 Specialist Findings if present for extra evidentiary depth
        const sec2Match = detailAnswer.match(/####\s+2\.\s+Specialist Observations[\s\S]*?(?=####\s+3\.|$)/i);
        if (sec2Match) {
          const findingLines = sec2Match[0]
            .split('\n')
            .filter(l => l.trim().startsWith('- [Finding') || l.trim().startsWith('- *[Finding') || l.trim().startsWith('- **[Finding'))
            .slice(0, 2)
            .map(l => {
              // Clean finding tags for compact bubble display
              return l.replace(/^-\s+/, '• ')
                .replace(/\[Finding\s+#?\d+\]\s*/i, '')
                .replace(/\*\((?:Status|State):\s*[A-Za-z_]+\)\*/i, '')
                .trim();
            });

          if (findingLines.length > 0) {
            cleanSummary += `\n\n**Specialist Observations:**\n` + findingLines.join('\n');
          }
        }
      }

      if (!cleanSummary || cleanSummary.trim().length === 0) {
        cleanSummary = `Investigation ${invId} successfully completed. Verified evidence and findings generated across ${plannedAgents.join(', ')}.`;
      }

      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: cleanSummary,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        investigationId: invId,
        findingsCount,
        plannedAgents,
        status: res.status,
      };

      setMessages(prev => [...prev, botMsg]);

      if (onAnalysisGenerated) {
        onAnalysisGenerated(invId, q);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `Error executing multi-agent reasoning: ${err?.message || 'Server connection failed.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const openOrchestratorGraph = (invId: string) => {
    navigate(`/agents/orchestrator?id=${invId}`);
  };

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
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] h-[540px] rounded-2xl bg-white border border-[#d8e4f0] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between flex-shrink-0">
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
                <p className="text-[10px] text-slate-300 capitalize">{workspaceTitle} Persona</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">
              Quick AI Prompts:
            </span>
            <div className="flex flex-col gap-1">
              {quickPrompts.slice(0, 3).map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="text-left text-[11px] text-indigo-700 bg-white hover:bg-indigo-50/80 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors truncate"
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
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                        : 'bg-white border border-[#d8e4f0] text-slate-800 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div className="space-y-1.5 text-xs text-[#1e293b]">
                        {msg.text.split('\n').map((rawLine, idx) => {
                          const line = rawLine.trim();
                          if (!line) return <div key={idx} className="h-1" />;

                          // Operational Status Badge (🟢, ⚠️, 🚨)
                          if (line.includes('🟢') || line.includes('⚠️') || line.includes('🚨')) {
                            const isGreen = line.includes('🟢');
                            const isAmber = line.includes('⚠️');
                            const bannerColor = isGreen
                              ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                              : isAmber
                              ? 'bg-amber-50 text-amber-950 border-amber-300'
                              : 'bg-rose-50 text-rose-950 border-rose-300';
                            const cleanTitle = line.replace(/\*\*/g, '').replace(/^[•\-]\s*/, '');
                            return (
                              <div
                                key={idx}
                                className={`p-2 rounded-xl border text-[11px] font-bold ${bannerColor} shadow-2xs leading-snug`}
                              >
                                {cleanTitle}
                              </div>
                            );
                          }

                          // Directives or Section Header
                          if (line.toLowerCase().includes('what to do') || line.toLowerCase().includes('directives') || line.toLowerCase().includes('guidance')) {
                            return (
                              <div key={idx} className="font-extrabold text-[#0a1628] text-[11.5px] mt-2 mb-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                <span>{line.replace(/\*\*/g, '').replace(/^[•\-]\s*/, '')}</span>
                              </div>
                            );
                          }

                          // Bullets
                          const isBullet = line.startsWith('•') || line.startsWith('-') || /^\d+\./.test(line);
                          const cleanContent = line.replace(/^[•\-]\s*/, '');

                          // Inline Markdown: **bold** and `code`
                          const segments = cleanContent.split(/(\*\*.*?\*\*|`.*?`)/g);
                          const rendered = segments.map((seg, sIdx) => {
                            if (seg.startsWith('**') && seg.endsWith('**')) {
                              return <strong key={sIdx} className="font-bold text-[#0a1628]">{seg.slice(2, -2)}</strong>;
                            }
                            if (seg.startsWith('`') && seg.endsWith('`')) {
                              return (
                                <code key={sIdx} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[10.5px] border border-indigo-100 font-semibold">
                                  {seg.slice(1, -1)}
                                </code>
                              );
                            }
                            return seg;
                          });

                          if (isBullet) {
                            return (
                              <div key={idx} className="flex items-start gap-1.5 text-xs text-[#334155] leading-relaxed pl-0.5">
                                <span className="text-indigo-500 font-bold text-xs select-none">•</span>
                                <div className="flex-1">{rendered}</div>
                              </div>
                            );
                          }

                          return (
                            <p key={idx} className="text-xs text-[#334155] leading-relaxed">
                              {rendered}
                            </p>
                          );
                        })}
                      </div>
                    )}

                    {/* Investigation Metadata & Action Button */}
                    {msg.investigationId && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 flex-wrap">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {msg.investigationId}
                          </span>
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            {msg.findingsCount} Claims Verified
                          </span>
                        </div>

                        {/* Open Full Execution Graph Button */}
                        <button
                          type="button"
                          onClick={() => openOrchestratorGraph(msg.investigationId!)}
                          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10.5px] border border-indigo-200 transition-all cursor-pointer"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Open Full Execution Graph</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono px-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-700 text-xs animate-pulse">
                <Clock className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Coordinating multi-agent specialists via Groq...</span>
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
              placeholder="Ask AI or simulate conditions..."
              disabled={loading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
