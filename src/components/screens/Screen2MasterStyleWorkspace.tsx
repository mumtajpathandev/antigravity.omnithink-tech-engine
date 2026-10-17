import React, { useState } from 'react';
import { useTechPack } from '../../context/TechPackContext';
import {
  Upload,
  FileText,
  ArrowRight,
  Copy,
  Check,
  FileCheck2,
  FolderOpen,
  Bookmark,
  Zap,
  Layers
} from 'lucide-react';

export const Screen2MasterStyleWorkspace: React.FC = () => {
  const {
    selectedMasterStyle,
    uploadedFileName,
    handleSketchUpload,
    addUploadedMstsFiles,
    sketchUploaded,
    setCurrentScreen,
    setActiveUploadModalOpen,
    isCleanSlate,
    saveCurrentAsSample,
    isCurrentSaved,
    runtimeNotification,
    clearRuntimeNotification
  } = useTechPack();

  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const hasActiveStyle = !isCleanSlate && selectedMasterStyle.masterStyleId !== 'PENDING';

  // Exact JSON output per user prompt
  const pdamPayload = {
    masterStyleId: selectedMasterStyle.masterStyleId,
    styleIds: selectedMasterStyle.styleIds.length > 0 ? selectedMasterStyle.styleIds : ['MASCL2A'],
    season: selectedMasterStyle.season,
    documentType: selectedMasterStyle.documentType
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(pdamPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Screen 02 · PDAM Ingestion
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Master Style Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            PDAM asset binding for Master Style Technical Sketches. Displays auto-extracted CAD Flat and standardized PDAM metadata.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveStyle && (
            <button
              onClick={() => saveCurrentAsSample()}
              disabled={isCurrentSaved}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs ${
                isCurrentSaved
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isCurrentSaved ? 'fill-current text-emerald-700' : ''}`} />
              <span>{isCurrentSaved ? '✓ Saved in Sample List' : 'Add to Sample List'}</span>
            </button>
          )}

          <button
            onClick={() => setCurrentScreen(3)}
            disabled={!hasActiveStyle}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-xs"
          >
            <span>View Plugin Metadata</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Runtime Notification Banner */}
      {runtimeNotification && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{runtimeNotification}</span>
          </div>
          <button
            onClick={clearRuntimeNotification}
            className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {!hasActiveStyle ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Layers className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">No Master Style Active</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Please upload an apparel Tech Pack PDF on Screen 1 (Intake) or select a sample from your library to view the PDAM CAD flat and metadata.
            </p>
          </div>
          <button
            onClick={() => setCurrentScreen(1)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Go to Intake Screen</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Technical Flat Vector Preview */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Vector CAD Technical Flat ({selectedMasterStyle.name})
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Layer: Master Artboard 01
                </span>
              </div>

              <div className="p-6 bg-slate-100/50 flex flex-col items-center justify-center min-h-[280px]">
                <div className="relative max-w-sm w-full bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <img
                    src={selectedMasterStyle.thumbnailUrl}
                    alt={selectedMasterStyle.name}
                    className="w-full h-56 object-cover rounded-md"
                  />
                  <div className="absolute top-6 left-6 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-1 rounded">
                    DOC: {selectedMasterStyle.documentType}
                  </div>
                  <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-xs text-slate-900 text-[10px] font-mono px-2 py-1 rounded border border-slate-200 shadow-xs">
                    ID: {selectedMasterStyle.masterStyleId}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 mt-3 font-mono">
                  Vector flat parsed from PDF: {uploadedFileName}
                </span>
              </div>
            </div>

            {/* Ingestion Status Summary */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="min-w-0 text-xs">
                  <span className="font-bold text-emerald-900 block truncate">
                    {uploadedFileName}
                  </span>
                  <span className="text-emerald-700">
                    PDAM Ingestion Status: Verified & Vector CAD DOM Parsed
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded shrink-0">
                READY
              </span>
            </div>
          </div>

          {/* Right Column: Metadata & JSON Payload */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Master Style Metadata (UI)</span>
                <span className="text-xs text-slate-400 font-mono">PDAM Attributes</span>
              </div>

              <div className="p-5 divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Master Style ID</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {selectedMasterStyle.masterStyleId}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Master Style Name</span>
                  <span className="font-semibold text-slate-900">
                    {selectedMasterStyle.name}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Season</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {selectedMasterStyle.season}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Document Type</span>
                  <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedMasterStyle.documentType}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Related Style IDs</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {selectedMasterStyle.styleIds.length}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Development Objects</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {selectedMasterStyle.devObjects.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Expected Output JSON Card */}
            <div className="bg-slate-900 text-slate-100 rounded-lg border border-slate-800 shadow-xs overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-300">Expected Output (PDAM Ingestion JSON)</span>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-400 leading-relaxed">
                {JSON.stringify(pdamPayload, null, 2)}
              </pre>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>Next: Inspect Illustrator Plugin Metadata</span>
              <button
                onClick={() => setCurrentScreen(3)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                Go to Screen 3 →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
