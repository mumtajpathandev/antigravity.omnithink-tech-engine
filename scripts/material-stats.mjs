// Standalone, read-only survey of the PDAM Material catalog. Needs only Node 18+ (no install, no other files).
//
//   node material-stats.mjs <PDAM base URL> [maxDocs] [cookie|token]
//
// It asks for your session cookie (or bearer token) at a hidden prompt, keeps it in memory only, reads Material
// documents with the NXQL query "SELECT * FROM Material" (a read), and writes material-stats.json into the folder
// you run it from: counts and a few example names only, no credentials. Please share that file.

import fs from 'node:fs';

const baseUrl = (process.argv[2] ?? '').replace(/\/+$/, '');
const maxDocs = Number(process.argv[3]) || 10000;
const mode = process.argv[4] === 'token' ? 'token' : 'cookie';
if (!/^https:\/\//.test(baseUrl)) {
  console.error('Usage: node material-stats.mjs <https://pdam base url> [maxDocs] [cookie|token]');
  process.exit(1);
}
const host = new URL(baseUrl).host;

function askHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    let value = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value.trim());
          return;
        }
        if (ch === '\u0003') process.exit(1); // Ctrl+C
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function readMaterials(secret, limit) {
  const headers = {
    'Content-Type': 'application/json',
    'X-NXproperties': '*',
    ...(mode === 'token' ? { Authorization: `Bearer ${secret.replace(/^bearer\s+/i, '')}` } : { Cookie: secret })
  };
  const entries = [];
  for (let page = 0; ; page++) {
    const res = await fetch(`${baseUrl}/api/v1/automation/Document.Query`, {
      method: 'POST',
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({ params: { query: 'SELECT * FROM Material WHERE ecm:isTrashed = 0', pageSize: 100, currentPageIndex: page } })
    });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) {
      throw new Error(`PDAM answered HTTP ${res.status}: the cookie/token is probably expired or wrong.`);
    }
    const body = await res.json();
    entries.push(...(body.entries ?? []));
    if (entries.length >= limit || !body.entries?.length || !body.isNextPageAvailable) return entries.slice(0, limit);
    if (page % 10 === 9) console.log(`  ${entries.length} read...`);
  }
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const supplierKey = (s) =>
  norm(s.replace(/\*\*[^*]*\*\*/g, '')).replace(/\b(co|ltd|limited|inc|corp|corporation|company|plc|sa|bic)\b/g, '').replace(/\s+/g, ' ').trim();
const count = (items, key) => {
  const m = {};
  for (const i of items) m[String(key(i))] = (m[String(key(i))] ?? 0) + 1;
  return m;
};

const secret = await askHidden(`${mode === 'token' ? 'Bearer token' : 'Cookie header value'} for ${host} (hidden): `);
if (!secret) throw new Error('Nothing entered');
console.log(`Reading up to ${maxDocs} Material documents from ${host} (read-only)...`);
const docs = await readMaterials(secret, maxDocs);

const rows = docs.flatMap((d) => {
  const p = d.properties ?? {};
  const info = Array.isArray(p['material_supplier:materialSupplierInfo']) ? p['material_supplier:materialSupplierInfo'] : [];
  const name = String(p['material:materialName'] ?? d.title ?? '');
  return (info.length ? info : [{}]).map((s) => ({
    uid: d.uid,
    top: (d.path ?? '').split('/').slice(0, 3).join('/'),
    name,
    status: String(s.materialStatus ?? ''),
    supplier: String(s.supplierName ?? ''),
    article: String(s.supplierArticleNumber ?? '')
  }));
});

const byName = new Map();
for (const r of rows) byName.set(norm(r.name), [...(byName.get(norm(r.name)) ?? []), r]);
const multi = [...byName.entries()].filter(([, v]) => new Set(v.map((x) => x.uid)).size > 1);
const disagree = multi.filter(([, v]) => new Set(v.map((x) => `${supplierKey(x.supplier)}|${norm(x.article)}`)).size > 1);
const realDisagree = disagree.filter(([, v]) => new Set(v.map((x) => norm(x.article))).size > 1); // different articles, not just a supplier spelling
const spellingOnly = disagree.length - realDisagree.length;
const shortNames = [...byName.keys()].filter((k) => k.split(' ').length <= 2);
const containedShort = shortNames.filter((k) => [...byName.keys()].some((o) => o !== k && o.includes(k)));

const stats = {
  host,
  readAt: new Date().toISOString(),
  capped: docs.length >= maxDocs,
  documents: docs.length,
  supplierEntries: rows.length,
  topFolders: count(rows, (r) => r.top),
  statuses: count(rows, (r) => r.status || '(none)'),
  supplierEntriesPerDoc: count(docs, (d) => (Array.isArray(d.properties?.['material_supplier:materialSupplierInfo']) ? d.properties['material_supplier:materialSupplierInfo'].length : 0)),
  nameWordCounts: count([...byName.keys()], (k) => Math.min(k.split(' ').length, 8)),
  distinctNames: byName.size,
  namesOnSeveralDocuments: multi.length,
  ofThoseDisagreeingOnSupplierOrArticle: disagree.length,
  disagreeingOnArticleNotJustSupplierSpelling: realDisagree.length,
  spellingOnly,
  namesWithTwoWordsOrFewer: shortNames.length,
  shortNamesInsideLongerNames: containedShort.length,
  entriesWithoutArticleNumber: rows.filter((r) => !r.article).length,
  examplesDifferentArticle: realDisagree.slice(0, 15).map(([k, v]) => ({ name: k.slice(0, 70), copies: v.slice(0, 4).map((x) => `${x.supplier} | ${x.article} | ${x.status}`) })),
  examplesSupplierSpelling: disagree.filter((d) => !realDisagree.includes(d)).slice(0, 10).map(([k, v]) => ({ name: k.slice(0, 70), copies: v.slice(0, 4).map((x) => `${x.supplier} | ${x.article}`) })),
  examplesShortNames: shortNames.slice(0, 30)
};

const out = 'material-stats.json';
fs.writeFileSync(out, JSON.stringify(stats, null, 2));
const { examplesDifferentArticle, examplesSupplierSpelling, examplesShortNames, ...headline } = stats;
console.log(JSON.stringify(headline, null, 2));
console.log(`\nWritten to ${out}. Please share that file. No credentials were saved.`);
