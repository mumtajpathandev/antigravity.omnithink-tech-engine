// Screen 2: read a style's sketch PDF. The no-AI methods run in Python (template parser, rules reader); pages only a text model can
// read are sent, redacted, to the configured model when the user asks. The result is compared with the plugin BOM rows.

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { SCRIPT_DIR } from './config';
import { structureLegend, type LegendEntry } from './legend';
import { aiKey, loadRead, pageSha, pdfSha, readerVersion, saveRead, type StoredAiPage } from './readcache';
import { aiModel, aiProvider, aiReady } from './ai';
import { getSettings } from './settings';
import type { BomRow, PdfLegendPage, PdfRead, Reconciliation, ReconciledRow } from '../src/harvest/types';

interface PythonRead {
  error?: string;
  pdf?: PdfRead['pdf'];
  header?: Record<string, string>;
  legendPages?: (PdfLegendPage & { text: string; skipAi?: boolean })[];
}

interface Loaded {
  read: PythonRead;
  sha?: string;
  cache: { hit: boolean; savedAt: string };
}

/** The Python reading of a style's sketch PDF: from the saved reading of this exact PDF when there is one, else run now and save. */
async function runPython(dir: string, fresh = false): Promise<Loaded> {
  const pdf = path.join(dir, 'sketch.pdf');
  const sha = fs.existsSync(pdf) ? await pdfSha(pdf) : undefined;
  const version = readerVersion();
  const saved = sha ? loadRead(sha) : undefined;
  if (!fresh && reuseSaved() && saved?.python && saved.readerVersion === version) {
    return { read: saved.python as PythonRead, sha, cache: { hit: true, savedAt: saved.savedAt } };
  }
  const result = await new Promise<PythonRead>((resolve, reject) => {
    execFile(
      process.env.PYTHON || 'python',
      ['read_sketch_pdf.py', dir],
      { cwd: SCRIPT_DIR, timeout: 90_000, windowsHide: true, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`The sketch PDF could not be read: ${String(stderr || err.message).split('\n').filter(Boolean).pop()}`));
        try {
          resolve(JSON.parse(stdout) as PythonRead);
        } catch {
          reject(new Error('The sketch reader gave an answer the app could not understand.'));
        }
      }
    );
  });
  const savedAt = new Date().toISOString();
  if (sha && !result.error) {
    // earlier AI readings stay valid only while the reader (and so the page texts) is the same
    saveRead({ pdfSha: sha, readerVersion: version, savedAt, python: result, ai: saved?.readerVersion === version ? saved.ai : {} });
  }
  return { read: result, sha, cache: { hit: false, savedAt } };
}

/** most pages sent to the AI in one reading (Settings) */
const aiPageLimit = () => getSettings().ai.pagesPerReading;
/** with "reuse saved readings" off every reading is made again (and saved) */
const reuseSaved = () => getSettings().reading.reuseSaved;
const MIN_TEXT = 20;

/** Why the PDF has no legend page at all (from how the profiler classified it). */
function noLegendReason(r: PythonRead): string | undefined {
  if ((r.legendPages ?? []).length) return undefined;
  const rung = r.pdf?.rung;
  if (rung === 'needs_ocr') return 'Every page is a picture with no text, so nothing can be read without OCR (not installed) or vision AI (switched off).';
  if (rung === 'nothing_readable') return 'The PDF has no readable text or pictures.';
  if (rung === 'text_no_legend') return 'The PDF has text, but no page looks like a materials legend (no page mentions one).';
  return 'No page mentions a legend, so there was nothing to read.';
}

/** The reason each page still has no entries. `report` is the AI reading's per-page outcome, when it ran. */
function unreadPages(pages: (PdfLegendPage & { text: string; skipAi?: boolean })[], report?: { page: number; entries: number; rejected: number; error?: string }[], tried?: Set<number>): { page: number; reason: string }[] {
  const out: { page: number; reason: string }[] = [];
  for (const p of pages) {
    if (p.method || p.entries.length || p.skipAi) continue;
    const said = report?.find((x) => x.page === p.page);
    let reason: string;
    if (p.text.trim().length < MIN_TEXT) reason = `The page has almost no text (${p.text.trim().length} characters): it is probably a scanned picture, which needs OCR (not installed) or vision AI (switched off).`;
    else if (said?.error) reason = `The AI could not read it: ${said.error}`;
    else if (said) reason = said.rejected ? `The AI answered, but all ${said.rejected} entries were dropped because their values are not on the page.` : 'The AI found no legend entries on this page.';
    else if (tried && !tried.has(p.page)) reason = `Not sent to the AI: only the first ${aiPageLimit()} unread pages go in one reading. Read again to continue.`;
    else reason = `The template and rules could not read it${p.note ? ` (${p.note})` : ''}; it needs the AI reading.`;
    out.push({ page: p.page, reason });
  }
  return out;
}

type PageComparison = NonNullable<NonNullable<PdfRead['ai']>['comparison']>[number];

const entryKey = (e: LegendEntry) => `${norm(e.heading)}|${norm(e.article) || norm(e.material).slice(0, 24)}`;

/** The AI's entries for a page against what the no-AI method read: the same, only the AI's (extra), only the other's (missed), and same heading with other values. */
function comparePage(page: number, baseMethod: string, base: LegendEntry[], ai: LegendEntry[], rejected: number): PageComparison {
  const aiLeft = [...ai];
  const baseLeft: LegendEntry[] = [];
  let same = 0;
  for (const b of base) {
    const i = aiLeft.findIndex((a) => entryKey(a) === entryKey(b));
    if (i >= 0) {
      aiLeft.splice(i, 1);
      same++;
    } else baseLeft.push(b);
  }
  const differs: { heading: string; base: LegendEntry; ai: LegendEntry }[] = [];
  for (const b of [...baseLeft]) {
    const i = aiLeft.findIndex((a) => norm(a.heading) === norm(b.heading));
    if (i >= 0) {
      differs.push({ heading: b.heading, base: b, ai: aiLeft[i] });
      aiLeft.splice(i, 1);
      baseLeft.splice(baseLeft.indexOf(b), 1);
    }
  }
  return { page, baseMethod, baseCount: base.length, aiCount: ai.length, same, onlyAi: aiLeft, onlyBase: baseLeft, differs, rejected };
}

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Compare the plugin rows with the legend entries found in the PDF. The plugin stays authoritative. */
export function reconcile(rows: BomRow[], entries: (LegendEntry & { page?: number; method?: string })[]): Reconciliation {
  const used = new Set<number>();
  const out: ReconciledRow[] = rows.map((r, index) => {
    const label = norm(r.label);
    const name = norm(r.materialName);
    const article = norm(r.articleNumber);
    let found = entries.findIndex((e, i) => !used.has(i) && label && norm(e.heading) === label);
    let via: 'label' | 'material' = 'label';
    if (found < 0) {
      via = 'material';
      found = entries.findIndex(
        (e, i) => !used.has(i) && ((name.length >= 12 && (norm(e.material).includes(name.slice(0, 24)) || name.includes(norm(e.material).slice(0, 24)))) || (article.length >= 4 && norm(e.article) === article))
      );
    }
    if (found < 0) return { index, label: r.label ?? '', materialName: r.materialName, status: 'plugin only' };
    used.add(found);
    const e = entries[found];
    return { index, label: r.label ?? '', materialName: r.materialName, status: 'in PDF', via, entry: { heading: e.heading, material: e.material, supplier: e.supplier, article: e.article, page: e.page } };
  });
  const onlyInPdf = entries.filter((_, i) => !used.has(i)).map((e) => ({ heading: e.heading, material: e.material, supplier: e.supplier, article: e.article, page: e.page }));
  return { rows: out, onlyInPdf };
}

function publicPages(pages: (PdfLegendPage & { text: string })[]): PdfLegendPage[] {
  return pages.map(({ page, method, entries, note }) => ({ page, method, entries, note }));
}

/** Everything the no-AI methods find in the sketch PDF. */
export async function readSketchNoAi(dir: string, rows: BomRow[], fresh = false): Promise<PdfRead> {
  const { read: r, cache } = await runPython(dir, fresh);
  if (r.error || !r.pdf) throw new Error(r.error ?? 'The sketch PDF could not be read.');
  const pages = r.legendPages ?? [];
  const entries = pages.flatMap((p) => p.entries.map((e) => ({ ...e, page: p.page, method: p.method ?? undefined })));
  return {
    pdf: r.pdf,
    header: r.header ?? {},
    legendPages: publicPages(pages),
    needsAi: pages.filter((p) => !p.method && !p.skipAi).map((p) => p.page),
    unread: unreadPages(pages),
    noLegendReason: noLegendReason(r),
    reconciliation: reconcile(rows, entries),
    cache
  };
}

const PAGE_CONCURRENCY = 3;

/** The pages the no-AI methods could not read, read by the text model (redacted, grounded). Slow on free models: pages run three at a time. */
export async function readSketchWithAi(dir: string, rows: BomRow[], compareRead = true, fresh = false): Promise<PdfRead & { ai: NonNullable<PdfRead['ai']> }> {
  const { read: base, sha, cache } = await runPython(dir);
  await aiReady();
  const expected = aiKey(aiProvider() ?? '', aiModel() ?? '');
  const stored = sha ? loadRead(sha) : undefined;
  const cached: NonNullable<NonNullable<PdfRead['ai']>['cached']> = [];
  let dirty = false;
  if (base.error || !base.pdf) throw new Error(base.error ?? 'The sketch PDF could not be read.');
  const pages = base.legendPages ?? [];
  // While testing (compareRead, on by default) the AI also reads the pages the no-AI methods already read (and cover pages), to see
  // what it finds extra or misses. Off: only the pages nothing else could read.
  // Pages nothing could read go first so the page limit never starves them.
  const todo = pages
    .filter((p) => p.text.trim().length >= MIN_TEXT && (compareRead || (!p.method && !p.skipAi)))
    .sort((a, b) => Number(Boolean(a.method || a.skipAi)) - Number(Boolean(b.method || b.skipAi)))
    .slice(0, aiPageLimit());
  const report: { page: number; entries: number; rejected: number; error?: string }[] = [];
  const comparison: PageComparison[] = [];
  let provider = '';
  let model = '';
  const merged = pages.map((p) => ({ ...p }));
  // Pages are read three at a time (a free model takes a while per page); the results are applied afterwards in page order.
  type PageRead = { p: (typeof todo)[number]; res?: { entries: LegendEntry[]; rejected: number; provider: string; model: string }; fromCache?: StoredAiPage; error?: string };
  const readPage = async (p: (typeof todo)[number]): Promise<PageRead> => {
    const key = pageSha(p.text);
    try {
      // The same page text was read before: reuse it (this model's reading first, else the newest by any model), unless "read again".
      const earlier = stored?.ai[key];
      const hit: StoredAiPage | undefined = fresh || !reuseSaved() || !earlier ? undefined : earlier[expected] ?? Object.values(earlier).sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
      if (hit) return { p, fromCache: hit, res: { entries: hit.entries as LegendEntry[], rejected: hit.rejected, provider: hit.provider, model: hit.model } };
      const done = await structureLegend(p.text, `Legend page ${p.page}${p.method ? ' (comparison)' : ''}`);
      if (stored && sha) {
        (stored.ai[key] ??= {})[aiKey(done.provider, done.model)] = { savedAt: new Date().toISOString(), provider: done.provider, model: done.model, entries: done.entries, rejected: done.rejected };
        dirty = true;
      }
      return { p, res: { entries: done.entries, rejected: done.rejected, provider: done.provider, model: done.model } };
    } catch (err) {
      return { p, error: (err as Error).message.slice(0, 600) };
    }
  };
  const reads: PageRead[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(PAGE_CONCURRENCY, todo.length) }, async () => {
      while (next < todo.length) reads.push(await readPage(todo[next++]));
    })
  );
  for (const { p, res, fromCache: hit, error } of reads.sort((x, y) => x.p.page - y.p.page)) {
    if (error !== undefined || !res) {
      report.push({ page: p.page, entries: 0, rejected: 0, error });
      continue;
    }
    if (hit) cached.push({ page: p.page, savedAt: hit.savedAt, provider: hit.provider, model: hit.model });
    provider = res.provider;
    model = res.model;
    const target = merged.find((m) => m.page === p.page)!;
    if (!p.method) {
      // a page nothing else read: the AI's entries are the result for it
      target.entries = res.entries.map((e) => ({ ...e }));
      target.method = res.entries.length ? 'model' : null;
      target.note = res.rejected ? `${res.rejected} entr${res.rejected === 1 ? 'y' : 'ies'} dropped: a value was not on the page` : '';
    } else {
      // a page already read without AI keeps that result; the AI's is only compared with it
      comparison.push(comparePage(p.page, p.method, p.entries, res.entries, res.rejected));
    }
    report.push({ page: p.page, entries: res.entries.length, rejected: res.rejected });
  }
  if (dirty && stored) saveRead(stored);
  const entries = merged.flatMap((p) => p.entries.map((e) => ({ ...e, page: p.page, method: p.method ?? undefined })));
  return {
    pdf: base.pdf,
    header: base.header ?? {},
    legendPages: publicPages(merged),
    needsAi: merged.filter((p) => !p.method && !p.skipAi).map((p) => p.page),
    unread: unreadPages(merged, report, new Set(todo.map((t) => t.page))),
    noLegendReason: noLegendReason(base),
    reconciliation: reconcile(rows, entries),
    cache,
    ai: { provider, model, pages: report, comparison: comparison.sort((a, b) => a.page - b.page), cached }
  };
}
