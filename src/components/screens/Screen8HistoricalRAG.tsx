import React from 'react';
import { useTechPack } from '../../context/TechPackContext';
import {
  Cpu,
  Search,
  Package,
  Tag,
  Scissors,
  ArrowRight,
  Sparkles,
  Percent,
  CheckCircle2
} from 'lucide-react';

export const Screen8HistoricalRAG: React.FC = () => {
  const {
    ragSearchQuery,
    setRagSearchQuery,
    historicalMatches,
    selectedHistoricalBom,
    setSelectedHistoricalBom,
    selectedMasterStyle,
    setCurrentScreen
  } = useTechPack();

  const activeItem = selectedHistoricalBom || (historicalMatches.length > 0 ? historicalMatches[0] : null);

  return (
    <div className="space-y-6">
      {/* Header Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Screen 08 · RAG Intelligence
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Historical Intelligence (RAG)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulating FAISS embedding vector similarity retrieval across 20+ historical season archives to recommend packaging, labels, and trims.
          </p>
        </div>

        <button
          onClick={() => setCurrentScreen(9)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap self-start md:self-auto cursor-pointer"
        >
          <span>Open Correction Workflow</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Input BOM Banner & Search Query */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-700 block">
              Vector Query: Active Development BOM ({selectedMasterStyle.name})
            </span>
            <span className="text-[11px] text-slate-500">
              Query Tokens: [NULU, Power Mesh, High-Rise Yoga Pant, SP28, Bonded Waistband]
            </span>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={ragSearchQuery}
            onChange={(e) => setRagSearchQuery(e.target.value)}
            placeholder="Filter historical archives..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Similar Products (Prompt Match) */}
        <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Similar Products (FAISS Vector Index)
            </span>
            <span className="text-xs font-mono text-slate-500">
              {historicalMatches.length} Historical BOMs Matched
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
            {historicalMatches.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No historical archives matched the query. Try adjusting the search term.
              </div>
            ) : (
              historicalMatches.map((item, idx) => {
                const isSelected = activeItem?.id === item.id;
                const isTop = idx < 2;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedHistoricalBom(item)}
                    className={`p-4 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-100/90 border-l-2 border-slate-900'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {item.styleName}
                        </span>
                        {isTop && (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            Top Match
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Season: <span className="font-mono text-slate-700">{item.season}</span> · Category:{' '}
                        <span className="text-slate-700">{item.category}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-1">
                        {item.baseMaterials.map((m) => (
                          <span key={m} className="bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded text-[10px] font-mono">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Similarity
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                        {(item.similarity * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Additional Output (Prompt Match: Packaging, Labels, Trims) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-700 block">
                  RAG Inferred Recommendations
                </span>
                <span className="text-[11px] text-slate-500">
                  {activeItem ? (
                    <>
                      Transferred from: <strong className="text-slate-900">{activeItem.styleName}</strong> ({(activeItem.similarity * 100).toFixed(0)}% Similarity)
                    </>
                  ) : (
                    'Select a matched style on the left'
                  )}
                </span>
              </div>
              {activeItem && (
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Confidence: High
                </span>
              )}
            </div>

            <div className="p-5 space-y-5 text-xs">
              {!activeItem ? (
                <div className="p-6 text-center text-slate-400">
                  Select a product from the list to preview RAG inferred components.
                </div>
              ) : (
                <>
                  {/* Suggested Packaging */}
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider mb-2 text-[11px]">
                      <Package className="w-3.5 h-3.5 text-slate-600" />
                      <span>Suggested Packaging</span>
                    </div>
                    <div className="space-y-1.5">
                      {activeItem.suggestedPackaging.map((pkg, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span>{pkg}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Labels */}
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider mb-2 text-[11px]">
                      <Tag className="w-3.5 h-3.5 text-slate-600" />
                      <span>Suggested Labels</span>
                    </div>
                    <div className="space-y-1.5">
                      {activeItem.suggestedLabels.map((lbl, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span>{lbl}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Trims */}
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider mb-2 text-[11px]">
                      <Scissors className="w-3.5 h-3.5 text-slate-600" />
                      <span>Suggested Trims</span>
                    </div>
                    <div className="space-y-1.5">
                      {activeItem.suggestedTrims.map((trm, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span>{trm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-1">
            <span className="font-semibold block">FAISS Embeddings Pipeline</span>
            <p className="leading-relaxed">
              OmniThink indexes historical tech packs into a vector space with normalized metadata. By projecting the newly generated SP28 BOM into this embedding space, adjacent products pass forward production-tested packaging barcodes and label configurations without manual entry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
