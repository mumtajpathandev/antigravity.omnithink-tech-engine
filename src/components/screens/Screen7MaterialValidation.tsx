import React, { useState } from 'react';
import { useTechPack } from '../../context/TechPackContext';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  ArrowRight,
  RefreshCw,
  Search,
  BookOpen
} from 'lucide-react';
import { MATERIAL_LIBRARY } from '../../data/mockData';

export const Screen7MaterialValidation: React.FC = () => {
  const {
    validationResults,
    extraTestMaterial,
    setExtraTestMaterial,
    addCustomMaterialTest,
    runMaterialValidation,
    setCurrentScreen
  } = useTechPack();

  const [selectedLibraryFilter, setSelectedLibraryFilter] = useState<'All' | 'Approved' | 'In Development' | 'Rejected' | 'Dropped' | 'Lab Use Only' | 'Deactivated'>('All');

  const filteredLibrary = MATERIAL_LIBRARY.filter((item) => {
    if (selectedLibraryFilter === 'All') return true;
    return item.status === selectedLibraryFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Screen 07 · Governance & Compliance
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Material Validation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluating BOM materials against FlexPLM material master lifecycle status rules prior to factory release.
          </p>
        </div>

        <button
          onClick={() => setCurrentScreen(8)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap self-start md:self-auto cursor-pointer"
        >
          <span>Run Historical RAG Intelligence</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Validation Rules Card (Prompt Exact Rules) */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <span className="text-xs font-semibold text-slate-800 block mb-2">
          FlexPLM Validation Rule Engine
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-md bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Pass Rules</span>
            </div>
            <ul className="text-emerald-700 space-y-0.5 text-[11px]">
              <li>• <strong>Approved</strong>: Cleared for commercial bulk BOM</li>
            </ul>
          </div>

          <div className="p-3 rounded-md bg-amber-50/70 border border-amber-200">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Warn Rules</span>
            </div>
            <ul className="text-amber-700 space-y-0.5 text-[11px]">
              <li>• <strong>In Development</strong>: Commercial release blocked pending lab dip / wear test</li>
            </ul>
          </div>

          <div className="p-3 rounded-md bg-rose-50/70 border border-rose-200">
            <div className="flex items-center gap-1.5 text-rose-800 font-bold mb-1">
              <XCircle className="w-4 h-4" />
              <span>Reject Rules</span>
            </div>
            <ul className="text-rose-700 space-y-0.5 text-[11px]">
              <li>• <strong>Rejected</strong>, <strong>Dropped</strong>, <strong>Lab Use Only</strong>, <strong>Deactivated</strong></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Primary Validation Results (Prompt Match) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-700">
            Sample Validation Input & Output ({validationResults.length} Materials Evaluated)
          </span>

          {/* Quick add custom material for testing */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={extraTestMaterial}
              onChange={(e) => setExtraTestMaterial(e.target.value)}
              placeholder="Test another material name..."
              className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCustomMaterialTest(extraTestMaterial);
              }}
            />
            <button
              onClick={() => addCustomMaterialTest(extraTestMaterial)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Test</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {validationResults.length === 0 ? (
            <div className="p-8 text-center">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-700">No Materials Queued for Validation</div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                Upload a Tech Pack or select a sample from Screen 1 to evaluate materials automatically against FlexPLM master lifecycle rules. You can also test individual materials above.
              </p>
            </div>
          ) : (
            validationResults.map((item, idx) => {
              const isPass = item.outcome === 'Pass';
              const isWarn = item.outcome === 'Warn';
              const isReject = item.outcome === 'Reject';

              return (
                <div
                  key={idx}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isPass && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      {isWarn && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                      {isReject && <XCircle className="w-5 h-5 text-rose-600" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {item.material}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {item.articleNumber} · {item.supplier}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                        <span>Reason:</span>
                        <span className="font-medium text-slate-800">{item.reason}</span>
                      </div>
                    </div>
                  </div>

                  <div className="self-end md:self-center shrink-0">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded flex items-center gap-1.5 ${
                        isPass
                          ? 'bg-emerald-100 text-emerald-800'
                          : isWarn
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <span>{isPass ? '✅ Approved' : isWarn ? '⚠️ In Development' : '❌ Rejected'}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Expected Output Demonstration Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <span>
            Validation Policies: <strong>Approved</strong> (Production Cleared), <strong>In Development</strong> (Warn / Lab Review), <strong>Rejected / Dropped</strong> (Blocked)
          </span>
          <span className="font-mono text-[11px] text-slate-400">FlexPLM SP28 Policy Validator</span>
        </div>
      </div>

      {/* Material Master Library Reference Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-800">
              FlexPLM Master Material Repository
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {(['All', 'Approved', 'In Development', 'Rejected', 'Dropped', 'Lab Use Only', 'Deactivated'] as const).map(
              (filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedLibraryFilter(filter)}
                  className={`text-[11px] px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    selectedLibraryFilter === filter
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter}
                </button>
              )
            )}
          </div>
        </div>

        <div className="overflow-x-auto max-h-60">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 sticky top-0 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2 px-3 font-semibold">Material</th>
                <th className="py-2 px-3 font-semibold">Status</th>
                <th className="py-2 px-3 font-semibold">Supplier</th>
                <th className="py-2 px-3 font-semibold">Article Number</th>
                <th className="py-2 px-3 font-semibold">Notes</th>
                <th className="py-2 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLibrary.map((item) => (
                <tr key={item.articleNumber} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-medium text-slate-900">{item.material}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        item.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'In Development'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-2 px-3">{item.supplier}</td>
                  <td className="py-2 px-3 font-mono text-[11px]">{item.articleNumber}</td>
                  <td className="py-2 px-3 text-[11px] text-slate-500">{item.notes}</td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => addCustomMaterialTest(item.material)}
                      className="text-[11px] font-medium text-slate-900 hover:underline cursor-pointer"
                    >
                      + Validate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
