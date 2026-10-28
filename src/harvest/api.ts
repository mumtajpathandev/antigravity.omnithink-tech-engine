import type {
  AiProviderId,
  AiResult,
  AppSettings,
  SettingsView,
  AppConfig,
  CatalogRow,
  DataSource,
  EnrichedView,
  Enrichment,
  PdfRead,
  AuthMode,
  DevObjectBom,
  Env,
  HarvestResult,
  MasterStyleRow,
  StyleDetail,
  StyleSummary,
  TechEngineInput
} from './types';

export const SESSION_LOST = 'omnithink:session-lost';
/** Fired by the Settings panel after keys or settings were saved, so the workspace reloads its config. */
export const SETTINGS_CHANGED = 'omnithink:settings-changed';

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error || `Request failed (HTTP ${res.status})`;
    // The server forgot the connection (it was restarted): tell the page so it stops showing "Connected".
    if (res.status === 401 && /not connected/i.test(message)) window.dispatchEvent(new Event(SESSION_LOST));
    throw new Error(message);
  }
  return data as T;
}

const post = <T>(url: string, body: unknown) =>
  call<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const q = encodeURIComponent;

export const harvestApi = {
  config: () => call<AppConfig>('/api/config'),
  /** The secret goes to the local server's memory only; it is never stored or sent back. */
  connect: (env: Env, mode: AuthMode, secret?: string) => post<{ ok: true }>('/api/session', { env, mode, secret }),
  /** Opens a browser window for the company sign-in; resolves once the user has signed in (up to 4 minutes). */
  ssoSignIn: (env: Env) => post<{ ok: true }>('/api/session/sso', { env }),
  cancelSso: (env: Env) => call<{ ok: true; cancelled: boolean }>(`/api/session/sso/${env}`, { method: 'DELETE' }),
  disconnect: (env: Env) => call<{ ok: true }>(`/api/session/${env}`, { method: 'DELETE' }),
  /** Saved master styles for an environment (newest copy of each) plus loaded inputs. */
  styles: (env: Env, source: DataSource = 'latest') => call<StyleSummary[]>(`/api/styles?env=${q(env)}&source=${source}`),
  /** Deletes this app's own saved runs (harvested + loaded inputs); the script's runs are untouched. */
  purgeHistory: () => call<{ ok: true; runs: number; styles: number }>('/api/history', { method: 'DELETE' }),
  liveStyles: (env: Env, anyPath: boolean) => post<MasterStyleRow[]>('/api/live/styles', { env, anyPath }),
  harvest: (env: Env, uids: string[]) => post<HarvestResult>('/api/live/harvest', { env, uids }),
  style: (ref: string) => call<StyleDetail>(`/api/style?ref=${q(ref)}`),
  boms: (ref: string) => call<DevObjectBom[]>(`/api/style/boms?ref=${q(ref)}`),
  /** The BOM and Flex payload after the PDAM lookup and the AI picks accepted so far. */
  enriched: (env: Env, ref: string, devObjectId: string, e: Enrichment) => post<EnrichedView>('/api/style/enriched', { env, ref, devObjectId, ...e }),
  /** The BOM PDF, built on the spot from that same enriched view. */
  bomPdf: async (env: Env, ref: string, devObjectId: string, e: Enrichment, includeAi = true): Promise<Blob> => {
    const res = await fetch('/api/style/bom-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ env, ref, devObjectId, includeAi, ...e }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = (data as { error?: string }).error || `Request failed (HTTP ${res.status})`;
      if (res.status === 401 && /not connected/i.test(message)) window.dispatchEvent(new Event(SESSION_LOST));
      throw new Error(message);
    }
    return res.blob();
  },
  /** A saved file of the style as JSON (null when the style has none): the plugin data, the style seasonal documents, the source document, the summary. */
  styleJson: <T = unknown>(ref: string, name: 'pluginData' | 'styleSeasonal' | 'sourceDocument' | 'summary') => call<T | null>(`/api/style/json?ref=${q(ref)}&name=${name}`),
  /** Screen 2: what the no-AI methods read from the sketch PDF, compared with the plugin rows of one dev object. */
  pdfRead: (ref: string, devObjectId: string, fresh = false) => post<PdfRead>('/api/style/pdf-read', { ref, devObjectId, fresh }),
  /** The same, plus the text model reading the legend pages the no-AI methods could not (page text goes out redacted). Slow on free models. */
  pdfReadAi: (ref: string, devObjectId: string, compareRead = true, fresh = false) => post<PdfRead>('/api/style/pdf-read-ai', { ref, devObjectId, compareRead, fresh }),
  /** Screen 5: remember what the person changed. `e.edits` holds the changes; the rest says what was applied when they made them. */
  saveCorrections: (env: Env, ref: string, devObjectId: string, e: Enrichment, reason?: string) =>
    post<{ saved: number; total: number }>('/api/corrections', { env, ref, devObjectId, ...e, reason }),
  correctionsSummary: () => call<{ total: number; materials: number; latest: string | null }>('/api/corrections/summary'),
  catalog: (env: Env, ref: string, devObjectId: string) => post<{ rows: CatalogRow[] }>('/api/style/catalog', { env, ref, devObjectId }),
  /** Sent to the local server only (kept in memory; saved encrypted for this Windows user when `remember`). Never returned. ADDS a key;
   *  `model` matters only for a provider with no default model and no models yet. */
  setAiKey: (provider: AiProviderId, key: string, label: string, remember: boolean, model?: string) =>
    post<{ ok: true; id?: string }>('/api/ai/key', { provider, key, label, remember, ...(model ? { model } : {}) }),
  /** What the provider's key may use (may be empty). */
  aiModels: (provider: AiProviderId) => call<{ id: string; label: string }[]>(`/api/ai/models?provider=${q(provider)}`),
  /** Forgets one key. */
  forgetAiKey: (id: string) => call<{ ok: true }>(`/api/ai/key?id=${q(id)}`, { method: 'DELETE' }),
  settings: () => call<SettingsView>('/api/settings'),
  /** Only the fields that changed; the server checks the ranges and answers 400 with a message when one is wrong. */
  saveSettings: (patch: { [K in keyof AppSettings]?: Partial<AppSettings[K]> }) =>
    call<SettingsView>('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }),
  clearPdfReadings: () => post<{ removed: number }>('/api/settings/clear-pdf-readings', {}),
  ai: (env: Env, ref: string, devObjectId: string) => post<AiResult>('/api/style/ai', { env, ref, devObjectId }),
  loadInput: (techInput: TechEngineInput, sketchBase64?: string) =>
    post<{ runId: string; style: StyleSummary }>('/api/inputs', { techInput, sketchBase64 }),
  fileUrl: (ref: string, name: string) => `/api/style/file?ref=${q(ref)}&name=${q(name)}`
};

let settingsOnce: Promise<AppSettings | null> | null = null;
/** The saved settings, fetched once per page load; null when the server cannot give them (callers keep their own defaults). */
export function loadSettingsOnce(): Promise<AppSettings | null> {
  settingsOnce ??= harvestApi.settings().then((v) => v.settings).catch(() => null);
  return settingsOnce;
}
/** After a save, so the next reader sees the new values. */
export function forgetSettingsCache(): void {
  settingsOnce = null;
}

/** Read a File as base64 (without the data: prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}
