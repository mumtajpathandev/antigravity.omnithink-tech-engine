import React from 'react';
import { useTechPack } from '../context/TechPackContext';
import {
  Search,
  FileSpreadsheet,
  Code2,
  ScanEye,
  GitBranch,
  Layers,
  ShieldCheck,
  Cpu,
  Edit3,
  TrendingUp,
  ChevronRight
} from 'lucide-react';

export const PIPELINE_SCREENS = [
  { id: 1, title: 'Intake & Samples', subtitle: 'PDF Stream & Sample Library', icon: Search },
  { id: 2, title: 'Master Style', subtitle: 'PDAM Technical Sketch', icon: FileSpreadsheet },
  { id: 3, title: 'Plugin Metadata', subtitle: 'msts:pluginData', icon: Code2 },
  { id: 4, title: 'Sketch Analyzer', subtitle: 'Vision AI Inference', icon: ScanEye },
  { id: 5, title: 'Dev Object Fan-Out', subtitle: 'Independent BOMs', icon: GitBranch },
  { id: 6, title: 'BOM Generator', subtitle: 'FlexPLM Payload', icon: Layers },
  { id: 7, title: 'Material Validation', subtitle: 'FlexPLM Status Rules', icon: ShieldCheck },
  { id: 8, title: 'Historical (RAG)', subtitle: 'FAISS Vector Intelligence', icon: Cpu },
  { id: 9, title: 'Correction Workflow', subtitle: 'User Feedback Intake', icon: Edit3 },
  { id: 10, title: 'Learning Loop', subtitle: 'Drift & Model Confidence', icon: TrendingUp }
];

export const PipelineStepper: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useTechPack();

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 overflow-x-auto">
      <div className="flex items-center min-w-max space-x-1">
        {PIPELINE_SCREENS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentScreen === step.id;
          const isPast = currentScreen > step.id;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setCurrentScreen(step.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : isPast
                    ? 'text-slate-700 hover:bg-slate-200/60'
                    : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-mono tabular-nums ${
                    isActive
                      ? 'bg-slate-900 text-white font-bold'
                      : isPast
                      ? 'bg-slate-300 text-slate-700'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step.id}
                </div>
                <span>{step.title}</span>
              </button>
              {idx < PIPELINE_SCREENS.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
