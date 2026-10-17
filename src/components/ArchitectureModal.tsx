import React, { useState } from 'react';
import { X, ArrowDown, GitBranch, Database, Cpu, ShieldCheck, RefreshCw, Layers, Zap, LayoutGrid } from 'lucide-react';
import { StageDataFlowVisualizer } from './StageDataFlowVisualizer';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToScreen: (screen: number) => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
  onJumpToScreen
}) => {
  const [viewMode, setViewMode] = useState<'d3_flow' | 'cards'>('d3_flow');

  if (!isOpen) return null;

  const flowNodes = [
    {
      screen: 1,
      title: 'GLP → PLIM → Keystone',
      system: 'Keystone Master Catalog',
      desc: 'Hierarchical taxonomy linking Master Styles (MASCL) to commercial styles and Development Objects.',
      color: 'bg-blue-50 border-blue-200 text-blue-900'
    },
    {
      screen: 2,
      title: 'PDAM Master Style Workspace',
      system: 'PDAM (Asset Management)',
      desc: 'Ingests MasterStyleTechnicalSketch.pdf with FileMasterStyleTechnicalSketch document binding.',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-900'
    },
    {
      screen: 3,
      title: 'Plugin Metadata Bridge',
      system: 'Adobe Illustrator Plugin',
      desc: 'Extracts msts:pluginData geometry parts and Development Object material assignments.',
      color: 'bg-purple-50 border-purple-200 text-purple-900'
    },
    {
      screen: 4,
      title: 'Vision AI Sketch Analyzer',
      system: 'OmniThink Multi-Modal Vision',
      desc: 'Segments CAD lines into anatomical parts (Upper, Pocket, Waistband), materials, and trims.',
      color: 'bg-cyan-50 border-cyan-200 text-cyan-900'
    },
    {
      screen: 5,
      title: 'Development Object Fan-Out',
      system: 'Core SP28 Fan-Out Engine',
      desc: 'Resolves single Master Style into independent parallel BOM pipelines for DO-001, DO-002, DO-003.',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-900'
    },
    {
      screen: 6,
      title: 'BOM Generator & FlexPLM Payload',
      system: 'PTC FlexPLM REST Event Bus',
      desc: 'Constructs standardized Development BOM event payloads with section and standard placement codes.',
      color: 'bg-amber-50 border-amber-200 text-amber-900'
    },
    {
      screen: 7,
      title: 'Material Status Rule Engine',
      system: 'FlexPLM Material Master',
      desc: 'Validates lifecycle status: Approved (Pass), In Development (Warn), Rejected/Dropped (Reject).',
      color: 'bg-orange-50 border-orange-200 text-orange-900'
    },
    {
      screen: 8,
      title: 'Historical Intelligence (RAG)',
      system: 'FAISS Vector Index',
      desc: 'Retrieves similar archival products (ALIGN PANT SP27 92%) to recommend packaging, labels, trims.',
      color: 'bg-teal-50 border-teal-200 text-teal-900'
    },
    {
      screen: 9,
      title: 'User Correction Workflow',
      system: 'Human-in-the-Loop Feedback',
      desc: 'Captures designer revisions (Power Mesh → Recycled Power Mesh) to seed replay buffers.',
      color: 'bg-rose-50 border-rose-200 text-rose-900'
    },
    {
      screen: 10,
      title: 'Adaptive Learning Dashboard',
      system: 'OmniThink Self-Learning Loop',
      desc: 'Tracks top corrections (12x), eliminates manual rules maintenance, and boosts confidence to 87%.',
      color: 'bg-slate-900 border-slate-800 text-white'
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-6xl w-full p-6 text-slate-900 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
                System Architecture Blueprint
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                D3 Pipeline Engine
              </span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 mt-0.5">
              Future-State SP28 OmniThink Architecture Flow
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live data flow across Keystone, PDAM, in-stream PDF byte containers, Vision AI, and FlexPLM event bus for the active PDF.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('d3_flow')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'd3_flow'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>D3 Stage Data Flow</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                <span>Stage Cards Grid</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {viewMode === 'd3_flow' ? (
            <StageDataFlowVisualizer
              onJumpToScreen={(screen) => {
                onJumpToScreen(screen);
                onClose();
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {flowNodes.map((node) => (
                <div
                  key={node.screen}
                  onClick={() => {
                    onJumpToScreen(node.screen);
                    onClose();
                  }}
                  className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-xs hover:border-slate-400 ${node.color}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold">
                      Screen {node.screen < 10 ? `0${node.screen}` : node.screen}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider opacity-75">
                      {node.system}
                    </span>
                  </div>
                  <div className="text-sm font-bold tracking-tight font-sans">
                    {node.title}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">
                    {node.desc}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive D3 visualization tracks live byte streams & packet flows for active PDF</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer shadow-xs"
          >
            Close Blueprint
          </button>
        </div>
      </div>
    </div>
  );
};
