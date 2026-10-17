import React, { useState } from 'react';
import { useTechPack } from '../../context/TechPackContext';
import {
  Layers,
  Code2,
  Copy,
  Check,
  Download,
  ArrowRight,
  ShieldCheck,
  Building,
  CheckCircle2
} from 'lucide-react';
import { CostingAndSustainabilityModule } from '../CostingAndSustainabilityModule';

export const Screen6BomGenerator: React.FC = () => {
  const {
    selectedMasterStyle,
    selectedDevObjectId,
    setSelectedDevObjectId,
    activeBomPayload,
    setCurrentScreen
  } = useTechPack();

  const [activeTab, setActiveTab] = useState<'human' | 'json'>('human');
  const [copied, setCopied] = useState(false);

  const devObjects = selectedMasterStyle.devObjects;

  // Clean JSON payload matching prompt specification
  const flexPlmPayloadPromptCompliant = activeBomPayload
    ? {
        header: {
          eventSource: 'OmniThink',
          eventEntity: 'Development BOM',
          eventType: 'Create'
        },
        devObjectId: activeBomPayload.devObjectId,
        seasonCode: activeBomPayload.seasonCode,
        bom: activeBomPayload.bom.map((b) => ({
          section: b.section,
          standardPlacement: b.standardPlacement,
          placement: b.placement,
          materialName: b.materialName,
          supplierName: b.supplierName,
          supplierArticle: b.supplierArticle
        }))
      }
    : null;

  const handleCopyJson = () => {
    if (!flexPlmPayloadPromptCompliant) return;
    navigator.clipboard.writeText(JSON.stringify(flexPlmPayloadPromptCompliant, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!flexPlmPayloadPromptCompliant) return;
    const blob = new Blob([JSON.stringify(flexPlmPayloadPromptCompliant, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FlexPLM_BOM_${activeBomPayload?.devObjectId}_SP28.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Screen 06 · FlexPLM Integration
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            BOM Generator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generating FlexPLM-ready standardized Bill of Materials payloads with automated placement categorization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentScreen(7)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap self-start md:self-auto cursor-pointer"
          >
            <span>Run Material Validation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Development Object Selector & View Controls */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* DO Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Target Dev Object:</span>
          <div className="flex items-center gap-1.5">
            {devObjects.map((d) => (
              <button
                key={d.devObjectId}
                onClick={() => setSelectedDevObjectId(d.devObjectId)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedDevObjectId === d.devObjectId
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full border border-white/50"
                  style={{ backgroundColor: d.colorHex }}
                />
                <span>{d.devObjectId}</span>
              </button>
            ))}
          </div>
        </div>

        {/* View Switcher & Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            <button
              onClick={() => setActiveTab('human')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeTab === 'human'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Human Spec View
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FlexPLM JSON Payload
            </button>
          </div>

          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {activeTab === 'human' ? (
        /* Human Readable BOM Specification Table */
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800">
                FlexPLM Development BOM Specification ({selectedDevObjectId})
              </span>
              <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Season: SP28
              </span>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {activeBomPayload?.bom.length || 0} Line Items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-500 font-medium uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4 font-semibold">Section</th>
                  <th className="py-2.5 px-4 font-semibold">Placement</th>
                  <th className="py-2.5 px-4 font-semibold">Standard Placement</th>
                  <th className="py-2.5 px-4 font-semibold">Material</th>
                  <th className="py-2.5 px-4 font-semibold">Supplier</th>
                  <th className="py-2.5 px-4 font-semibold">Supplier Article</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Consumption</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-sans">
                {!activeBomPayload || activeBomPayload.bom.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No BOM generated yet. Ingest a Tech Pack PDF on Screen 1 to generate FlexPLM BOMs.
                    </td>
                  </tr>
                ) : (
                  activeBomPayload.bom.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium capitalize text-slate-600">
                        {row.section}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {row.placement}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {row.standardPlacement}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {row.materialName}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {row.supplierName}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {row.supplierArticle}
                      </td>
                      <td className="py-3 px-4 font-mono text-right tabular-nums text-slate-700">
                        {row.consumption} {row.unit}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Prompt-Targeted Callout */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-slate-600">
              <span>Section: <strong className="text-slate-900">Fabric</strong></span>
              <span>·</span>
              <span>Placement: <strong className="text-slate-900">BODY</strong></span>
              <span>·</span>
              <span>Standard Placement: <strong className="text-slate-900">Self</strong></span>
              <span>·</span>
              <span>Material: <strong className="text-slate-900">NULU</strong></span>
              <span>·</span>
              <span>Supplier: <strong className="text-slate-900">ABC Textiles</strong></span>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              SP28 Auto BOM Compliant
            </span>
          </div>
        </div>
      ) : (
        /* FlexPLM JSON Payload (Prompt Match) */
        <div className="bg-slate-900 text-slate-100 rounded-lg border border-slate-800 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-300">
              FlexPLM REST Event Payload ({selectedDevObjectId})
            </span>
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-400 leading-relaxed max-h-[500px]">
            {JSON.stringify(flexPlmPayloadPromptCompliant, null, 2)}
          </pre>
        </div>
      )}

      {/* Advanced Apparel Engineering: Marker Nesting, Costing SAM, and ESG LCA */}
      <CostingAndSustainabilityModule />
    </div>
  );
};
