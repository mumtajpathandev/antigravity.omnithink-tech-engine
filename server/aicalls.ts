// A record of every AI call (local or hosted), kept so decisions about which model to use can be made from real numbers: how long
// it took, whether it answered, how many rows, and how much memory the computer had free. One JSON line per attempt, appended and
// never changed. It holds no material names, articles or supplier values: only counts, sizes, timings and error text.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { APP_ROOT } from './config';

export interface AiCallRecord {
  at: string;
  /** what was asked: the task's tool name (matching decisions, legend structure, ...) */
  task: string;
  provider: string;
  /** which key of that provider answered or failed: the name given in the page, 'key N' or 'env key N' (absent for local) */
  account?: string;
  model: string;
  /** 'local' ran on this computer; 'cloud' went to a hosted endpoint */
  where: 'local' | 'cloud';
  ok: boolean;
  ms: number;
  /** rows the prompt asked about, and list items the model answered (when the task is per row) */
  rowsAsked?: number;
  itemsAnswered?: number;
  promptChars: number;
  /** why it failed (HTTP status, timeout, malformed answer) */
  error?: string;
  /** an earlier attempt for the same question failed and this one is the fallback */
  fallbackFrom?: string;
  freeRamGb: number;
  totalRamGb: number;
}

const FILE = path.join(APP_ROOT, 'memory', 'ai-calls.jsonl');
const gb = (n: number) => Math.round((n / 1024 ** 3) * 10) / 10;

export function recordCall(r: Omit<AiCallRecord, 'at' | 'freeRamGb' | 'totalRamGb'>): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const line: AiCallRecord = { at: new Date().toISOString(), ...r, freeRamGb: gb(os.freemem()), totalRamGb: gb(os.totalmem()) };
    fs.appendFileSync(FILE, JSON.stringify(line) + '\n');
  } catch {
    /* the record must never break the call it describes */
  }
}

export function readCalls(): AiCallRecord[] {
  try {
    return fs
      .readFileSync(FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .flatMap((l) => {
        try {
          return [JSON.parse(l) as AiCallRecord];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

const pct = (sorted: number[], p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0);

/** Per model: calls, how many answered, typical and slow times, and seconds per row. */
export function callSummary() {
  const groups = new Map<string, AiCallRecord[]>();
  for (const c of readCalls()) {
    const key = `${c.where}|${c.provider}|${c.model}|${c.task}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.entries()].map(([key, list]) => {
    const [where, provider, model, task] = key.split('|');
    const ok = list.filter((c) => c.ok);
    const times = ok.map((c) => c.ms).sort((a, b) => a - b);
    const rows = ok.reduce((n, c) => n + (c.rowsAsked ?? 0), 0);
    const errors = new Map<string, number>();
    for (const c of list.filter((x) => !x.ok)) errors.set((c.error ?? 'unknown').slice(0, 60), (errors.get((c.error ?? 'unknown').slice(0, 60)) ?? 0) + 1);
    return {
      where, provider, model, task,
      calls: list.length,
      answered: ok.length,
      failed: list.length - ok.length,
      medianSeconds: Math.round(pct(times, 0.5) / 100) / 10,
      slowestSeconds: Math.round((times[times.length - 1] ?? 0) / 100) / 10,
      secondsPerRow: rows ? Math.round(ok.reduce((n, c) => n + c.ms, 0) / rows / 100) / 10 : null,
      lowestFreeRamGb: Math.min(...list.map((c) => c.freeRamGb)),
      commonFailures: [...errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([error, count]) => ({ error, count }))
    };
  });
}
