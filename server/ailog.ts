// A live log of what the AI layer is doing, kept in memory (the last 500 events) and polled by the page (GET /ai/log).
// Only labels are stored: provider, model, account name, plain-English lines, raw error text. Never a key, never a prompt.

import type { AiLogEvent, AiLogReply, AiRunning } from '../src/harvest/types';

const MAX_EVENTS = 500;
const STALE_MS = 15 * 60_000; // an attempt still "running" after this long is dropped

let events: AiLogEvent[] = [];
let seq = 0;
let running = new Map<number, AiRunning>();
let nextAttempt = 1;

/** A short random id for one question asked of the AI layer. */
export const newRunId = (): string => Math.random().toString(36).slice(2, 8);

/** Add an event: seq and time are filled in here. */
export function emit(partial: Omit<AiLogEvent, 'seq' | 'at'>): AiLogEvent {
  const event: AiLogEvent = { ...partial, seq: ++seq, at: new Date().toISOString() };
  if (event.detail) event.detail = event.detail.slice(0, 600);
  events.push(event);
  if (events.length > MAX_EVENTS) events = events.slice(events.length - MAX_EVENTS);
  return event;
}

function dropStale(): void {
  const cutoff = Date.now() - STALE_MS;
  for (const [id, r] of running) if (Date.parse(r.startedAt) < cutoff) running.delete(id);
}

/** Mark an attempt as in flight; call the returned function when it ends (put it in a finally). Calling it twice is harmless. */
export function beginAttempt(info: Omit<AiRunning, 'startedAt'>): () => void {
  dropStale();
  const id = nextAttempt++;
  running.set(id, { ...info, startedAt: new Date().toISOString() });
  return () => {
    running.delete(id);
  };
}

/** Everything after `since` (a `since` above the last seq means the server restarted: answer from 0). */
export function readSince(since = 0): AiLogReply {
  dropStale();
  const from = Number.isFinite(since) && since >= 0 && since <= seq ? since : 0;
  return { events: events.filter((e) => e.seq > from), last: seq, running: [...running.values()] };
}

/** Empty the buffer and start counting again (the contract: `last` is 0 when empty). A page still holding an old, higher seq is answered from 0. */
export function clearLog(): void {
  events = [];
  seq = 0;
}
