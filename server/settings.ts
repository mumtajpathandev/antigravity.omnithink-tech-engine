// The user's settings (the Settings screen): saved in memory/settings.json, never a key. Every field has a type and a range that
// is checked on every update; the file itself is read leniently (a bad field falls back to its default) so a hand-edit cannot
// stop the app. Environment variables still win where they did before (AI_LOCAL=off, LOCAL_MODEL, AI_PROVIDER): ai.ts applies them.
//
// getSettings() is cheap (kept in memory, read again only after a save), so the AI and PDF code may call it on every request.

import fs from 'node:fs';
import path from 'node:path';
import { AI_PROVIDERS, type AiProviderId, type AppSettings } from '../src/harvest/types';
import { APP_ROOT } from './config';

const DIR = path.join(APP_ROOT, 'memory');
let FILE = path.join(DIR, 'settings.json');
/** tests only: save somewhere else */
export const useSettingsFile = (file: string) => {
  FILE = file;
  cache = undefined;
};

export const HOSTED_IDS = AI_PROVIDERS.filter((p) => p.id !== 'local').map((p) => p.id);

export const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    localFirst: true,
    localModel: '',
    hostedOrder: ['openrouter', 'groq', 'cerebras', 'mistral', 'gemini', 'anthropic', 'openai'],
    timeoutLocalSeconds: 600,
    timeoutHostedSeconds: 30,
    pagesPerReading: 8,
    compareReadDefault: true,
    localMinGbForLegend: 4,
    models: {}
  },
  data: { defaultSource: 'latest', catalogCacheMinutes: 10 },
  reading: { reuseSaved: true },
  display: { aboutTab: 0, analyticsTab: 0 }
};

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** A bad value, in plain English (the routes turn it into a 400). */
class Invalid extends Error {}

type Check = (v: unknown) => unknown; // returns the clean value or throws Invalid

const bool = (name: string): Check => (v) => {
  if (typeof v !== 'boolean') throw new Invalid(`${name} must be on or off.`);
  return v;
};
const int = (name: string, min: number, max: number): Check => (v) => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new Invalid(`${name} must be a whole number from ${min} to ${max}.`);
  return v;
};
const num = (name: string, min: number, max: number): Check => (v) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Invalid(`${name} must be a number from ${min} to ${max}.`);
  return v;
};
const modelId: Check = (v) => {
  if (typeof v !== 'string' || !/^[\w.\-/:~]{0,120}$/.test(v.trim())) throw new Invalid('The local model id does not look right (letters, digits and . - _ / : ~ only, up to 120 characters).');
  return v.trim();
};
const source: Check = (v) => {
  if (v !== 'latest' && v !== 'offline') throw new Invalid("The starting data must be 'latest' or 'offline'.");
  return v;
};
const order: Check = (v) => {
  if (!Array.isArray(v)) throw new Invalid('The provider order must be a list.');
  const seen = new Set<string>();
  for (const id of v) {
    if (id === 'local') throw new Invalid("The provider order lists hosted providers only; the local model is set by 'Try the local model first'.");
    if (!HOSTED_IDS.includes(id as AiProviderId)) throw new Invalid(`Unknown provider in the order: ${String(id).slice(0, 30)}.`);
    if (seen.has(id as string)) throw new Invalid(`${String(id)} appears twice in the provider order.`);
    seen.add(id as string);
  }
  return [...v];
};

const MODEL_ID = /^[\w.\-/:~]{1,120}$/;
/** Per hosted provider, a list of 0..8 distinct model ids. Returns the checked object; merge() replaces each listed provider's list as a whole. */
const models: Check = (v) => {
  if (!isObject(v)) throw new Invalid('The models must be an object with a list of model ids per provider.');
  const out: Record<string, string[]> = {};
  for (const [id, list] of Object.entries(v)) {
    if (id === 'local') throw new Invalid("Models are chosen for hosted providers only; the local model is set by 'Local model'.");
    if (!HOSTED_IDS.includes(id as AiProviderId)) throw new Invalid(`Unknown provider in the models: ${id.slice(0, 30)}.`);
    if (!Array.isArray(list)) throw new Invalid(`The models of ${id} must be a list.`);
    if (list.length > 8) throw new Invalid(`${id} can have at most 8 models.`);
    const seen = new Set<string>();
    for (const m of list) {
      if (typeof m !== 'string' || !MODEL_ID.test(m.trim())) throw new Invalid(`A model id for ${id} does not look right (letters, digits and . - _ / : ~ only, up to 120 characters).`);
      if (seen.has(m.trim())) throw new Invalid(`${m.trim().slice(0, 40)} appears twice in the models of ${id}.`);
      seen.add(m.trim());
    }
    out[id] = [...seen];
  }
  return out;
};

const RULES: { [S in keyof AppSettings]: Record<string, Check> } = {
  ai: {
    localFirst: bool('Try the local model first'),
    localModel: modelId,
    hostedOrder: order,
    timeoutLocalSeconds: int('The local model wait', 30, 1800),
    timeoutHostedSeconds: int('The hosted provider wait', 10, 600),
    pagesPerReading: int('Pages per reading', 1, 30),
    compareReadDefault: bool('Compare readings'),
    localMinGbForLegend: num('The smallest local model for legends', 0, 20),
    models
  },
  data: { defaultSource: source, catalogCacheMinutes: int('The catalog memory time', 0, 120) },
  reading: { reuseSaved: bool('Reuse saved readings') },
  display: { aboutTab: int('The About tab', 0, 20), analyticsTab: int('The Analytics tab', 0, 20) }
};

/** `base` with every known key of `patch` checked and applied; unknown keys are ignored. With `lenient`, a bad value keeps the base value. */
function merge(base: AppSettings, patch: unknown, lenient: boolean): AppSettings {
  const out = clone(base);
  if (!isObject(patch)) {
    if (lenient || patch === undefined) return out;
    throw new Invalid('The settings must be an object.');
  }
  for (const section of Object.keys(RULES) as (keyof AppSettings)[]) {
    const given = patch[section];
    if (given === undefined) continue;
    if (!isObject(given)) {
      if (lenient) continue;
      throw new Invalid(`The ${section} settings must be an object.`);
    }
    for (const [field, check] of Object.entries(RULES[section])) {
      if (!(field in given)) continue;
      try {
        const clean = check(given[field]);
        if (section === 'ai' && field === 'models') {
          // a listed provider's list is replaced as a whole (an empty list clears it); the others stay as they are
          const next = { ...out.ai.models } as Record<string, string[]>;
          for (const [id, list] of Object.entries(clean as Record<string, string[]>)) {
            if (list.length) next[id] = list;
            else delete next[id];
          }
          out.ai.models = next;
        } else (out[section] as unknown as Record<string, unknown>)[field] = clean;
      } catch (err) {
        if (!lenient) throw err;
      }
    }
  }
  return out;
}

let cache: AppSettings | undefined;

function load(): AppSettings {
  try {
    return merge(DEFAULT_SETTINGS, JSON.parse(fs.readFileSync(FILE, 'utf8').replace(/^﻿/, '')), true);
  } catch {
    return clone(DEFAULT_SETTINGS); // no file yet, or one that cannot be read: the defaults
  }
}

/** The current settings (a copy: change them only through updateSettings). */
export function getSettings(): AppSettings {
  cache ??= load();
  return clone(cache);
}

/** Check `patch` (a partial AppSettings), merge it into the current settings and save. Throws an Error with a plain message when a value is not acceptable; nothing is saved then. */
export function updateSettings(patch: unknown): AppSettings {
  let next: AppSettings;
  try {
    next = merge(getSettings(), patch, false);
  } catch (err) {
    if (err instanceof Invalid) throw new Error(err.message);
    throw err;
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(next, null, 2));
  fs.renameSync(`${FILE}.tmp`, FILE);
  cache = next;
  return clone(next);
}
