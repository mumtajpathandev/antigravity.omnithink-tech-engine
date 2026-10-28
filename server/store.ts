// Saved runs: golden-dataset folders written by this server ("ui") or by the standalone Python
// script ("script"). Both use the same layout, so either tool's output can be browsed here.
//
//   <root>/.../<run>/golden-dataset/<MASTER>-<uid>/{tech-engine-input.json, summary.json, sketch.pdf, ...}

import fs from 'node:fs';
import path from 'node:path';
import { APP_ROOT, SCRIPT_DIR } from './config';
import { dedupeDevObjects } from './bom';
import type { SourceRun, StyleSummary, TechEngineInput } from '../src/harvest/types';

export const UI_DATA_DIR = path.join(APP_ROOT, 'harvest-data');
const ROOTS: Record<string, string> = { ui: UI_DATA_DIR, script: path.resolve(SCRIPT_DIR) };
const ENVS = ['DEV', 'UAT', 'PREPROD', 'PROD'];

const SAFE_SEGMENT = /^[^\\/:*?"<>|\x00-\x1f]+$/;

export function safeName(value: unknown): string {
  const cleaned = String(value).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/^[ .]+|[ .]+$/g, '');
  return cleaned || '_';
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8').replace(/^﻿/, '')) as T;
  } catch {
    return null;
  }
}

function subdirs(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      // a Windows junction or symlink (the "offline" link) reports as a link, not a directory
      .filter((e) => e.isDirectory() || (e.isSymbolicLink() && fs.statSync(path.join(dir, e.name), { throwIfNoEntry: false })?.isDirectory()))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/** runId is "<root>:<relative path>"; resolve it and refuse anything outside that root. */
export function resolveRun(runId: string): string {
  const [rootKey, ...rest] = runId.split(':');
  const root = ROOTS[rootKey];
  const rel = rest.join(':');
  if (!root || !rel) throw new Error('Unknown run');
  const segments = rel.split('/');
  if (!segments.every((s) => s && s !== '..' && s !== '.' && SAFE_SEGMENT.test(s))) throw new Error('Invalid run');
  const dir = path.resolve(root, ...segments);
  if (!dir.startsWith(root + path.sep)) throw new Error('Invalid run');
  return dir;
}

export function resolveStyle(ref: string): { dir: string; runId: string; folder: string } {
  const cut = ref.lastIndexOf('|');
  const runId = ref.slice(0, cut);
  const folder = ref.slice(cut + 1);
  if (cut < 0 || !SAFE_SEGMENT.test(folder) || folder === '..' || folder === '.') throw new Error('Invalid style reference');
  const dir = path.join(resolveRun(runId), 'golden-dataset', folder);
  if (!fs.existsSync(path.join(dir, 'tech-engine-input.json'))) throw new Error('Style not found');
  return { dir, runId, folder };
}

function styleFolders(runDir: string): string[] {
  return subdirs(path.join(runDir, 'golden-dataset')).filter((f) =>
    fs.existsSync(path.join(runDir, 'golden-dataset', f, 'tech-engine-input.json'))
  );
}

const OFFLINE_NAME = 'offline';
const OFFLINE_GROUP = 'offline snapshot';

/** The saved run each environment's "offline" link points at (absent when there is no such link). */
export function offlineInfo(): Partial<Record<string, { run: string; styleCount: number }>> {
  const out: Partial<Record<string, { run: string; styleCount: number }>> = {};
  for (const env of ENVS) {
    const dir = path.join(ROOTS.script, env, OFFLINE_NAME);
    try {
      const count = styleFolders(dir).length;
      if (count) out[env] = { run: path.basename(fs.realpathSync(dir)), styleCount: count };
    } catch {
      /* no link */
    }
  }
  return out;
}

export function listRuns(): SourceRun[] {
  const runs: SourceRun[] = [];
  const add = (rootKey: 'ui' | 'script', relParts: string[], group: string, writable: boolean) => {
    const dir = path.join(ROOTS[rootKey], ...relParts);
    const count = styleFolders(dir).length;
    if (!count) return;
    let modified = 0;
    try {
      modified = fs.statSync(path.join(dir, 'golden-dataset')).mtimeMs;
    } catch {
      /* keep 0 */
    }
    runs.push({ runId: `${rootKey}:${relParts.join('/')}`, label: relParts[relParts.length - 1], group, styleCount: count, writable, modified });
  };
  for (const env of [...ENVS, 'INPUT']) {
    for (const run of subdirs(path.join(UI_DATA_DIR, env))) add('ui', [env, run], env === 'INPUT' ? 'Loaded inputs' : `${env}, harvested here`, true);
  }
  for (const env of ENVS) {
    for (const run of subdirs(path.join(ROOTS.script, 'reference-data', env))) add('script', ['reference-data', env, run], `${env}, saved reference (script)`, false);
    // "<ENV>/offline" is a link to the saved run to fall back on: it is its own group, never one of the ordinary runs.
    for (const run of subdirs(path.join(ROOTS.script, env))) {
      if (run === OFFLINE_NAME) add('script', [env, run], `${env}, ${OFFLINE_GROUP}`, false);
      else add('script', [env, run], `${env}, script runs`, false);
    }
  }
  for (const run of subdirs(path.join(ROOTS.script, 'REBUILD'))) add('script', ['REBUILD', run], 'Offline rebuilds (script)', false);
  return runs.sort((a, b) => a.group.localeCompare(b.group) || b.label.localeCompare(a.label));
}

/** A workspace draft is a sketch whose PDAM path is outside /Domain/ProductLibrary (unpublished). */
function isDraftDoc(dir: string): boolean | undefined {
  const doc = readJson<{ path?: string }>(path.join(dir, 'source-document.json'));
  return doc?.path ? !doc.path.startsWith('/Domain/ProductLibrary') : undefined;
}

export function summarize(ref: string, folder: string, dir: string, ti: TechEngineInput): StyleSummary {
  const devObjects = dedupeDevObjects(ti.developmentObjectParts);
  const materialCount = devObjects.reduce(
    (n, d) => n + (d.parts ?? []).reduce((m, p) => m + (p.materials?.length ?? 0), 0),
    0
  );
  return {
    ref,
    folder,
    masterStyleID: ti.masterStyleID,
    uid: ti.mstsDocumentUid,
    season: ti.seasonYear ?? null,
    classification: ti.classification,
    partCount: ti.parts?.length ?? 0,
    materialCount,
    devObjectCount: devObjects.length,
    hasSketch: fs.existsSync(path.join(dir, 'sketch.pdf')),
    isDraft: isDraftDoc(dir)
  };
}

// Reading and summarising every saved style on each request was slow (300-600 ms), so summaries are kept in
// memory and rebuilt only when one of the style's files changes (size/mtime signature).
const summaryCache = new Map<string, { sig: string; summary: StyleSummary }>();
const stamp = (file: string) => {
  try {
    const s = fs.statSync(file);
    return `${s.mtimeMs}:${s.size}`;
  } catch {
    return '-';
  }
};

export function listStyles(runId: string): StyleSummary[] {
  const runDir = resolveRun(runId);
  const out: StyleSummary[] = [];
  for (const folder of styleFolders(runDir)) {
    const dir = path.join(runDir, 'golden-dataset', folder);
    const ref = `${runId}|${folder}`;
    const sig = ['tech-engine-input.json', 'source-document.json', 'sketch.pdf'].map((f) => stamp(path.join(dir, f))).join('|');
    const hit = summaryCache.get(ref);
    if (hit?.sig === sig) {
      out.push(hit.summary);
      continue;
    }
    const ti = readJson<TechEngineInput>(path.join(dir, 'tech-engine-input.json'));
    if (!ti) continue;
    const summary = summarize(ref, folder, dir, ti);
    summaryCache.set(ref, { sig, summary });
    out.push(summary);
  }
  return out.sort((a, b) => String(a.masterStyleID).localeCompare(String(b.masterStyleID)));
}

/** Read every saved run once at startup so the first click in the UI is not slow. */
export function warmCache(): void {
  try {
    for (const run of listRuns()) listStyles(run.runId);
  } catch {
    /* the cache is an optimisation only */
  }
}

/**
 * One list per environment, no run picker: every saved style for that environment (and any loaded
 * inputs), newest copy first, one entry per PDAM document.
 */
export function listEnvStyles(env: string, source: 'latest' | 'offline' = 'latest'): StyleSummary[] {
  const offlineGroup = `${env}, ${OFFLINE_GROUP}`;
  const runs = listRuns()
    .filter((r) => (source === 'offline' ? r.group === offlineGroup : r.group === 'Loaded inputs' || (r.group.startsWith(`${env},`) && r.group !== offlineGroup)))
    // Newest run wins. Run folders are named by their timestamp (YYYYMMDD_HHMMSS, from either tool), which stays right when a
    // folder is copied; a folder's own modified time does not (a copied reference run looks newer than the run it came from).
    .sort((a, b) => b.label.localeCompare(a.label) || b.modified - a.modified);
  const seen = new Set<string>();
  const out: StyleSummary[] = [];
  for (const run of runs) {
    for (const s of listStyles(run.runId)) {
      const key = s.uid ?? s.ref;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...s, origin: run.group === 'Loaded inputs' ? 'loaded' : run.writable ? 'harvested' : 'saved' });
    }
  }
  return out.sort((a, b) => String(a.masterStyleID).localeCompare(String(b.masterStyleID)) || String(b.season).localeCompare(String(a.season)));
}

export function readStyle(ref: string) {
  const { dir } = resolveStyle(ref);
  const techInput = readJson<TechEngineInput>(path.join(dir, 'tech-engine-input.json'));
  if (!techInput) throw new Error('tech-engine-input.json is not valid JSON');
  return {
    dir,
    techInput,
    summary: readJson<Record<string, unknown>>(path.join(dir, 'summary.json')),
    hasSketch: fs.existsSync(path.join(dir, 'sketch.pdf'))
  };
}

/** BOM PDFs the Python script wrote: boms/<DevObject>/<DevObject>.pdf, keyed by dev object id. */
export function bomPdfs(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const bomsDir = path.join(dir, 'boms');
  for (const folder of subdirs(bomsDir)) {
    for (const f of fs.readdirSync(path.join(bomsDir, folder))) {
      if (f.toLowerCase().endsWith('.pdf')) out[folder] = `boms/${folder}/${f}`;
    }
  }
  return out;
}

/** Allow only the sketch and BOM PDFs, by exact relative name. */
export function styleFile(ref: string, name: string): string {
  const { dir } = resolveStyle(ref);
  const ok = name === 'sketch.pdf' || /^boms\/[^/\\:*?"<>|]+\/[^/\\:*?"<>|]+\.pdf$/i.test(name);
  if (!ok || name.includes('..')) throw new Error('File not allowed');
  const file = path.resolve(dir, ...name.split('/'));
  if (!file.startsWith(dir + path.sep) || !fs.existsSync(file)) throw new Error('File not found');
  return file;
}

/**
 * Purge History: delete everything this app saved (harvested runs and loaded inputs) under
 * harvest-data/. Never touches the Python script's runs, reference data or rebuilds.
 */
export function purgeHistory(): { runs: number; styles: number } {
  const mine = listRuns().filter((r) => r.writable);
  const result = { runs: mine.length, styles: mine.reduce((n, r) => n + r.styleCount, 0) };
  if (path.basename(UI_DATA_DIR) !== 'harvest-data') throw new Error('Refusing to purge an unexpected folder');
  for (const entry of fs.existsSync(UI_DATA_DIR) ? fs.readdirSync(UI_DATA_DIR) : []) {
    fs.rmSync(path.join(UI_DATA_DIR, entry), { recursive: true, force: true });
  }
  return result;
}

/** Write one harvested style (or a loaded input) into a new writable run folder. */
/** Local time with milliseconds, e.g. 20261026_153012-407: matches the Python tool's local names, and two runs in one second do not collide. */
function runStamp(): string {
  const d = new Date();
  const p = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${p(d.getMilliseconds(), 3)}`;
}

export function createRun(group: string): { runId: string; goldenDir: string } {
  const stamp = runStamp();
  const goldenDir = path.join(UI_DATA_DIR, group, stamp, 'golden-dataset');
  fs.mkdirSync(goldenDir, { recursive: true });
  return { runId: `ui:${group}/${stamp}`, goldenDir };
}

/**
 * tech-engine-input.json is what makes a folder count as a style, so it is written last: a style is
 * never listed while its sketch or summary is still missing.
 */
export function writeStyleFiles(goldenDir: string, folder: string, files: Record<string, string | Buffer | null | undefined>): string {
  const dir = path.join(goldenDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  const marker = 'tech-engine-input.json';
  for (const [name, content] of Object.entries(files)) {
    if (content != null && name !== marker) fs.writeFileSync(path.join(dir, name), content);
  }
  if (files[marker] != null) fs.writeFileSync(path.join(dir, marker), files[marker]!);
  return dir;
}
