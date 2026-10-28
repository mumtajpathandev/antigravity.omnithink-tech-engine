// Retrieval over the memory of corrections. A ladder from strict to loose finds past corrections for a NEW style's material:
// exact (the only rung that may be applied automatically), normalised name, character-trigram overlap, embeddings.
// The looser rungs are suggestions only: they feed an AI prompt as context, they never overwrite a row by themselves.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { APP_ROOT } from './config';
import { REUSABLE_FIELDS, scopeKey, type CorrectionField, type CorrectionRecord } from './corrections';

export type RagMethod = 'exact' | 'normalised' | 'lexical' | 'embedding';
export interface RagQuery {
  material: string;
  article?: string | null;
  placement?: string | null;
  standardPlacement?: string | null;
  section?: string | null;
  supplier?: string | null;
}
export interface RagHit {
  record: CorrectionRecord;
  method: RagMethod;
  score: number;
  reusable: boolean;
}
export interface RagOptions {
  load: () => CorrectionRecord[];
  embed?: (texts: string[]) => Promise<number[][]>;
  cacheFile?: string;
}

const LEXICAL_MIN = 0.6;
const EMBEDDING_MIN = 0.82;
const BATCH = 32;
const FAIL_MS = 60_000;
const RANK: Record<RagMethod, number> = { exact: 0, normalised: 1, lexical: 2, embedding: 3 };
// placement/name edits are never applied elsewhere, but they are useful context; add/delete rows say nothing about a material
const SEARCHABLE: CorrectionField[] = [...REUSABLE_FIELDS, 'placement', 'standardPlacement', 'materialName'];

const NOISE = new Set(['the', 'a', 'an', 'and', 'of', 'with', 'for', 'in', 'to', 'by']);
const UNITS = new Set(['gsm', 'g', 'gr', 'gm', 'kg', 'oz', 'cm', 'mm', 'm', 'mtr', 'dtex', 'den', 'd']);
const SIZES = new Set(['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl']);
const NUM_UNIT = /^\d+(?:\.\d+)?(?:gsm|gr|gm|g|kg|oz|cm|mm|mtr|m|dtex|den|d|l)$/;

/** Name without case, punctuation, noise words, units and sizes ("The Zorbel Twill, 180 gsm" -> "zorbel twill"). */
export function normaliseName(s: string | null | undefined): string {
  const tokens = (s ?? '').toLowerCase().split(/[^a-z0-9.]+/).map((t) => t.replace(/^\.+|\.+$/g, '')).filter(Boolean);
  const out: string[] = [];
  tokens.forEach((t, i) => {
    if (NOISE.has(t) || UNITS.has(t) || SIZES.has(t) || NUM_UNIT.test(t)) return;
    if (/^\d+(?:\.\d+)?$/.test(t) && UNITS.has(tokens[i + 1] ?? '')) return; // "180 gsm"
    out.push(t.replace(/\./g, ''));
  });
  return out.join(' ');
}

const normArticle = (a: string | null | undefined) => (a ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
// the ONLY text that is embedded or compared fuzzily: no user, supplier or value ever goes in
const textOf = (material: string, article: string | null | undefined) => `${normaliseName(material)} ${normArticle(article)}`.trim();

function trigrams(s: string): Set<string> {
  const p = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i + 3 <= p.length; i++) out.add(p.slice(i, i + 3));
  return out;
}

interface Doc {
  text: string;
  tri: Set<string>;
  hash: string;
  recs: CorrectionRecord[];
  vec?: number[];
  vnorm?: number;
}

const norm2 = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
const sha = (t: string) => crypto.createHash('sha256').update(t).digest('hex');
const DEFAULT_CACHE = path.join(APP_ROOT, 'memory', 'embeddings.json');

export function createRag(options: RagOptions) {
  const cacheFile = options.cacheFile ?? DEFAULT_CACHE;
  let seen = 0; // how many loaded records are in the index (the memory is append-only)
  let byScope = new Map<string, CorrectionRecord[]>();
  let byName = new Map<string, CorrectionRecord[]>();
  let docs = new Map<string, Doc>();
  let postings = new Map<string, Doc[]>(); // trigram -> docs containing it, so a query never scans all records
  let cache: Map<string, number[]> | null = null;
  let failUntil = 0;

  const push = <T>(m: Map<string, T[]>, k: string, v: T) => (m.get(k)?.push(v) ?? m.set(k, [v]));

  function add(recs: CorrectionRecord[]) {
    for (const r of recs) {
      if (!SEARCHABLE.includes(r.field)) continue;
      push(byScope, scopeKey(r.material, r.article), r);
      push(byName, normaliseName(r.material), r);
      const text = textOf(r.material, r.article);
      let d = docs.get(text);
      if (!d) {
        d = { text, tri: trigrams(text), hash: sha(text), recs: [] };
        docs.set(text, d);
        for (const t of d.tri) push(postings, t, d);
      }
      d.recs.push(r);
    }
  }

  function sync(force = false) {
    const all = options.load();
    if (!force && all.length === seen) return;
    if (!force && all.length > seen) {
      add(all.slice(seen));
    } else {
      byScope = new Map(); byName = new Map(); docs = new Map(); postings = new Map();
      add(all);
    }
    seen = all.length;
  }

  const refresh = () => sync(true);

  function loadCache(): Map<string, number[]> {
    if (cache) return cache;
    try {
      cache = new Map(Object.entries(JSON.parse(fs.readFileSync(cacheFile, 'utf8')) as Record<string, number[]>));
    } catch {
      cache = new Map(); // missing or damaged cache just means re-embedding
    }
    return cache;
  }

  function saveCache(c: Map<string, number[]>) {
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    const tmp = `${cacheFile}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(c)), 'utf8');
    fs.renameSync(tmp, cacheFile); // atomic: a crash never leaves half a cache
  }

  async function embedTexts(texts: string[]): Promise<number[][]> {
    const out = await options.embed!(texts);
    if (!Array.isArray(out) || out.length !== texts.length) throw new Error('embed returned the wrong number of vectors');
    return out;
  }

  async function ensureEmbedded() {
    const c = loadCache();
    const missing = [...docs.values()].filter((d) => !c.has(d.hash));
    try {
      for (let i = 0; i < missing.length; i += BATCH) {
        const batch = missing.slice(i, i + BATCH);
        (await embedTexts(batch.map((d) => d.text))).forEach((v, j) => c.set(batch[j].hash, v));
      }
    } finally {
      if (missing.some((d) => c.has(d.hash))) saveCache(c); // keep what succeeded even if a later batch failed
    }
    for (const d of docs.values()) {
      if (!d.vec && c.has(d.hash)) { d.vec = c.get(d.hash); d.vnorm = norm2(d.vec!); }
    }
  }

  async function embeddingScores(text: string): Promise<[Doc, number][]> {
    if (!options.embed || Date.now() < failUntil || !docs.size) return [];
    try {
      await ensureEmbedded();
      const c = loadCache();
      const qv = c.get(sha(text)) ?? (await embedTexts([text]))[0];
      const qn = norm2(qv);
      const out: [Doc, number][] = [];
      for (const d of docs.values()) {
        if (!d.vec || !qn || !d.vnorm || d.vec.length !== qv.length) continue;
        let dot = 0;
        for (let i = 0; i < qv.length; i++) dot += qv[i] * d.vec[i];
        const s = dot / (qn * d.vnorm);
        if (s >= EMBEDDING_MIN) out.push([d, s]);
      }
      return out;
    } catch {
      failUntil = Date.now() + FAIL_MS; // server down: do not make every retrieval wait for it
      return [];
    }
  }

  async function retrieve(query: RagQuery, k = 5): Promise<RagHit[]> {
    sync();
    const best = new Map<string, RagHit>();
    const consider = (record: CorrectionRecord, method: RagMethod, score: number) => {
      const key = `${scopeKey(record.material, record.article)}|${record.field}`;
      const cur = best.get(key);
      if (cur) {
        if (RANK[cur.method] < RANK[method]) return;
        if (RANK[cur.method] === RANK[method] && (cur.score > score || (cur.score === score && cur.record.at >= record.at))) return;
      }
      const reusable = method === 'exact' && REUSABLE_FIELDS.includes(record.field) && record.after !== null;
      best.set(key, { record, method, score, reusable });
    };

    const qKey = scopeKey(query.material, query.article);
    for (const r of byScope.get(qKey) ?? []) {
      if (REUSABLE_FIELDS.includes(r.field) && r.after === null) continue; // like historyFor: a cleared value is not reusable
      consider(r, 'exact', 1);
    }

    const qName = normaliseName(query.material);
    if (qName) for (const r of byName.get(qName) ?? []) consider(r, 'normalised', 0.95);

    const text = textOf(query.material, query.article);
    const qTri = trigrams(text);
    const inter = new Map<Doc, number>();
    for (const t of qTri) for (const d of postings.get(t) ?? []) inter.set(d, (inter.get(d) ?? 0) + 1);
    for (const [d, n] of inter) {
      const j = n / (qTri.size + d.tri.size - n);
      if (j >= LEXICAL_MIN) for (const r of d.recs) consider(r, 'lexical', j);
    }

    for (const [d, s] of await embeddingScores(text)) for (const r of d.recs) consider(r, 'embedding', s);

    return [...best.values()]
      .sort((a, b) => RANK[a.method] - RANK[b.method] || b.score - a.score || (b.record.at > a.record.at ? 1 : -1))
      .slice(0, k);
  }

  const LABEL: Partial<Record<CorrectionField, string>> = { supplierName: 'supplier', supplierArticle: 'supplier article', materialName: 'name' };

  /** Values only (no user, id or time): this text goes to an external AI. */
  function promptContext(hits: RagHit[], max = 5): string {
    const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
    const lines = new Set<string>();
    for (const h of hits) {
      const r = h.record;
      if (r.after === null) continue;
      lines.add(`material ${clean(r.material)}: ${LABEL[r.field] ?? r.field} ${r.before ? clean(r.before) : '(empty)'} -> ${clean(r.after)}`);
      if (lines.size >= max) break;
    }
    return [...lines].join('\n');
  }

  function stats() {
    sync();
    return {
      records: seen,
      embedded: [...docs.values()].filter((d) => loadCache().has(d.hash)).length,
      methods: { exact: true, normalised: true, lexical: true, embedding: !!options.embed && Date.now() >= failUntil },
    };
  }

  return { retrieve, promptContext, refresh, stats };
}
