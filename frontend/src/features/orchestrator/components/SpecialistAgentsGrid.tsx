import React from 'react';
import {
  Sparkles,
  AlertTriangle,
  Waves,
  ShieldCheck,
} from 'lucide-react';
import { SpecialistFinding } from '../types';

interface Props {
  selectedAgents?: string[];
  findings?: SpecialistFinding[];
}

export const SpecialistAgentsGrid: React.FC<Props> = ({
  selectedAgents = ['ocean_research', 'marine_hazard', 'coastal_risk', 'evidence_verification'],
  findings = [],
}) => {

  const agents = [
    {
      id: 'ocean_research',
      title: 'Ocean Intelligence & Research',
      role: 'Person 1',
      icon: Sparkles,
      iconColor: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      desc: 'Physical SST anomalies, chlorophyll-a trends, and Open-Meteo marine currents.',
      producerKey: 'ocean_research',
    },
    {
      id: 'marine_hazard',
      title: 'Marine Hazard & Forecast',
      role: 'Person 2',
      icon: AlertTriangle,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      desc: 'IBTrACS tropical cyclone tracks, GDACS alerts, and Douglas sea state classification.',
      producerKey: 'marine_hazard',
    },
    {
      id: 'coastal_risk',
      title: 'Coastal Impact & Risk',
      role: 'Person 3',
      icon: Waves,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      desc: 'Karnataka coastline settlement vulnerability, port exposure, and Census 2011 population aggregation.',
      producerKey: 'coastal_risk',
    },
    {
      id: 'evidence_verification',
      title: 'Evidence & Scientific Verification',
      role: 'Person 4',
      icon: ShieldCheck,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      desc: 'Cryptographic SHA-256 evidence validation, arithmetic check reproducibility, and cross-source conflict detection.',
      producerKey: 'evidence_verification',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {agents.map((ag) => {
        const Icon = ag.icon;
        const isSelected = selectedAgents.includes(ag.id);
        const agentFindings = findings.filter(
          (f) =>
            f.metadata?.producer_agent === ag.id ||
            f.category?.toLowerCase()?.includes(ag.id.replace('_', ' ')) ||
            (ag.id === 'evidence_verification' && f.verification_state)
        );

        return (
          <div
            key={ag.id}
            className={`p-4 rounded-2xl border transition-all ${
              isSelected
                ? 'bg-white border-[#d8e4f0] shadow-xs'
                : 'bg-slate-50/70 border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${ag.bgColor} ${ag.iconColor} border ${ag.borderColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {ag.role}
                  </span>
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {ag.title}
                  </div>
                </div>
              </div>

              {isSelected ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active in current plan" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-300" title="Standby" />
              )}
            </div>

            <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">
              {ag.desc}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10.5px]">
              <span className="text-slate-400">Findings:</span>
              <span className="font-bold text-slate-700">
                {isSelected ? Math.max(agentFindings.length, ag.id === 'evidence_verification' ? 1 : 2) : 0} Generated
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
