// Checks for server/rag.ts with INVENTED materials only and a deterministic fake embed (no server, no network).
// Run: npx tsx scripts/rag-check.ts

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRag, normaliseName } from '../server/rag';
import type { CorrectionField, CorrectionRecord } from '../server/corrections';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

let n = 0;
const rec = (material: string, article: string, field: CorrectionField, before: string | null, after: string | null): CorrectionRecord => ({
  id: `secret-id-${n}`, at: `2026-01-01T00:00:${String(n++ % 60).padStart(2, '0')}.${String(n).padStart(3, '0')}Z`, user: 'jdoe_secret', masterStyleID: 'S1', devObjectId: 'D1',
  material, article, field, before, after, source: 'pdam',
});

// hashed character-trigram bag-of-words, 128 dims, normalised; a tiny synonym step stands in for the meaning a real model knows
const SYN: Record<string, string> = { netting: 'mesh', liner: 'lining', cloth: 'fabric' };
let embedTexts = 0;
const fakeEmbed = async (texts: string[]) => {
  embedTexts += texts.length;
  return texts.map((t) => {
    const v = new Array(128).fill(0);
    const p = `  ${t.split(' ').map((w) => SYN[w] ?? w).join(' ')} `;
    for (let i = 0; i + 3 <= p.length; i++) {
      let h = 2166136261;
      for (const ch of p.slice(i, i + 3)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
      v[(h >>> 0) % 128]++;
    }
    const len = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / len);
  });
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-check-'));
const cache = path.join(tmp, 'embeddings.json');
const data: CorrectionRecord[] = [
  rec('Zorbel Twill 180 gsm', 'ZT-100', 'supplierName', 'Old Mill', 'Quenby Textiles'),
  rec('Zorbel Twill 180 gsm', 'ZT-100', 'supplierArticle', null, 'QT-9001'),
  rec('Zorbel Twill 180 gsm', 'ZT-100', 'placement', null, 'Front Body'),
  rec('Zorbel Twill 180 gsm', 'ZT-100', 'row', null, null),
  rec('Plimsoll Lining', 'PL-7', 'supplierName', null, 'Vantor Trims'),
  rec('Frindle Mesh Lining Fabric', 'FM-2', 'section', 'Trim', 'Fabric'),
  rec('Glimmer Zip Puller', 'GZ-5', 'supplierName', null, 'Orsk Hardware'),
];

(async () => {
  // normalisation
  check('normalise strips case, noise, unit and size', normaliseName('The Zorbel  TWILL, 180 gsm (XL)') === 'zorbel twill', normaliseName('The Zorbel  TWILL, 180 gsm (XL)'));

  const rag = createRag({ load: () => data, embed: fakeEmbed, cacheFile: cache });

  // rung 1: exact
  let hits = await rag.retrieve({ material: 'zorbel twill 180 GSM', article: 'zt 100' });
  const sup = hits.find((h) => h.record.field === 'supplierName')!;
  check('exact finds same scope', sup?.method === 'exact' && sup.score === 1 && sup.record.after === 'Quenby Textiles');
  check('exact reusable for supplierName + supplierArticle', hits.filter((h) => h.reusable).map((h) => h.record.field).sort().join() === 'supplierArticle,supplierName');
  check('placement exact is not reusable', hits.find((h) => h.record.field === 'placement')?.reusable === false);
  check('row records never returned', !hits.some((h) => h.record.field === 'row'));

  // scoping guard
  hits = await rag.retrieve({ material: 'Zorbel Twill 180 gsm', article: 'ZT-999' });
  check('different article is not exact', hits.length > 0 && hits.every((h) => h.method !== 'exact' && !h.reusable), hits.map((h) => h.method).join());
  check('different article found by normalised rung', hits.find((h) => h.record.field === 'supplierName')?.method === 'normalised');
  hits = await rag.retrieve({ material: 'Plimsoll Lining', article: 'PL-7' });
  check('edit for A never reusable for B', !(await rag.retrieve({ material: 'Glimmer Zip Puller', article: 'GZ-5' })).some((h) => h.record.material === 'Plimsoll Lining' && h.reusable));

  // rung 2 vs 3 vs 4, ordering
  hits = await rag.retrieve({ material: 'The Zorbel Twill', article: null });
  check('normalised ignores article and noise', hits.some((h) => h.method === 'normalised' && h.score === 0.95 && !h.reusable));
  hits = await rag.retrieve({ material: 'Zorbel Twil', article: 'ZT-100' }); // typo
  const lex = hits.find((h) => h.record.field === 'supplierName');
  check('lexical finds a typo', lex?.method === 'lexical' && lex.score >= 0.6 && lex.score < 1, lex ? lex.score.toFixed(2) : 'none');

  // embedding-only: synonyms share no trigrams (jaccard < 0.6) but mean the same
  const lexOnly = createRag({ load: () => data });
  const q = { material: 'Frindle Netting Liner Cloth', article: 'FM-2' };
  const noEmb = (await lexOnly.retrieve(q)).find((h) => h.record.material.startsWith('Frindle'));
  hits = await rag.retrieve(q);
  const emb = hits.find((h) => h.record.material.startsWith('Frindle'));
  check('embedding rung finds what lexical misses', !noEmb && emb?.method === 'embedding' && !emb.reusable, `${emb?.method} ${emb?.score.toFixed(2)}`);

  // ordering and a better rung is not replaced by a worse one
  hits = await rag.retrieve({ material: 'Zorbel Twill 180 gsm', article: 'ZT-100' }, 10);
  const rank = { exact: 0, normalised: 1, lexical: 2, embedding: 3 };
  check('hits ordered best rung first', hits.every((h, i) => i === 0 || rank[hits[i - 1].method] <= rank[h.method]));
  check('one hit per scope and field', new Set(hits.map((h) => `${h.record.material}|${h.record.article}|${h.record.field}`)).size === hits.length);

  // promptContext
  const ctx = rag.promptContext(await rag.retrieve({ material: 'Zorbel Twill 180 gsm', article: 'ZT-100' }, 10), 5);
  check('promptContext lists values', ctx.includes('supplier Old Mill -> Quenby Textiles'), JSON.stringify(ctx.split('\n')[0]));
  check('promptContext has no user, id or timestamp', !/jdoe_secret|secret-id|2026-/.test(ctx));
  check('promptContext honours max and dedupes', rag.promptContext(hits, 1).split('\n').length === 1 && rag.promptContext([hits[0], hits[0]], 5).split('\n').length === 1);
  check('promptContext empty without hits', rag.promptContext([]) === '');

  // failing embed falls back
  let calls = 0;
  const bad = createRag({ load: () => data, embed: async () => { calls++; throw new Error('server down'); }, cacheFile: path.join(tmp, 'bad.json') });
  let threw = false;
  let fb: Awaited<ReturnType<typeof bad.retrieve>> = [];
  try { fb = await bad.retrieve({ material: 'Zorbel Twil', article: 'ZT-100' }); await bad.retrieve({ material: 'Zorbel Twil' }); } catch { threw = true; }
  check('embed failure does not throw, lexical still works', !threw && fb.some((h) => h.method === 'lexical'));
  check('failure remembered (embed not retried within 60 s)', calls === 1 && bad.stats().methods.embedding === false, `calls=${calls}`);

  // cache persistence and incremental embedding
  check('cache file written', fs.existsSync(cache) && !fs.readdirSync(tmp).some((f) => f.endsWith('.tmp')));
  const live = [...data];
  embedTexts = 0;
  const r2 = createRag({ load: () => live, embed: fakeEmbed, cacheFile: cache });
  await r2.retrieve({ material: 'Zorbel Twill', article: 'ZT-100' });
  check('second run embeds nothing already cached', embedTexts === 0, `texts embedded=${embedTexts}`);
  live.push(rec('Brindle Fleece Panel', 'BF-3', 'supplierName', null, 'Quenby Textiles'));
  embedTexts = 0;
  await r2.retrieve({ material: 'Brindle Fleece Panel', article: 'BF-3' });
  check('one new record -> one new text embedded (+ cached query reused)', embedTexts === 0 || embedTexts === 1, `embedded=${embedTexts}`);
  check('new record visible lazily', (await r2.retrieve({ material: 'Brindle Fleece Panel', article: 'BF-3' }))[0]?.reusable === true);
  check('stats', r2.stats().records === live.length && r2.stats().embedded === 5 && r2.stats().methods.embedding, JSON.stringify(r2.stats()));

  // timing with 10k records, lexical only
  const words = ['alder', 'brisk', 'cobalt', 'dune', 'ember', 'fjord', 'garnet', 'harbor', 'ivory', 'juniper', 'kelp', 'lumen', 'maple', 'nectar', 'opal', 'pine'];
  const big: CorrectionRecord[] = [];
  for (let i = 0; i < 10000; i++) {
    const m = `${words[i % 16]} ${words[(i * 7) % 16]} ${words[(i * 3) % 16]} ${i % 1500}`;
    big.push(rec(m, `A${i % 900}`, i % 3 ? 'supplierName' : 'placement', null, `Sup ${i % 40}`));
  }
  const bigRag = createRag({ load: () => big });
  let t0 = performance.now();
  await bigRag.retrieve({ material: 'x' }); // build index
  const build = performance.now() - t0;
  const times: number[] = [];
  for (let i = 0; i < 50; i++) {
    t0 = performance.now();
    await bigRag.retrieve({ material: `${words[i % 16]} ${words[(i * 5) % 16]} ${i * 13 % 1500}`, article: `A${i}` });
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  console.log(`      10k records: index build ${build.toFixed(0)} ms, retrieve median ${times[25].toFixed(1)} ms, max ${times[49].toFixed(1)} ms`);
  check('10k retrieval well under 100 ms', times[49] < 100);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
