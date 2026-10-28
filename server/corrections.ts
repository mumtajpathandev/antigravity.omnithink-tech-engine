// The memory of corrections. Every edit a person makes on screen 5 is appended to one file (never changed or deleted), so it can be
// audited and undone. Screen 3 looks past corrections up by the material they were made for and applies them.
//
// Scope guard: a correction is only reused for the SAME material (same name and same plugin article number). The fields reused
// automatically are the supplier, the supplier article and the section; placement and name edits belong to one style, so they are
// recorded but not reused on other styles.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { APP_ROOT } from './config';

export type CorrectionField = 'supplierName' | 'supplierArticle' | 'section' | 'standardPlacement' | 'placement' | 'materialName' | 'row';
export const REUSABLE_FIELDS: CorrectionField[] = ['supplierName', 'supplierArticle', 'section'];

export interface CorrectionRecord {
  id: string;
  at: string;
  user: string;
  masterStyleID: string;
  devObjectId: string;
  /** what the correction was made for: the plugin's own material name and article number */
  material: string;
  article: string;
  field: CorrectionField;
  before: string | null;
  after: string | null;
  /** where the value came from before the edit: plugin, pdam, ai, history */
  source: string;
  reason?: string;
}

const FILE = path.join(APP_ROOT, 'memory', 'corrections.jsonl');
const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
export const scopeKey = (material: string, article: string | null | undefined) => `${norm(material)}|${norm(article)}`;

export function readAll(): CorrectionRecord[] {
  try {
    return fs
      .readFileSync(FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as CorrectionRecord];
        } catch {
          return []; // a damaged line must not hide the rest of the memory
        }
      });
  } catch {
    return [];
  }
}

export function recordAll(records: Omit<CorrectionRecord, 'id' | 'at' | 'user'>[]): CorrectionRecord[] {
  if (!records.length) return [];
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const now = new Date().toISOString();
  const user = os.userInfo().username;
  const full = records.map((r, i) => ({ id: `${now}#${i}`, at: now, user, ...r }));
  fs.appendFileSync(FILE, full.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  return full;
}

export interface HistoryHit {
  field: CorrectionField;
  value: string;
  at: string;
  user: string;
  id: string;
}

/** The latest reusable correction per field for this material, or an empty list. */
export function historyFor(material: string, article: string | null | undefined, all: CorrectionRecord[] = readAll()): HistoryHit[] {
  const key = scopeKey(material, article);
  const latest = new Map<CorrectionField, CorrectionRecord>();
  for (const r of all) {
    if (!REUSABLE_FIELDS.includes(r.field) || r.after === null || scopeKey(r.material, r.article) !== key) continue;
    const prev = latest.get(r.field);
    if (!prev || r.at >= prev.at) latest.set(r.field, r);
  }
  return [...latest.values()].map((r) => ({ field: r.field, value: r.after as string, at: r.at, user: r.user, id: r.id }));
}

export function stats() {
  const all = readAll();
  return { total: all.length, materials: new Set(all.map((r) => scopeKey(r.material, r.article))).size, latest: all.at(-1)?.at ?? null };
}
