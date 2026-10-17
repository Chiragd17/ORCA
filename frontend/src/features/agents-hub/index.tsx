import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Cpu,
  Waves,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  FileCheck,
  ChevronRight,
  X,
} from 'lucide-react';

export const AgentsHub: React.FC = () => {
  const navigate = useNavigate();
  const [selectedAgentModal, setSelectedAgentModal] = useState<string | null>(null);

  const agents = [
    {
      id: 'ocean-research',
      title: 'Ocean Intelligence & Research Agent',
      assignedRole: 'Person 1',
      status: 'LIVE',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      statusDot: 'bg-emerald-500',
      icon: Sparkles,
      iconGradient: 'from-cyan-600 to-teal-600',
      badge: 'Production Ready',
      description:
        'Investigates sea surface temperature (SST) anomalies, chlorophyll-a trends, ocean current vectors, and seasonal environmental time-series.',
      keyCapabilities: [
        'Deterministic SST anomaly & thermal trend analysis against Arabian Sea baselines',
        '194 verified Arabian Sea historical & 7-day numerical forecast observations',
        'Live real-time marine telemetry ingestion via Open-Meteo Marine API',
        'Biochemical chlorophyll-a & ocean-colour biological productivity monitoring',
        'Cryptographic SHA-256 evidence record chaining with zero hallucinations',
      ],
      targetWorkspaces: ['Marine Monitoring', 'Fisherman Advisory'],
      stats: [
        { label: 'Primary Variable', value: 'SST & Anomaly' },
        { label: 'Forecast Horizon', value: '7-Day Hourly' },
        { label: 'Study Basin', value: 'Arabian Sea' },
        { label: 'Test Coverage', value: '94 / 94 Passed' },
      ],
      isInteractive: true,
      route: '/agents/ocean-research',
    },
    {
      id: 'marine-hazard',
      title: 'Marine Hazard & Forecast Agent',
      assignedRole: 'Person 2',
      status: 'LIVE',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      statusDot: 'bg-emerald-500',
      icon: AlertTriangle,
      iconGradient: 'from-orange-600 to-red-600',
      badge: 'Production Ready',
      description:
        'Processes tropical cyclones, gale wind gusts, high-swell surges, and disaster alerts using official meteorological feeds.',
      keyCapabilities: [
        'IBTrACS historical tropical cyclone tracks & playback structures (1,865 storms)',
        'GDACS real-time international disaster alerts & flood impact polygons',
        'Douglas Sea State classification & significant wave height threshold evaluation',
        'NOAA NHC 5-day future track waypoints & predicted trajectory runs',
        'Specialist conversational agent with autonomous tool execution loop',
      ],
      targetWorkspaces: ['Disaster Management', 'Coastal Authority', 'Fisherman Advisory'],
      stats: [
        { label: 'Storm Registry', value: '1,865 Cyclones' },
        { label: 'Track Fixes', value: '62,874 Points' },
        { label: 'Precedents', value: 'Tauktae, Ockhi' },
        { label: 'Wave Model', value: 'ECMWF IFS 7-Day' },
      ],
      isInteractive: true,
      route: '/agents/marine-hazard',
    },
    {
      id: 'coastal-risk',
      title: 'Coastal Impact & Risk Agent',
      assignedRole: 'Person 3',
      status: 'LIVE',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      statusDot: 'bg-emerald-500',
      icon: Waves,
      iconGradient: 'from-blue-600 to-cyan-600',
      badge: 'Production Ready',
      description:
        'Analyzes spatial exposure and vulnerability for coastal settlements, critical infrastructure, and ports across 320km of Karnataka coastline.',
      keyCapabilities: [
        'Deterministic Haversine geodesic distance & polygon intersection math',
        'Ingests 36 verified coastal features across Dakshina Kannada, Udupi & Uttara Kannada',
        'Official Census of India 2011 population exposure summation (1.07M residents)',
        'Live real-time marine wave observation via Open-Meteo Marine API',
        'Historical IMD / INCOIS cyclone surge models (Cyclone Tauktae 5.8m waves)',
      ],
      targetWorkspaces: ['Coastal Risk Workspace', 'Coastal Authority', 'Disaster Management'],
      stats: [
        { label: 'Coverage', value: '320 km Coastline' },
        { label: 'Settlements', value: '19 Towns' },
        { label: 'Monitored Pop', value: '1,075,668' },
        { label: 'Ports / Bases', value: '9 Facilities' },
      ],
      isInteractive: true,
      route: '/agents/coastal-risk',
    },
    {
      id: 'evidence-verification',
      title: 'Evidence & Scientific Verification Agent',
      assignedRole: 'Person 4',
      status: 'LIVE',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      statusDot: 'bg-emerald-500',
      icon: FileCheck,
      iconGradient: 'from-purple-600 to-indigo-600',
      badge: 'Scientific Auditor',
      description:
        'Independently verifies scientific claims, evidence provenance, data quality, calculations, source conflicts, and uncertainty.',
      keyCapabilities: [
        'Enforces shared ORCA agent contracts across all specialist outputs',
        'Validates cryptographic SHA-256 hashes against raw retrieved payloads',
        'Checks data freshness, coordinate bounds, and SI physical unit consistency',
        'Detects unsourced or conflicting claims made during investigations',
        'Assigns standardized verification states: matched, unmet, potential_gap, unverified, conflicting, needs_review',
      ],
      targetWorkspaces: ['Cross-Cutting Layer across ALL Workspaces'],
      stats: [
        { label: 'Integrity', value: 'SHA-256 Hashing' },
        { label: 'States', value: '6 Audit Grades' },
        { label: 'Audit Scope', value: 'All 4 Agents' },
        { label: 'Provenance', value: 'OSM, Census, IMD' },
      ],
      isInteractive: true,
      route: '/agents/evidence-verification',
    },
    {
      id: 'orchestrator',
      title: 'ORCA Master Orchestrator Agent',
      assignedRole: 'Person 5 (Master Orchestrator)',
      status: 'LIVE',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      statusDot: 'bg-emerald-500',
      icon: Cpu,
      iconGradient: 'from-indigo-600 via-purple-600 to-blue-600',
      badge: 'Master Coordinator',
      description:
        'Central orchestration engine autonomously coordinating all 4 specialist agents with structured dependency graphs, concurrent scheduling, mandatory scientific verification, and executive synthesis.',
      keyCapabilities: [
        'Dynamic multi-agent intent normalization & capability-based routing',
        'Asynchronous concurrent specialist scheduling with timeout and bounded retry limits',
        'Direct integration with Evidence & Scientific Verification Agent (Agent 4)',
        'Detects and reconciles material discrepancies across competing meteorological feeds',
        'Dual-tier persistence (PostgreSQL durable storage + low-latency cache)',
      ],
      targetWorkspaces: ['Master Coordination Layer across ALL 5 Workspaces'],
      stats: [
        { label: 'Coordination', value: 'All 4 Specialists' },
        { label: 'Scheduling', value: 'Async Concurrency' },
        { label: 'Audit Grade', value: 'Mandatory Verif' },
        { label: 'Persistence', value: 'PostgreSQL Engine' },
      ],
      isInteractive: true,
      route: '/agents/orchestrator',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-slate-800 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <Bot className="w-3.5 h-3.5" />
              <span>ORCA Multi-Agent Autonomous Architecture</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Specialist AI Agents Hub
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Autonomous scientific and spatial agents coordinating deterministically through the central
              Orchestrator to deliver verified marine, coastal, and disaster intelligence.
            </p>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span><strong>5</strong> Autonomous Agents Active</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span><strong>4 Specialists + Master Orchestrator</strong> Live</span>
            </div>
          </div>
        </div>
      </div>


      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <div
              key={agent.id}
              onClick={() => {
                if (agent.isInteractive && agent.route) {
                  navigate(agent.route);
                }
              }}
              onKeyDown={(e) => {
                if (agent.isInteractive && agent.route && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  navigate(agent.route);
                }
              }}
              tabIndex={agent.isInteractive ? 0 : undefined}
              role={agent.isInteractive ? 'button' : undefined}
              aria-label={agent.isInteractive ? `Open ${agent.title} scientific workspace directly` : undefined}
              className={`rounded-2xl bg-white border transition-all duration-200 p-6 flex flex-col justify-between shadow-xs ${
                agent.isInteractive
                  ? 'border-blue-200 hover:border-blue-500 hover:shadow-lg hover:ring-2 hover:ring-blue-500/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Agent Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.iconGradient} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-[#0a1628] leading-tight">
                          {agent.title}
                        </h2>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        Assigned: {agent.assignedRole}
                      </span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${agent.statusColor}`}>
                    <span className={`w-2 h-2 rounded-full ${agent.statusDot}`} />
                    <span>{agent.status}</span>
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  {agent.description}
                </p>

                {/* Key Capabilities */}
                <div className="mb-4 space-y-1.5 bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Verified Capabilities
                  </span>
                  {agent.keyCapabilities.map((cap, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="text-blue-500 font-bold text-[10px] mt-0.5">•</span>
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {agent.stats.map((st, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-400 block leading-tight">{st.label}</span>
                      <span className="text-xs font-bold text-slate-800 block mt-0.5 truncate">{st.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {agent.isInteractive ? 'Click anywhere on card to launch workspace' : 'Architecture scaffold in place'}
                </span>

                {agent.isInteractive ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(agent.route!);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Launch Agent Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAgentModal(agent.id);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>View Spec</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-Agent Orchestration Architecture Card */}
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#2563eb]" />
          <h3 className="text-base font-bold text-[#0a1628]">
            Orchestration & Investigation Planner Workflow
          </h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
          The central <strong>InvestigationPlanner</strong> (in <code>backend/app/orchestrator/planner.py</code>)
          determines agent execution dynamically based on workspace domain and query keywords. Every investigation
          is cryptographically audited by the Evidence Verification Agent before delivery to the frontend.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-800 block">1. Task Planning</span>
            <p className="text-slate-500 text-[11px]">
              Routes user inquiries from any workspace to the appropriate specialist agents without user intervention.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-800 block">2. Autonomous Data Retrieval</span>
            <p className="text-slate-500 text-[11px]">
              Pulls spatial boundaries from PostgreSQL (36 features) and live ocean telemetry via Open-Meteo & IMD.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-800 block">3. Cryptographic Verification</span>
            <p className="text-slate-500 text-[11px]">
              Hashes all evidence with SHA-256 to ensure complete scientific provenance, zero hallucinations, and auditability.
            </p>
          </div>
        </div>
      </div>

      {/* Agent Specification / Architecture Modal */}
      {selectedAgentModal && (() => {
        const modalAgent = agents.find((a) => a.id === selectedAgentModal);
        if (!modalAgent) return null;
        const Icon = modalAgent.icon;

        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedAgentModal(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedAgentModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 pr-8">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${modalAgent.iconGradient} flex items-center justify-center text-white shadow-xs flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {modalAgent.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 font-medium">{modalAgent.assignedRole}</span>
                    <span className="text-slate-300">•</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${modalAgent.statusColor}`}>
                      {modalAgent.status}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {modalAgent.description}
              </p>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Planned Pipeline & Capabilities
                </span>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  {modalAgent.keyCapabilities.map((cap, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Target Workspace Consumers
                </span>
                <div className="flex flex-wrap gap-2">
                  {modalAgent.targetWorkspaces.map((ws, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                      {ws}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Agent scaffold active in <code>backend/app/orchestrator/</code>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedAgentModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
