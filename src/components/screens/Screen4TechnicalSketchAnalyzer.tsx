import React, { useState } from 'react';
import { useTechPack } from '../../context/TechPackContext';
import {
  ScanEye,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  Sliders,
  Crosshair,
  Code2,
  Box,
  Cpu,
  Zap,
  Info
} from 'lucide-react';
import { VectorCadDomStudio } from '../VectorCadDomStudio';

export const Screen4TechnicalSketchAnalyzer: React.FC = () => {
  const {
    visionDetection,
    isAnalyzingSketch,
    runVisionAnalysis,
    selectedMasterStyle,
    setCurrentScreen
  } = useTechPack();

  const [activeLayer, setActiveLayer] = useState<'all' | 'part' | 'material' | 'trim'>('all');
  const [selectedEngine, setSelectedEngine] = useState<'vision_ai' | 'vector_cad' | 'clo3d_twin'>('vision_ai');
  const [copied, setCopied] = useState(false);

  // Exact JSON output per user prompt
  const visionOutputJson = {
    parts: visionDetection.parts,
    materials: visionDetection.materials,
    trims: visionDetection.trims
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(visionOutputJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFeatures = visionDetection.annotatedFeatures.filter((feat) => {
    if (activeLayer === 'all') return true;
    return feat.type === activeLayer;
  });

  return (
    <div className="space-y-6">
      {/* Header Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Screen 04 · Vision AI & Alternatives
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Technical Sketch Analyzer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluating Vision AI inference alongside deterministic Vector CAD DOM parsing and CLO3D 3D digital twin pattern import.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runVisionAnalysis}
            disabled={isAnalyzingSketch}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingSketch ? 'animate-spin' : ''}`} />
            <span>{isAnalyzingSketch ? 'Running Inference...' : 'Re-Run Vision AI'}</span>
          </button>
          <button
            onClick={() => setCurrentScreen(5)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>Fan-Out Development Objects</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Engine Comparison Selector (Answering: "is there any alternative to vision ai?") */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-800">
              Geometry & Parts Recognition Engine Comparison
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Select an architecture to compare accuracy, latency, and determinism
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedEngine('vision_ai')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              selectedEngine === 'vision_ai'
                ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold font-mono">1. Vision AI (Default)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${selectedEngine === 'vision_ai' ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-700'}`}>
                Multimodal
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${selectedEngine === 'vision_ai' ? 'text-slate-300' : 'text-slate-500'}`}>
              Computer vision segments visual artboard raster/vector lines. Tolerant to un-tagged artwork, but probabilistic (94% confidence).
            </p>
          </button>

          <button
            onClick={() => setSelectedEngine('vector_cad')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              selectedEngine === 'vector_cad'
                ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold font-mono">2. Vector CAD DOM Parser</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${selectedEngine === 'vector_cad' ? 'bg-slate-800 text-emerald-300' : 'bg-emerald-100 text-emerald-800'}`}>
                100% Deterministic
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${selectedEngine === 'vector_cad' ? 'text-slate-300' : 'text-slate-500'}`}>
              Extracts named Illustrator layers (<code className="font-mono">msts:Upper</code>), path bezier points, and stroke regex directly in 4ms with zero hallucination.
            </p>
          </button>

          <button
            onClick={() => setSelectedEngine('clo3d_twin')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              selectedEngine === 'clo3d_twin'
                ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold font-mono">3. CLO3D / Browzwear 3D Twin</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${selectedEngine === 'clo3d_twin' ? 'bg-slate-800 text-cyan-300' : 'bg-cyan-100 text-cyan-800'}`}>
                ASTM D6959
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed ${selectedEngine === 'clo3d_twin' ? 'text-slate-300' : 'text-slate-500'}`}>
              Direct digital twin import: reads 2D pattern piece polygons, seam grainlines, and physical fabric parameters directly from authoring CAD.
            </p>
          </button>
        </div>

        {/* Engine Tradeoff Matrix */}
        <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 font-mono text-slate-600">
          <div>
            Active Pipeline: <strong className="text-slate-900">{selectedEngine === 'vision_ai' ? 'Vision AI Inference' : selectedEngine === 'vector_cad' ? 'Illustrator Vector DOM Parser' : 'CLO3D Digital Twin ASTM D6959'}</strong>
          </div>
          <div>
            Latency: <strong className="text-slate-900">{selectedEngine === 'vision_ai' ? '1,120 ms' : selectedEngine === 'vector_cad' ? '4 ms' : '22 ms'}</strong>
          </div>
          <div>
            Accuracy: <strong className="text-slate-900">{selectedEngine === 'vision_ai' ? '94% (Probabilistic)' : '100% (Mathematical)'}</strong>
          </div>
          <div>
            Token Cost: <strong className="text-slate-900">{selectedEngine === 'vision_ai' ? '~$0.04/sketch' : '$0.00 (Zero tokens)'}</strong>
          </div>
        </div>
      </div>

      {selectedEngine === 'vector_cad' ? (
        <VectorCadDomStudio />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Interactive CAD Canvas with Bounding Boxes */}
          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5" />
                <span>
                  {selectedEngine === 'vision_ai' ? 'Vision AI Inference Overlay' : 'CLO3D Pattern Mesh Polygons'}
                </span>
              </span>

            {/* Layer Filter Buttons */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded">
              <button
                onClick={() => setActiveLayer('all')}
                className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                  activeLayer === 'all' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveLayer('part')}
                className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                  activeLayer === 'part' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Parts
              </button>
              <button
                onClick={() => setActiveLayer('trim')}
                className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                  activeLayer === 'trim' ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Trims
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-100 flex flex-col items-center justify-center relative min-h-[360px]">
            {isAnalyzingSketch ? (
              <div className="flex flex-col items-center justify-center p-8 space-y-3">
                <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium text-slate-700">
                  Scanning vector paths and segmenting garment geometry...
                </span>
              </div>
            ) : (
              <div className="relative max-w-md w-full bg-white p-3 rounded-lg border border-slate-300 shadow-sm">
                <img
                  src={selectedMasterStyle.thumbnailUrl}
                  alt={selectedMasterStyle.name}
                  className="w-full h-72 object-cover rounded opacity-90"
                />

                {/* Simulated Bounding Boxes Overlay */}
                {filteredFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="absolute border border-dashed rounded transition-all hover:bg-slate-900/10 cursor-pointer group"
                    style={{
                      left: `${feat.x}%`,
                      top: `${feat.y}%`,
                      width: `${feat.width}%`,
                      height: `${feat.height}%`,
                      borderColor: feat.type === 'part' ? '#2563eb' : '#d97706',
                      borderWidth: '1.5px'
                    }}
                  >
                    <span
                      className="absolute -top-5 left-0 text-[10px] font-mono px-1.5 py-0.5 rounded text-white whitespace-nowrap shadow-xs pointer-events-none"
                      style={{
                        backgroundColor: feat.type === 'part' ? '#1d4ed8' : '#b45309'
                      }}
                    >
                      {feat.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between w-full max-w-md text-[11px] text-slate-500 font-mono">
              <span>Engine: {selectedEngine === 'vision_ai' ? 'OmniThink-Vision-V2' : 'clo3d-dxf-parser'}</span>
              <span>Confidence: {selectedEngine === 'vision_ai' ? `${(visionDetection.confidence * 100).toFixed(0)}%` : '100% (Deterministic)'}</span>
            </div>
          </div>
        </div>

        {/* Right: Prompt-Exact UI & JSON Output */}
        <div className="lg:col-span-5 space-y-6">
          {/* UI Section (Prompt Match) */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Classification Spec (UI)</span>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Verified
              </span>
            </div>

            <div className="p-5 space-y-5 text-xs">
              {/* Detected Parts */}
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                  Detected Parts
                </span>
                <div className="space-y-1.5 font-medium text-slate-900">
                  {visionDetection.parts.map((p) => (
                    <div
                      key={p}
                      className="p-2 rounded bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                    >
                      <span className="font-semibold">{p}</span>
                      <span className="text-[11px] font-mono text-slate-500">Geometry Class: Self/Trim</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                  Detected Materials
                </span>
                <div className="space-y-1.5 font-medium text-slate-900">
                  {visionDetection.materials.map((m) => (
                    <div
                      key={m}
                      className="p-2 rounded bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                    >
                      <span className="font-semibold">{m}</span>
                      <span className="text-[11px] font-mono text-slate-500">Knit Fabric</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                  Detected Trims
                </span>
                <div className="space-y-1.5 font-medium text-slate-900">
                  {visionDetection.trims.map((t) => (
                    <div
                      key={t}
                      className="p-2 rounded bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                    >
                      <span className="font-semibold">{t}</span>
                      <span className="text-[11px] font-mono text-slate-500">Trim Component</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Expected Output JSON */}
          <div className="bg-slate-900 text-slate-100 rounded-lg border border-slate-800 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300">Expected Output (Vision / CAD JSON)</span>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-400 leading-relaxed">
              {JSON.stringify(visionOutputJson, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    )}
  </div>
);
};
