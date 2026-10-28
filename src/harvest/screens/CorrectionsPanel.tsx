import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, ExternalLink, Plus, RotateCcw, Save, FileText } from 'lucide-react';
import { harvestApi } from '../api';
import type { DevObjectBom, EnrichedView, Enrichment, Env, FlexRow, RowEdits, RowFields } from '../types';
import { diffRows, rowToFields } from './correctionsLogic';
import type { DraftFields, DraftRow } from './correctionsLogic';

const card = 'bg-white rounded-lg border border-slate-200 shadow-xs';
const th = 'px-2 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap';
const btnPrimary = 'px-3 py-1.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-md cursor-pointer disabled:cursor-not-allowed';
const btnSecondary = 'px-3 py-1.5 text-sm font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 rounded-md cursor-pointer disabled:cursor-not-allowed';

const SECTIONS = ['fabric', 'trim', 'lining', 'print', 'graphics', 'stitch', 'bonding', 'other', 'packaging', 'labels', 'finishing'];

const COLUMNS: { key: keyof DraftFields; label: string }[] = [
  { key: 'section', label: 'Section' },
  { key: 'standardPlacement', label: 'Standard placement' },
  { key: 'placement', label: 'Placement' },
  { key: 'supplierArticle', label: 'Supplier article' },
  { key: 'supplierName', label: 'Supplier' },
  { key: 'materialName', label: 'Material' }
];

const NO_ENRICHMENT: Enrichment = { lookup: false, history: true, ai: [] };
const enrichKey = (styleRef: string, devObjectId: string) => `${styleRef}|${devObjectId}`;


const originLabel: Record<string, string> = { pdam: 'PDAM', ai: 'AI', history: 'history', edit: 'edit' };
const originClass: Record<string, string> = {
  pdam: 'bg-sky-100 text-sky-800',
  ai: 'bg-violet-100 text-violet-800',
  history: 'bg-emerald-100 text-emerald-800',
  edit: 'bg-yellow-100 text-yellow-800',
  plugin: 'bg-slate-100 text-slate-600'
};

const Badge: React.FC<{ origin: string }> = ({ origin }) => (
  <span className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${originClass[origin] ?? originClass.plugin}`}>{originLabel[origin] ?? 'plugin'}</span>
);

export const CorrectionsPanel: React.FC<{
  boms: DevObjectBom[];
  styleRef: string;
  env: Env;
  activeId: string | null;
  onActive: (id: string) => void;
  enrichment: Record<string, Enrichment>;
  loading: boolean;
}> = ({ boms, styleRef, env, activeId, onActive, enrichment, loading }) => {
  const active = boms.find((b) => b.devObjectId === activeId) ?? boms[0];
  const devObjectId = active?.devObjectId;
  const current = (devObjectId && enrichment[enrichKey(styleRef, devObjectId)]) || NO_ENRICHMENT;
  // The "before": the earlier screens' state without any edits.
  const baseKey = JSON.stringify({ lookup: current.lookup, history: current.history, ai: current.ai });
  const base = useMemo<Enrichment>(() => JSON.parse(baseKey) as Enrichment, [baseKey]);

  const [view, setView] = useState<EnrichedView | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRow[]>([]);
  const [reload, setReload] = useState(0);
  const seq = useRef(0);
  const nextKey = useRef(0);

  const [memory, setMemory] = useState<{ total: number; materials: number } | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);

  const refreshMemory = useCallback(() => {
    harvestApi.correctionsSummary().then((s) => setMemory(s)).catch(() => setMemory(null));
  }, []);
  useEffect(() => {
    refreshMemory();
  }, [refreshMemory]);

  const setPdf = useCallback((url: string | null) => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    pdfUrlRef.current = url;
    setPdfUrl(url);
  }, []);
  useEffect(() => () => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
  }, []);

  // Load the rows (without edits) whenever the dev object or the earlier screens' state changes.
  useEffect(() => {
    if (!devObjectId) return;
    const mine = ++seq.current;
    setViewLoading(true);
    setViewError(null);
    setView(null);
    setDraft([]);
    setSaveMsg(null);
    setSaveError(null);
    setPdf(null);
    setPdfError(null);
    harvestApi
      .enriched(env, styleRef, devObjectId, base)
      .then((v) => {
        if (mine !== seq.current) return;
        setView(v);
        setDraft(v.flexPayload.bom.map((r, i) => ({ key: `l${i}`, index: i, removed: false, fields: rowToFields(r) })));
        setViewLoading(false);
      })
      .catch((e: unknown) => {
        if (mine !== seq.current) return;
        setViewError(e instanceof Error ? e.message : String(e));
        setViewLoading(false);
      });
  }, [env, styleRef, devObjectId, base, reload, setPdf]);

  const loaded = useMemo(() => view?.flexPayload.bom ?? [], [view]);
  const origins = useMemo(() => {
    if (!view) return [] as (string | undefined)[];
    const rows = view.bom.bomRows;
    if (rows.length === loaded.length) return rows.map((r) => r.enrichedBy);
    const visible = rows.filter((r) => !r.isInDevelopment);
    return visible.length === loaded.length ? visible.map((r) => r.enrichedBy) : [];
  }, [view, loaded.length]);

  const edits = useMemo(() => diffRows(loaded, draft), [loaded, draft]);
  const stats = useMemo(() => {
    let changed = 0;
    for (const r of edits?.rows ?? []) changed += Object.keys(r.fields).length;
    return { changed, removed: edits?.deleted.length ?? 0, added: edits?.added.length ?? 0 };
  }, [edits]);

  const setField = (key: string, f: keyof DraftFields, value: string) =>
    setDraft((d) => d.map((r) => (r.key === key ? { ...r, fields: { ...r.fields, [f]: value } } : r)));
  const toggleRemoved = (key: string) => setDraft((d) => d.map((r) => (r.key === key ? { ...r, removed: !r.removed } : r)));
  const dropAdded = (key: string) => setDraft((d) => d.filter((r) => r.key !== key));
  const addRow = () =>
    setDraft((d) => [
      ...d,
      { key: `n${nextKey.current++}`, index: null, removed: false, fields: { section: 'fabric', standardPlacement: '', placement: '', supplierArticle: '', supplierName: '', materialName: '' } }
    ]);
  const reset = () => {
    setDraft(loaded.map((r, i) => ({ key: `l${i}`, index: i, removed: false, fields: rowToFields(r) })));
    setSaveMsg(null);
    setSaveError(null);
  };

  const save = async () => {
    if (!edits || !devObjectId) return;
    setSaving(true);
    setSaveError(null);
    setSaveMsg(null);
    try {
      const r = await harvestApi.saveCorrections(env, styleRef, devObjectId, { ...base, edits }, reason.trim() || undefined);
      setSaveMsg(`${r.saved} correction${r.saved === 1 ? '' : 's'} saved, memory now holds ${r.total}.`);
      refreshMemory();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const makePdf = async () => {
    if (!devObjectId) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      const blob = await harvestApi.bomPdf(env, styleRef, devObjectId, { ...base, ...(edits ? { edits } : {}) });
      setPdf(URL.createObjectURL(blob));
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : String(e));
    } finally {
      setPdfBusy(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-500">Building BOMs...</div>;
  if (!active) return <div className="p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md">No development objects to review for this style.</div>;

  const input = 'w-full min-w-[7rem] px-1.5 py-1 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-slate-400';
  const changedCls = 'bg-yellow-100 ring-1 ring-yellow-300 border-yellow-300';
  const untouched = draft.every((r) => r.index !== null && !r.removed) && !edits;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Dev object:</span>
        {boms.map((b) => (
          <button
            key={b.devObjectId}
            onClick={() => onActive(b.devObjectId)}
            className={`px-3 py-1.5 rounded-md text-sm font-mono cursor-pointer ${
              b.devObjectId === active.devObjectId ? 'bg-slate-900 text-white font-bold' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {b.devObjectId}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-600">
          {memory ? `Memory: ${memory.total} correction${memory.total === 1 ? '' : 's'} for ${memory.materials} material${memory.materials === 1 ? '' : 's'}` : 'Memory: not available'}
        </span>
      </div>

      {viewError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
          <span>{viewError}</span>
          <button className="underline hover:text-rose-900 cursor-pointer" onClick={() => setReload((n) => n + 1)}>Retry</button>
        </div>
      )}
      {viewLoading && <div className="text-sm text-slate-500">Loading the rows...</div>}

      {view && (
        <div className={card}>
          <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-slate-100">
            <div className="text-sm font-semibold text-slate-800">Review and correct</div>
            <div className="text-xs text-slate-600" aria-live="polite">
              {stats.changed} cell{stats.changed === 1 ? '' : 's'} changed, {stats.removed} row{stats.removed === 1 ? '' : 's'} removed, {stats.added} row{stats.added === 1 ? '' : 's'} added
            </div>
            <div className="ml-auto flex gap-2">
              <button className={`${btnSecondary} flex items-center gap-1`} onClick={addRow}><Plus className="w-3.5 h-3.5" /> Add a row</button>
              <button className={`${btnSecondary} flex items-center gap-1`} onClick={reset} disabled={untouched}><RotateCcw className="w-3.5 h-3.5" /> Reset</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>#</th>
                  {COLUMNS.map((c) => <th key={c.key} className={th}>{c.label}</th>)}
                  <th className={th}>Score</th>
                  <th className={th}>Source</th>
                  <th className={th}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {draft.map((r, n) => {
                  const orig = r.index !== null ? rowToFields(loaded[r.index]) : null;
                  const label = `row ${n + 1}`;
                  return (
                    <tr key={r.key} className={r.index === null ? 'bg-emerald-50/40' : view?.bom.bomRows[r.index]?.isInDevelopment ? 'text-slate-500' : ''} title={r.index !== null && view?.bom.bomRows[r.index]?.isInDevelopment ? 'In development: corrected like the other rows' : undefined}>
                      <td className="px-2 py-1.5 text-xs text-slate-500 align-middle">{n + 1}</td>
                      {COLUMNS.map((c) => {
                        const changed = !!orig && r.fields[c.key] !== orig[c.key];
                        const inDev = r.index !== null && !!view?.bom.bomRows[r.index]?.isInDevelopment;
                        const cls = `${input} ${changed ? changedCls : ''} ${r.removed || inDev ? 'line-through text-slate-400 bg-slate-50' : ''}`;
                        const aria = `${c.label}, ${label}`;
                        const title = changed && orig ? `Original: ${orig[c.key] || '(empty)'}` : undefined;
                        const needsName = c.key === 'materialName' && r.index === null;
                        return (
                          <td key={c.key} className="px-1 py-1 align-middle">
                            {c.key === 'section' ? (
                              <select aria-label={aria} title={title} className={cls} value={r.fields.section} disabled={r.removed} onChange={(e) => setField(r.key, c.key, e.target.value)}>
                                {!r.fields.section && <option value="">(none)</option>}
                                {[...new Set([...SECTIONS, r.fields.section].filter(Boolean))].map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : (
                              <input
                                aria-label={aria}
                                aria-required={needsName ? true : undefined}
                                title={title}
                                className={`${cls} ${needsName && !r.fields.materialName.trim() ? 'border-rose-300' : ''}`}
                                value={r.fields[c.key]}
                                readOnly={r.removed}
                                placeholder={needsName ? 'required' : undefined}
                                onChange={(e) => setField(r.key, c.key, e.target.value)}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className={`px-2 py-1.5 text-sm align-middle whitespace-nowrap ${r.removed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                        {r.index !== null ? loaded[r.index].omniMatchScore : '-'}
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        {r.index === null ? <Badge origin="edit" /> : <Badge origin={origins[r.index] ?? 'plugin'} />}
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        {r.index === null ? (
                          <button className="text-xs underline text-slate-700 hover:text-slate-900 cursor-pointer" onClick={() => dropAdded(r.key)} aria-label={`Remove ${label}`}>Remove</button>
                        ) : (
                          <button className="text-xs underline text-slate-700 hover:text-slate-900 cursor-pointer" onClick={() => toggleRemoved(r.key)} aria-label={`${r.removed ? 'Undo remove' : 'Remove'} ${label}`}>
                            {r.removed ? 'Undo' : 'Remove'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!draft.length && <tr><td colSpan={10} className="px-3 py-4 text-sm text-slate-500">No rows in the payload for this dev object.</td></tr>}
              </tbody>
            </table>
          </div>
          {draft.some((r) => r.index === null && !r.fields.materialName.trim()) && (
            <div className="px-4 py-2 text-xs text-amber-800 bg-amber-50 border-t border-amber-200">An added row without a material name is ignored.</div>
          )}
        </div>
      )}

      {view && (
        <div className={`${card} p-4 space-y-3`}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-600 grow sm:grow-0">
              Reason (optional)
              <input className="px-2 py-1.5 text-sm border border-slate-300 rounded-md sm:w-80" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Why these corrections" />
            </label>
            <button className={`${btnPrimary} flex items-center gap-1`} disabled={!edits || saving} onClick={save}>
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save corrections'}
            </button>
            <button className={`${btnSecondary} flex items-center gap-1`} disabled={pdfBusy} onClick={makePdf}>
              <FileText className="w-3.5 h-3.5" /> {pdfBusy ? 'Building the PDF...' : 'Generate final PDF'}
            </button>
          </div>
          {saveMsg && (
            <div role="status" className="text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              {saveMsg} Supplier, article and section edits are reused for the same material on later styles; placement and name edits stay with this style.
            </div>
          )}
          {saveError && <div role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{saveError}</div>}
          {pdfError && <div role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{pdfError}</div>}
        </div>
      )}

      {pdfUrl && (
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-100 text-sm">
            <span className="font-semibold text-slate-800">
              Final PDF <span className="font-normal text-slate-500">(built with your edits{edits ? '' : ': none yet, so it matches the BOM above'})</span>
            </span>
            <span className="flex items-center gap-3">
              <a href={pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"><ExternalLink className="w-3.5 h-3.5" /> Open in a new tab</a>
              <a href={pdfUrl} download={`BOM_${active.devObjectId}_final.pdf`} className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"><Download className="w-3.5 h-3.5" /> Download</a>
            </span>
          </div>
          <iframe title="Final BOM PDF" src={pdfUrl} className="w-full h-[640px] bg-slate-100" />
        </div>
      )}
    </div>
  );
};
