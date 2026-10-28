import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Table } from './AboutPanel';
import { loadSettingsOnce } from './api';

// Analytics: how the AI calls went, what has been saved so work is not repeated, and what this computer can run.
// Everything comes from GET /api/analytics (counts, timings and sizes only: no material names, no keys).

const card = 'bg-white border border-slate-200 rounded-lg shadow-sm';
const p = 'text-sm text-slate-700 leading-relaxed';

interface CallRow { at: string; task: string; provider: string; model: string; where: string; ok: boolean; ms: number; rowsAsked?: number; itemsAnswered?: number; promptChars: number; error?: string; fallbackFrom?: string; freeRamGb: number }
interface ModelRow { where: string; provider: string; model: string; task: string; calls: number; answered: number; failed: number; medianSeconds: number; slowestSeconds: number; secondsPerRow: number | null; lowestFreeRamGb: number; commonFailures: { error: string; count: number }[] }
interface Analytics {
  generatedAt: string;
  calls: {
    total: number; first: string | null; last: string | null;
    local: { calls: number; answered: number; seconds: number; wastedSeconds: number };
    cloud: { calls: number; answered: number; seconds: number; wastedSeconds: number };
    byModel: ModelRow[];
    failures: { where: string; provider: string; account?: string; model: string; category: string; hint: string; count: number; last: string; example: string }[];
    recent: CallRow[];
  };
  memory: { corrections: { total: number; materials: number; latest: string | null }; pdfReadings: { pdfs: number; aiPages: number; megabytes: number } };
  machine: { totalRamGb: number; freeRamGb: number; cpu: string; cores: number; ollama: { running: boolean; version: string | null; installed: { name: string; gb: number }[]; loaded: { name: string; gb: number }[] } };
}

const TABS = ['AI models', 'Recent calls', 'Saved work', 'PDF corpus', 'This computer'] as const;
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');
const secs = (n: number) => (n >= 120 ? `${Math.floor(n / 60)} min ${n % 60} s` : `${n} s`);

const Tile: React.FC<{ label: string; value: React.ReactNode; note?: string }> = ({ label, value, note }) => (
  <div className="border border-slate-200 rounded-md px-3 py-2 min-w-0">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-base font-semibold text-slate-900 break-words">{value}</div>
    {note && <div className="text-xs text-slate-500">{note}</div>}
  </div>
);

export const AnalyticsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const touched = useRef(false); // a tab the person chose is not overridden when the settings arrive
  useEffect(() => {
    void loadSettingsOnce().then((s) => {
      if (s && !touched.current && Number.isInteger(s.display.analyticsTab) && s.display.analyticsTab >= 0 && s.display.analyticsTab < TABS.length) setTab(s.display.analyticsTab);
    });
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/analytics')
      .then(async (r) => {
        if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) {
          throw new Error('The running server does not have the analytics yet (it was started before they were added). Restart the server, then press Refresh.');
        }
        setData((await r.json()) as Analytics);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const go = (i: number) => {
    touched.current = true;
    const next = (i + TABS.length) % TABS.length;
    setTab(next);
    document.getElementById(`an-tab-${next}`)?.focus();
  };

  const c = data?.calls;
  return (
    <section className={`${card} overflow-hidden`} aria-labelledby="analytics-title">
      <div className="flex items-center gap-2 px-4 py-3">
        <h2 id="analytics-title" className="text-sm font-bold text-slate-900">Analytics</h2>
        <span className="text-xs text-slate-500">AI timings and failures, saved work, this computer</span>
        <button type="button" onClick={onClose} aria-label="Close" className="ml-auto p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {(
        <div id="analytics-body" className="border-t border-slate-100">
          <div className="flex items-center justify-between gap-2 px-3 pt-2 border-b border-slate-200">
            <div role="tablist" aria-label="Analytics" className="flex gap-1 overflow-x-auto overflow-y-hidden">
              {TABS.map((t, i) => (
                <button
                  key={t}
                  id={`an-tab-${i}`}
                  role="tab"
                  type="button"
                  aria-selected={tab === i}
                  aria-controls={`an-panel-${i}`}
                  tabIndex={tab === i ? 0 : -1}
                  onClick={() => { touched.current = true; setTab(i); }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
                    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
                  }}
                  className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-t-md ${
                    tab === i ? 'border-sky-600 text-sky-800 font-semibold' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1 px-2 py-1 mb-1 text-xs rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
            </button>
          </div>

          <div id={`an-panel-${tab}`} role="tabpanel" aria-labelledby={`an-tab-${tab}`} className="px-4 py-4 space-y-4">
            {error && <div role="alert" className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">{error}</div>}
            {!data && !error && <p className="text-sm text-slate-500">Loading...</p>}

            {data && c && tab === 0 && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <Tile label="AI calls recorded" value={c.total} note={c.first ? `since ${time(c.first)}` : 'none yet'} />
                  <Tile label="Local (this computer)" value={`${c.local.answered} of ${c.local.calls} answered`} note={`${secs(c.local.seconds)} spent, ${secs(c.local.wastedSeconds)} on failed calls`} />
                  <Tile label="Hosted endpoints" value={`${c.cloud.answered} of ${c.cloud.calls} answered`} note={`${secs(c.cloud.seconds)} spent, ${secs(c.cloud.wastedSeconds)} on failed calls`} />
                  <Tile label="Failed calls" value={c.total - c.local.answered - c.cloud.answered} note="local first, then the endpoints in turn" />
                </div>
                {c.byModel.length > 0 ? (
                  <Table
                    caption="AI calls per model and task"
                    head={['Where', 'Model', 'Task', 'Calls', 'Answered', 'Failed', 'Median s', 'Slowest s', 's / row', 'Lowest free RAM']}
                    rows={c.byModel.map((m) => [m.where, `${m.provider} / ${m.model}`, m.task, m.calls, m.answered, m.failed, m.medianSeconds, m.slowestSeconds, m.secondsPerRow ?? '-', `${m.lowestFreeRamGb} GB`])}
                  />
                ) : (
                  <p className="text-sm text-slate-500">No AI call recorded yet.</p>
                )}
                {c.failures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">Why calls failed</h4>
                    <Table
                      caption="Why calls failed"
                      head={['Where and model', 'What went wrong', 'Times', 'Last seen']}
                      rows={c.failures.map((f) => [
                        <span key="m" className="inline-flex flex-col">
                          <span>{f.where === 'local' ? 'Local' : f.provider}</span>
                          {f.account && <span className="text-xs font-normal text-slate-600">{f.account}</span>}
                          <span className="text-xs font-normal text-slate-500">{f.model}</span>
                        </span>,
                        <div key="w" className="space-y-1">
                          <div className="font-medium text-slate-900">{f.category}</div>
                          {f.hint && <div className="text-xs text-slate-600">{f.hint}</div>}
                          <details>
                            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-800">Message</summary>
                            <pre className="mt-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-2 whitespace-pre-wrap break-words max-h-40 overflow-auto">{f.example}</pre>
                          </details>
                        </div>,
                        f.count,
                        time(f.last)
                      ])}
                    />
                  </div>
                )}
                <p className="text-sm text-slate-500">
                  Matching a few rows (report_matches) and reading a legend page (report_legend) are different jobs: compare models within the same task. A failed local call
                  that falls back to a hosted endpoint costs the time of both.
                </p>
              </>
            )}

            {data && c && tab === 1 && (
              c.recent.length ? (
                <Table
                  caption="The last 30 AI calls, newest first"
                  head={['When', 'Where', 'Model', 'Task', 'Result', 'Seconds', 'Rows', 'Free RAM', 'Detail']}
                  rows={c.recent.map((r) => [
                    new Date(r.at).toLocaleTimeString(),
                    r.where,
                    `${r.provider} / ${r.model}`,
                    r.task,
                    r.ok ? 'answered' : 'failed',
                    (r.ms / 1000).toFixed(1),
                    r.rowsAsked ?? '-',
                    `${r.freeRamGb} GB`,
                    r.ok ? (r.fallbackFrom ? `after ${r.fallbackFrom} failed` : '') : (r.error ?? '').slice(0, 90)
                  ])}
                />
              ) : (
                <p className="text-sm text-slate-500">No AI call recorded yet.</p>
              )
            )}

            {data && tab === 2 && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <Tile label="Corrections remembered" value={data.memory.corrections.total} note={`${data.memory.corrections.materials} material${data.memory.corrections.materials === 1 ? '' : 's'}${data.memory.corrections.latest ? `, latest ${time(data.memory.corrections.latest)}` : ''}`} />
                  <Tile label="PDFs read and saved" value={data.memory.pdfReadings.pdfs} note="the same PDF is never read twice" />
                  <Tile label="AI page readings saved" value={data.memory.pdfReadings.aiPages} note="reused by any style with the same PDF" />
                  <Tile label="Space used" value={`${data.memory.pdfReadings.megabytes} MB`} note="memory/pdf-reads" />
                </div>
                <p className={p}>
                  A PDF reading is saved by the PDF's content, so every style that uses the same PDF, and every later run, takes it from disk. "Read again" on screen 2 ignores
                  the saved reading and saves the new one. Corrections are reused for the same material on later styles (screen 3).
                </p>
              </>
            )}

            {tab === 3 && (
              <>
                <p className={p}>
                  What the profiler found in the sketch PDFs checked so far: 25 distinct PDFs, 346 pages. Each PDF sits on the first step of this ladder that holds:
                </p>
                <Table
                  caption="Where the PDFs sit on the reading ladder"
                  head={['Step', 'PDFs', 'Share', 'What it means']}
                  rows={[
                    ['Legend read by the template', 4, '16%', 'solved without AI'],
                    ['Legend page, template empty', 9, '36%', 'the legend is there but the template finds no lines'],
                    ['Legend in another layout', 10, '40%', 'the rules reader or the AI is needed'],
                    ['Text but no legend page', 1, '4%', 'nothing to read as a legend'],
                    ['Image-only pages', 0, '0%', 'would need OCR or vision: none found, so vision is off by default'],
                    ['Nothing readable', 1, '4%', 'no usable text or pictures']
                  ]}
                />
                <p className="text-sm text-slate-500">Figures from the corpus report (corpus_report.py); pictures exist on 10 of the PDFs but none is needed for the text.</p>
              </>
            )}

            {data && tab === 4 && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <Tile label="Memory" value={`${data.machine.freeRamGb} of ${data.machine.totalRamGb} GB free`} note="a model that does not fit makes the whole computer swap" />
                  <Tile label="Processor" value={`${data.machine.cores} cores`} note={data.machine.cpu} />
                  <Tile label="Ollama" value={data.machine.ollama.running ? `running ${data.machine.ollama.version ?? ''}` : 'not running'} note={data.machine.ollama.loaded.length ? `loaded: ${data.machine.ollama.loaded.map((m) => `${m.name} (${m.gb} GB)`).join(', ')}` : 'no model loaded now'} />
                  <Tile label="Updated" value={new Date(data.generatedAt).toLocaleTimeString()} />
                </div>
                <Table
                  caption="Installed local models"
                  head={['Model', 'Size']}
                  rows={data.machine.ollama.installed.length ? data.machine.ollama.installed.map((m) => [m.name, `${m.gb} GB`]) : [['none', '-']]}
                />
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
