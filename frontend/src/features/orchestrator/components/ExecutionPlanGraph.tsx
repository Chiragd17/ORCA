import React from 'react';
import {
  GitCommit,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  Zap,
  MapPin,
} from 'lucide-react';
import { ExecutionPlan } from '../types';

interface Props {
  plan: ExecutionPlan | null;
  status: string;
}

export const ExecutionPlanGraph: React.FC<Props> = ({ plan, status }) => {
  if (!plan) {
    return (
      <div className="rounded-2xl bg-white border border-[#d8e4f0] p-5 shadow-xs text-center text-xs text-slate-400">
        No structured execution plan loaded. Select an investigation or run a new multi-agent query.
      </div>
    );
  }

  const isCompleted = status === 'completed' || status === 'partial';

  return (
    <div className="rounded-2xl bg-white border border-[#d8e4f0] p-5 shadow-xs space-y-4">
      {/* Plan Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
            <GitCommit className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-[#0a1628] flex items-center gap-2">
              <span>Dynamic Execution Graph</span>
              <span className="font-mono text-[10px] text-slate-400">({plan.plan_id})</span>
            </h3>
            <p className="text-[11px] text-[#6b8fc0]">
              Intent: <strong className="text-slate-700">{plan.normalized_intent.replace(/_/g, ' ')}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-[10.5px]">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            <MapPin className="w-3 h-3 text-indigo-500" />
            <span>{plan.target_coordinates.latitude}°N, {plan.target_coordinates.longitude}°E (r={plan.target_coordinates.radius_km}km)</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
            <Layers className="w-3 h-3" />
            <span>{plan.steps.length} Pipeline Steps</span>
          </span>
        </div>
      </div>

      {/* Execution Stepper Flow */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Phase 1: Planning */}
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phase 1</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xs font-bold text-slate-800">Normalization & Routing</div>
            <p className="text-[10.5px] text-slate-500 mt-1 leading-relaxed">
              Mapped intent to {plan.selected_agents.length} specialist capabilities.
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
            <span>Deterministic Plan Created</span>
          </div>
        </div>

        {/* Phase 2: Concurrent Independent Specialists */}
        <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Phase 2</span>
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              )}
            </div>
            <div className="text-xs font-bold text-slate-800">Concurrent Specialists</div>
            <p className="text-[10.5px] text-slate-500 mt-1 leading-relaxed">
              Parallel dispatch of Ocean Research and/or Marine Hazard agents.
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-100 flex items-center gap-1 text-[10px] text-blue-700 font-medium">
            <span>Async Concurrency Limit (20s)</span>
          </div>
        </div>

        {/* Phase 3: Dependent Specialist Tasks */}
        <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Phase 3</span>
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
              )}
            </div>
            <div className="text-xs font-bold text-slate-800">Dependent Calculations</div>
            <p className="text-[10.5px] text-slate-500 mt-1 leading-relaxed">
              Coastal Risk evaluating exposure using upstream wave and surge inputs.
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-indigo-100 flex items-center gap-1 text-[10px] text-indigo-700 font-medium">
            <span>Upstream Context Injected</span>
          </div>
        </div>

        {/* Phase 4: Scientific Verification & Synthesis */}
        <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Phase 4</span>
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
              )}
            </div>
            <div className="text-xs font-bold text-slate-800">Scientific Verification</div>
            <p className="text-[10.5px] text-slate-500 mt-1 leading-relaxed">
              Agent 4 independent audit, cross-source conflict reconciliation, & persistence.
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-purple-100 flex items-center gap-1 text-[10px] text-purple-700 font-medium">
            <span>PostgreSQL Durable Record</span>
          </div>
        </div>
      </div>
    </div>
  );
};
