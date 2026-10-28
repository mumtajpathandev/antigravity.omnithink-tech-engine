import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Loader2 } from 'lucide-react';
import { harvestApi } from './api';
import { AiLogView } from './AiLog';
import { runningText, useAiLog, useAiPlan, useNow } from './aiLogHooks';
import { NO_ENRICHMENT, enrichmentKey } from './enrichment';
import { AI_PROVIDERS, type AiProviderId } from './types';
import type { AiResult, AiSuggestion, CatalogRow, DevObjectBom, EnrichedView, Enrichment, Env, FlexRow, StyleDetail } from './types';

// HELPERS-START (pure text builders)
/** The sources that are on, e.g. "past corrections + PDAM catalog lookup + 2 AI suggestions". `aiCount` lets the PDF switch hide the AI picks. */
const sourcesText = (e: Enrichment, aiCount: number = e.ai.length): string => {
  const parts: string[] = [];
  if (e.history) parts.push('past corrections');
  if (e.lookup) parts.push('PDAM catalog lookup');
  if (aiCount > 0) parts.push(`${aiCount} AI suggestion${aiCount === 1 ? '' : 's'}`);
  if (e.edits) parts.push('your edits');
  return parts.join(' + ');
};

/** What step 1 reports once applied, from the server's enrichment.history block (undefined while the view is loading). */
const historyText = (h?: { applied: number; of: number; overrodeLookup: number }): string | null => {
  if (!h) return null;
  if (h.applied === 0) return 'No past corrections match yet: the memory fills as people correct BOMs on screen 5.';
  return `${h.applied} of ${h.of} rows matched a past correction (${h.overrodeLookup} replaced the PDAM lookup).`;
};
// HELPERS-END

const card = 'bg-white rounded-lg border border-slate-200 shadow-xs';
const th = 'px-3 py-2 text-left text-xs font-semibold text-slate-500';
const td = 'px-3 py-1.5 text-sm align-top';

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="px-3 py-2 rounded-md bg-slate-50 border border-slate-100 min-w-0">
    <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
    <div className="text-sm font-bold text-slate-900 truncate">{value ?? '-'}</div>
  </div>
);

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md cursor-pointer"
    >
      {done ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
};

const Json: React.FC<{ value: unknown; height?: string }> = ({ value, height = 'max-h-[420px]' }) => (
  <pre className={`${height} overflow-auto text-xs leading-relaxed bg-slate-900 text-slate-100 rounded-md p-3 font-mono`}>{JSON.stringify(value, null, 2)}</pre>
);

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md">{children}</div>
);

const InDev = () => <span className="ml-1.5 text-xs px-1 rounded bg-amber-100 text-amber-800">in development</span>;
const Blank = () => <span className="text-slate-400" aria-label="none">-</span>;
/** The supplier of an in-development material: it is not in PDAM's catalog yet, so there is nothing to fill in. inline-block keeps a struck-through row from striking it. */
const NotYet = () => <span className="inline-block text-xs italic text-slate-500" title="In-development materials are not in PDAM's material catalog yet">Not in PDAM yet</span>;

/** Step 2: the master style and its sketch PDF. */
export const SketchPanel: React.FC<{ detail: StyleDetail }> = ({ detail }) => {
  const t = detail.techInput;
  const devObjects = new Set(t.developmentObjectParts.map((d) => d.devObjectId)).size;
  return (
    <div className="space-y-4">
      <div className={`${card} p-4 grid grid-cols-2 md:grid-cols-4 gap-2`}>
        <Stat label="Master style" value={t.masterStyleID} />
        <Stat label="Season" value={t.seasonYear} />
        <Stat label="Styles" value={t.styleIds?.length ?? 0} />
        <Stat label="Dev objects" value={devObjects} />
      </div>
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 text-sm">
          <span className="font-semibold text-slate-800">{t.documentTitle ?? 'Technical sketch'}</span>
          {detail.hasSketch && (
            <a href={harvestApi.fileUrl(detail.ref, 'sketch.pdf')} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900">
              <ExternalLink className="w-3.5 h-3.5" /> Open in a new tab
            </a>
          )}
        </div>
        {detail.hasSketch ? (
          <iframe title="Sketch PDF" src={harvestApi.fileUrl(detail.ref, 'sketch.pdf')} className="w-full h-[620px] bg-slate-100" />
        ) : (
          <div className="p-4"><Note>No sketch PDF is stored with this style.</Note></div>
        )}
      </div>
    </div>
  );
};

/** Step 3: the harvested data (tech-engine-input.json): parts, then each dev object's materials. */
export const InputPanel: React.FC<{ detail: StyleDetail }> = ({ detail }) => {
  const t = detail.techInput;
  const parts = useMemo(() => new Map(t.parts.map((p) => [p.partId, p])), [t]);
  // Same rule as the BOM step: one entry per dev object id (the last copy), entries without an id are ignored.
  const devObjects = useMemo(
    () => [...new Map(t.developmentObjectParts.filter((d) => d?.devObjectId).map((d) => [d.devObjectId, d])).values()],
    [t]
  );

  return (
    <div className="space-y-4">
      <div className={`${card} overflow-x-auto`}>
        <div className="px-4 py-2 text-sm font-semibold text-slate-800 border-b border-slate-100">Parts ({t.parts.length})</div>
        {t.parts.length ? (
          <table className="w-full">
            <thead className="bg-slate-50"><tr><th className={th}>Part</th><th className={th}>Type</th><th className={th}>Placement</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {t.parts.map((p) => (
                <tr key={p.partId}><td className={td}>{p.name}</td><td className={td}>{p.partType}</td><td className={td}>{p.placement}</td></tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4"><Note>No parts: the plugin data was never saved on this sketch, so there is nothing to build a BOM from.</Note></div>
        )}
      </div>

      {devObjects.map((d) => (
        <div key={d.devObjectId} className={`${card} overflow-x-auto`}>
          <div className="px-4 py-2 text-sm border-b border-slate-100">
            <span className="font-semibold text-slate-800">{d.devObjectId}</span>
            {d.name && <span className="text-slate-500"> · {d.name}</span>}
          </div>
          {(d.parts ?? []).some((p) => p.materials?.length) ? (
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className={th}>Part</th><th className={th}>Material</th><th className={th}>Article #</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(d.parts ?? []).flatMap((p) =>
                  (p.materials ?? []).map((m, i) => (
                    <tr key={`${p.partId}-${i}`}>
                      <td className={td}>{parts.get(p.partId)?.name ?? p.partId}</td>
                      <td className={`${td} text-slate-900`}>{m.materialName}{m.isInDevelopment && <InDev />}</td>
                      <td className={`${td} font-mono`}>{m.articleNumber || <Blank />}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <div className="p-4"><Note>No materials are assigned to this dev object yet.</Note></div>
          )}
        </div>
      ))}

      <details className={`${card} p-4`}>
        <summary className="text-sm font-medium text-slate-700 cursor-pointer">Show the raw tech-engine-input.json</summary>
        <div className="mt-3 space-y-2">
          <div className="flex justify-end"><CopyButton text={JSON.stringify(t, null, 2)} /></div>
          <Json value={t} height="max-h-[520px]" />
        </div>
      </details>
    </div>
  );
};

interface AiInfo {
  available: boolean;
  model?: string;
  provider?: AiProviderId;
  keySource?: 'env' | 'session' | 'saved';
}

const providerLabel = (id?: AiProviderId) => AI_PROVIDERS.find((p) => p.id === id)?.label ?? 'the provider';

const FIELDS: { key: keyof FlexRow; label: string }[] = [
  // OmniThink's column order (BOM.csv)
  { key: 'section', label: 'Section' },
  { key: 'standardPlacement', label: 'Standard placement' },
  { key: 'placement', label: 'Placement' },
  { key: 'supplierArticle', label: 'Supplier article' },
  { key: 'supplierName', label: 'Supplier' },
  { key: 'materialName', label: 'Material' },
  { key: 'omniMatchScore', label: 'Score' }
];

const Changed: React.FC<{ from: unknown; to: unknown }> = ({ from, to }) => (
  <span className="inline-flex flex-wrap items-baseline gap-1 bg-yellow-100 ring-1 ring-yellow-300 rounded px-1">
    <span className="line-through text-slate-500">{String(from ?? '') || '(empty)'}</span>
    <span className="font-semibold text-slate-900">{String(to ?? '')}</span>
  </span>
);

/** PDAM catalog lookup (fills supplier, article, section) and, separately, the optional AI suggestions with changes highlighted. */
const CatalogPanel: React.FC<{
  env: Env;
  connected: boolean;
  ai?: AiInfo;
  styleRef: string;
  devObjectId: string;
  /** what is applied to the BOM, payload and PDF so far; the lookup applies on its own, AI picks only when ticked */
  enrichment: Enrichment;
  onEnrichment: (e: Enrichment) => void;
  /** the loaded enriched view, used to report how many rows past corrections matched */
  view?: EnrichedView | null;
  /** per payload row: still in development (processed like the others, shown struck through) */
  inDev?: boolean[];
}> = ({ env, connected, ai, styleRef, devObjectId, enrichment, onEnrichment, view, inDev }) => {
  const [rows, setRows] = useState<CatalogRow[] | null>(null);
  const [suggest, setSuggest] = useState<AiResult | null>(null);
  const [busy, setBusy] = useState<'catalog' | 'ai' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  /** the log's last seq when Ask AI was clicked: the log shows only what came after; null before any run */
  const [since, setSince] = useState<number | null>(null);
  const log = useAiLog(busy === 'ai' || logOpen);
  const plan = useAiPlan();
  const now = useNow(busy === 'ai');
  const live = busy === 'ai' ? log.running[0] : undefined;

  // A different dev object or style means different rows: drop what was shown for the previous one.
  React.useEffect(() => { setRows(null); setSuggest(null); setError(null); }, [styleRef, devObjectId, env]);

  const run = async (kind: 'catalog' | 'ai') => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'catalog') {
        setSuggest(null);
        setRows((await harvestApi.catalog(env, styleRef, devObjectId)).rows);
        onEnrichment({ ...enrichment, lookup: true, ai: [] }); // the lookup is applied to the BOM, payload and PDF straight away; earlier AI picks no longer fit
      } else {
        setSuggest(await harvestApi.ai(env, styleRef, devObjectId));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const askAi = async () => {
    setSince(await log.reload().catch(() => log.last));
    void run('ai');
  };
  const canAsk = Boolean(ai?.available) && Boolean(rows) && busy === null;
  const whyNot = busy !== null ? null : !rows ? 'Run step 2 first: the model chooses among its candidates.' : !ai?.available ? 'Off: add a key in Settings (top bar).' : null;
  const resultLine = suggest && busy !== 'ai' && suggest.ms !== undefined
    ? `Answered by ${suggest.model} via ${suggest.provider} in ${(suggest.ms / 1000).toFixed(1)} s · ${suggest.suggestions.length} suggestion${suggest.suggestions.length === 1 ? '' : 's'}, ${suggest.declined} none of the candidates${suggest.triedFirst?.length ? ` · first tried ${suggest.triedFirst.map((t) => `${t.provider} ${t.model} (failed after ${(t.ms / 1000).toFixed(1)} s)`).join(', ')}` : ''}`
    : null;

  const byIndex = new Map((suggest?.suggestions ?? []).map((s) => [s.index, s]));
  const rowsByIndex = new Map((rows ?? []).map((r) => [r.index, r]));
  const sentRows: ({ kind: 'suggestion'; index: number; s: AiSuggestion } | { kind: 'none'; index: number; reason: string })[] = suggest
    ? [
        ...suggest.suggestions.map((s) => ({ kind: 'suggestion' as const, index: s.index, s })),
        ...(suggest.declinedRows ?? []).filter((d) => !byIndex.has(d.index)).map((d) => ({ kind: 'none' as const, index: d.index, reason: d.reason }))
      ].sort((x, y) => x.index - y.index)
    : [];
  const picked = (index: number) => enrichment.ai.some((p) => p.index === index);
  const togglePick = (s: AiSuggestion, on: boolean) =>
    onEnrichment({
      ...enrichment,
      ai: on ? [...enrichment.ai.filter((p) => p.index !== s.index), { index: s.index, candidate: s.candidate, confidence: s.confidence }] : enrichment.ai.filter((p) => p.index !== s.index)
    });
  const resolved = rows?.filter((r) => r.chosen !== null).length ?? 0;

  const historyInfo = enrichment.history ? historyText(view?.flexPayload._sketch?.enrichment?.history) : null;

  return (
    <div className="space-y-3">
      <div>
        <div className="text-base font-semibold text-slate-900">Enrichment</div>
        <div className="text-xs text-slate-600">Past corrections beat the catalog lookup; AI suggestions apply only when ticked.</div>
      </div>

      <div className={`${card} p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-800">1 Apply historical corrections</div>
            <div className="text-xs text-slate-500">Reuses what people corrected before for the same material and article. Needs no connection to PDAM. Applied to the BOM, the payload and the PDF straight away.</div>
          </div>
          <button
            onClick={() => onEnrichment({ ...enrichment, history: !enrichment.history })}
            aria-pressed={enrichment.history}
            className={`px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer ${enrichment.history ? 'text-slate-800 bg-white border border-slate-300 hover:bg-slate-50' : 'text-white bg-slate-900 hover:bg-slate-800'}`}
          >
            {enrichment.history ? 'Switch off' : 'Apply historical corrections'}
          </button>
        </div>
        {enrichment.history && (
          <div className="mt-2 text-xs text-slate-600" aria-live="polite">{historyInfo ?? 'Checking past corrections...'}</div>
        )}
      </div>

    <div className={`${card} p-4 space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-800">2 Apply PDAM lookup</div>
          <div className="text-xs text-slate-500">Fills supplier, article number, section and a match score from PDAM's Material documents. No AI. Applied to the BOM, the payload and the PDF as soon as it runs.</div>
        </div>
        <button
          onClick={() => run('catalog')}
          disabled={!connected || busy !== null}
          title={connected ? undefined : `Connect to ${env} first`}
          className="px-3 py-1.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-md cursor-pointer disabled:cursor-not-allowed"
        >
          {busy === 'catalog' ? 'Looking up...' : rows ? 'Look up again' : 'Look up in PDAM'}
        </button>
      </div>
      {!connected && <Note>Connect to {env} (step 1) to look rows up in its catalog.</Note>}
      {error && <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}

      {rows && (
        <>
          <div className="text-xs text-slate-600">{resolved} of {rows.length} rows resolved. Changed cells are highlighted; the old value is struck through.</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className={th}>#</th>{FIELDS.map((f) => <th key={f.key} className={th}>{f.label}</th>)}<th className={th}>Matched by</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.index} className={inDev?.[r.index] ? 'line-through text-slate-500' : undefined} title={inDev?.[r.index] ? 'In development: processed like the other rows' : undefined}>
                    <td className={td}>{r.index + 1}</td>
                    {FIELDS.map((f) => (
                      <td key={f.key} className={td}>
                        {r.row[f.key] !== r.baseline[f.key] ? <Changed from={r.baseline[f.key]} to={r.row[f.key]} /> : (r.row[f.key] as string) || (f.key === 'supplierName' && inDev?.[r.index] ? <NotYet /> : <Blank />)}
                      </td>
                    ))}
                    <td className={td}>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${r.matchedBy === 'article' ? 'bg-emerald-100 text-emerald-800' : r.matchedBy === 'name' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                        {r.matchedBy === 'none' ? (r.candidates.length ? `${r.candidates.length} candidates` : 'no match') : r.matchedBy}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </>
      )}
    </div>

    <div className={`${card} p-4 space-y-3`} aria-labelledby="ai-card-title">
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h4 id="ai-card-title" className="text-sm font-semibold text-slate-800">3 Apply AI matching</h4>
              <span className="text-xs text-slate-500 border border-slate-200 rounded-full px-2 py-0.5">Optional · suggestions only</span>
            </div>
            <p className="text-xs text-slate-600">
              The model may only choose among the candidates above for rows that are not an exact match. It sends those rows' material names, articles and candidates to the provider that answers{ai?.provider === 'openrouter' ? ' (and the model provider behind OpenRouter)' : ''}.
            </p>
            <p className="text-xs text-slate-600">
              <span className="font-medium text-slate-700">Will use:</span> {plan ?? 'checking Settings...'}.{' '}
              <a href="#/settings" onClick={(e) => { e.preventDefault(); window.location.hash = '#/settings'; }} className="underline hover:text-slate-900 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">Keys, models and order in Settings</a>
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={askAi}
                disabled={!canAsk}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-md cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
              >
                {busy === 'ai' && <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                {busy === 'ai' ? 'Asking AI...' : 'Ask AI'}
              </button>
              {whyNot && <span className="text-xs text-slate-600">{whyNot}</span>}
            </div>
            <div role="status" className="text-xs text-slate-700 font-mono min-h-[1rem]">
              {busy === 'ai' && (live ? runningText(live, now) : 'Waiting for the server...')}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              {resultLine && <span>{resultLine}</span>}
              <button
                type="button"
                onClick={() => setLogOpen((o) => !o)}
                aria-expanded={logOpen}
                aria-controls="ai-card-log"
                className="underline hover:text-slate-900 cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                {logOpen ? 'Hide log' : 'Show log'}
              </button>
            </div>
            {logOpen && (
              <div id="ai-card-log" className="space-y-1">
                {since === null && !log.unavailable && <div className="text-xs text-slate-500">Showing recent activity</div>}
                <AiLogView events={log.events} running={log.running} since={since ?? undefined} unavailable={log.unavailable} onClear={log.clear} label="AI log for matching" />
              </div>
            )}
            {suggest && (
              <div className="space-y-2">
                {!suggest.declinedRows && (
                  <div className="text-xs text-slate-600">
                    Asked about {suggest.asked} row{suggest.asked === 1 ? '' : 's'}; {suggest.suggestions.length} suggestion{suggest.suggestions.length === 1 ? '' : 's'}, {suggest.declined} judged as none of the candidates{suggest.unanswered ? `, ${suggest.unanswered} not answered by the model (press Ask AI again)` : ''}.
                  </div>
                )}
                {suggest.declinedRows && suggest.unanswered ? <div className="text-xs text-slate-600">{suggest.unanswered} not answered by the model (press Ask AI again).</div> : null}
                <div className="text-xs text-slate-600">A suggestion changes the BOM, the payload and the PDF only once you tick it.</div>
                {sentRows.length > 0 && (
                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <caption className="sr-only">Rows sent to the model, in row order: suggestions to tick, and rows with no change and why</caption>
                    <thead className="bg-slate-50"><tr><th className={th}>Apply</th><th className={th}>#</th>{FIELDS.map((f) => <th key={f.key} className={th}>{f.label}</th>)}<th className={th}>Why</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {sentRows.map((e) => e.kind === 'suggestion' ? (
                        <tr key={e.index} className={`${picked(e.index) ? 'bg-emerald-50' : ''} ${inDev?.[e.index] ? 'line-through text-slate-500' : ''}`}>
                          <td className={td}>
                            <input type="checkbox" aria-label={`Apply the suggestion for row ${e.index + 1}`} checked={picked(e.index)} onChange={(ev) => togglePick(e.s, ev.target.checked)} />
                          </td>
                          <td className={td}>{e.index + 1}</td>
                          {FIELDS.map((f) => (
                            <td key={f.key} className={td}>
                              {e.s.changed.includes(f.key) ? <Changed from={e.s.from[f.key]} to={e.s.to[f.key]} /> : (e.s.to[f.key] as string) || <Blank />}
                            </td>
                          ))}
                          <td className={`${td} text-xs text-slate-600`}>{e.s.reason}</td>
                        </tr>
                      ) : (
                        <tr key={e.index} className={`text-slate-500 ${inDev?.[e.index] ? 'line-through' : ''}`}>
                          <td className={`${td} text-xs`}>No change</td>
                          <td className={td}>{e.index + 1}</td>
                          {FIELDS.map((f) => (
                            <td key={f.key} className={td}>{(rowsByIndex.get(e.index)?.row[f.key] as string) || <Blank />}</td>
                          ))}
                          <td className={`${td} text-xs text-slate-600`}>{e.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            )}
          </div>
    </div>
    </div>
  );
};

const hasEnrichment = (e: Enrichment) => e.lookup || e.history || e.ai.length > 0 || Boolean(e.edits);

/** Step 4: per dev object, the BOM on the left and the Flex payload (or BOM JSON) on the right, with the PDAM lookup and AI below. */
export const BomPanel: React.FC<{
  boms: DevObjectBom[];
  styleRef: string;
  loading: boolean;
  env: Env;
  connected: boolean;
  ai?: AiInfo;
  activeId: string | null;
  onActive: (id: string) => void;
  enrichment: Record<string, Enrichment>;
  onEnrichment: (key: string, e: Enrichment) => void;
}> = ({ boms, styleRef, loading, env, connected, ai, activeId, onActive, enrichment, onEnrichment }) => {
  const active = boms.find((b) => b.devObjectId === activeId) ?? boms[0];
  const [jsonTab, setJsonTab] = useState<'flex' | 'bom'>('flex');
  const current = active ? enrichment[enrichmentKey(styleRef, active.devObjectId)] ?? NO_ENRICHMENT : NO_ENRICHMENT;

  // The BOM, payload and PDF all come from the same enriched view, which the server builds from the lookup and the ticked AI picks.
  const [view, setView] = useState<EnrichedView | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const requestId = useRef(0);
  const activeDevId = active?.devObjectId;
  const enrichmentSignature = JSON.stringify(current);
  useEffect(() => {
    const mine = ++requestId.current;
    setViewError(null);
    if (!activeDevId || !hasEnrichment(current)) {
      setView(null);
      return;
    }
    harvestApi
      .enriched(env, styleRef, activeDevId, current)
      .then((v) => mine === requestId.current && setView(v))
      .catch((e) => {
        if (mine !== requestId.current) return;
        setView(null);
        setViewError((e as Error).message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, styleRef, activeDevId, enrichmentSignature]);

  if (loading) return <div className="text-sm text-slate-500">Building BOMs...</div>;
  if (!active) return <Note>This style has no dev objects, so there are no BOMs or Flex payloads.</Note>;

  const shownBom = view?.bom ?? active.bom;
  const shownPayload = view?.flexPayload ?? active.flexPayload;
  const payload = JSON.stringify(jsonTab === 'flex' ? shownPayload : shownBom, null, 2);
  const download = () => {
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${jsonTab === 'flex' ? 'flex-payload' : 'bom'}_${active.devObjectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
            {b.devObjectId} <span className="opacity-70">· {b.bom.bomRows.length} {b.bom.bomRows.length === 1 ? 'row' : 'rows'}</span>
          </button>
        ))}
      </div>

      {hasEnrichment(current) && (
        <div className="flex flex-wrap items-center gap-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-md px-3 py-2">
          <span>
            <b>Enriched:</b> {sourcesText(current)} applied to the BOM, the payload and the PDF below.
          </span>
          <button className="underline hover:text-emerald-950 cursor-pointer" onClick={() => onEnrichment(enrichmentKey(styleRef, active.devObjectId), NO_ENRICHMENT)}>Clear</button>
        </div>
      )}
      {viewError && <div role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{viewError}</div>}

      {active.warnings.map((w) => <Note key={w}>{w}</Note>)}

      <div className="grid grid-cols-1 gap-4 items-start">
        <div className={`${card} overflow-x-auto`}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 text-sm">
            <span className="font-semibold text-slate-800">
              BOM · {shownBom.bomRows.length} rows
              <span
                className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${active.confirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                title={active.confirmed ? "Listed by PDAM's style data" : "Not listed by PDAM's style data, so it would be held back from Flex"}
              >
                {active.confirmed ? 'confirmed in PDAM' : 'not confirmed'}
              </span>
            </span>
            <span className="text-xs text-slate-500">Next step: BOM PDF, built from this</span>
          </div>
          {shownBom.bomRows.length === 0 && <div className="p-4"><Note>No materials recorded for this dev object.</Note></div>}
          {shownBom.bomRows.length > 0 && (
            <table className="w-full min-w-[56rem]">
              <thead className="bg-slate-50">
                <tr><th className={`${th} w-20`}>Section</th><th className={`${th} w-32`}>Standard placement</th><th className={`${th} w-32`}>Placement</th><th className={`${th} w-44`}>Supplier article</th><th className={`${th} w-40`}>Supplier</th><th className={th}>Material</th><th className={`${th} w-20`}>Score</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shownBom.bomRows.map((r, i) => (
                  <tr key={i} className={r.isInDevelopment ? 'line-through text-slate-500' : r.enrichedBy ? 'bg-emerald-50/50' : undefined} title={r.isInDevelopment ? 'In development: processed like the other rows' : undefined}>
                    <td className={td}><span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">{r.section}</span></td>
                    <td className={td}>{r.standardPlacement || <Blank />}</td>
                    <td className={td}>{r.placement}</td>
                    <td className={`${td} font-mono`}>{r.articleNumber || <Blank />}</td>
                    <td className={td}>{r.supplierName || (r.isInDevelopment ? <NotYet /> : <Blank />)}</td>
                    <td className={`${td} text-slate-900`}>{r.materialName}{r.isInDevelopment && <InDev />}</td>
                    <td className={td}>
                      {r.omniMatchScore ? <>{r.omniMatchScore}{r.enrichedBy && <span className="ml-1 text-xs text-emerald-800">{r.enrichedBy === 'ai' ? 'AI' : r.enrichedBy === 'history' ? 'history' : r.enrichedBy === 'edit' ? 'edit' : 'PDAM'}</span>}</> : <Blank />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100">
            Supplier, article, section and score appear once an enrichment step below has run (and for AI suggestions you tick). Usage, price and colourways are not in this data.
          </div>
        </div>

        <div className={`${card} p-4 space-y-2`}>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1" role="tablist" aria-label="JSON view">
              {([['flex', 'Flex payload (draft)'], ['bom', 'BOM JSON']] as const).map(([id, name]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={jsonTab === id}
                  onClick={() => setJsonTab(id)}
                  title={id === 'flex' ? 'Flex has not confirmed this format: its consumer requires fields such as styleId that are not here yet' : 'The BOM rows, in-development ones included'}
                  className={`px-2.5 py-1 text-xs rounded-md cursor-pointer ${jsonTab === id ? 'bg-slate-900 text-white font-semibold' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <CopyButton text={payload} />
              <button onClick={download} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          </div>
          <Json value={jsonTab === 'flex' ? shownPayload : shownBom} height="max-h-[520px]" />
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">What in this draft is confirmed?</summary>
            <div className="mt-2 space-y-2">
              <p>
                <span className="font-semibold">Matches OmniTechPack's real output for MASCL2A-01:</span> the header, <code>parentId</code> (the PDAM
                document id), <code>type</code>, <code>devObjectId</code> (it replaces <code>styleId</code>), <code>seasonCode</code>,{' '}
                <code>errorCode</code>, <code>message</code> and the row fields; in-development materials are left out.
              </p>
              <p>
                <span className="font-semibold">Plugin values, unconverted:</span> <code>standardPlacement</code> and <code>section</code> are sent as the
                plugin stored them (for example CONT1, L1). OmniTechPack's output spells them differently ("Contrast 1"); where that mapping comes from
                is not known yet, so nothing is converted. Their payload carries no <code>styleId</code>, and the stage Flex consumer rejected it for
                that, so the final format needs Flex's confirmation.
              </p>
              <p>
                <span className="font-semibold">Not filled yet:</span> <code>supplierName</code> is empty and <code>supplierArticle</code> is the
                plugin's article number; the catalog lookup below can fill them from PDAM's Material documents. <code>omniMatchScore</code> is "100%" for
                plugin rows, and <code>_sketch.source_sha256</code> needs the sketch PDF.
              </p>
            </div>
          </details>
        </div>
      </div>

      <CatalogPanel env={env} connected={connected} ai={ai} styleRef={styleRef} devObjectId={active.devObjectId} enrichment={current} view={view} inDev={active.bom.bomRows.map((r) => !!r.isInDevelopment)} onEnrichment={(e) => onEnrichment(enrichmentKey(styleRef, active.devObjectId), e)} />
    </div>
  );
};

/**
 * Step 5: the BOM PDF, built on the spot from everything the previous step holds: the BOM rows plus the PDAM lookup and the AI
 * suggestions that were ticked. Nothing is read from a saved PDF; it is rebuilt every time this step opens or the data changes.
 */
export const PdfPanel: React.FC<{
  boms: DevObjectBom[];
  styleRef: string;
  loading: boolean;
  env: Env;
  activeId: string | null;
  onActive: (id: string) => void;
  enrichment: Record<string, Enrichment>;
}> = ({ boms, styleRef, loading, env, activeId, onActive, enrichment }) => {
  const active = boms.find((b) => b.devObjectId === activeId) ?? boms[0];
  const current = active ? enrichment[enrichmentKey(styleRef, active.devObjectId)] ?? NO_ENRICHMENT : NO_ENRICHMENT;
  const [url, setUrl] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withAi, setWithAi] = useState(true);
  const requestId = useRef(0);
  const devId = active?.devObjectId;
  const hasRows = (active?.bom.bomRows.length ?? 0) > 0;
  const signature = JSON.stringify(current);
  const hasAi = current.ai.length > 0;
  const includeAi = hasAi && withAi;

  useEffect(() => {
    const mine = ++requestId.current;
    setError(null);
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    if (!devId || !hasRows) return;
    setBuilding(true);
    harvestApi
      .bomPdf(env, styleRef, devId, current, includeAi)
      .then((blob) => {
        if (mine === requestId.current) setUrl(URL.createObjectURL(blob));
      })
      .catch((e) => mine === requestId.current && setError((e as Error).message))
      .finally(() => mine === requestId.current && setBuilding(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, styleRef, devId, hasRows, signature, includeAi]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  if (loading) return <div className="text-sm text-slate-500">Building BOMs...</div>;
  if (!active) return <Note>This style has no dev objects, so there is no BOM PDF.</Note>;
  const applied = sourcesText(current, includeAi ? current.ai.length : 0);

  return (
    <div className="space-y-3">
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
      </div>
      <div className="text-xs text-slate-600">
        Built from the previous step's data:{' '}
        <b>{applied ? `${applied} applied` : 'plain plugin data (nothing applied yet)'}</b>.
        Go back to change it; this PDF is rebuilt every time.
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="AI picks in the PDF" title={hasAi ? undefined : 'This dev object has no AI picks, so the switch makes no difference'}>
        {([[true, 'With AI picks'], [false, 'Without AI picks']] as const).map(([val, name]) => (
          <button
            key={name}
            disabled={!hasAi}
            aria-pressed={includeAi === val}
            onClick={() => setWithAi(val)}
            className={`px-3 py-1.5 rounded-md text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${includeAi === val ? 'bg-slate-900 text-white font-semibold' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            {name}
          </button>
        ))}
        {!hasAi && <span className="text-xs text-slate-500">No AI picks for this dev object.</span>}
      </div>
      {error && <div role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</div>}
      {!hasRows && <Note>This dev object has no BOM rows, so there is no PDF to make.</Note>}
      {hasRows && (
        <div className={`${card} overflow-hidden`}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 text-sm">
            <span className="font-semibold text-slate-800">BOM PDF · {active.devObjectId}{building ? ' · building...' : ''}</span>
            <div className="flex items-center gap-2">
              <a
                href={url ?? undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!url}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md ${url ? 'text-slate-700 bg-white hover:bg-slate-50' : 'text-slate-400 pointer-events-none'}`}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in a new tab
              </a>
              <a
                href={url ?? undefined}
                download={`BOM_${active.devObjectId}.pdf`}
                aria-disabled={!url}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md ${url ? 'text-slate-700 bg-white hover:bg-slate-50' : 'text-slate-400 pointer-events-none'}`}
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>
          </div>
          {url ? (
            <iframe title={`BOM PDF ${active.devObjectId}`} src={url} className="w-full h-[640px] bg-slate-100" />
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-slate-500">{building ? 'Building the PDF...' : 'No PDF yet.'}</div>
          )}
        </div>
      )}
    </div>
  );
};
