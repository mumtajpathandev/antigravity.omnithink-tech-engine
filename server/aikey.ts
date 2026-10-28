// The AI key can be entered in the page instead of an environment variable. It is held in this process's memory for the
// whole session (one entry serves every environment and every request) and, if the user asks to remember it, saved
// encrypted with Windows DPAPI (ConvertFrom-SecureString): only the same Windows user on this computer can decrypt the
// file. The key is never logged and never sent back to the page.
//
// Several keys can be held at once, also for the same provider (e.g. three Gemini keys from different accounts); the file holds the
// saved ones as one list, in the order they were added, which is the order they are tried. An older file (a single entry, or a list
// without labels) is still read. A provider marked noKey (the local Ollama) is saved with an empty key: only its model choice is remembered.
//
// Order of use (see ai.ts): environment variables first, then the keys stored here.

import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AI_PROVIDERS, type AiProviderId } from '../src/harvest/types';
import { APP_ROOT } from './config';
import { getSettings, updateSettings } from './settings';

export interface StoredAiKey {
  /** identifies this key while the server runs (random, assigned at load or creation, never saved) */
  id: string;
  provider: AiProviderId;
  key: string;
  /** the model an older version saved with this key, or ''. Only a migration hint (see ai.ts): models are chosen per provider in the settings. */
  legacyModel: string;
  /** a name the person gave it ("account B"), or '' */
  label: string;
}

let FILE = path.join(APP_ROOT, '.ai-key.dat'); // DPAPI blob, listed in .gitignore
/** tests only: use another file and forget what is in memory */
export function useKeyFile(file: string): void {
  FILE = file;
  entries = [];
  sources.clear();
  loaded = false;
}

// Every key, in the order they were added. `sources` says, per key id, whether it was only entered for this session or is also
// saved in the file (the file holds exactly the saved ones).
let entries: StoredAiKey[] = [];
const sources = new Map<string, 'session' | 'saved'>();
let loaded = false;

/** Runs a fixed PowerShell snippet; the secret travels in an environment variable, never in the command line. */
function powershell(script: string, env: Record<string, string>): string {
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
    windowsHide: true,
    timeout: 20_000
  });
  if (r.status !== 0) throw new Error('Windows could not encrypt or decrypt the key.');
  return r.stdout.trim();
}

const encrypt = (value: string) =>
  powershell('$s = ConvertTo-SecureString -String $env:OMNI_SECRET -AsPlainText -Force; ConvertFrom-SecureString -SecureString $s', { OMNI_SECRET: value });

const decrypt = (blob: string) =>
  powershell(
    '$s = ConvertTo-SecureString -String $env:OMNI_BLOB; [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))',
    { OMNI_BLOB: blob }
  );

const isProvider = (v: unknown): v is AiProviderId => AI_PROVIDERS.some((p) => p.id === v);
const noKey = (id: AiProviderId) => AI_PROVIDERS.some((p) => p.id === id && p.noKey);

function cleanLabel(raw: unknown): string {
  const label = String(raw ?? '').trim();
  if (label.length > 40) throw new Error('The name is too long (40 characters at most).');
  if (/[\x00-\x1f\x7f]/.test(label)) throw new Error('The name cannot contain control characters.');
  return label;
}

function parseEntry(raw: Partial<StoredAiKey> | undefined): StoredAiKey | undefined {
  if (!raw || !isProvider(raw.provider) || typeof raw.key !== 'string' || !(raw.key || noKey(raw.provider))) return undefined;
  let label = '';
  try {
    label = cleanLabel(raw.label);
  } catch {
    /* a damaged name is dropped, the key is kept */
  }
  return { id: randomUUID(), provider: raw.provider, key: raw.key, legacyModel: String((raw as { model?: unknown }).model ?? '').trim(), label };
}

/** Every key entered in the page or saved earlier, in the order they are tried. Decrypts the saved file once, on first use. The file is a list; an older file with a single entry is read as a list of one. */
export function storedKeys(): StoredAiKey[] {
  if (!loaded) {
    loaded = true;
    if (process.platform === 'win32' && fs.existsSync(FILE)) {
      try {
        const parsed = JSON.parse(decrypt(fs.readFileSync(FILE, 'utf8').trim())) as unknown;
        for (const raw of Array.isArray(parsed) ? parsed : [parsed]) {
          const entry = parseEntry(raw as Partial<StoredAiKey>);
          if (entry && !entries.some((e) => e.provider === entry.provider && e.key === entry.key)) {
            entries.push(entry);
            sources.set(entry.id, 'saved');
          }
        }
      } catch {
        /* unreadable (another user or computer, or an older file format): treated as no saved key */
      }
    }
  }
  return entries.map((e) => ({ ...e }));
}

/** The first stored key (for callers that only know one). */
export const storedKey = (): StoredAiKey | undefined => storedKeys()[0];

/** Where the key `id` (default: the first one) came from. */
export function storedKeySource(id?: string): 'session' | 'saved' | undefined {
  const list = storedKeys();
  const entry = id ? list.find((e) => e.id === id) : list[0];
  return entry ? sources.get(entry.id) : undefined;
}

/** Write the saved entries (all of them) to the file, or delete the file when none is left. */
function persist(): void {
  const saved = entries.filter((e) => sources.get(e.id) === 'saved').map(({ provider, key, legacyModel, label }) => ({ provider, key, label, ...(legacyModel ? { model: legacyModel } : {}) }));  // an old model is carried along unchanged, never written for a new key
  if (!saved.length) return void fs.rmSync(FILE, { force: true });
  if (process.platform !== 'win32') throw new Error('Remembering the key needs Windows (it is encrypted with your Windows account). Use it for this session only.');
  fs.writeFileSync(FILE, encrypt(JSON.stringify(saved)), { mode: 0o600 });
}

function validModel(raw: unknown): string {
  const model = String(raw ?? '').trim();
  if (!/^[\w.\-/:~]{1,120}$/.test(model)) throw new Error('That model id does not look right.');
  return model;
}

/** Make the model list of a provider exactly [model] (the local provider has one model: the local model setting). */
function setProviderModels(provider: AiProviderId, model: string): void {
  if (provider === 'local') void updateSettings({ ai: { localModel: model } });
  else void updateSettings({ ai: { models: { [provider]: [model] } } });
}

/** Make a change and write the file; if that fails, put everything back as it was. */
function atomically(change: () => void): void {
  const before = { entries: entries.map((e) => ({ ...e })), sources: new Map(sources) };
  try {
    change();
    persist();
  } catch (err) {
    entries = before.entries;
    sources.clear();
    before.sources.forEach((v, k) => sources.set(k, v));
    throw err;
  }
}

/** Add a key (several per provider are fine). The same key value for the same provider updates that entry's name instead. A `model` is only used to give a provider with no models yet its first one. Returns the entry's id. */
export function saveKey(input: { provider: unknown; key: unknown; model?: unknown; label?: unknown; remember: boolean }): string {
  if (!isProvider(input.provider)) throw new Error('Choose a provider.');
  const provider = input.provider;
  const meta = AI_PROVIDERS.find((p) => p.id === provider)!;
  const key = meta.noKey ? '' : String(input.key ?? '').trim();
  const model = String(input.model ?? '').trim();
  const label = cleanLabel(input.label);
  if (!meta.noKey && (!key || key.length > 300 || /\s/.test(key))) throw new Error('Paste the key as it was given, without spaces.');
  if (meta.keyPrefix && !key.startsWith(meta.keyPrefix)) throw new Error(`A ${meta.label} key starts with ${meta.keyHint}. Check the provider you chose.`);
  if (model) validModel(model);
  storedKeys(); // load the saved ones first, so they are kept
  const hasModels = provider === 'local' ? Boolean(getSettings().ai.localModel) : (getSettings().ai.models[provider]?.length ?? 0) > 0;
  const hasLegacy = entries.some((e) => e.provider === provider && e.legacyModel);
  if (!model && !meta.defaultModel && !meta.noKey && !hasModels && !hasLegacy) throw new Error(`Enter the model id to use with ${meta.label}.`);
  let id = '';
  atomically(() => {
    const at = entries.findIndex((e) => e.provider === provider && e.key === key);
    if (at >= 0) {
      id = entries[at].id;
      entries[at] = { ...entries[at], label };
    } else {
      id = randomUUID();
      entries.push({ id, provider, key, legacyModel: '', label });
    }
    // asking to remember it saves it; entering it again for this session only does not take it out of the file
    if (input.remember) sources.set(id, 'saved');
    else if (!sources.has(id)) sources.set(id, 'session');
  });
  if (model && !hasModels) setProviderModels(provider, model);
  return id;
}

/** Make the model of the provider of one key (the first key when no id is given) exactly [model]. The key itself never leaves the server. */
export function setModel(raw: unknown, id?: string): void {
  const list = storedKeys();
  const stored = id ? list.find((e) => e.id === id) : list[0];
  if (!stored) throw new Error('There is no key saved in the app, so there is no model to change. Enter a key first.');
  setProviderModels(stored.provider, validModel(raw));
}

/** Forget one key (id), every key of a provider (provider), or (no target) every key in memory and delete the saved file. */
export function forgetKey(target?: { id?: string; provider?: AiProviderId }): void {
  storedKeys();
  if (!target?.id && !target?.provider) {
    entries = [];
    sources.clear();
    fs.rmSync(FILE, { force: true });
    return;
  }
  atomically(() => {
    const gone = entries.filter((e) => (target.id ? e.id === target.id : e.provider === target.provider));
    entries = entries.filter((e) => !gone.includes(e));
    gone.forEach((e) => sources.delete(e.id));
  });
}
