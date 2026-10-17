import React, { useState } from 'react';
import { useTechPack } from '../../context/TechPackContext';
import {
  Upload,
  FolderOpen,
  Cloud,
  Trash2,
  FileText,
  Bookmark,
  Zap,
  Check,
  ArrowRight,
  Sparkles,
  Info,
  Layers,
  FileCheck2,
  CheckCircle2,
  Palette
} from 'lucide-react';

export const Screen1ProductExplorer: React.FC = () => {
  const {
    selectedMasterStyle,
    setSelectedMasterStyle,
    uploadedFileName,
    sketchUploaded,
    handleSketchUpload,
    addUploadedMstsFiles,
    savedSamples,
    saveCurrentAsSample,
    removeSavedSample,
    runSavedSampleAtRuntime,
    isCurrentSaved,
    clearAllSampleData,
    setCurrentScreen,
    setActiveUploadModalOpen,
    ingestedDocs,
    deleteMstsDoc,
    selectMstsDoc,
    isCleanSlate,
    runtimeNotification,
    clearRuntimeNotification
  } = useTechPack();

  const [dragActive, setDragActive] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const hasActiveTechPack = !isCleanSlate && selectedMasterStyle.masterStyleId !== 'PENDING';

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length === 1) {
        handleSketchUpload(e.dataTransfer.files[0]);
      } else {
        addUploadedMstsFiles(e.dataTransfer.files);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files.length === 1) {
        handleSketchUpload(e.target.files[0]);
      } else {
        addUploadedMstsFiles(e.target.files);
      }
    }
  };

  const handleSaveToSample = () => {
    saveCurrentAsSample();
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Screen 01 · Tech Pack Intake & Samples
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Product & Sample Intake Manager
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload apparel Tech Pack PDFs. Master Style and Styles are auto-extracted directly from the PDF in-stream XMP metadata.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveTechPack && (
            <button
              onClick={() => {
                if (confirm('Purge all historical tech pack data and reset to clean state?')) {
                  clearAllSampleData();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Purge History</span>
            </button>
          )}

          <button
            onClick={() => setActiveUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer shadow-xs"
          >
            <Cloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Cloud / SharePoint Ingest</span>
          </button>

          {hasActiveTechPack && (
            <button
              onClick={() => setCurrentScreen(2)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              <span>View CAD DOM Flat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
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

      {/* Primary Intake Hero Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`p-6 rounded-xl border-2 transition-all ${
          dragActive
            ? 'border-slate-900 bg-slate-100/90 scale-[1.01]'
            : 'border-slate-300 border-dashed bg-white shadow-xs hover:border-slate-400'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <Upload className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  Upload Tech Pack PDF(s)
                </span>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  In-Stream CAD Extraction
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Drag & drop your apparel tech pack PDFs (select 1 or multiple files). The engine directly extracts the Master Style, Style IDs, colorways, and vector CAD parts from the PDF stream.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer shadow-xs flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              <span>Browse Tech Pack PDFs</span>
              <input
                type="file"
                multiple
                accept=".pdf,.ai,.svg,.json"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Active Tech Pack: Auto-Extracted Required Inputs Card */}
      {hasActiveTechPack ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">
                Required Inputs Combination (Extracted from PDF)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveToSample}
                disabled={isCurrentSaved}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer shadow-xs ${
                  isCurrentSaved
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isCurrentSaved ? 'fill-current text-emerald-700' : ''}`} />
                <span>{isCurrentSaved ? '✓ Saved in Sample List' : 'Add to Sample List'}</span>
              </button>

              <button
                onClick={() => setCurrentScreen(2)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer shadow-xs"
              >
                <span>Proceed to Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Auto-Extraction Explanation Note */}
            <div className="p-3.5 rounded-lg bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed">
                <span className="font-bold">Auto-Extraction from PDF In-Stream:</span>
                <p>
                  Master Style and corresponding styles are extracted directly from the PDF in-stream XMP metadata and vector headers. You do <strong>not</strong> need them separately as manual inputs. When you click <strong>Add to Sample List</strong>, only this input combination (PDF + Master Style + Styles) is saved — zero intermediate CAD DOM or final BOM payloads are stored.
                </p>
              </div>
            </div>

            {/* 3 Required Inputs Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Input 1: PDF Document */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Input 1: PDF Source</span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">
                    VALID STREAM
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-slate-900 truncate" title={uploadedFileName}>
                  {uploadedFileName}
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div>Status: Verified Adobe PDF container</div>
                  <div>Doc Type: {selectedMasterStyle.documentType}</div>
                </div>
              </div>

              {/* Input 2: Master Style */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Input 2: Master Style</span>
                  <span className="text-[10px] font-mono text-slate-600 bg-slate-200 px-1.5 py-0.2 rounded">
                    Season: {selectedMasterStyle.season}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 truncate">
                  {selectedMasterStyle.name}
                </div>
                <div className="font-mono text-xs text-slate-600">
                  ID: <strong className="text-slate-900">{selectedMasterStyle.masterStyleId}</strong> · {selectedMasterStyle.category}
                </div>
              </div>

              {/* Input 3: Styles & Colorways */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Input 3: Styles / Colorways</span>
                  <span className="text-[10px] font-mono text-slate-600 bg-slate-200 px-1.5 py-0.2 rounded">
                    {selectedMasterStyle.devObjects.length} Styles
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-slate-900">
                  Style Code: {selectedMasterStyle.code}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {selectedMasterStyle.devObjects.map((d) => (
                    <span
                      key={d.devObjectId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-slate-200 text-slate-700"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.colorHex }} />
                      <span>{d.devObjectId}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Zero-Data Clean Slate Banner */
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Layers className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">No Tech Pack Active (Clean Slate)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload your apparel tech pack PDF into the box above, or select an input sample from your saved library below. Zero mock data is stored in memory.
            </p>
          </div>
        </div>
      )}

      {/* Saved Tech Pack Sample Library (Strictly Pure Inputs Only) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-indigo-600 fill-indigo-100" />
            <span className="text-xs font-bold text-slate-900">
              Saved Sample Library ({savedSamples.length} Samples)
            </span>
            <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-medium">
              Pure Inputs (PDF + Master Style + Styles) · 0 Mock / Intermediate Cache
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Selecting a sample parses the PDF stream fresh at runtime
          </span>
        </div>

        {savedSamples.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-100 text-slate-500 space-y-1.5">
            <p className="text-xs font-medium text-slate-700">Sample Library is empty</p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Upload any apparel tech pack PDF and click <strong>Add to Sample List</strong> to save its input combination.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {savedSamples.map((sample) => (
              <div
                key={sample.id}
                className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-white transition-all shadow-2xs flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {sample.masterStyle?.masterStyleName || sample.fileName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600 bg-slate-200/80 px-1.5 py-0.2 rounded shrink-0 font-medium">
                      {sample.masterStyle?.category || 'Apparel'}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 truncate" title={sample.fileName}>
                    {sample.fileName}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 font-mono space-y-0.5">
                    <div>Master Style ID: <strong className="text-slate-800">{sample.masterStyle?.masterStyleId}</strong></div>
                    <div>Styles: {sample.styles?.styleIds?.join(', ') || 'DO-001'}</div>
                    <div className="text-slate-400">Added: {sample.savedAt}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => removeSavedSample(sample.id)}
                    className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => runSavedSampleAtRuntime(sample.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded transition-all cursor-pointer shadow-2xs"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Run at Runtime</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ingested Documents Queue (When multiple PDFs uploaded) */}
      {ingestedDocs.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900">
              Active Documents Queue ({ingestedDocs.length} Tech Packs Loaded)
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Click any style to switch active pipeline context
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {ingestedDocs.map((doc) => {
              const isSelected = selectedMasterStyle.masterStyleId === doc.masterStyleId;
              return (
                <div
                  key={doc.id}
                  className={`py-2 px-3 rounded flex items-center justify-between text-xs transition-colors ${
                    isSelected ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-mono text-slate-800 truncate">{doc.fileName}</span>
                    <span className="text-slate-500 font-normal">({doc.masterStyleName})</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => selectMstsDoc(doc.id)}
                      className="text-[11px] font-semibold text-slate-900 hover:underline cursor-pointer"
                    >
                      {isSelected ? 'Active Context' : 'Select →'}
                    </button>
                    <button
                      onClick={() => deleteMstsDoc(doc.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      title="Remove document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
