import React, { useState } from 'react';
import { useTechPack } from '../../context/TechPackContext';
import {
  Edit3,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  Send,
  Sparkles,
  History,
  FileCheck
} from 'lucide-react';

export const Screen9CorrectionWorkflow: React.FC = () => {
  const {
    correctionPart,
    setCorrectionPart,
    suggestedMaterial,
    setSuggestedMaterial,
    correctedMaterial,
    setCorrectedMaterial,
    correctionReason,
    setCorrectionReason,
    correctionsLog,
    submitCorrection,
    setCurrentScreen
  } = useTechPack();

  const [copied, setCopied] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Exact JSON output per user prompt
  const correctionPayload = {
    part: correctionPart,
    suggestedMaterial: suggestedMaterial,
    correctedMaterial: correctedMaterial
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(correctionPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCorrection();
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Screen 09 · Human-in-the-Loop Feedback
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Correction Workflow
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Capturing technical designer modifications to seed the OmniThink continuous reinforcement learning loop.
          </p>
        </div>

        <button
          onClick={() => setCurrentScreen(10)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap self-start md:self-auto cursor-pointer"
        >
          <span>View Learning Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Input Form (Prompt Match: Suggested Power Mesh -> User changes Recycled Power Mesh) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-semibold text-slate-800">
              Technical Designer Feedback Intake
            </span>
            <span className="text-xs font-mono text-slate-400">
              Audit Session #4928
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Part Selection */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Garment Part / Component
              </label>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {['Pocket', 'Upper', 'Waistband', 'Draw Cord', 'Hem'].map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setCorrectionPart(p)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      correctionPart === p
                        ? 'bg-slate-900 text-white font-medium'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={correctionPart}
                onChange={(e) => setCorrectionPart(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 font-medium focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Suggested vs Corrected Material Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Suggested (Model Auto-Inferred)
                </label>
                <input
                  type="text"
                  value={suggestedMaterial}
                  onChange={(e) => setSuggestedMaterial(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium cursor-not-allowed"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Original Auto-BOM recommendation
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  User Changes (Corrected Material)
                </label>
                <input
                  type="text"
                  value={correctedMaterial}
                  onChange={(e) => setCorrectedMaterial(e.target.value)}
                  placeholder="e.g. Recycled Power Mesh"
                  className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded text-slate-900 font-semibold focus:outline-hidden"
                />
                <span className="text-[11px] text-emerald-600 mt-1 block font-medium">
                  Will feed forward to Learning Dashboard
                </span>
              </div>
            </div>

            {/* Quick Suggestions for Corrected Material */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">
                Suggested alternatives:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Recycled Power Mesh',
                  'Silverescent Mesh',
                  'Recycled Poly Thread 40',
                  'Luxtreme Interlock'
                ].map((mat) => (
                  <button
                    type="button"
                    key={mat}
                    onClick={() => setCorrectedMaterial(mat)}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Engineering Rationale / Notes
              </label>
              <textarea
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Logged to OmniThink fine-tuning replay buffer
              </span>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Correction</span>
              </button>
            </div>
          </form>

          {justSubmitted && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Correction recorded! Learning weights updated on Screen 10 (Learning Dashboard).
              </span>
            </div>
          )}
        </div>

        {/* Right: Prompt-Exact Expected Output JSON & Live Log */}
        <div className="lg:col-span-5 space-y-6">
          {/* Expected Output JSON */}
          <div className="bg-slate-900 text-slate-100 rounded-lg border border-slate-800 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300">Expected Output (Correction Event JSON)</span>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-400 leading-relaxed">
              {JSON.stringify(correctionPayload, null, 2)}
            </pre>
          </div>

          {/* Captured User Corrections Log */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Recent User Corrections Log
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {correctionsLog.length} events
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto text-xs">
              {correctionsLog.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No corrections recorded yet. Submit a component modification on the left to capture technical designer feedback.
                </div>
              ) : (
                correctionsLog.map((log) => (
                  <div key={log.id} className="p-3.5 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 font-mono">
                        Part: {log.part}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.timestamp}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="line-through text-slate-400 font-mono">
                        {log.suggestedMaterial}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="font-bold text-slate-900 font-mono bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded">
                        {log.correctedMaterial}
                      </span>
                    </div>

                    {log.reason && (
                      <div className="text-[11px] text-slate-500 mt-1 italic">
                        &ldquo;{log.reason}&rdquo;
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
