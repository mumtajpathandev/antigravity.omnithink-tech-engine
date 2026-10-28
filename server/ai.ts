// Optional AI suggestion step. Off unless a key is set, runs only when asked, and only SUGGESTS: it can pick one of the
// catalog candidates PDAM returned for a row, never invent a value.
//
// The key comes from the page (kept in memory for the session, or saved encrypted: see aikey.ts) or from an environment
// variable, which wins:
//   ANTHROPIC_API_KEY / ANTHROPIC_MODEL    Anthropic's Messages API        (default model claude-sonnet-5-5)
//   OPENROUTER_API_KEY / OPENROUTER_MODEL  OpenRouter chat completions     (default anthropic/claude-sonnet-5.5)
//   OPENAI_API_KEY / OPENAI_MODEL          OpenAI chat completions         (model required; not tested yet)
//   GEMINI_API_KEY / GEMINI_MODEL          Gemini, OpenAI-compatible API   (model required; not tested yet)
//   GROQ_API_KEY / GROQ_MODEL              Groq (default llama-3.3-70b-versatile; own free quota)
//   CEREBRAS_API_KEY / CEREBRAS_MODEL      Cerebras (model required; own free quota)
//   MISTRAL_API_KEY / MISTRAL_MODEL        Mistral (default mistral-small-latest; own free tier)
// Set several keys and every one is tried in turn when the one before fails (e.g. rate-limited): AI_PROVIDER's first, then the
// order chosen in Settings (hostedOrder). Within a provider, its environment keys come first (a variable may hold several keys
// separated by commas), then the keys entered in the page, in the order they were added. A key works for every model of its provider: the models are a per-provider list in Settings (see effectiveModels). An OpenRouter-format key (sk-or-...) put
// in ANTHROPIC_API_KEY is treated as OpenRouter's.
//   LOCAL_MODEL / AI_LOCAL=off             Ollama on this computer, no key (see local.ts)
// Local first (a Settings choice, on by default): a running Ollama with an installed chat model answers; the keyed endpoint above
// is only called when local is missing or fails. With it off, local is the last resort, tried only when no hosted key worked.
// AI_LOCAL=off turns local off.
//
// What leaves this machine: the placement, material name and article of the rows it is asked about, plus the candidate
// names/suppliers/articles, to the chosen provider (and, via OpenRouter, to the model provider behind it). Nothing else
// (no PDAM credentials, no PDFs). With the local provider nothing leaves this machine.

import { AI_PROVIDERS, type AiLogEvent, type AiProviderId,type AiResult, type AiSuggestion, type CatalogRow, type FlexRow } from '../src/harvest/types';
import { storedKeys, storedKeySource } from './aikey';
import { getSettings } from './settings';
import { applyCandidate } from './catalog';
import os from 'node:os';
import { callSummary, recordCall } from './aicalls';
import { LOCAL_BASE, localStatus } from './local';
import { beginAttempt, emit, newRunId } from './ailog';
import { whatWentWrong } from './analytics';

export type AiProvider = AiProviderId;

export interface Choice {
  provider: AiProviderId;
  key: string;
  model: string;
  /** size of a local model on disk, to tell a small one from a capable one */
  sizeBytes?: number;
  /** which key this is, to tell accounts of the same provider apart: the name given in the page, 'key N', or 'env key N' */
  account?: string;
  /** the id of the key entered in the page, when it is one (see aikey.ts) */
  keyId?: string;
}

const meta = (id: AiProviderId) => AI_PROVIDERS.find((p) => p.id === id)!;
export const ENV_NAMES: Record<AiProviderId, { key: string; model: string }> = {
  anthropic: { key: 'ANTHROPIC_API_KEY', model: 'ANTHROPIC_MODEL' },
  openrouter: { key: 'OPENROUTER_API_KEY', model: 'OPENROUTER_MODEL' },
  openai: { key: 'OPENAI_API_KEY', model: 'OPENAI_MODEL' },
  gemini: { key: 'GEMINI_API_KEY', model: 'GEMINI_MODEL' },
  groq: { key: 'GROQ_API_KEY', model: 'GROQ_MODEL' },
  cerebras: { key: 'CEREBRAS_API_KEY', model: 'CEREBRAS_MODEL' },
  mistral: { key: 'MISTRAL_API_KEY', model: 'MISTRAL_MODEL' },
  local: { key: '', model: 'LOCAL_MODEL' } // no key
};
const PRIORITY: AiProviderId[] = ['anthropic', 'openrouter', 'groq', 'cerebras', 'mistral', 'gemini', 'openai'];
const localOff = () => process.env.AI_LOCAL?.trim().toLowerCase() === 'off';

/** The keys in the environment variable of a provider (a comma-separated value is several keys; blanks are ignored). */
export function envKeysOf(id: AiProviderId): string[] {
  const env = process.env;
  const split = (v: string | undefined) => (v ?? '').split(',').map((k) => k.trim()).filter(Boolean);
  if (!ENV_NAMES[id].key) return [];
  const own = split(env[ENV_NAMES[id].key]);
  // an OpenRouter key (sk-or-...) put in ANTHROPIC_API_KEY is OpenRouter's, not Anthropic's
  if (id === 'anthropic') return own.filter((k) => !k.startsWith('sk-or-'));
  if (id === 'openrouter') return [...own, ...split(env.ANTHROPIC_API_KEY).filter((k) => k.startsWith('sk-or-') && !own.includes(k))];
  return own;
}

/** The models tried for a hosted provider, in order: the list chosen in Settings; else (migration) the distinct models older versions saved with its keys, in key order; else its default (the environment's <PROVIDER>_MODEL first); else none, and the provider is not used until a model is set. */
export function effectiveModels(id: AiProviderId): string[] {
  const chosen = getSettings().ai.models[id];
  if (chosen?.length) return [...chosen];
  const legacy = [...new Set(storedKeys().filter((k) => k.provider === id && k.legacyModel).map((k) => k.legacyModel))];
  if (legacy.length) return legacy;
  const fallback = process.env[ENV_NAMES[id].model]?.trim() || meta(id).defaultModel;
  return fallback ? [fallback] : [];
}

// Local first: when Ollama is running with an installed chat model, that model answers. The configured endpoint (a key from
// the environment or the page) is only called when the local model is not there or fails. AI_LOCAL=off skips local entirely.
// Preference among installed models: LOCAL_MODEL (or the model chosen in the page for the local provider), then the list below,
// then any installed model that is not an embedding model.
const LOCAL_PREFERENCE = ['qwen2.5:7b', 'granite3.3:2b'];
let localCache: { at: number; wanted: string; choice: Choice | null } = { at: 0, wanted: '', choice: null };

async function loadedModels(): Promise<Set<string>> {
  try {
    const res = await fetch(`${LOCAL_BASE}/api/ps`, { signal: AbortSignal.timeout(2000) });
    const body = (await res.json()) as { models?: { name?: string }[] };
    return new Set((body.models ?? []).map((m) => String(m.name)));
  } catch {
    return new Set();
  }
}

async function localChoice(): Promise<Choice | null> {
  if (localOff()) {
    localCache = { at: Date.now(), wanted: '', choice: null };
    return null;
  }
  const stored = storedKeys().find((k) => k.provider === 'local');
  // LOCAL_MODEL wins, then the model chosen in Settings, then the one chosen for the local provider in the page
  const wanted = process.env.LOCAL_MODEL?.trim() || getSettings().ai.localModel || stored?.legacyModel || '';
  if (Date.now() - localCache.at < 15_000 && localCache.wanted === wanted) return localCache.choice;
  const { running, models } = await localStatus();
  const has = (n: string) => models.some((m) => m.name === n || m.name === `${n}:latest`);
  // A model that does not fit in free memory makes the whole computer swap to disk: take the next one down instead.
  const loaded = running ? await loadedModels() : new Set<string>();
  const size = (n: string) => models.find((m) => m.name === n || m.name === `${n}:latest`)?.sizeBytes ?? 0;
  const fits = (n: string) => os.freemem() + (loaded.has(n) || loaded.has(`${n}:latest`) ? size(n) : 0) >= size(n) * 1.2;
  const chat = models.filter((m) => !/embed/i.test(m.name)).sort((a, b) => a.sizeBytes - b.sizeBytes);
  const model = [wanted, ...LOCAL_PREFERENCE].find((n) => n && has(n) && fits(n)) ?? chat[0]?.name;
  const choice: Choice | null = running && model ? { provider: 'local', key: '', model, sizeBytes: size(model) } : null;
  localCache = { at: Date.now(), wanted, choice };
  return choice;
}

/** Every (model, key) pair in the order they are tried: providers as ordered in Settings (AI_PROVIDER's first); within a provider model by model (first model on every key, then the next model), and for one model the environment keys first, then the keys entered in the page in the order they were added. Never the local provider. */
export function cloudChoices(): Choice[] {
  const wanted = process.env.AI_PROVIDER?.trim().toLowerCase();
  const saved = storedKeys().filter((k) => k.provider !== 'local');
  // a provider missing from the chosen order is tried after the listed ones rather than dropped
  const order = getSettings().ai.hostedOrder;
  const providers = [...new Set<AiProviderId>([...PRIORITY.filter((id) => id === wanted), ...order, ...PRIORITY])];
  const list: Choice[] = [];
  for (const id of providers) {
    const keys: { key: string; account: string; keyId?: string }[] = envKeysOf(id).map((key, i) => ({ key, account: `env key ${i + 1}` }));
    saved.filter((k) => k.provider === id).forEach((k, i) => keys.push({ key: k.key, account: k.label || `key ${i + 1}`, keyId: k.id }));
    // key-major: key 1 tries every model in order, then key 2 tries every model, and so on
    for (const k of keys) for (const model of effectiveModels(id)) list.push({ provider: id, key: k.key, model, account: k.account, ...(k.keyId ? { keyId: k.keyId } : {}) });
  }
  return list;
}
const cloudChoice = (): Choice | null => cloudChoices()[0] ?? null;

/** What is used first (from the last check of Ollama): local or the endpoint, as Settings orders them. */
function choose(): Choice | null {
  const local = localOff() ? null : localCache.choice;
  return getSettings().ai.localFirst ? local ?? cloudChoice() : cloudChoice() ?? local;
}

/** The local model the app would use now (after a check of Ollama, cached for 15 s), or null. */
export async function activeLocalModel(): Promise<string | null> {
  return (await localChoice())?.model ?? null;
}

/** Look at Ollama again (cached for 15 s); the page and the AI routes call this before they ask. */
export async function aiReady(): Promise<boolean> {
  await localChoice();
  return choose() !== null;
}
export const aiAvailable = () => choose() !== null;
/** Where the key in use comes from: the environment, or a key entered in the page (this session / saved). Local needs none. */
export function aiKeySource(): 'env' | 'session' | 'saved' | undefined {
  const used = choose();
  if (!used) return undefined;
  if (used.provider === 'local') return storedKeySource(storedKeys().find((k) => k.provider === 'local')?.id) ?? 'session';
  return used.keyId ? storedKeySource(used.keyId) : 'env';
}

/** Try local first (or last, per Settings) and the endpoints in their order. `model` overrides the model of whichever is tried first. Returns who answered. */
interface Attempt { provider: AiProviderId; model: string; ms: number; error: string; account?: string }
/** Total time one ask() call may spend starting attempts; the attempt in flight still finishes or times out. */
const ASK_BUDGET_MS = 120_000;
const who = (c: { provider: string; account?: string }) => (c.account ? `${c.provider} (${c.account})` : c.provider);
async function ask(task: Task, content: string, model?: string, rows?: number, context?: string): Promise<{ got: unknown; choice: Choice; ms: number; failed: Attempt[] }> {
  const runId = newRunId();
  const runStarted = Date.now();
  const log = (e: Omit<AiLogEvent, 'seq' | 'at' | 'runId' | 'task' | 'context'>) => emit({ runId, task: task.toolName, ...(context ? { context } : {}), ...e });
  const secs = (ms: number) => (ms / 1000).toFixed(1);
  const clouds = cloudChoices();
  let local = await localChoice();
  let tooSmall = '';
  if (local && clouds.length && task.localMinBytes && (local.sizeBytes ?? 0) < task.localMinBytes) {
    console.log(`Local ${local.model} is too small for ${task.toolName}: trying ${who(clouds[0])} first and the local model last.`);
    tooSmall = local.model;
  }
  // local first only when Settings say so AND it is big enough for this task; otherwise it is the last resort, never dropped
  const order = (getSettings().ai.localFirst && !tooSmall ? [local, ...clouds] : [...clouds, local]).filter((c): c is Choice => c !== null);
  const providers = [...new Set(order.map((c) => c.provider))];
  log({ kind: 'start', message: `Asking for ${context ?? task.toolName}: ${providers.length ? `trying ${providers.length > 1 ? `${providers[0]} first, then ${providers.slice(1).join(', ')}` : providers[0]}` : 'no AI is set up'}` });
  if (tooSmall) log({ kind: 'skip', provider: 'local', model: tooSmall, where: 'local', message: `Local model ${tooSmall} is too small for this task: trying ${who(clouds[0])} first, the local model only if every hosted key fails` });
  if (!order.length) {
    log({ kind: 'end', ms: Date.now() - runStarted, message: 'Nothing to ask: AI is not enabled (install a local model, or enter a key in the AI card)' });
    throw new Error('AI is not enabled: install a local model (Ollama), or enter a key in the AI card.');
  }
  if (model) order[0] = { ...order[0], model };
  let last: unknown;
  const failed: Attempt[] = [];
  const deadKeys = new Set<string>(); // keys that cannot be used now (no credits, quota, rejected): their other models are not tried
  const keyOf = (c: Choice) => `${c.provider}|${c.keyId ?? c.account ?? ''}`;
  let stoppedByBudget = false;
  for (const choice of order) {
    if (Date.now() - runStarted > ASK_BUDGET_MS) {
      stoppedByBudget = true;
      log({ kind: 'info', message: `Stopped after the 2-minute limit: no further attempt is started (${failed.length} attempt${failed.length === 1 ? '' : 's'} failed so far)` });
      break;
    }
    if (choice.provider !== 'local' && deadKeys.has(keyOf(choice))) continue;
    const started = Date.now();
    const where = choice.provider === 'local' ? 'local' : 'cloud';
    const label = { provider: choice.provider, model: choice.model, ...(choice.account ? { account: choice.account } : {}), where } as const;
    log({ kind: 'try', ...label, message: `Trying ${who(choice)} / ${choice.model} (${where})` });
    const endAttempt = beginAttempt({ runId, task: task.toolName, ...(context ? { context } : {}), ...label });
    try {
      const got = await withRetry(() => (choice.provider === 'anthropic' ? askAnthropic(choice, task, content) : askCompatible(choice, task, content)), choice.provider === 'local' ? 2 : 3);
      const ms = Date.now() - started;
      log({ kind: 'ok', ...label, ms, message: `${who(choice)} / ${choice.model} answered in ${secs(ms)} s` });
      log({ kind: 'end', ...label, ms: Date.now() - runStarted, message: `Done in ${secs(Date.now() - runStarted)} s: answered by ${who(choice)} / ${choice.model}${failed.length ? ` after ${failed.length} failed attempt${failed.length === 1 ? '' : 's'}` : ''}` });
      recordCall({ task: task.toolName, provider: choice.provider, account: choice.account, model: choice.model, where: choice.provider === 'local' ? 'local' : 'cloud', ok: true, ms, rowsAsked: rows, itemsAnswered: Array.isArray(got) ? got.length : undefined, promptChars: content.length, fallbackFrom: failed.length ? failed[failed.length - 1].provider : undefined });
      console.log(`AI call: ${choice.provider === 'local' ? 'local' : 'cloud'} ${who(choice)}/${choice.model} answered in ${(ms / 1000).toFixed(1)} s${failed.length ? ` after ${failed.map((f) => `${who(f)} failed in ${(f.ms / 1000).toFixed(1)} s`).join(', ')}` : ''}`);
      return { got, choice, ms, failed };
    } catch (err) {
      last = err;
      failed.push({ provider: choice.provider, account: choice.account, model: choice.model, ms: Date.now() - started, error: (err as Error).message.slice(0, 160) });
      recordCall({ task: task.toolName, provider: choice.provider, account: choice.account, model: choice.model, where: choice.provider === 'local' ? 'local' : 'cloud', ok: false, ms: Date.now() - started, rowsAsked: rows, promptChars: content.length, error: (err as Error).message.slice(0, 600), fallbackFrom: failed.length > 1 ? failed[failed.length - 2].provider : undefined });
      const raw = (err as Error).message;
      const why = whatWentWrong(raw);
      log({ kind: 'fail', ...label, ms: Date.now() - started, category: why.category, detail: raw.slice(0, 600), message: `${why.category} (${secs(Date.now() - started)} s).${why.hint ? ` ${why.hint}` : ''}` });
      if (choice.provider !== 'local' && keyLevelFailure((err as Error).message)) {
        deadKeys.add(keyOf(choice));
        console.warn(`${who(choice)} cannot be used right now (${(err as Error).message.replace(/\s+/g, ' ').slice(0, 90)}): its other models are skipped, moving to the next key.`);
        log({ kind: 'skip', provider: choice.provider, ...(choice.account ? { account: choice.account } : {}), where: 'cloud', message: `${who(choice)} cannot be used right now (${why.category.toLowerCase()}): skipping its other models, moving to the next key` });
      }
      if (choice.provider === 'local') console.warn(`Local model ${choice.model} failed (${(err as Error).message.slice(0, 120)}); ${order.length > 1 && order[0] === choice ? `falling back to ${who(order[1])}` : 'no other endpoint left'}.`);
    } finally {
      endAttempt();
    }
  }
  log({ kind: 'end', ms: Date.now() - runStarted, message: `No AI answered after ${secs(Date.now() - runStarted)} s (${failed.length} attempt${failed.length === 1 ? '' : 's'} failed${stoppedByBudget ? ', stopped after the 2-minute limit' : ''})` });
  // Say why EACH provider failed: only the last error would hide the others (a capped free key must not hide a real fault elsewhere).
  if (failed.length > 1 || (stoppedByBudget && failed.length)) {
    const first = (m: string) => m.replace(/\s+/g, ' ').slice(0, 110);
    throw new Error(`No AI answered${stoppedByBudget ? ' (stopped after the 2-minute limit)' : ''}. ${failed.map((f) => `${who(f)} ${f.model}: ${first(f.error)}`).join(' | ')}`);
  }
  if (stoppedByBudget && !last) throw new Error('No AI answered (stopped after the 2-minute limit).');
  throw last;
}
export const aiModel = () => choose()?.model;
export const aiProvider = (): AiProvider | undefined => choose()?.provider;

/** One kind of question for the model: what it is told, the answer shape, and which list in the answer to return. */
export interface Task {
  system: string;
  toolName: string;
  toolDescription: string;
  schema: object;
  /** the property of the answer that holds the list */
  listKey: string;
  /** room for the answer, including a reasoning model's thinking (default 2000) */
  maxTokens?: number;
  /** a local model smaller than this (bytes on disk) is skipped for this task when a hosted endpoint is configured: small models
   *  fail it and cost minutes before the fallback runs */
  localMinBytes?: number;
}

const SCHEMA = {
  type: 'object',
  properties: {
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          row: { type: 'integer', description: 'the row number given in the request' },
          candidate: { type: ['integer', 'null'], description: 'index of the matching candidate, or null if none is clearly the same material' },
          confidence: { type: 'integer', minimum: 0, maximum: 100 },
          reason: { type: 'string', description: 'one short sentence' }
        },
        required: ['row', 'candidate', 'confidence', 'reason']
      }
    }
  },
  required: ['decisions']
} as const;
const TOOL_NAME = 'report_matches';
const TOOL_DESCRIPTION = 'Report, for each row, which catalog candidate (if any) is the same material.';

const SYSTEM =
  'You help match garment bill-of-materials rows to a material catalog. For each row choose the candidate that is the SAME material ' +
  '(same product and same supplier article, allowing for abbreviation, punctuation, case or truncation). If no candidate is clearly the same, ' +
  'answer null: a wrong match is worse than none. Never pick a candidate because it is merely similar in type. Use only the data given.';

const MATCH_TASK: Task = {
  system: SYSTEM,
  toolName: TOOL_NAME,
  toolDescription: TOOL_DESCRIPTION,
  schema: SCHEMA,
  listKey: 'decisions',
  // a 2B local model took about 1.5 minutes for 10 rows and always picked the first candidate: with a hosted key present, a small local model is
  // skipped here as well, with the same setting as legend reading (Settings, default 4 GB; 0 = never skip)
  get localMinBytes() {
    return getSettings().ai.localMinGbForLegend * 1e9;
  }
};

async function fail(res: Response, who: string): Promise<never> {
  const text = (await res.text().catch(() => '')).slice(0, 200);
  throw new Error(`${who} request failed (HTTP ${res.status}): ${text}`);
}

async function askAnthropic(c: Choice, task: Task, content: string): Promise<unknown> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: c.model,
      max_tokens: task.maxTokens ?? 2000,
      system: task.system,
      tools: [{ name: task.toolName, description: task.toolDescription, input_schema: task.schema }],
      tool_choice: { type: 'tool', name: task.toolName },
      messages: [{ role: 'user', content }]
    }),
    signal: AbortSignal.timeout(getSettings().ai.timeoutHostedSeconds * 1000)
  });
  if (!res.ok) await fail(res, 'Anthropic');
  const body = (await res.json()) as { content?: { type: string; input?: Record<string, unknown> }[] };
  return body.content?.find((b) => b.type === 'tool_use')?.input?.[task.listKey];
}

/** OpenRouter, OpenAI and Gemini (and a local Ollama) all answer the OpenAI chat-completions format with function calling. */
async function askCompatible(c: Choice, task: Task, content: string): Promise<unknown> {
  const who = meta(c.provider).label;
  const local = c.provider === 'local';
  const res = await fetch(local ? `${LOCAL_BASE}/v1/chat/completions` : meta(c.provider).compat!, {
    method: 'POST',
    headers: { ...(local ? {} : { Authorization: `Bearer ${c.key}` }), 'content-type': 'application/json', ...(c.provider === 'openrouter' ? { 'X-Title': 'SketchToBOM' } : {}) },
    body: JSON.stringify({
      model: c.model,
      [c.provider === 'openai' ? 'max_completion_tokens' : 'max_tokens']: task.maxTokens ?? 2000,
      // Matching a few rows needs no long chain of thought; OpenRouter passes this on to reasoning models and ignores it for others.
      ...(c.provider === 'openrouter' ? { reasoning: { effort: 'low' } } : {}),
      // Local models: deterministic, no forced tool choice (many reject it; the JSON in the message text is parsed instead).
      ...(local ? { temperature: 0 } : {}),
      messages: [{ role: 'system', content: local ? `${task.system}
Answer with JSON only, no other text, in exactly this shape (every field, every row): ${JSON.stringify(task.schema)}` : task.system }, { role: 'user', content }],
      tools: [{ type: 'function', function: { name: task.toolName, description: task.toolDescription, parameters: task.schema } }],
      ...(local ? {} : { tool_choice: { type: 'function', function: { name: task.toolName } } })
    }),
    // a local model on a CPU can take minutes for a long prompt; a hosted one should answer much sooner (both limits are in Settings)
    signal: AbortSignal.timeout((local ? getSettings().ai.timeoutLocalSeconds : getSettings().ai.timeoutHostedSeconds) * 1000)
  });
  if (!res.ok) await fail(res, who);
  const body = (await res.json()) as { choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[]; content?: string | null } }[]; error?: { message?: string } };
  if (body.error) throw new Error(`${who} error: ${String(body.error.message).slice(0, 200)}`);
  const msg = body.choices?.[0]?.message;
  const decisions = parseList(msg?.tool_calls?.[0]?.function?.arguments, task.listKey) ?? parseList(msg?.content, task.listKey);
  if (decisions === undefined) {
    const said = msg?.tool_calls?.[0]?.function?.arguments ?? msg?.content ?? '';
    throw new MalformedAnswer(String(said).replace(/\s+/g, ' ').slice(0, 160));
  }
  return decisions;
}

class MalformedAnswer extends Error {
  constructor(said = '') {
    super(`The model did not return its answer in the expected format${said ? ` (it said: ${said})` : ' (it said nothing)'}.`);
  }
}

/** The list under `key` in a model's text answer, tolerating code fences or a sentence around the JSON. */
function parseList(raw: string | null | undefined, key: string): unknown {
  if (!raw) return undefined;
  const text = raw.replace(/```(?:json)?/gi, '');
  for (const candidate of [text, text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)]) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown> | unknown[];
      let decisions = Array.isArray(parsed) ? parsed : parsed[key];
      // a small model may name the list differently ("rows", "results"): accept the only list in the answer
      if (!Array.isArray(decisions) && parsed && typeof parsed === 'object') {
        const lists = Object.values(parsed).filter(Array.isArray);
        if (lists.length === 1) decisions = lists[0];
      }
      if (Array.isArray(decisions)) return decisions;
    } catch {
      /* try the next form */
    }
  }
  return undefined;
}

/** Free models are often busy or sloppy: try a few times on a rate limit, a server error or an answer that is not the expected JSON. */
/**
 * True when the failure belongs to the KEY (its account), not to the model: no credits, a used-up daily or monthly quota, a rejected or
 * disabled key. Trying the same key with another model would fail the same way, so the rest of that key's models are skipped.
 * A busy model (503), a model that is not available (404), a timeout or a malformed answer are NOT key problems.
 */
export function keyLevelFailure(message: string): boolean {
  if (/HTTP (401|402|403)/.test(message)) return true;
  if (/HTTP 429/.test(message) && /quota|credit|billing|free-models-per-day|per.?day|daily|exhausted|insufficient/i.test(message)) return true;
  return /insufficient[_ ]?(funds|quota|credit)|out of credits|no credits|billing/i.test(message);
}

async function withRetry(call: () => Promise<unknown>, attempts = 3): Promise<unknown> {
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await call();
    } catch (err) {
      last = err;
      const message = (err as Error).message;
      const retryable = !keyLevelFailure(message) && (err instanceof MalformedAnswer || /HTTP (429|5\d\d)/.test(message));
      if (!retryable || attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, err instanceof MalformedAnswer ? 500 : 2000 * attempt));
    }
  }
  throw last;
}

export async function suggest(rows: CatalogRow[], modelOverride?: string): Promise<AiResult> {
  await localChoice();
  const found = choose();
  if (!found) throw new Error('AI is not enabled: install a local model (Ollama), or enter a key in the AI card.');
  // A model chosen for this run only (for whichever is tried first): handy for comparing models without changing the saved setting.
  const override = modelOverride && /^[\w.\-/:~]{1,120}$/.test(modelOverride) ? modelOverride : undefined;
  const toAsk = rows.filter((r) => r.matchedBy !== 'article' && r.candidates.length > 0);
  let used: Choice = found;
  let aiMs = 0;
  const triedFirst: Attempt[] = [];
  if (!toAsk.length) return { model: found.model, provider: found.provider, suggestions: [], asked: 0, declined: 0, declinedRows: [], unanswered: 0 };

  const describe = (list: CatalogRow[]) =>
    list
      .map((r) =>
        [
          `Row ${r.index}: placement "${r.baseline.placement ?? ''}", material "${r.baseline.materialName}", article "${r.baseline.supplierArticle ?? ''}"`,
          ...r.candidates.map((c, i) => `  candidate ${i}: "${c.materialName}" | supplier "${c.supplierName ?? ''}" | article "${c.supplierArticle ?? ''}" | status ${c.status ?? '?'}`)
        ].join('\n')
      )
      .join('\n\n');

  // Smaller and free models often answer only some of the rows: ask again for the rows that got no answer (a "none of these"
  // answer counts as an answer), up to three rounds in all.
  type Decision = { row?: number; candidate?: number | null; confidence?: number; reason?: string };
  const decisions: Decision[] = [];
  let pending = toAsk;
  for (let round = 0; round < 3 && pending.length; round++) {
    const content = describe(pending);
    const answer = await ask(MATCH_TASK, content, round === 0 ? override : undefined, pending.length, `Matching ${pending.length} row${pending.length === 1 ? '' : 's'}${round > 0 ? ' (asking again for the ones not answered)' : ''}`);
    used = answer.choice;
    aiMs += answer.ms + answer.failed.reduce((n, f) => n + f.ms, 0);
    triedFirst.push(...answer.failed);
    const got = answer.got;
    if (!Array.isArray(got)) throw new Error('AI returned no decisions');
    decisions.push(...(got as Decision[]));
    const answered = new Set((got as Decision[]).map((d) => Number(d?.row)));
    pending = pending.filter((r) => !answered.has(r.index));
  }

  const byIndex = new Map(toAsk.map((r) => [r.index, r]));
  const suggestions: AiSuggestion[] = [];
  const taken = new Set<number>();
  const declinedMap = new Map<number, string>();
  for (const d of decisions) {
    const r = byIndex.get(Number(d?.row));
    const ci = d?.candidate;
    // The model may only choose from what PDAM returned; anything else is ignored.
    if (!r || taken.has(r.index) || typeof ci !== 'number' || !Number.isInteger(ci) || ci < 0 || ci >= r.candidates.length) {
      if (r && !taken.has(r.index) && !declinedMap.has(r.index)) declinedMap.set(r.index, String(d?.reason ?? '').replace(/\s+/g, ' ').trim().slice(0, 300) || 'No candidate fits this material.');
      continue;
    }
    declinedMap.delete(r.index);
    taken.add(r.index);
    const confidence = Math.max(0, Math.min(100, Math.round(Number(d.confidence) || 0)));
    const to = applyCandidate(r.baseline, r.candidates[ci], `${confidence}%`);
    const changed = (Object.keys(to) as (keyof FlexRow)[]).filter((k) => to[k] !== r.row[k]);
    suggestions.push({ index: r.index, from: r.row, to, changed, candidate: ci, confidence, reason: String(d.reason ?? '').slice(0, 300) });
  }
  const declinedRows = [...declinedMap].filter(([i]) => !taken.has(i)).map(([index, reason]) => ({ index, reason }));
  return { model: used.model, provider: used.provider, suggestions, asked: toAsk.length, declined: declinedRows.length, declinedRows, unanswered: pending.length, ms: aiMs, ...(triedFirst.length ? { triedFirst } : {}) };
}

export interface ModelOption {
  id: string;
  label: string;
  free: boolean;
  reasoning: boolean;
}

let modelCache: { at: number; list: ModelOption[] } | null = null;

/** OpenRouter's public catalog (no key needed), reduced to the models that can do function calling, free ones first. */
export async function openRouterModels(): Promise<ModelOption[]> {
  if (modelCache && Date.now() - modelCache.at < 60 * 60_000) return modelCache.list;
  const res = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`OpenRouter's model list is not available (HTTP ${res.status}).`);
  const body = (await res.json()) as { data?: { id: string; name?: string; pricing?: { prompt?: string; completion?: string }; supported_parameters?: string[]; context_length?: number }[] };
  const list = (body.data ?? [])
    .filter((m) => m.supported_parameters?.includes('tools') && !m.id.endsWith(':batch'))
    .map((m) => {
      const priceIn = Number(m.pricing?.prompt ?? 0) * 1e6;
      const priceOut = Number(m.pricing?.completion ?? 0) * 1e6;
      const free = priceIn === 0 && priceOut === 0;
      const reasoning = Boolean(m.supported_parameters?.some((p) => p === 'reasoning' || p === 'include_reasoning'));
      return {
        id: m.id,
        free,
        reasoning,
        label: `${free ? 'free' : `$${priceIn.toFixed(2)} / $${priceOut.toFixed(2)} per M tokens`}${reasoning ? ' · reasoning' : ' · no reasoning'}`
      };
    })
    .sort((a, b) => Number(b.free) - Number(a.free) || Number(a.reasoning) - Number(b.reasoning) || a.id.localeCompare(b.id));
  modelCache = { at: Date.now(), list };
  return list;
}

/** The models a hosted provider says this key may use (OpenAI-style GET /models), e.g. to pick one that still works for a new account. */
export async function hostedModels(id: AiProviderId): Promise<ModelOption[]> {
  const m = meta(id);
  if (!m.compat) return [];
  const c = cloudChoices().find((x) => x.provider === id);
  if (!c) return [];
  const res = await fetch(m.compat.replace(/\/chat\/completions$/, '/models'), { headers: { Authorization: `Bearer ${c.key}` }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${m.label} could not list its models (HTTP ${res.status}).`);
  const body = (await res.json()) as { data?: { id?: string }[]; models?: { name?: string }[] };
  const ids = (body.data ?? []).map((x) => String(x.id ?? '')).concat((body.models ?? []).map((x) => String(x.name ?? '')));
  return ids
    .map((x) => x.replace(/^models\//, ''))
    .filter(Boolean)
    .sort()
    .map((x) => {
      const worked = callSummary().filter((r) => r.provider === id && r.model === x && r.answered > 0);
      const median = worked.length ? Math.round((worked.reduce((n, r) => n + r.medianSeconds, 0) / worked.length) * 10) / 10 : null;
      return { id: x, label: median === null ? 'available to your key' : `answered here (median ${median} s)`, free: false, reasoning: false };
    })
    .sort((a, b) => Number(b.label.startsWith('answered')) - Number(a.label.startsWith('answered')));
}

/** The models installed in the local Ollama (free: they run on this computer). */
export async function localModelOptions(): Promise<ModelOption[]> {
  const { models } = await localStatus();
  return models.map((m) => ({ id: m.name, free: true, reasoning: false, label: `installed · ${(m.sizeBytes / 1e9).toFixed(1)} GB` }));
}

/** Ask the configured model a structured question and get the list back (retried on rate limits and messy answers). */
export async function askStructured(task: Task, content: string, context?: string): Promise<{ list: unknown[]; provider: AiProviderId; model: string }> {
  const { got, choice } = await ask(task, content, undefined, undefined, context);
  if (!Array.isArray(got)) throw new Error('AI returned no list');
  return { list: got, provider: choice.provider, model: choice.model };
}
