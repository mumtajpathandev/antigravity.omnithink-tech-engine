import React, { useState } from 'react';
import { useTechPack } from '../context/TechPackContext';
import {
  Scissors,
  DollarSign,
  Leaf,
  Layers,
  ShieldCheck,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
  Sliders
} from 'lucide-react';
import {
  generateMarkerNestingMetrics,
  generateCostingBreakdown,
  generateEsgLcaMetrics
} from '../data/agenticData';

export const CostingAndSustainabilityModule: React.FC = () => {
  const { selectedMasterStyle } = useTechPack();
  const [activeTab, setActiveTab] = useState<'nesting' | 'costing' | 'esg'>('nesting');

  const nesting = generateMarkerNestingMetrics(selectedMasterStyle.name);
  const costing = generateCostingBreakdown(selectedMasterStyle.name);
  const esg = generateEsgLcaMetrics(selectedMasterStyle.name);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Advanced Apparel Engineering & ESG Intelligence</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Zero-Hallucination Mathematical Kernel
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Real-time fabric cut marker nesting, standard allowed minutes (SAM) labor costing, and Life Cycle Assessment (LCA) for {selectedMasterStyle.name}.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md text-xs font-medium">
          <button
            onClick={() => setActiveTab('nesting')}
            className={`flex items-center gap-1 px-3 py-1 rounded transition-colors cursor-pointer ${
              activeTab === 'nesting' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scissors className="w-3 h-3 text-slate-700" />
            <span>1. Marker Nesting ({nesting.markerEfficiencyPercent}%)</span>
          </button>

          <button
            onClick={() => setActiveTab('costing')}
            className={`flex items-center gap-1 px-3 py-1 rounded transition-colors cursor-pointer ${
              activeTab === 'costing' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3 h-3 text-emerald-600" />
            <span>2. Costing SAM (${costing.totalEstimatedFobUsd})</span>
          </button>

          <button
            onClick={() => setActiveTab('esg')}
            className={`flex items-center gap-1 px-3 py-1 rounded transition-colors cursor-pointer ${
              activeTab === 'esg' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Leaf className="w-3 h-3 text-teal-600" />
            <span>3. ESG & LCA Carbon</span>
          </button>
        </div>
      </div>

      {/* TAB 1: 2D Marker Nesting Yield */}
      {activeTab === 'nesting' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-mono block">MARKER EFFICIENCY</span>
              <span className="text-base font-bold text-emerald-700 font-mono">
                {nesting.markerEfficiencyPercent}%
              </span>
              <span className="text-[10px] text-slate-500 block">High utilization cut yield</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-mono block">FABRIC WASTE SCRAP</span>
              <span className="text-base font-bold text-slate-800 font-mono">
                {nesting.fabricWastePercent}%
              </span>
              <span className="text-[10px] text-slate-500 block">Off-cut salvageable fiber</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-mono block">FABRIC ROLL WIDTH</span>
              <span className="text-base font-bold text-slate-800 font-mono">
                {nesting.fabricWidthInches}" Cuttable
              </span>
              <span className="text-[10px] text-slate-500 block">Grainline: {nesting.grainlineAlignment}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-mono block">PATTERN PIECES</span>
              <span className="text-base font-bold text-slate-800 font-mono">
                {nesting.patternPiecesCount} Pieces
              </span>
              <span className="text-[10px] text-slate-500 block">Total length: {nesting.totalLengthYards} yds</span>
            </div>
          </div>

          {/* Visual 2D Marker Nesting Roll Canvas */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-900 text-slate-200">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800 pb-2 mb-3">
              <span>2D Marker Nesting Canvas (Roll Width: {nesting.fabricWidthInches}")</span>
              <span className="text-emerald-400">Yield: {nesting.rollUtilizationSqMeters} m² / Garment</span>
            </div>

            {/* Simulated 2D Nested Pattern Polygons */}
            <div className="h-28 bg-slate-950 rounded border border-slate-800 p-2 relative overflow-hidden flex items-center justify-between gap-2">
              <div className="h-full w-1/4 rounded bg-emerald-950/80 border border-emerald-500/40 p-2 text-[10px] font-mono flex flex-col justify-between">
                <span className="text-emerald-300 font-bold">Front Leg L</span>
                <span className="text-slate-400">Area: 710 cm²</span>
              </div>
              <div className="h-full w-1/4 rounded bg-emerald-950/80 border border-emerald-500/40 p-2 text-[10px] font-mono flex flex-col justify-between">
                <span className="text-emerald-300 font-bold">Front Leg R</span>
                <span className="text-slate-400">Area: 710 cm²</span>
              </div>
              <div className="h-full w-1/5 rounded bg-blue-950/80 border border-blue-500/40 p-2 text-[10px] font-mono flex flex-col justify-between">
                <span className="text-blue-300 font-bold">Waistband</span>
                <span className="text-slate-400">Area: 380 cm²</span>
              </div>
              <div className="h-full w-1/6 rounded bg-amber-950/80 border border-amber-500/40 p-2 text-[10px] font-mono flex flex-col justify-between">
                <span className="text-amber-300 font-bold">Pocket Bags</span>
                <span className="text-slate-400">Area: 165 cm²</span>
              </div>
              <div className="h-full w-[8%] rounded bg-slate-800/40 border border-dashed border-slate-700 p-1 text-[9px] font-mono flex items-center justify-center text-slate-500 text-center">
                Scrap (8.8%)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Costing SAM Breakdown */}
      {activeTab === 'costing' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-mono block">TOTAL ESTIMATED FOB</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                ${costing.totalEstimatedFobUsd}
              </span>
              <span className="text-[10px] text-slate-500 block">Target: ${costing.targetFobUsd}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-mono block">SAM SEWING MINUTES</span>
              <span className="text-base font-bold text-slate-800 font-mono">
                {costing.samMinutes} mins
              </span>
              <span className="text-[10px] text-slate-500 block">Labor: ${costing.laborCostUsd}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-mono block">RAW MATERIALS COST</span>
              <span className="text-base font-bold text-slate-800 font-mono">
                ${costing.materialCostUsd}
              </span>
              <span className="text-[10px] text-slate-500 block">Trims: ${costing.trimsCostUsd}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-mono block">MARGIN VARIANCE</span>
              <span className={`text-base font-bold font-mono ${costing.marginVariancePercent > 5 ? 'text-amber-600' : 'text-emerald-700'}`}>
                +{costing.marginVariancePercent}%
              </span>
              <span className="text-[10px] text-slate-500 block">Within commercial tolerance</span>
            </div>
          </div>

          {/* Cost Distribution Bar */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <span className="text-[11px] font-bold text-slate-700 block mb-2">FOB Cost Composition</span>
            <div className="h-4 rounded-full overflow-hidden flex text-[10px] font-bold text-white font-mono">
              <div style={{ width: '52%' }} className="bg-slate-800 flex items-center justify-center">
                Materials (52%)
              </div>
              <div style={{ width: '24%' }} className="bg-emerald-600 flex items-center justify-center">
                Labor (24%)
              </div>
              <div style={{ width: '12%' }} className="bg-amber-600 flex items-center justify-center">
                Trims
              </div>
              <div style={{ width: '12%' }} className="bg-blue-600 flex items-center justify-center">
                Freight
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ESG Carbon & LCA */}
      {activeTab === 'esg' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-emerald-800 text-[10px] font-mono block">SCOPE 3 CARBON</span>
              <span className="text-base font-bold text-emerald-950 font-mono">
                {esg.carbonFootprintKgCo2e} kg CO2e
              </span>
              <span className="text-[10px] text-emerald-700 block">-22% vs virgin baseline</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-mono block">WATER CONSUMPTION</span>
              <span className="text-base font-bold text-slate-800 font-mono">
                {esg.waterConsumptionLiters} Liters
              </span>
              <span className="text-[10px] text-slate-500 block">Dope dye wet processing</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-mono block">RECYCLED CONTENT</span>
              <span className="text-base font-bold text-emerald-700 font-mono">
                {esg.recycledContentPercent}%
              </span>
              <span className="text-[10px] text-slate-500 block">Post-industrial nylon</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[10px] font-mono block">HIGG MSI SCORE</span>
              <span className="text-base font-bold text-slate-800 font-mono">
                {esg.higgMsiScore} pts
              </span>
              <span className="text-[10px] text-slate-500 block">Tier 1 Green Energy: {esg.tier1SupplierRenewableEnergyPercent}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
