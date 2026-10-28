// What the page's Analytics section shows: how the AI calls went (time, failures, memory), what has been saved so the work is not
// repeated (corrections, PDF readings), and what this computer can run. Numbers only: no material names, no keys.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { APP_ROOT } from './config';
import { callSummary, readCalls } from './aicalls';
import { stats as correctionStats } from './corrections';
import { LOCAL_BASE, localStatus } from './local';

const gb = (n: number) => Math.round((n / 1024 ** 3) * 10) / 10;

function savedPdfReadings() {
  const dir = path.join(APP_ROOT, 'memory', 'pdf-reads');
  let pdfs = 0;
  let aiPages = 0;
  let bytes = 0;
  try {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const file = path.join(dir, f);
      bytes += fs.statSync(file).size;
      pdfs++;
      try {
        const saved = JSON.parse(fs.readFileSync(file, 'utf8')) as { ai?: Record<string, unknown> };
        aiPages += Object.keys(saved.ai ?? {}).length;
      } catch {
        /* a damaged file just counts as a PDF */
      }
    }
  } catch {
    /* none saved yet */
  }
  return { pdfs, aiPages, megabytes: Math.round((bytes / 1024 ** 2) * 10) / 10 };
}

async function loadedModels() {
  try {
    const res = await fetch(`${LOCAL_BASE}/api/ps`, { signal: AbortSignal.timeout(2000) });
    const body = (await res.json()) as { models?: { name?: string; size?: number }[] };
    return (body.models ?? []).map((m) => ({ name: String(m.name), gb: gb(Number(m.size) || 0) }));
  } catch {
    return [];
  }
}


/** A failure message in plain words, with what to do about it. The full message is kept alongside for anyone who wants it. */
export function whatWentWrong(error: string): { category: string; hint: string } {
  if (/free-models-per-day/i.test(error)) return { category: 'Daily free quota used up', hint: 'Wait for tomorrow, add credit, or move this provider down the order in Settings.' };
  if (/HTTP 429/.test(error)) return { category: 'Rate limit reached', hint: 'Too many requests for now; it usually clears within a minute.' };
  if (/HTTP 404/.test(error)) return { category: 'Model not available to this key', hint: 'Pick another model for this provider in Settings.' };
  if (/HTTP 40[13]/.test(error)) return { category: 'Key rejected', hint: 'Check or replace the key in Settings.' };
  if (/HTTP (5\d\d)/.test(error)) return { category: 'Provider busy or down', hint: 'Temporary on the provider\'s side; the next provider is tried.' };
  if (/timeout|aborted/i.test(error)) return { category: 'No answer in time', hint: 'The model took longer than the wait set in Settings.' };
  if (/expected format/i.test(error)) return { category: 'Answer in the wrong format', hint: 'The model replied, but not in a form the app can read.' };
  if (/fetch failed|ECONNREFUSED/i.test(error)) return { category: 'Could not reach the service', hint: 'For a local model: Ollama is not running.' };
  return { category: 'Other', hint: '' };
}

export async function analytics() {
  const calls = readCalls();
  const local = calls.filter((c) => c.where === 'local');
  const cloud = calls.filter((c) => c.where === 'cloud');
  const seconds = (list: typeof calls) => Math.round(list.reduce((n, c) => n + c.ms, 0) / 1000);
  const failures = new Map<string, { where: string; provider: string; account?: string; model: string; category: string; hint: string; count: number; last: string; example: string }>();
  for (const c of calls.filter((x) => !x.ok)) {
    const { category, hint } = whatWentWrong(c.error ?? '');
    const key = `${c.where}|${c.provider}|${c.account ?? ''}|${c.model}|${category}`;
    const seen = failures.get(key);
    if (seen) {
      seen.count++;
      if (c.at > seen.last) {
        seen.last = c.at;
        seen.example = (c.error ?? '').replace(/\s+/g, ' ').trim();
      }
    } else {
      failures.set(key, { where: c.where, provider: c.provider, ...(c.account ? { account: c.account } : {}), model: c.model, category, hint, count: 1, last: c.at, example: (c.error ?? '').replace(/\s+/g, ' ').trim() });
    }
  }
  const status = await localStatus();
  return {
    generatedAt: new Date().toISOString(),
    calls: {
      total: calls.length,
      first: calls[0]?.at ?? null,
      last: calls[calls.length - 1]?.at ?? null,
      local: { calls: local.length, answered: local.filter((c) => c.ok).length, seconds: seconds(local), wastedSeconds: seconds(local.filter((c) => !c.ok)) },
      cloud: { calls: cloud.length, answered: cloud.filter((c) => c.ok).length, seconds: seconds(cloud), wastedSeconds: seconds(cloud.filter((c) => !c.ok)) },
      byModel: callSummary(),
      failures: [...failures.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)),
      recent: calls.slice(-30).reverse()
    },
    memory: { corrections: correctionStats(), pdfReadings: savedPdfReadings() },
    machine: {
      totalRamGb: gb(os.totalmem()),
      freeRamGb: gb(os.freemem()),
      cpu: os.cpus()[0]?.model.replace(/\s+/g, ' ') ?? 'unknown',
      cores: os.cpus().length,
      ollama: { running: status.running, version: status.version ?? null, installed: status.models.map((m) => ({ name: m.name, gb: gb(m.sizeBytes) })), loaded: await loadedModels() }
    }
  };
}
