import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { VerificationFinding } from '../types';

interface Props {
  finding: VerificationFinding | null;
  onClose: () => void;
  onResolved: () => void;
}

export const ResolveFindingModal: React.FC<Props> = ({ finding, onClose, onResolved }) => {
  const [strategy, setStrategy] = useState<string>('accept_primary');
  const [preferredSource] = useState<string>('ECMWF High Resolution HRES Model');
  const [rationale, setRationale] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!finding) return null;

  const isConflict = finding.finding_code === 'VFD_MATERIAL_SOURCE_CONFLICT';
  const isConflation = finding.finding_code === 'VFD_FORECAST_CONFLATION';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/evidence-verification/findings/resolve', {
        finding_code: finding.finding_code,
        claim_id: finding.claim_id,
        resolution_strategy: strategy,
        preferred_source: isConflict ? preferredSource : undefined,
        rationale: rationale.trim() || undefined,
        resolved_by: 'Scientific Reviewer (Auditor Sign-off)',
      });
      onResolved();
      onClose();
    } catch (err: any) {
      console.error('Failed to resolve finding:', err);
      setError('Failed to resolve discrepancy. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#0a1628] flex items-center gap-2">
                Resolve Scientific Discrepancy
              </h2>
              <span className="text-[11px] text-slate-500 font-mono">
                {finding.finding_code} • Claim {finding.claim_id}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Finding explanation alert */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-[11.5px] text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Flagged Discrepancy
            </span>
            <p className="leading-relaxed text-[11px] text-amber-900">{finding.explanation}</p>
          </div>

          {/* Resolution Strategy Selector */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block text-xs">
              Select Scientific Resolution Strategy:
            </label>

            {isConflict && (
              <div className="space-y-2">
                <label
                  onClick={() => setStrategy('accept_primary')}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    strategy === 'accept_primary'
                      ? 'border-purple-500 bg-purple-50/40 ring-1 ring-purple-500'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    checked={strategy === 'accept_primary'}
                    onChange={() => setStrategy('accept_primary')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Select Primary Trusted Model Feed
                    </span>
                    <span className="text-[11px] text-slate-500 leading-normal block">
                      Prioritize ECMWF High Resolution HRES (46.5 kt) due to superior coastal resolution over GFS (34.0 kt).
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setStrategy('acknowledged')}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    strategy === 'acknowledged'
                      ? 'border-purple-500 bg-purple-50/40 ring-1 ring-purple-500'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    checked={strategy === 'acknowledged'}
                    onChange={() => setStrategy('acknowledged')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Acknowledge Ensemble Variance
                    </span>
                    <span className="text-[11px] text-slate-500 leading-normal block">
                      Accept 34.0–46.5 kt range as inherent multi-model atmospheric spread during storm transit.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {isConflation && (
              <div className="space-y-2">
                <label
                  onClick={() => setStrategy('reclassify_forecast')}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    strategy === 'reclassify_forecast'
                      ? 'border-purple-500 bg-purple-50/40 ring-1 ring-purple-500'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    checked={strategy === 'reclassify_forecast'}
                    onChange={() => setStrategy('reclassify_forecast')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Reclassify Claim to Numerical Forecast
                    </span>
                    <span className="text-[11px] text-slate-500 leading-normal block">
                      Correct taxonomy from physical in-situ observation to numerical model forecast output.
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setStrategy('acknowledged')}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    strategy === 'acknowledged'
                      ? 'border-purple-500 bg-purple-50/40 ring-1 ring-purple-500'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    checked={strategy === 'acknowledged'}
                    onChange={() => setStrategy('acknowledged')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Auditor Model Ingestion Approval
                    </span>
                    <span className="text-[11px] text-slate-500 leading-normal block">
                      Acknowledge forecast model citation with caveat note attached to finding.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {!isConflict && !isConflation && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-purple-500 bg-purple-50/40">
                <input type="radio" checked readOnly className="mt-0.5 text-purple-600" />
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    Scientific Auditor Sign-off
                  </span>
                  <span className="text-[11px] text-slate-500 leading-normal block">
                    Accept discrepancy with documented rationale.
                  </span>
                </div>
              </label>
            )}
          </div>

          {/* Auditor Justification Note */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 block text-xs">
              Auditor Justification / Rationale:
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="e.g. Verified against regional synoptic chart; ECMWF prioritized for coastal gust forecasting."
              rows={2}
              className="w-full px-3 py-2 text-[11px] bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-sm cursor-pointer transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Resolving...
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Confirm & Resolve
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
