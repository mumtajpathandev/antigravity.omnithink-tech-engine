import React from 'react';
import { useTechPack } from '../../context/TechPackContext';
import {
  GitBranch,
  CheckCircle2,
  Clock,
  ArrowRight,
  Play,
  RotateCw,
  Layers,
  Sparkles
} from 'lucide-react';

export const Screen5DevObjectFanOut: React.FC = () => {
  const {
    selectedMasterStyle,
    fanOutStatus,
    isFanningOut,
    runFanOut,
    setSelectedDevObjectId,
    setCurrentScreen
  } = useTechPack();

  const devObjects = selectedMasterStyle.devObjects;

  return (
    <div className="space-y-6">
      {/* Header Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Screen 05 · Core SP28 Engine
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Development Object Fan-Out
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic resolution from single Master Style technical specification into independent colorway Development Object BOMs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runFanOut}
            disabled={isFanningOut}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFanningOut ? 'animate-spin' : ''}`} />
            <span>{isFanningOut ? 'Fanning Out...' : 'Re-run Fan-Out'}</span>
          </button>
          <button
            onClick={() => setCurrentScreen(6)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>View FlexPLM Payload</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Input / Target Summary Strip */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
            Master Style Input
          </span>
          <span className="text-sm font-bold text-slate-900 font-sans block">
            {selectedMasterStyle.name}
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            ID: {selectedMasterStyle.masterStyleId} · Season: {selectedMasterStyle.season}
          </span>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
            Development Objects Scope
          </span>
          <div className="flex items-center gap-2">
            {devObjects.map((d) => (
              <span
                key={d.devObjectId}
                className="text-xs font-mono font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
              >
                {d.devObjectId}
              </span>
            ))}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {devObjects.length} Independent BOM targets resolved
          </span>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
            Pipeline Output State
          </span>
          <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded inline-block">
            {isFanningOut ? 'Generating In Parallel' : `Generated: ${devObjects.length} Independent BOMs`}
          </span>
        </div>
      </div>

      {/* Expected Output Card (Prompt Match) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-semibold text-slate-800">
              Generating: {devObjects.length} Independent BOMs
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Target: FlexPLM SP28 Development BOM Schema
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {devObjects.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No Development Objects to fan out. Ingest a Tech Pack PDF on Screen 1 to begin.
            </div>
          ) : (
            devObjects.map((doObj) => {
            const status = fanOutStatus[doObj.devObjectId] || 'completed';
            const isCompleted = status === 'completed';

            return (
              <div
                key={doObj.devObjectId}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 text-white shadow-xs"
                    style={{ backgroundColor: doObj.colorHex }}
                  >
                    {doObj.devObjectId.replace('DO-', '')}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {doObj.devObjectId}
                      </span>
                      <span className="text-xs font-medium text-slate-700">
                        {doObj.code}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-0.5">
                      Colorway: <span className="font-medium text-slate-700">{doObj.colorway}</span> · Material Spec:{' '}
                      <span className="font-mono text-slate-700">
                        {doObj.materials[0]?.materialName || 'NULU'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="text-right">
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block">
                      Status
                    </span>
                    <span
                      className={`text-xs font-mono font-semibold ${
                        isCompleted ? 'text-emerald-700' : 'text-amber-600'
                      }`}
                    >
                      {status === 'generating' ? 'Generating...' : 'Generated'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedDevObjectId(doObj.devObjectId);
                      setCurrentScreen(6);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <span>Inspect BOM</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* Architectural Context Box */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
        <span className="font-semibold text-slate-800 block">
          Why Development Object Fan-Out is Transformative:
        </span>
        <p className="leading-relaxed">
          Previously, technical designers manually copied Master BOM line-items into every colorway in FlexPLM, leading to human error and data mismatch. OmniThink automates this in real time, mapping color-specific material articles (e.g. Solid Black MAT-001 vs Chroma Disperse MAT-015) while preserving master construction rules.
        </p>
      </div>
    </div>
  );
};
