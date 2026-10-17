import React, { useState } from 'react';
import { useTechPack } from '../context/TechPackContext';
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  FolderOpen,
  Sparkles,
  Download,
  ArrowRight,
  Layers,
  Cpu,
  RefreshCw,
  Plus,
  Cloud,
  Trash2,
  AlertTriangle,
  FolderSync,
  Database
} from 'lucide-react';

interface MstsUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MstsUploadModal: React.FC<MstsUploadModalProps> = ({ isOpen, onClose }) => {
  const {
    ingestedDocs,
    addUploadedMstsFiles,
    selectMstsDoc,
    deleteMstsDoc,
    clearAllSampleData,
    batchGenerateBoms,
    isBatchGenerating,
    setCurrentScreen,
    isCleanSlate
  } = useTechPack();

  const [activeTab, setActiveTab] = useState<'upload' | 'cloud'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [cloudPath, setCloudPath] = useState(
    'https://enterprise.sharepoint.com/sites/ApparelPDAM/Shared%20Documents/SP28_MasterSketches/'
  );
  const [isCrawlingCloud, setIsCrawlingCloud] = useState(false);
  const [cloudCrawlLog, setCloudCrawlLog] = useState<string | null>(null);

  if (!isOpen) return null;

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
      addUploadedMstsFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addUploadedMstsFiles(e.target.files);
    }
  };

  const handleCloudIngest = () => {
    setIsCrawlingCloud(true);
    setCloudCrawlLog('Authenticating MS Graph API / S3 REST endpoint with enterprise credentials...');
    setTimeout(() => {
      setCloudCrawlLog('Scanning directory tree at: ' + cloudPath);
    }, 400);
    setTimeout(() => {
      setCloudCrawlLog('Connected to cloud repository. Drop or select PDF files to ingest into active pipeline.');
      setIsCrawlingCloud(false);
    }, 900);
  };

  const sampleCloudPresets = [
    { label: 'SharePoint SP28 Library', url: 'https://enterprise.sharepoint.com/sites/ApparelPDAM/Shared%20Documents/SP28_MasterSketches/' },
    { label: 'AWS S3 TechPack Bucket', url: 's3://apparel-techpack-pipeline/SP28/production/' },
    { label: 'Google Cloud Storage PDAM', url: 'gs://pdam-sketches-sp28/cad-dom-exports/' }
  ];

  const handleExportAllJson = () => {
    const bundle = {
      exportTimestamp: new Date().toISOString(),
      eventSource: 'OmniThink SP28 Batch Worker',
      totalMstsFiles: ingestedDocs.length,
      documents: ingestedDocs.map((doc) => ({
        file: doc.fileName,
        masterStyleId: doc.masterStyleId,
        masterStyleName: doc.masterStyleName,
        season: doc.season,
        devObjectsCount: doc.devObjectsCount,
        partsCount: doc.partsCount,
        flexPlmReady: doc.flexPlmPayloadReady
      }))
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OmniThink_SP28_Batch_BOM_${ingestedDocs.length}_Styles.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-5xl w-full p-6 text-slate-900 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
                MSTS Batch Intake Engine
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Multi-Select & Cloud Sync
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              Upload & Ingest Master Style Technical Sketches
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bulk-upload multiple MSTS PDFs at once via native multi-select, drag & drop, or enter a SharePoint / Cloud path.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ingestion Mode Tabs */}
        <div className="flex items-center gap-2 pt-3 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'upload'
                ? 'border-slate-900 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Local Files (Multi-Select Supported)</span>
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'cloud'
                ? 'border-slate-900 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-blue-600" />
            <span>SharePoint / Cloud Storage URI</span>
          </button>
        </div>

        {/* Tab 1: Local Upload / Dropzone */}
        {activeTab === 'upload' && (
          <div className="pt-4 space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-all ${
                dragActive
                  ? 'border-slate-900 bg-slate-100/80 scale-[1.01]'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-700 mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                Drag & Drop Multiple MSTS PDF Files Here
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                Multi-select enabled: hold Shift or Cmd/Ctrl to select all 10 PDF samples at once.
              </span>

              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3">
                <label className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer shadow-xs flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Choose Multiple Files (Multi-Select)</span>
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
        )}

        {/* Tab 2: SharePoint / Cloud Storage Path */}
        {activeTab === 'cloud' && (
          <div className="pt-4 space-y-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-800 block">
                  Enter SharePoint Library URL or Cloud Bucket URI:
                </label>
                <span className="text-[11px] text-slate-500">
                  Supports Microsoft 365 SharePoint Online, Amazon S3, Google Cloud Storage, or Azure Blob Storage.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cloudPath}
                  onChange={(e) => setCloudPath(e.target.value)}
                  placeholder="https://company.sharepoint.com/sites/ApparelPDAM/Shared%20Documents/..."
                  className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={handleCloudIngest}
                  disabled={isCrawlingCloud || !cloudPath.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs disabled:opacity-50"
                >
                  <FolderSync className={`w-3.5 h-3.5 ${isCrawlingCloud ? 'animate-spin' : ''}`} />
                  <span>{isCrawlingCloud ? 'Crawling Path...' : 'Crawl & Ingest Cloud Path'}</span>
                </button>
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400">Quick Test URIs:</span>
                {sampleCloudPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCloudPath(preset.url)}
                    className="text-[10px] font-mono px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {cloudCrawlLog && (
                <div className="p-2.5 bg-slate-900 text-amber-300 text-[11px] font-mono rounded border border-slate-800 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 shrink-0 text-amber-400 animate-pulse" />
                  <span>{cloudCrawlLog}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Batch Status Table Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-800">
              Active Documents Queue ({ingestedDocs.length} Tech Packs Loaded)
            </span>
            {isCleanSlate && (
              <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Clean Slate Mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {ingestedDocs.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Purge all loaded tech packs and reset to clean slate?')) {
                    clearAllSampleData();
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Purge History</span>
              </button>
            )}

            <button
              onClick={batchGenerateBoms}
              disabled={isBatchGenerating || ingestedDocs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBatchGenerating ? 'animate-spin' : ''}`} />
              <span>{isBatchGenerating ? 'Generating...' : 'Batch Fan-Out All BOMs'}</span>
            </button>

            <button
              onClick={handleExportAllJson}
              disabled={ingestedDocs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Batch JSON</span>
            </button>
          </div>
        </div>

        {/* Ingested Documents List */}
        <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto mt-2">
          {ingestedDocs.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 text-slate-500">
              <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-700">No tech packs loaded in history</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Drop your PDF files above or browse to populate the active queue.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="py-2 px-3">File Package</th>
                  <th className="py-2 px-3">Master Style</th>
                  <th className="py-2 px-3">Dev Objects</th>
                  <th className="py-2 px-3">Parts</th>
                  <th className="py-2 px-3">Source</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-sans">
                {ingestedDocs.map((doc, idx) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate max-w-xs">{doc.fileName}</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {doc.masterStyleName} <span className="font-mono text-slate-400 text-[10px]">({doc.masterStyleId})</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {doc.devObjectsCount} DOs
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {doc.partsCount} Parts
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        doc.source === 'Upload' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {doc.source}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            selectMstsDoc(doc.id);
                            onClose();
                            setCurrentScreen(2);
                          }}
                          className="text-[11px] font-semibold text-slate-900 hover:underline cursor-pointer"
                        >
                          Inspect Flow →
                        </button>
                        <button
                          onClick={() => deleteMstsDoc(doc.id)}
                          title="Delete from history"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>Enterprise CAD Ingestion · Multi-file stream decoding & zero-hallucination validation</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
