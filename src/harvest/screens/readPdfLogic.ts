import type { PdfLegendPage, PdfRead, ReconciledRow } from '../types';

export interface KindCount { kind: string; count: number }

/** The page kinds of the profile as a stable list: text, vector-only, image-only, blank first, then anything else. */
export function kindCounts(kinds: Record<string, number> | undefined): KindCount[] {
  const k = kinds ?? {};
  const known = ['text', 'vector-only', 'image-only', 'blank'];
  const out: KindCount[] = known.map((kind) => ({ kind, count: Number(k[kind] ?? 0) }));
  for (const kind of Object.keys(k)) if (!known.includes(kind)) out.push({ kind, count: Number(k[kind]) || 0 });
  return out;
}

/** Header fields with a non-empty value, in the order given. */
export function headerEntries(header: Record<string, string> | undefined): [string, string][] {
  return Object.entries(header ?? {})
    .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v == null ? '' : String(v)] as [string, string])
    .filter(([, v]) => v !== '');
}

/** "lastModified" / "product_developer" -> "Last modified" */
export function prettyKey(key: string): string {
  const s = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : key;
}

export type MethodKey = 'template' | 'rules' | 'model' | 'none';
export function methodOf(p: PdfLegendPage): MethodKey {
  return p.method ?? 'none';
}
export const METHOD_LABEL: Record<MethodKey, string> = { template: 'template', rules: 'rules', model: 'model', none: 'not read' };

/** Message for the "needs AI" notice, or null when there is none. */
export function needsAiMessage(needsAi: number[] | undefined): string | null {
  const n = needsAi?.length ?? 0;
  if (!n) return null;
  return `${n} legend page${n === 1 ? '' : 's'} could not be read without AI (page${n === 1 ? '' : 's'} ${needsAi!.join(', ')}). Part 2 below can try ${n === 1 ? 'it' : 'them'}.`;
}

/** The latest result: the with-AI one when present, else part 1. */
export function latestResult(base: PdfRead | null, withAi: PdfRead | null): PdfRead | null {
  return withAi ?? base;
}

export interface ReconSummary { matched: number; pluginOnly: number; onlyInPdf: number }
export function reconSummary(r: PdfRead | null): ReconSummary {
  const rec = r?.reconciliation;
  const rows = rec?.rows ?? [];
  const matched = rows.filter((x) => x.status === 'in PDF').length;
  return { matched, pluginOnly: rows.length - matched, onlyInPdf: rec?.onlyInPdf?.length ?? 0 };
}

export function viaLabel(r: ReconciledRow): string {
  if (r.status !== 'in PDF') return '';
  return r.via === 'label' ? 'via label' : r.via === 'material' ? 'via material' : '';
}

/** Pages the AI read (method 'model'), for the table of what it added. */
export function modelPages(r: PdfRead | null): PdfLegendPage[] {
  return (r?.legendPages ?? []).filter((p) => p.method === 'model' && (p.entries?.length ?? 0) > 0);
}

export interface AiPageRow { page: number; entries: number; rejected: number; error?: string }
export function aiPageRows(r: PdfRead | null): AiPageRow[] {
  return (r?.ai?.pages ?? []).map((p) => ({ page: p.page, entries: p.entries, rejected: p.rejected, error: p.error }));
}

export function aiExplanation(aiLabel?: string): string {
  return `The text of the legend pages that part 1 could not read goes to ${aiLabel || 'the chosen AI provider'}, with people, dates, confidentiality text and prices removed. Nothing else is sent.`;
}
