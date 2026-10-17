import React, { useState } from 'react';
import { useTechPack } from '../context/TechPackContext';
import {
  Trash2,
  Bookmark,
  Zap,
  FolderOpen,
  ArrowRight
} from 'lucide-react';

export const TopNav: React.FC = () => {
  const {
    setCurrentScreen,
    currentScreen,
    clearAllSampleData,
    isCleanSlate,
    selectedMasterStyle,
    uploadedFileName,
    savedSamples,
    runSavedSampleAtRuntime,
    setActiveUploadModalOpen,
    ingestedDocs
  } = useTechPack();

  const [confirmPurgeOpen, setConfirmPurgeOpen] = useState(false);
  const [savedDropdownOpen, setSavedDropdownOpen] = useState(false);

  const handleConfirmPurge = () => {
    clearAllSampleData();
    setConfirmPurgeOpen(false);
  };

  const hasActiveStyle = !isCleanSlate && selectedMasterStyle.masterStyleId !== 'PENDING';

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-3 bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Zone 1: Brand Wordmark & Active Style Indicator */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            setCurrentScreen(1);
          }}
          className="text-base font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <div className="w-6 h-6 rounded bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
            OT
          </div>
          <span className="font-bold">OmniThink Engine</span>
        </a>
        <span className="hidden sm:inline text-xs text-slate-300">|</span>
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <span className="text-slate-400">Active Tech Pack:</span>
          {hasActiveStyle ? (
            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{selectedMasterStyle.name}</span>
              <span className="text-slate-400 font-normal">({selectedMasterStyle.masterStyleId})</span>
            </span>
          ) : (
            <span className="font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Clean Slate · Ready for PDF Intake
            </span>
          )}
        </div>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden xl:flex items-center gap-5 text-xs font-medium text-slate-600">
        <button
          onClick={() => setCurrentScreen(1)}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentScreen === 1 ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
          }`}
        >
          Intake & Samples
        </button>
        <button
          onClick={() => setCurrentScreen(2)}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentScreen === 2 || currentScreen === 3 ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
          }`}
        >
          PDAM Flat & CAD DOM
        </button>
        <button
          onClick={() => setCurrentScreen(4)}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentScreen === 4 || currentScreen === 5 ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
          }`}
        >
          Vision & Fan-Out
        </button>
        <button
          onClick={() => setCurrentScreen(6)}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentScreen === 6 || currentScreen === 7 ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
          }`}
        >
          FlexPLM BOM & Rules
        </button>
        <button
          onClick={() => setCurrentScreen(10)}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentScreen === 10 ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
          }`}
        >
          Learning Loop
        </button>
      </nav>

      {/* Zone 3: Essential Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Saved Samples Dropdown (Processed at Runtime) */}
        <div className="relative">
          <button
            onClick={() => setSavedDropdownOpen(!savedDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            title="Saved Tech Pack Input Samples"
          >
            <Bookmark className="w-3.5 h-3.5 text-indigo-600 fill-indigo-200" />
            <span>Sample List</span>
            <span className="text-[10px] font-mono bg-indigo-200/80 px-1.5 py-0.2 rounded font-bold">
              {savedSamples.length}
            </span>
          </button>

          {savedDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-80 bg-white rounded-lg border border-slate-200 shadow-xl p-3 z-50 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Sample List (Pure Inputs)</span>
                  <span className="text-[10px] text-slate-400">PDF + Master Style + Styles only</span>
                </div>
                <button
                  onClick={() => setSavedDropdownOpen(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Close
                </button>
              </div>

              {savedSamples.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No samples saved yet. Add a PDF tech pack to save as a sample.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {savedSamples.map((sample) => (
                    <div key={sample.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {sample.masterStyle?.masterStyleName || sample.fileName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {sample.masterStyle?.masterStyleId} · {sample.fileName}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          runSavedSampleAtRuntime(sample.id);
                          setSavedDropdownOpen(false);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                        title="Process at runtime from scratch"
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Run</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Purge History Button */}
        <button
          onClick={() => setConfirmPurgeOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-xs"
          title="Purge all uploaded tech packs, sample library, and history"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          <span>Purge History</span>
        </button>
      </div>

      {/* Confirmation Modal for Purge History */}
      {confirmPurgeOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-900 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Purge All Historical Data?</h3>
                <p className="text-xs text-slate-500">Completely clears all history and cache</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will purge all loaded tech pack documents, custom uploaded PDFs, saved sample lists, active CAD DOM states, generated FlexPLM BOMs, and local storage. The system will reset to an absolute clean slate with zero stored data.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmPurgeOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurge}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors cursor-pointer shadow-xs"
              >
                Yes, Purge All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
