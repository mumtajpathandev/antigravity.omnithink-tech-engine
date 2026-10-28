// Material-Supplier catalog lookup. PDAM's Material documents carry the supplier entries
// (material_supplier:materialSupplierInfo: supplier name, supplier article number, status), which is what
// OmniTechPack's catalog supplies. Read-only: NXQL queries only.

import type { PdamClient } from './pdam';
import { getSettings } from './settings';
import type { CatalogCandidate, CatalogRow, FlexRow } from '../src/harvest/types';

const nx = (s: string) => s.replace(/%/g, ' ').replace(/\\/g, '\\\\').replace(/'/g, "\\'").trim();
/** Comparison key: case, punctuation and spacing do not matter. */
const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const MAX_DOCS = 10;

function candidatesOf(docs: Awaited<ReturnType<PdamClient['nxql']>>): CatalogCandidate[] {
  const seen = new Set<string>();
  const out: CatalogCandidate[] = [];
  for (const d of docs) {
    const p = d.properties ?? {};
    const name = String(p['material:materialName'] ?? d.title ?? '').trim();
    const subtype = String(p['material:materialSubTyp'] ?? '').trim().toLowerCase(); // passed through, not mapped
    const section = subtype || null;
    const info = Array.isArray(p['material_supplier:materialSupplierInfo']) ? p['material_supplier:materialSupplierInfo'] : [];
    for (const s of info) {
      const c: CatalogCandidate = {
        materialName: name,
        supplierName: s?.supplierName ? String(s.supplierName).trim() : null,
        supplierArticle: s?.supplierArticleNumber ? String(s.supplierArticleNumber).trim() : null,
        status: s?.materialStatus ? String(s.materialStatus) : null,
        section
      };
      const key = `${c.materialName}|${c.supplierName}|${c.supplierArticle}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(c);
      }
    }
  }
  return out;
}

/** True when `inner` is a whole-word part of `outer` (both normalised): "ykk taiwan" in "ykk taiwan co ltd". */
const nameWithin = (inner: string, outer: string) => inner.length > 0 && inner !== outer && ` ${outer} `.includes(` ${inner} `);

/**
 * PDAM may hold the same supplier under several names ("Textile", "Eclat Textile Co., Ltd."). Of the candidates for one material, drop an entry
 * whose supplier name is contained in another entry's name (same article, or either without one), so the most complete name is kept. When the row has
 * an article and some entries carry exactly it, only those are kept. Names are never joined or invented: unrelated names are left alone.
 */
export function fullestSupplier(list: CatalogCandidate[], article?: string | null): CatalogCandidate[] {
  const a = norm(article);
  const pool = a && list.some((c) => norm(c.supplierArticle) === a) ? list.filter((c) => norm(c.supplierArticle) === a) : list;
  return pool.filter((c, i) => {
    const mine = norm(c.supplierName);
    return !pool.some((o, j) => {
      if (i === j || norm(o.materialName) !== norm(c.materialName)) return false;
      const sameArticle = !c.supplierArticle || !o.supplierArticle || norm(c.supplierArticle) === norm(o.supplierArticle);
      const theirs = norm(o.supplierName);
      // an exact duplicate name is kept once (the first)
      return sameArticle && (nameWithin(mine, theirs) || (mine === theirs && mine !== '' && j < i));
    });
  });
}

const SLOW_MS = 3000;

const query = async (client: PdamClient, where: string) => {
  const started = Date.now();
  try {
    return await client.nxql(`SELECT * FROM Material WHERE ecm:isTrashed = 0 AND ${where}`, MAX_DOCS);
  } catch (err) {
    console.log(`catalog query failed after ${Date.now() - started} ms: ${(err as Error).message.slice(0, 120)} | ${where.slice(0, 90)}`);
    return [];
  } finally {
    const ms = Date.now() - started;
    if (ms >= SLOW_MS) console.log(`catalog query slow (${ms} ms): ${where.slice(0, 110)}`);
  }
};

/** The two longest words of a name, for a loose search when nothing matched exactly. */
const keyWords = (name: string) =>
  [...new Set(name.split(/[^A-Za-z0-9#.-]+/).filter((w) => w.length >= 5))].sort((a, b) => b.length - a.length).slice(0, 2);

async function resolve(client: PdamClient, row: FlexRow): Promise<Omit<CatalogRow, 'index' | 'baseline' | 'row'>> {
  const article = row.supplierArticle?.trim();
  const name = row.materialName.trim().slice(0, 80);
  // The article query is by far the slowest (about 20 s on UAT, a few seconds on PREPROD), so it runs alongside the name query
  // instead of before it; the answer is the same as when they ran one after the other.
  const [articleDocs, equalDocs] = await Promise.all([
    article ? query(client, `material_supplier:materialSupplierInfo/*/supplierArticleNumber ILIKE '${nx(article)}'`) : Promise.resolve([]),
    query(client, `material:materialName ILIKE '${nx(name)}'`)
  ]);
  if (article) {
    // The same article is often held by more than one document (library copy and a working copy): one supplier + article is one answer.
    const bySupplier = new Map<string, CatalogCandidate>();
    for (const c of candidatesOf(articleDocs)) {
      if (norm(c.supplierArticle) === norm(article) && !bySupplier.has(c.supplierName ?? '')) bySupplier.set(c.supplierName ?? '', c);
    }
    const exact = fullestSupplier([...bySupplier.values()], article);
    if (exact.length === 1) return { matchedBy: 'article', candidates: exact, chosen: 0 };
    if (exact.length > 1) return { matchedBy: 'none', candidates: exact, chosen: null }; // ambiguous: needs a person (or the AI step)
  }
  // The substring search only FETCHES candidates; a name counts as a match only when it equals the catalog name (case/punctuation aside).
  // Equal names are asked for first, so they cannot be crowded out of the 10-document cap by longer names that contain them.
  const equal = candidatesOf(equalDocs);
  const byName = equal.length ? equal : candidatesOf(await query(client, `material:materialName ILIKE '%${nx(name)}%'`));
  const sameName = new Map<string, CatalogCandidate>();
  for (const c of byName) if (norm(c.materialName) === norm(name) && !sameName.has(`${c.supplierName}|${c.supplierArticle}`)) sameName.set(`${c.supplierName}|${c.supplierArticle}`, c);
  const fullest = fullestSupplier([...sameName.values()], article);
  sameName.clear();
  for (const c of fullest) sameName.set(`${c.supplierName}|${c.supplierArticle}`, c);
  // A generic name ("Fabric") says too little to trust on its own: candidates only.
  const specific = norm(name).split(' ').length >= 3;
  if (sameName.size === 1 && specific) return { matchedBy: 'name', candidates: [...sameName.values()], chosen: 0 };
  if (byName.length) return { matchedBy: 'none', candidates: byName, chosen: null };
  const words = keyWords(row.materialName);
  if (!words.length) return { matchedBy: 'none', candidates: [], chosen: null };
  const loose = candidatesOf(await query(client, `(${words.map((w) => `material:materialName ILIKE '%${nx(w)}%'`).join(' OR ')})`));
  return { matchedBy: 'none', candidates: loose.slice(0, 8), chosen: null };
}

export const SCORE: Record<CatalogRow['matchedBy'], string> = { article: '100%', name: '80%', none: '0%' };

export function applyCandidate(row: FlexRow, c: CatalogCandidate, score: string): FlexRow {
  return {
    ...row,
    section: c.section ?? row.section,
    supplierArticle: c.supplierArticle ?? row.supplierArticle,
    supplierName: c.supplierName,
    omniMatchScore: score
  };
}

/** Look every row up in the catalog (same article/name asked once). Nothing is guessed: unresolved rows stay as they were. */
type Resolved = Omit<CatalogRow, 'index' | 'baseline' | 'row'>;

// Answers are kept for a few minutes per connection, so switching dev objects or pressing "Apply AI" (which looks the rows up again)
// does not repeat the slow queries (how many minutes is a Setting; 0 keeps nothing). A new sign-in is a new client and starts empty; failed lookups are not kept.
const cacheMs = () => getSettings().data.catalogCacheMinutes * 60_000;
const caches = new WeakMap<PdamClient, Map<string, { at: number; value: Promise<Resolved> }>>();

export async function lookupRows(client: PdamClient, rows: FlexRow[]): Promise<CatalogRow[]> {
  const cache = caches.get(client) ?? caches.set(client, new Map()).get(client)!;
  const resolveCached = (baseline: FlexRow): Promise<Resolved> => {
    const key = `${baseline.supplierArticle ?? ''}|${baseline.materialName}`;
    const ttl = cacheMs();
    const hit = cache.get(key);
    if (ttl > 0 && hit && Date.now() - hit.at < ttl) return hit.value;
    const value = resolve(client, baseline);
    if (ttl > 0) cache.set(key, { at: Date.now(), value });
    value.catch(() => cache.delete(key));
    return value;
  };
  return Promise.all(
    rows.map(async (baseline, index) => {
      const r = await resolveCached(baseline);
      const row = r.chosen === null ? { ...baseline, omniMatchScore: SCORE.none } : applyCandidate(baseline, r.candidates[r.chosen], SCORE[r.matchedBy]);
      return { index, baseline, row, ...r };
    })
  );
}
