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

      // Format preview text for chat snippet
      const cleanSummary = detailAnswer
        ? detailAnswer.split('\n\n')[0].replace(/^#+\s*/, '').replace(/\*\*/g, '')
        : `Investigation ${invId} successfully executed across ${plannedAgents.join(', ')}.`;

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
                    <p className="whitespace-pre-wrap">{msg.text}</p>

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
