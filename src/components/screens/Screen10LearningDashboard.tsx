import React from 'react';
import { useTechPack } from '../../context/TechPackContext';
import {
  TrendingUp,
  ArrowDown
} from 'lucide-react';

export const Screen10LearningDashboard: React.FC = () => {
  const {
    learningStats,
    setCurrentScreen,
    selectedMasterStyle
  } = useTechPack();

  return (
    <div className="space-y-6">
      {/* Header Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Screen 10 · Self-Improving Architecture
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Learning Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Demonstrating OmniThink's continuous learning loop aggregating designer corrections into autonomous model recalibration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentScreen(1)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-xs"
          >
            <span>Return to Intake (Step 1)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Prompt Match: Top Corrections, Most Corrected Part, Recommendation Confidence) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Most Corrected Part */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
            Most Corrected Part
          </span>
          <div className="text-2xl font-bold font-sans text-slate-900 tracking-tight mt-1">
            {learningStats.mostCorrectedPart || 'None'}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {learningStats.totalCorrections > 0
              ? `${learningStats.totalCorrections} designer manual interventions`
              : '0 designer manual interventions'}
          </span>
        </div>

        {/* Recommendation Confidence */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
            Recommendation Confidence
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight mt-1">
            {(learningStats.recommendationConfidence * 100).toFixed(0)}%
          </div>
          <span className="text-xs text-emerald-700 font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>
              {learningStats.driftReductionPercent > 0
                ? `+${learningStats.driftReductionPercent}% accuracy improvement`
                : 'Baseline calibrated'}
            </span>
          </span>
        </div>

        {/* Total Feedback Iterations */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
            Feedback Loop Volume
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight mt-1">
            {learningStats.totalCorrections} Recorded
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {selectedMasterStyle.masterStyleId !== 'PENDING'
              ? `Tracking ${selectedMasterStyle.name}`
              : 'Awaiting tech pack execution'}
          </span>
        </div>
      </div>

      {/* Top Corrections Breakdown (Prompt Match) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Top Corrections List */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              Top Material Corrections & Patterns
            </span>
            <span className="text-xs font-mono text-slate-500">
              Ranked by Frequency
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {learningStats.topCorrections.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No correction patterns learned yet. Submit designer corrections in Screen 9 to train the model.
              </div>
            ) : (
              learningStats.topCorrections.map((corr, idx) => (
                <div
                  key={idx}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-slate-100 text-slate-700 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-800 line-through text-slate-400">
                          {corr.from}
                        </span>
                        <ArrowDown className="w-3 h-3 text-slate-400 rotate-[-90deg]" />
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono">
                          {corr.to}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Autonomous preference rule learned
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-900 tabular-nums block">
                      {corr.count} times
                    </span>
                    <span className="text-[10px] text-slate-400">Recorded</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-end">
            <button
              onClick={() => setCurrentScreen(9)}
              className="text-xs font-medium text-slate-900 underline hover:no-underline cursor-pointer"
            >
              Log a correction on Screen 9 →
            </button>
          </div>
        </div>

        {/* Right: Architecture & Reinforcement Learning Explanation */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
            <span className="text-xs font-semibold text-slate-800 block">
              OmniThink Closed-Loop Intelligence Pipeline
            </span>

            <div className="space-y-3 text-slate-600">
              <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
                <span className="font-semibold text-slate-900 block mb-0.5">
                  1. Zero Manual Rules Maintenance
                </span>
                <p className="leading-relaxed">
                  Instead of hardcoding thousands of if-else mapping rules across every apparel archetype, the engine observes designer corrections in real time.
                </p>
              </div>

              <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
                <span className="font-semibold text-slate-900 block mb-0.5">
                  2. Sustainable Substitution Reflex
                </span>
                <p className="leading-relaxed">
                  Once 12 technical designers replace virgin Power Mesh with Recycled Power Mesh, the system adapts future Auto-BOM recommendations automatically for all SP28 bottoms.
                </p>
              </div>

              <div className="p-3 rounded bg-slate-50 border border-slate-200/80">
                <span className="font-semibold text-slate-900 block mb-0.5">
                  3. FlexPLM Upstream Feedback
                </span>
                <p className="leading-relaxed">
                  Learned preferences are tagged with traceability IDs back into FlexPLM, preventing rejected materials and accelerating season-to-market cycle times.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => setCurrentScreen(1)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
              >
                Restart from Intake (Step 1)
              </button>
              <button
                onClick={() => setCurrentScreen(9)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              >
                Log a Correction →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
