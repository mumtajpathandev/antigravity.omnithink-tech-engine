import React, { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import { harvestApi, loadSettingsOnce } from '../api';
import { AiLogView } from '../AiLog';
import { runningText, useAiLog, useNow } from '../aiLogHooks';
import { METHOD_LABEL, aiExplanation, aiPageRows, headerEntries, kindCounts, latestResult, methodOf, modelPages, needsAiMessage, prettyKey, reconSummary, viaLabel } from './readPdfLogic';
import type { MethodKey } from './readPdfLogic';
import type { DevObjectBom, PdfLegendEntry, PdfLegendPage, PdfRead, ReconciledRow, StyleDetail } from '../types';

const card = 'bg-white rounded-lg border border-slate-200 shadow-xs';
const th = 'px-3 py-2 text-left text-xs font-semibold text-slate-500';
const td = 'px-3 py-1.5 text-sm align-top';

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md">{children}</div>
);
const Blank = () => <span className="text-slate-400" aria-label="none">-</span>;

// ---------- small views ----------

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const Badge: React.FC<{ tone: 'green' | 'amber' | 'slate' | 'blue' | 'violet'; children: React.ReactNode }> = ({ tone, children }) => {
  const cls = {
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-sky-100 text-sky-800',
    violet: 'bg-violet-100 text-violet-800'
  }[tone];
  return <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${cls}`}>{children}</span>;
};

const MethodBadge: React.FC<{ method: MethodKey }> = ({ method }) => (
  <Badge tone={method === 'template' ? 'green' : method === 'rules' ? 'blue' : method === 'model' ? 'violet' : 'amber'}>{METHOD_LABEL[method]}</Badge>
);

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="px-3 py-2 rounded-md bg-slate-50 border border-slate-100 min-w-0">
    <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
    <div className="text-sm font-bold text-slate-900 break-words">{value === '' || value == null ? '-' : value}</div>
  </div>
);

const Cell: React.FC<{ v: string | null | undefined }> = ({ v }) => (v ? <>{v}</> : <Blank />);

const EntriesTable: React.FC<{ entries: PdfLegendEntry[]; badge?: string; caption: string }> = ({ entries, badge, caption }) => (
  <div className="overflow-x-auto border border-slate-200 rounded-md">
    <table className="w-full min-w-[34rem]">
      <caption className="sr-only">{caption}</caption>
      <thead className="bg-slate-50">
        <tr>
          <th scope="col" className={th}>Heading</th>
          <th scope="col" className={th}>Material</th>
          <th scope="col" className={th}>Supplier</th>
          <th scope="col" className={th}>Article</th>
          <th scope="col" className={th}>Width</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {entries.map((e, i) => (
          <tr key={i}>
            <td className={td}>{e.heading || <Blank />}</td>
            <td className={td}>
              {e.material || <Blank />}
              {badge && <span className="ml-1.5"><Badge tone="violet">{badge}</Badge></span>}
            </td>
            <td className={td}><Cell v={e.supplier} /></td>
            <td className={`${td} font-mono text-xs`}><Cell v={e.article} /></td>
            <td className={td}><Cell v={e.width} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ---------- the screen ----------

/** Pages that still have no entries, each with the reason, so nothing unread is left unexplained. */
const UnreadList: React.FC<{ items?: { page: number; reason: string }[] }> = ({ items }) =>
  items && items.length > 0 ? (
    <div role="status" className="p-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md space-y-1">
      <div className="font-semibold">Not read ({items.length} page{items.length === 1 ? '' : 's'}) and why:</div>
      <ul className="list-disc pl-5">
        {items.map((u) => <li key={u.page}>Page {u.page}: {u.reason}</li>)}
      </ul>
    </div>
  ) : null;

export const ReadPdfPanel: React.FC<{
  detail: StyleDetail;
  styleRef: string;
  boms: DevObjectBom[];
  activeId: string | null;
  onActive: (id: string) => void;
  aiAvailable: boolean;
  aiLabel?: string;
}> = ({ detail, styleRef, boms, activeId, onActive, aiAvailable, aiLabel }) => {
  const [pdfOpen, setPdfOpen] = useState(false);
  const devId = activeId ?? boms[0]?.devObjectId ?? null;
  const active = boms.find((b) => b.devObjectId === devId) ?? boms[0];

  const [base, setBase] = useState<PdfRead | null>(null);
  const [baseLoading, setBaseLoading] = useState(false);
  const [baseError, setBaseError] = useState<string | null>(null);
  const [aiRes, setAiRes] = useState<PdfRead | null>(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [compareRead, setCompareRead] = useState(true); // testing: the AI also reads pages already read, to compare
  useEffect(() => {
    void loadSettingsOnce().then((s) => s && setCompareRead(s.ai.compareReadDefault));
  }, []);
  const baseSeq = useRef(0);
  const aiSeq = useRef(0);
  const freshNext = useRef(false); // the next reading ignores the saved one
  const [readNonce, setReadNonce] = useState(0);

  useEffect(() => {
    // new dev object or style: drop everything from the previous one and ignore its late answers
    const seq = ++baseSeq.current;
    aiSeq.current++;
    setBase(null);
    setAiRes(null);
    setAiError(null);
    setAiRunning(false);
    setBaseError(null);
    if (!devId) {
      setBaseLoading(false);
      return;
    }
    setBaseLoading(true);
    const fresh = freshNext.current;
    freshNext.current = false;
    harvestApi
      .pdfRead(styleRef, devId, fresh)
      .then((r) => {
        if (seq === baseSeq.current) setBase(r);
      })
      .catch((e) => {
        if (seq === baseSeq.current) setBaseError(errText(e));
      })
      .finally(() => {
        if (seq === baseSeq.current) setBaseLoading(false);
      });
  }, [styleRef, devId, readNonce]);

  const readAgain = () => {
    freshNext.current = true;
    setReadNonce((n) => n + 1);
  };

  const [logOpen, setLogOpen] = useState(false);
  const [logSince, setLogSince] = useState<number | null>(null);
  const aiLog = useAiLog(aiRunning || logOpen);
  const aiNow = useNow(aiRunning);

  const runAi = async (fresh = false) => {
    if (!devId) return;
    setAiRunning(true);
    setLogSince(await aiLog.reload());
    const seq = ++aiSeq.current;
    const key = baseSeq.current;
    setAiRunning(true);
    setAiError(null);
    harvestApi
      .pdfReadAi(styleRef, devId, compareRead, fresh)
      .then((r) => {
        if (seq === aiSeq.current && key === baseSeq.current) setAiRes(r);
      })
      .catch((e) => {
        if (seq === aiSeq.current && key === baseSeq.current) setAiError(errText(e));
      })
      .finally(() => {
        if (seq === aiSeq.current && key === baseSeq.current) setAiRunning(false);
      });
  };

  const latest = latestResult(base, aiRes);
  const sum = reconSummary(latest);
  const aiMsg = needsAiMessage(base?.needsAi);
  const aiPages = aiPageRows(aiRes);
  const aiAdded = modelPages(aiRes);

  return (
    <div className="space-y-4">
      {/* 1. the PDF */}
      <section className={`${card} p-4`} aria-label="Sketch PDF">
        {detail.hasSketch === false ? (
          <p className="text-sm text-slate-600">This style has no sketch PDF.</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setPdfOpen((o) => !o)}
              aria-expanded={pdfOpen}
              aria-controls="sketch-pdf-viewer"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              {pdfOpen ? 'Close the sketch PDF' : 'Open the sketch PDF'}
            </button>
            {pdfOpen && (
              <iframe
                id="sketch-pdf-viewer"
                title="Sketch PDF"
                src={harvestApi.fileUrl(styleRef, 'sketch.pdf')}
                className="mt-3 w-full h-[640px] rounded-md border border-slate-200"
              />
            )}
          </>
        )}
      </section>

      {/* 2. dev object tabs */}
      {boms.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Development objects">
          {boms.map((b) => {
            const on = b.devObjectId === active?.devObjectId;
            return (
              <button
                key={b.devObjectId}
                type="button"
                onClick={() => onActive(b.devObjectId)}
                aria-pressed={on}
                className={`px-3 py-1.5 text-sm rounded-md border focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  on ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {b.devObjectId}
              </button>
            );
          })}
        </div>
      ) : (
        <Note>This style has no development objects, so there is nothing to compare the PDF with.</Note>
      )}

      {/* 3a. part 1 */}
      <section className={`${card} p-4 space-y-4`} aria-labelledby="part1-title" aria-busy={baseLoading}>
        <div>
          <h3 id="part1-title" className="text-sm font-bold text-slate-900">Part 1: Read without AI</h3>
          <p className="text-xs text-slate-500 mt-0.5">Runs on its own. Nothing leaves this computer.</p>
          {base?.cache && (
            <p className="text-xs text-slate-600 mt-1">
              {base.cache.hit ? `Saved reading of this exact PDF, made ${new Date(base.cache.savedAt).toLocaleString()}: nothing was read again.` : 'Read just now and saved: the same PDF will not be read again.'}{' '}
              <button type="button" onClick={readAgain} disabled={baseLoading} className="underline hover:text-slate-900 disabled:opacity-50 cursor-pointer">Read again</button>
            </p>
          )}
        </div>

        {baseLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-600" role="status">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Reading the PDF...
          </div>
        )}
        {baseError && <div role="alert" className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">Could not read the PDF: {baseError}</div>}

        {base && (
          <>
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-1.5">PDF profile</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label="Pages" value={base.pdf?.pages} />
                {kindCounts(base.pdf?.kinds).map((k) => (
                  <Stat key={k.kind} label={`${k.kind} pages`} value={k.count} />
                ))}
                <Stat label="Pictures on text pages" value={base.pdf?.imagesOnTextPages} />
                <Stat label="Producer" value={base.pdf?.producer} />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-1.5">Sketch header</h4>
              {headerEntries(base.header).length === 0 ? (
                <p className="text-sm text-slate-500">No header fields were found.</p>
              ) : (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  {headerEntries(base.header).map(([k, v]) => (
                    <div key={k} className="flex gap-2 min-w-0">
                      <dt className="text-slate-500 shrink-0">{prettyKey(k)}:</dt>
                      <dd className="text-slate-900 font-medium break-words min-w-0">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500">Legend pages</h4>
              {aiMsg && <Note>{aiMsg}</Note>}
              {base.legendPages.length === 0 && <p className="text-sm text-slate-500">No legend pages were found. {base.noLegendReason}</p>}
              <UnreadList items={base.unread} />
              {base.legendPages.map((p) => (
                <div key={p.page} className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">Page {p.page}</span>
                    <MethodBadge method={methodOf(p)} />
                    {p.note && <span className="text-xs text-slate-500 break-words min-w-0">{p.note}</span>}
                  </div>
                  {p.entries?.length > 0 ? (
                    <EntriesTable entries={p.entries} caption={`Entries read from page ${p.page}`} />
                  ) : (
                    <p className="text-sm text-slate-500">No entries read from this page.</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 3b. part 2 */}
      <section className={`${card} p-4 space-y-3`} aria-labelledby="part2-title" aria-busy={aiRunning}>
        <h3 id="part2-title" className="text-sm font-bold text-slate-900">Part 2: Read with AI</h3>
        {!aiRes && <p className="text-sm text-slate-700">{aiExplanation(aiLabel)}</p>}
        {!aiAvailable && (
          <Note>AI is not available: no AI provider is set up. Add one in the settings to use this step. Part 1 and the comparison below work without it.</Note>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={compareRead} onChange={(e) => setCompareRead(e.target.checked)} />
          Also read the pages already read (testing): compares what the AI finds with the no-AI result
        </label>
        <button
          type="button"
          onClick={() => runAi(false)}
          disabled={!aiAvailable || aiRunning || baseLoading || !base || !devId}
          aria-describedby={!aiAvailable ? undefined : 'part2-help'}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {aiRunning ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Sparkles className="w-4 h-4" aria-hidden="true" />}
          {aiRes ? 'Read with AI again' : 'Read with AI'}
        </button>
        <p id="part2-help" className="sr-only">Sends redacted legend page text to the AI provider.</p>
        {aiRunning && (
          <div className="flex items-center gap-2 text-sm text-slate-600" role="status">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            The AI is reading. This can take a minute or more on free models.
            {aiLog.running[0] && <span className="font-mono text-xs">{runningText(aiLog.running[0], aiNow)}</span>}
          </div>
        )}
        <div>
          <button
            type="button"
            onClick={() => setLogOpen((o) => !o)}
            aria-expanded={logOpen}
            aria-controls="part2-log"
            className="text-xs text-slate-600 underline hover:text-slate-900 cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            {logOpen ? 'Hide log' : 'Show log'}
          </button>
        </div>
        {logOpen && (
          <div id="part2-log" className="space-y-1">
            {logSince === null && !aiLog.unavailable && <div className="text-xs text-slate-500">Showing recent activity</div>}
            <AiLogView events={aiLog.events} running={aiLog.running} since={logSince ?? undefined} unavailable={aiLog.unavailable} onClear={aiLog.clear} label="AI log for the PDF reading" />
          </div>
        )}
        {aiError && <div role="alert" className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">The AI reading failed: {aiError}</div>}

        {aiRes && (
          <div className="space-y-3">
            {aiRes.ai?.cached && aiRes.ai.cached.length > 0 && (
              <p className="text-xs text-slate-600">
                {aiRes.ai.cached.length} page{aiRes.ai.cached.length === 1 ? '' : 's'} ({aiRes.ai.cached.map((c) => c.page).join(', ')}) taken from the saved AI reading of this exact PDF, made{' '}
                {new Date(aiRes.ai.cached.map((c) => c.savedAt).sort()[0]).toLocaleString()}: the model was not called for {aiRes.ai.cached.length === 1 ? 'it' : 'them'}.{' '}
                <button type="button" onClick={() => runAi(true)} disabled={aiRunning} className="underline hover:text-slate-900 disabled:opacity-50 cursor-pointer">Read again, ignoring the saved reading</button>
              </p>
            )}
            {aiRes.ai?.model && aiRes.ai.provider && (
              <p className="text-sm text-slate-700">
                Read by <span className="font-semibold">{aiRes.ai.model}</span> {aiRes.ai.provider === 'local' ? <>on this computer (local model)</> : <>via <span className="font-semibold">{aiRes.ai.provider}</span></>}.
              </p>
            )}
            {aiPages.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full min-w-[28rem]">
                  <caption className="sr-only">What the AI found per page</caption>
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className={th}>Page</th>
                      <th scope="col" className={th}>Entries found</th>
                      <th scope="col" className={th}>Rejected (value not on the page)</th>
                      <th scope="col" className={th}>Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {aiPages.map((p) => (
                      <tr key={p.page}>
                        <td className={td}>{p.page}</td>
                        <td className={td}>{p.entries}</td>
                        <td className={td}>{p.rejected}</td>
                        <td className={`${td} text-red-700 break-words`}>{p.error || <Blank />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No model was called: nothing needed AI.{' '}
                {(base?.legendPages ?? []).filter((p) => p.method).map((p) => `The legend on page ${p.page} was read without AI (${p.method}).`).join(' ')}{' '}
                {(base?.legendPages ?? []).filter((p) => !p.method && p.note).map((p) => `Page ${p.page} only mentions the legend (${p.note}).`).join(' ')}
              </p>
            )}
            <UnreadList items={aiRes.unread} />
            {(aiRes.ai?.comparison ?? []).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500">AI against the no-AI reading, page by page</h4>
                {aiRes.ai!.comparison!.map((c) => (
                  <div key={c.page} className="p-3 border border-slate-200 rounded-md space-y-1.5 text-sm">
                    <div className="font-semibold text-slate-900">
                      Page {c.page} <span className="font-normal text-slate-500">(no-AI: {c.baseMethod}, {c.baseCount} entries; AI: {c.aiCount} entries)</span>
                    </div>
                    <div className="text-slate-700">
                      {c.same} the same
                      {c.onlyAi.length ? ` · ${c.onlyAi.length} extra from the AI` : ''}
                      {c.onlyBase.length ? ` · ${c.onlyBase.length} the AI missed` : ''}
                      {c.differs.length ? ` · ${c.differs.length} with other values` : ''}
                      {c.rejected ? ` · ${c.rejected} AI entries dropped (not on the page)` : ''}
                      {!c.onlyAi.length && !c.onlyBase.length && !c.differs.length ? ' · no difference' : ''}
                    </div>
                    {c.onlyAi.length > 0 && <EntriesTable entries={c.onlyAi} badge="model" caption={`Extra entries the AI found on page ${c.page}`} />}
                    {c.onlyBase.length > 0 && <EntriesTable entries={c.onlyBase} caption={`Entries the AI missed on page ${c.page}`} />}
                    {c.differs.map((d, i) => (
                      <div key={i} className="text-xs text-slate-700 break-words">
                        {d.heading}: no-AI "{d.base.material} | {d.base.supplier ?? '-'} | {d.base.article ?? '-'}" against AI "{d.ai.material} | {d.ai.supplier ?? '-'} | {d.ai.article ?? '-'}"
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {aiAdded.map((p) => (
              <div key={p.page} className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">Page {p.page}</span>
                  <MethodBadge method="model" />
                  {p.note && <span className="text-xs text-slate-500 break-words min-w-0">{p.note}</span>}
                </div>
                <EntriesTable entries={p.entries} badge="model" caption={`Entries the AI read from page ${p.page}`} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. comparison */}
      <section className={`${card} p-4 space-y-3`} aria-labelledby="recon-title">
        <div>
          <h3 id="recon-title" className="text-sm font-bold text-slate-900">Plugin rows vs the PDF</h3>
          <p className="text-xs text-slate-500 mt-0.5">{aiRes ? 'Using the result with AI.' : 'Using the result without AI.'}</p>
        </div>
        {!latest ? (
          <p className="text-sm text-slate-500">{baseLoading ? 'Waiting for the reading...' : 'No reading yet.'}</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Matched" value={sum.matched} />
              <Stat label="Plugin only" value={sum.pluginOnly} />
              <Stat label="Only in PDF" value={sum.onlyInPdf} />
            </div>

            {latest.reconciliation.rows.length === 0 ? (
              <p className="text-sm text-slate-500">This dev object has no plugin rows.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full min-w-[40rem]">
                  <caption className="sr-only">Plugin rows compared with the PDF</caption>
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className={th}>Label</th>
                      <th scope="col" className={th}>Material</th>
                      <th scope="col" className={th}>Status</th>
                      <th scope="col" className={th}>PDF supplier</th>
                      <th scope="col" className={th}>PDF article</th>
                      <th scope="col" className={th}>Matched</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {latest.reconciliation.rows.map((r) => (
                      <tr key={r.index}>
                        <td className={td}><Cell v={r.label} /></td>
                        <td className={td}><Cell v={r.materialName} /></td>
                        <td className={td}><Badge tone={r.status === 'in PDF' ? 'green' : 'amber'}>{r.status === 'in PDF' ? 'in PDF' : 'plugin only'}</Badge></td>
                        <td className={td}><Cell v={r.entry?.supplier} /></td>
                        <td className={`${td} font-mono text-xs`}><Cell v={r.entry?.article} /></td>
                        <td className={td}>{viaLabel(r) || <Blank />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-1">Only in the PDF</h4>
              <p className="text-sm text-slate-600 mb-2">
                The plugin stays authoritative. These legend entries have no matching plugin row; they are shown for review and are not added to the BOM.
              </p>
              {latest.reconciliation.onlyInPdf.length === 0 ? (
                <p className="text-sm text-slate-500">Every legend entry matches a plugin row.</p>
              ) : (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                  {latest.reconciliation.onlyInPdf.map((e, i) => (
                    <li key={i} className="px-3 py-2 text-sm flex flex-wrap gap-x-4 gap-y-0.5">
                      <span className="font-semibold text-slate-900 break-words">{e.heading || '-'}</span>
                      <span className="break-words">{e.material || '-'}</span>
                      <span className="text-slate-600 break-words">Supplier: {e.supplier || '-'}</span>
                      <span className="text-slate-600 font-mono text-xs self-center break-words">Article: {e.article || '-'}</span>
                      <span className="text-slate-500">{e.page != null ? `Page ${e.page}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
