import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';
import { forgetSettingsCache, harvestApi, SETTINGS_CHANGED } from './api';
import type { AiProviderId, AppSettings, ProviderKey, ProviderStatus, SettingsView } from './types';

// Settings: keys and models for the AI providers, the order they are tried in, limits, data and display choices.
// Keys go to the local server only and are never shown again. Everything else is saved automatically a moment after it is changed.

const card = 'bg-white border border-slate-200 rounded-lg shadow-sm';
const input = 'px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500';
const btn = 'px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500';
const btnPrimary = `${btn} text-white bg-slate-900 hover:bg-slate-800`;
const btnPlain = `${btn} text-slate-800 bg-white border border-slate-300 hover:bg-slate-50`;
const hint = 'text-xs text-slate-500';

const TABS = ['AI keys', 'AI order & limits', 'Data & reading', 'Display'] as const;
const ABOUT_TABS = ['Objective', 'Screens', 'Architecture', 'Tech specs', 'AI policy', 'Security', 'Run & test', 'Limits', 'Roadmap'];
const ANALYTICS_TABS = ['AI models', 'Recent calls', 'Saved work', 'PDF corpus', 'This computer'];

const SOURCE_LABEL: Record<string, string> = { env: 'from environment', saved: 'saved on this computer', session: 'this session only' };

/** Each number field: its label, allowed range and the unit shown after it. */
const LIMITS = [
  { key: 'timeoutLocalSeconds', label: 'Wait for the local model', min: 30, max: 1800, unit: 'seconds' },
  { key: 'timeoutHostedSeconds', label: 'Wait for a hosted endpoint', min: 10, max: 600, unit: 'seconds' },
  { key: 'pagesPerReading', label: 'Pages sent to the AI in one PDF reading', min: 1, max: 30, unit: 'pages' },
  { key: 'localMinGbForLegend', label: 'Smallest local model tried first for matching and legend reading (when a hosted key exists)', min: 0, max: 20, unit: 'GB' }
] as const;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const OTHER = '__other__';
const label = 'block text-xs font-semibold text-slate-700 mb-1';
const iconBtn = 'p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500';
const linkBtn = 'text-sm text-sky-800 hover:underline cursor-pointer disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded';
const MAX_BACKUPS = 3;

type Models = { id: string; label: string }[];

/** One model dropdown: the provider's available models, "Another model" to type an id. Without a list it is a text box. */
const ModelPick: React.FC<{
  id: string; aria: string; value: string; avail: Models | null; taken: string[]; emptyLabel: string; allowEmpty: boolean;
  onPick: (v: string) => void;
}> = ({ id, aria, value, avail, taken, emptyLabel, allowEmpty, onPick }) => {
  const listed = (avail?.length ?? 0) > 0;
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  if (!listed || typing) {
    return (
      <input
        id={id}
        type="text"
        spellCheck={false}
        autoFocus={typing}
        aria-label={aria}
        value={typing ? text : value}
        onChange={(e) => { setTyping(true); setText(e.target.value); onPick(e.target.value.trim()); }}
        placeholder="Model id, exactly as the provider names it"
        className={`${input} w-full font-mono`}
      />
    );
  }
  const options = avail!.filter((m) => m.id === value || !taken.includes(m.id));
  return (
    <select
      id={id}
      aria-label={aria}
      value={value}
      onChange={(e) => { if (e.target.value === OTHER) { setTyping(true); setText(''); } else onPick(e.target.value); }}
      className={`${input} w-full font-mono`}
    >
      {(allowEmpty || !value) && <option value="">{emptyLabel}</option>}
      {value && !avail!.some((m) => m.id === value) && <option value={value}>{value}</option>}
      {options.map((m) => <option key={m.id} value={m.id}>{m.id}{m.label && m.label !== m.id ? `  —  ${m.label}` : ''}</option>)}
      <option value={OTHER}>Another model: type its id...</option>
    </select>
  );
};

const modelsLine = (p: ProviderStatus, list: string[]) =>
  list.length ? list.join(', ') : p.defaultModel ? `default: ${p.defaultModel}` : 'needs a model';

const chipClass = (ok: boolean) =>
  `inline-block px-2 py-0.5 text-xs rounded-full border whitespace-nowrap ${ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`;

const statusText = (p: ProviderStatus) => {
  const n = p.keys?.length ?? 0;
  const env = p.envKeys ?? 0;
  if (n > 0) return `${n + env} key${n + env === 1 ? '' : 's'}`;
  if (env > 0) return 'from environment';
  return 'no key';
};

/** The body of an expanded provider: its keys (saved at once) and its model preference (staged in the draft). */
const ProviderBody: React.FC<{
  p: ProviderStatus; list: string[]; setList: (l: string[]) => void; onChanged: () => Promise<void>;
}> = ({ p, list, setList, onChanged }) => {
  const keys = p.keys ?? [];
  const envKeys = p.envKeys ?? 0;
  const hasKey = keys.length > 0 || envKeys > 0;
  const [adding, setAdding] = useState(false);
  const [keyText, setKeyText] = useState('');
  const [keyLabel, setKeyLabel] = useState('');
  const [keyModel, setKeyModel] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [avail, setAvail] = useState<Models | null>(null);
  const [pendingBackup, setPendingBackup] = useState(false);
  const needsModel = !p.defaultModel && list.length === 0;

  // The provider's models, once, when it is expanded. OpenRouter lists its models without a key.
  useEffect(() => {
    if (!hasKey && p.id !== 'openrouter') { setAvail(null); return; }
    let live = true;
    harvestApi.aiModels(p.id).then((l) => live && setAvail(l)).catch(() => live && setAvail([]));
    return () => { live = false; };
  }, [p.id, hasKey]);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await fn();
      await onChanged();
      setDone(message);
      return true;
    } catch (e) {
      setError(`${(e as Error).message}. If the server was started before several keys were supported, restart it.`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    const ok = await run(() => harvestApi.setAiKey(p.id, keyText, keyLabel.trim(), remember, needsModel ? keyModel.trim() : undefined), 'Key added');
    if (ok) { setKeyText(''); setKeyLabel(''); setKeyModel(''); setAdding(false); }
  };
  const canAdd = !busy && keyText.trim() !== '' && (!needsModel || keyModel.trim() !== '');
  const backups = list.slice(1);
  const canBackup = backups.length + (pendingBackup ? 1 : 0) < MAX_BACKUPS && (list.length > 0 || !!p.defaultModel);
  const availNote = (avail?.length ?? 0) > 0 ? `${avail!.length} available to your key` : null;

  return (
    <div className="px-4 pb-3 pt-2 space-y-4 border-t border-slate-100">
      <section aria-label={`${p.label} keys`} className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-700">Keys (accounts)</h4>
        <p className={hint}>A key works for every model your account can use.</p>
        {(keys.length > 0 || envKeys > 0) && (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
            {keys.map((k, i) => {
              const name = k.label || `Key ${i + 1}`;
              return (
                <li key={k.id} className="flex items-center gap-3 px-3 py-1.5">
                  <span className="text-sm text-slate-900">{name}</span>
                  <span className="text-xs text-slate-500">{SOURCE_LABEL[k.source]}</span>
                  <button
                    type="button"
                    className="ml-auto text-xs text-slate-600 underline hover:text-rose-700 cursor-pointer disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
                    disabled={busy}
                    aria-label={`Forget ${p.label} key ${name}`}
                    onClick={() => void run(() => harvestApi.forgetAiKey(k.id), `${name} forgotten`)}
                  >
                    Forget
                  </button>
                </li>
              );
            })}
            {envKeys > 0 && (
              <li className="px-3 py-1.5 text-xs text-slate-600">
                {envKeys} key{envKeys === 1 ? '' : 's'} from the server's environment (change {envKeys === 1 ? 'it' : 'them'} there)
              </li>
            )}
          </ul>
        )}
        {!adding ? (
          <button type="button" className={linkBtn} onClick={() => { setAdding(true); setDone(null); }}>+ Add key</button>
        ) : (
          <div className="border border-slate-200 rounded-md bg-slate-50 px-3 py-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`label-${p.id}`} className={label}>Label (optional)</label>
                <input id={`label-${p.id}`} type="text" autoComplete="off" value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} placeholder="e.g. account B" className={`${input} w-full`} />
              </div>
              <div>
                <label htmlFor={`key-${p.id}`} className={label}>API key</label>
                <input id={`key-${p.id}`} type="password" autoComplete="off" spellCheck={false} value={keyText} onChange={(e) => setKeyText(e.target.value)} placeholder={p.keyHint} className={`${input} font-mono w-full`} />
              </div>
              {needsModel && (
                <div className="sm:col-span-2">
                  <label htmlFor={`keymodel-${p.id}`} className={label}>Model id (required: {p.label} has no default model)</label>
                  <input id={`keymodel-${p.id}`} type="text" spellCheck={false} value={keyModel} onChange={(e) => setKeyModel(e.target.value)} placeholder="Model id, exactly as the provider names it" className={`${input} font-mono w-full`} />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Remember on this computer
              </label>
              <button type="button" className={btnPrimary} disabled={!canAdd} onClick={() => void add()}>{busy ? 'Working...' : 'Add key'}</button>
              <button type="button" className={btnPlain} disabled={busy} onClick={() => { setAdding(false); setKeyText(''); setError(null); }}>Cancel</button>
            </div>
          </div>
        )}
        {done && <p role="status" className="text-xs text-emerald-700">{done}</p>}
        {error && <div role="alert" className="text-xs text-rose-700">{error}</div>}
      </section>

      <section aria-label={`${p.label} model`} className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <label htmlFor={`model-${p.id}`} className="text-xs font-semibold text-slate-700">Model</label>
          {availNote && <span className={hint}>{availNote}</span>}
        </div>
        <ModelPick
          id={`model-${p.id}`}
          aria={`${p.label} model`}
          value={list[0] ?? ''}
          avail={avail}
          taken={list}
          allowEmpty={!!p.defaultModel && list.length <= 1}
          emptyLabel={p.defaultModel ? `${p.defaultModel}  —  default` : 'Choose a model...'}
          onPick={(v) => setList(v ? [v, ...backups] : [])}
        />
        {list.length === 0 && p.defaultModel && <p className={hint}>Default: {p.defaultModel}. Pick a model to choose your own.</p>}
        {list.length === 0 && !p.defaultModel && <p className={hint}>This provider has no default: pick or type the model to use.</p>}
        {(backups.length > 0 || pendingBackup) && (
          <div className="space-y-2 pt-1">
            {backups.map((m, i) => (
              <div key={`${i}-${m}`} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <ModelPick
                    id={`backup-${p.id}-${i}`}
                    aria={`${p.label} backup model ${i + 1}`}
                    value={m}
                    avail={avail}
                    taken={list}
                    allowEmpty={false}
                    emptyLabel="Choose a backup model..."
                    onPick={(v) => setList(list.map((x, j) => (j === i + 1 ? v : x)).filter(Boolean))}
                  />
                </div>
                <button type="button" className={iconBtn} aria-label={`Remove backup model ${m} from ${p.label}`} onClick={() => setList(list.filter((_, j) => j !== i + 1))}>
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            {pendingBackup && (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <ModelPick
                    id={`backup-${p.id}-new`}
                    aria={`${p.label} new backup model`}
                    value=""
                    avail={avail}
                    taken={list}
                    allowEmpty={false}
                    emptyLabel="Choose a backup model..."
                    onPick={(v) => { if (v) { setList([...(list.length ? list : p.defaultModel ? [p.defaultModel] : []), v]); setPendingBackup(false); } }}
                  />
                </div>
                <button type="button" className={iconBtn} aria-label={`Cancel the new backup model for ${p.label}`} onClick={() => setPendingBackup(false)}>
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}
        {canBackup && !pendingBackup && (
          <button type="button" className="text-xs text-slate-600 hover:text-slate-900 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded" onClick={() => setPendingBackup(true)}>
            + Add a backup model
          </button>
        )}
        {(backups.length > 0 || pendingBackup) && <p className={hint}>If the model above is busy or fails, the next one is tried with the same key. A key that is out of credits is skipped, and the next key starts again from the first model.</p>}
      </section>
    </div>
  );
};

/** The AI keys tab: one list of hosted providers in the order they are tried; each expands to its keys and its model. */
const KeysTab: React.FC<{
  view: SettingsView; draft: AppSettings; edit: (fn: (d: AppSettings) => void) => void; onChanged: () => Promise<void>;
}> = ({ view, draft, edit, onChanged }) => {
  const [open, setOpen] = useState<Set<AiProviderId>>(new Set());
  const [dragId, setDragId] = useState<AiProviderId | null>(null);
  const [overId, setOverId] = useState<AiProviderId | null>(null);
  const local = view.local;
  const toggle = (id: AiProviderId) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const move = (i: number, to: number) => edit((d) => { const o = d.ai.hostedOrder; [o[i], o[to]] = [o[to], o[i]]; });

  return (
    <>
      <p className={hint}>Providers are tried in this order, after the local model; only those with a key are used. Drag a row or use the arrows. Keys go to the local server only and are never shown again; "Remember on this computer" saves a key encrypted for your Windows account.</p>
      <ol aria-label="Hosted providers, in the order tried" className="border border-slate-200 rounded-md divide-y divide-slate-100">
        {draft.ai.hostedOrder.map((id, i, all) => {
          const p = view.providers.find((x) => x.id === id);
          if (!p) return null;
          const expanded = open.has(id);
          // what is saved in Settings, else what the server works out from keys saved before models belonged to the provider (never just the default)
          const inUse = (p.models ?? []).filter((m) => !(p.defaultModel && (p.models ?? []).length === 1 && m === p.defaultModel));
          const list = draft.ai.models?.[id] ?? inUse;
          const hasKey = (p.keys?.length ?? 0) > 0 || (p.envKeys ?? 0) > 0;
          return (
            <li
              key={id}
              onDragOver={(e) => {
                if (!dragId || dragId === id) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setOverId(id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragId;
                setDragId(null);
                setOverId(null);
                if (!from || from === id) return;
                edit((d) => {
                  const o = d.ai.hostedOrder;
                  const a = o.indexOf(from);
                  const b = o.indexOf(id);
                  if (a < 0 || b < 0) return;
                  o.splice(a, 1);
                  o.splice(b, 0, from);
                });
              }}
              className={`${dragId === id ? 'opacity-40' : ''} ${overId === id && dragId && dragId !== id ? 'bg-sky-50 ring-2 ring-inset ring-sky-400' : ''}`}
            >
              <div
                draggable
                onDragStart={(e) => {
                  setDragId(id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', id);
                }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                className="flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="text-xs text-slate-500 w-4 shrink-0">{i + 1}</span>
                <span className="text-sm font-semibold text-slate-900 shrink-0">{p.label}</span>
                <span className={chipClass(hasKey)}>{statusText(p)}</span>
                <span className="text-xs text-slate-500 font-mono truncate min-w-0 flex-1">{modelsLine(p, list)}</span>
                <button type="button" aria-label={`Move ${p.label} up`} disabled={i === 0} onClick={() => move(i, i - 1)} className={iconBtn}>
                  <ArrowUp className="w-4 h-4" aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Move ${p.label} down`} disabled={i === all.length - 1} onClick={() => move(i, i + 1)} className={iconBtn}>
                  <ArrowDown className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`prov-${id}`}
                  aria-label={`${expanded ? 'Collapse' : 'Expand'} ${p.label}`}
                  onClick={() => toggle(id)}
                  className={iconBtn}
                >
                  {expanded ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
              {expanded && (
                <div id={`prov-${id}`}>
                  <ProviderBody
                    p={p}
                    list={list}
                    setList={(l) => edit((d) => { d.ai.models ??= {}; if (l.length) d.ai.models[id] = l; else delete d.ai.models[id]; })}
                    onChanged={onChanged}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className={hint}>Model choices, the order and keys are all saved automatically.</p>
      <div className="border border-slate-200 rounded-md px-4 py-3 space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-semibold text-slate-900">Local (Ollama)</span>
          <span className={chipClass(!!local?.running)}>{local?.running ? 'running' : 'not running'}</span>
          {local?.version && <span className="text-xs text-slate-600">version {local.version}</span>}
        </div>
        <p className="text-xs text-slate-600">
          {local?.running
            ? local.models.length
              ? <>Installed: {local.models.map((m) => `${m.name} (${m.gb} GB)`).join(', ')}. Active: <span className="font-mono">{local.active ?? 'none yet'}</span>.</>
              : 'No models installed.'
            : 'Start Ollama on this computer to use a local model. No key is needed and nothing leaves the machine.'}
        </p>
      </div>
    </>
  );
};

const NumberField: React.FC<{
  id: string; label: string; min: number; max: number; unit?: string; def: number; value: number; onChange: (n: number) => void;
}> = ({ id, label, min, max, unit, def, value, onChange }) => {
  const bad = !Number.isInteger(value) || value < min || value > max;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm text-slate-800">{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={1}
          value={Number.isNaN(value) ? '' : value}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
          aria-invalid={bad}
          aria-describedby={`${id}-hint`}
          className={`${input} w-28 ${bad ? 'border-rose-400' : ''}`}
        />
        {unit && <span className="text-xs text-slate-600">{unit}</span>}
        <span id={`${id}-hint`} className={bad ? 'text-xs text-rose-700' : hint}>
          {bad ? `Whole number from ${min} to ${max}.` : `From ${min} to ${max}, default ${def}.`}
        </span>
      </div>
    </div>
  );
};

type Draft = AppSettings;

export const SettingsPanel: React.FC<{ onClose: () => void; onChanged?: () => void }> = ({ onClose, onChanged }) => {
  const [tab, setTab] = useState(0);
  const [view, setView] = useState<SettingsView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);
  const dirtyDraft = useRef(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const announce = () => {
    window.dispatchEvent(new Event(SETTINGS_CHANGED));
    onChanged?.();
  };

  /** Upload or remove the logo, then reload the settings so the new version shows here and in the top bar. */
  const changeLogo = async (action: () => Promise<unknown>) => {
    setLogoBusy(true);
    setLogoError(null);
    try {
      await action();
      forgetSettingsCache();
      const v = await harvestApi.settings();
      setView(v);
      setDraft((cur) => (cur ? { ...cur, display: { ...cur.display, logoVersion: v.settings.display.logoVersion } } : structuredClone(v.settings)));
      announce();
    } catch (e) {
      setLogoError((e as Error).message);
    } finally {
      setLogoBusy(false);
    }
  };

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const v = await harvestApi.settings();
      setView(v);
      // A form the person is editing is not overwritten when only the key list is reloaded.
      setDraft((cur) => (cur && dirtyDraft.current ? cur : structuredClone(v.settings)));
    } catch (e) {
      setLoadError(`Settings could not be loaded (${(e as Error).message}). If the server was started before Settings were added, restart it.`);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const keysChanged = async () => {
    forgetSettingsCache();
    await load();
    announce();
  };

  const go = (i: number) => {
    const next = (i + TABS.length) % TABS.length;
    setTab(next);
    setSaved(false);
    setSaveError(null);
    document.getElementById(`set-tab-${next}`)?.focus();
  };

  const edit = (fn: (d: Draft) => void) => {
    setDraft((cur) => {
      if (!cur) return cur;
      const next = structuredClone(cur);
      fn(next);
      return next;
    });
    dirtyDraft.current = true;
    setSaved(false);
    setSaveError(null);
  };

  /** The part of the settings a tab saves, so Save changes and Restore defaults touch one tab only. */
  const groupOf = (s: AppSettings, t: number): Partial<AppSettings> | null =>
    t === 0 ? { ai: { hostedOrder: s.ai.hostedOrder, models: s.ai.models } as AppSettings['ai'] } :
    t === 1 ? { ai: (({ hostedOrder: _o, models: _m, ...rest }) => rest)(s.ai) as AppSettings['ai'] } : t === 2 ? { data: s.data, reading: s.reading } : t === 3 ? { display: s.display } : null;

  const savedSettings = view?.settings;
  const dirty = !!(draft && savedSettings && !same(groupOf(draft, tab), groupOf(savedSettings, tab)));
  const invalidTab = (t: number) =>
    !!draft && (
      (t === 1 && LIMITS.some((l) => { const v = draft.ai[l.key]; return !Number.isInteger(v) || v < l.min || v > l.max; })) ||
      (t === 2 && (!Number.isInteger(draft.data.catalogCacheMinutes) || draft.data.catalogCacheMinutes < 0 || draft.data.catalogCacheMinutes > 120)) ||
    (t === 3 && draft.display.appName !== undefined && ((draft.display.appName ?? '').trim() === '' || (draft.display.badge ?? '').trim() === ''))
    );
  const invalid = invalidTab(tab);

  const saveTab = async (t: number) => {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const v = await harvestApi.saveSettings(groupOf(draft, t)!);
      setView(v);
      // Keep the other tabs' unsaved edits; take the server's answer for the tab just saved.
      const g = groupOf(v.settings, t)!;
      setDraft((cur) => (cur ? { ...cur, ...structuredClone(g), ai: { ...cur.ai, ...structuredClone(g.ai ?? {}) } } : structuredClone(v.settings)));
      dirtyDraft.current = TABS.some((_, i) => groupOf(draft, i) && draft && !same(groupOf(draft, i), groupOf(v.settings, i)) && i !== t);
      forgetSettingsCache();
      setSaved(true);
      announce();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Settings save by themselves shortly after a change; a value that is out of range waits until it is valid, and a failed save is not retried
  // until the next edit (edit() clears the error).
  useEffect(() => {
    if (!draft || !view || saving || saveError) return;
    const t = TABS.findIndex((_, i) => groupOf(draft, i) && !same(groupOf(draft, i), groupOf(view.settings, i)) && !invalidTab(i));
    if (t < 0) return;
    const timer = setTimeout(() => void saveTab(t), 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, view, saving, saveError]);

  const restore = () => {
    if (!view) return;
    const g = groupOf(view.defaults, tab);
    if (!g) return;
    edit((d) => Object.assign(d, structuredClone(g)));
  };

  const clearReadings = async () => {
    setClearing(true);
    setClearResult(null);
    try {
      const r = await harvestApi.clearPdfReadings();
      setClearResult(`${r.removed} saved PDF reading${r.removed === 1 ? '' : 's'} removed.`);
      setConfirmClear(false);
    } catch (e) {
      setClearResult((e as Error).message);
    } finally {
      setClearing(false);
    }
  };

  const local = view?.local;

  const anyDirty = !!draft && !!view && TABS.some((_, i) => groupOf(draft, i) && !same(groupOf(draft, i), groupOf(view.settings, i)));
  const footer = (
    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
      <span role="status" className={invalid ? 'text-sm text-rose-700' : 'text-sm text-slate-600'}>
        {saving ? 'Saving...' : invalid ? 'Fix the highlighted value to save it.' : saveError ? '' : anyDirty ? 'Saving shortly...' : 'All changes saved.'}
      </span>
      <button type="button" className={btnPlain} disabled={saving} onClick={restore}>Restore defaults</button>
      <span className={hint}>Resets this tab to the standard settings.</span>
      {saveError && <span role="alert" className="text-sm text-rose-700">{saveError}</span>}
    </div>
  );

  return (
    <section className={`${card} overflow-hidden`} aria-labelledby="settings-title">
      <div className="flex items-center gap-2 px-4 py-3">
        <h2 id="settings-title" className="text-sm font-bold text-slate-900">Settings</h2>
        <span className="text-xs text-slate-500">AI keys and order, limits, data, display</span>
        <button type="button" onClick={onClose} aria-label="Close" className="ml-auto p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="border-t border-slate-100">
        <div className="flex items-center gap-2 px-3 pt-2 border-b border-slate-200">
          <div role="tablist" aria-label="Settings" className="flex gap-1 overflow-x-auto overflow-y-hidden">
            {TABS.map((t, i) => (
              <button
                key={t}
                id={`set-tab-${i}`}
                role="tab"
                type="button"
                aria-selected={tab === i}
                aria-controls={`set-panel-${i}`}
                tabIndex={tab === i ? 0 : -1}
                onClick={() => go(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
                  else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
                  else if (e.key === 'Home') { e.preventDefault(); go(0); }
                  else if (e.key === 'End') { e.preventDefault(); go(TABS.length - 1); }
                }}
                className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-t-md ${
                  tab === i ? 'border-sky-600 text-sky-800 font-semibold' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div id={`set-panel-${tab}`} role="tabpanel" aria-labelledby={`set-tab-${tab}`} className="px-4 py-4 space-y-4">
          {loadError && (
            <div role="alert" className="text-sm px-3 py-2 rounded-md border text-rose-800 bg-rose-50 border-rose-200">
              {loadError}{' '}
              <button type="button" className="underline cursor-pointer" onClick={() => void load()}>Try again</button>
            </div>
          )}
          {!view && !loadError && <p className="text-sm text-slate-500">Loading settings...</p>}

          {view && draft && tab === 0 && (
            <>
              <KeysTab view={view} draft={draft} edit={edit} onChanged={keysChanged} />
              {footer}
            </>
          )}

          {view && draft && tab === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input type="checkbox" checked={draft.ai.localFirst} onChange={(e) => edit((d) => { d.ai.localFirst = e.target.checked; })} />
                  Use the local model first
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="set-local-model" className="text-sm text-slate-800">Local model</label>
                  <select id="set-local-model" className={input} value={draft.ai.localModel} onChange={(e) => edit((d) => { d.ai.localModel = e.target.value; })}>
                    <option value="">Automatic (the best one that fits in free memory)</option>
                    {draft.ai.localModel && !local?.models.some((m) => m.name === draft.ai.localModel) && <option value={draft.ai.localModel}>{draft.ai.localModel} (not installed)</option>}
                    {(local?.models ?? []).map((m) => <option key={m.name} value={m.name}>{m.name} ({m.gb} GB)</option>)}
                  </select>
                  {!local?.running && <span className={hint}>Ollama is not running, so no models are listed.</span>}
                </div>
              </div>

              <div className="space-y-3">
                {LIMITS.map((l) => (
                  <NumberField
                    key={l.key}
                    id={`set-${l.key}`}
                    label={l.label}
                    min={l.min}
                    max={l.max}
                    unit={l.unit}
                    def={view.defaults.ai[l.key]}
                    value={draft.ai[l.key]}
                    onChange={(n) => edit((d) => { d.ai[l.key] = n; })}
                  />
                ))}
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input type="checkbox" checked={draft.ai.compareReadDefault} onChange={(e) => edit((d) => { d.ai.compareReadDefault = e.target.checked; })} />
                  Also read pages already read without AI, to compare (screen 2 starts with this on)
                </label>
              </div>
              {footer}
            </div>
          )}

          {view && draft && tab === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="set-source" className="text-sm text-slate-800">The style list starts on</label>
                <select id="set-source" className={input} value={draft.data.defaultSource} onChange={(e) => edit((d) => { d.data.defaultSource = e.target.value as AppSettings['data']['defaultSource']; })}>
                  <option value="latest">Latest</option>
                  <option value="offline">Pinned snapshot</option>
                </select>
                <span className={hint}>A Pinned snapshot is used only for an environment that has one.</span>
              </div>
              <NumberField
                id="set-catalog-cache"
                label="Remember a PDAM catalog lookup for"
                min={0}
                max={120}
                unit="minutes (0 = not remembered)"
                def={view.defaults.data.catalogCacheMinutes}
                value={draft.data.catalogCacheMinutes}
                onChange={(n) => edit((d) => { d.data.catalogCacheMinutes = n; })}
              />
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input type="checkbox" checked={draft.reading.reuseSaved} onChange={(e) => edit((d) => { d.reading.reuseSaved = e.target.checked; })} />
                Reuse the saved reading of a PDF that was read before
              </label>
              {footer}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <h3 className="text-sm font-bold text-slate-900">Saved PDF readings</h3>
                <p className={hint}>Deletes every saved reading of a sketch PDF. The next reading of each PDF runs again.</p>
                {!confirmClear ? (
                  <button type="button" className={btnPlain} onClick={() => { setConfirmClear(true); setClearResult(null); }}>Clear saved PDF readings</button>
                ) : (
                  <div role="alertdialog" aria-label="Confirm clearing saved PDF readings" className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-800">Delete all saved PDF readings?</span>
                    <button type="button" className={`${btn} text-white bg-rose-600 hover:bg-rose-700`} disabled={clearing} onClick={clearReadings}>
                      {clearing ? 'Deleting...' : 'Yes, delete them'}
                    </button>
                    <button type="button" className={btnPlain} disabled={clearing} onClick={() => setConfirmClear(false)}>Cancel</button>
                  </div>
                )}
                {clearResult && <p role="status" className="text-sm text-slate-700">{clearResult}</p>}
              </div>
            </div>
          )}

          {view && draft && tab === 3 && (
            <div className="space-y-4">
              <div className="space-y-3 pb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Name and look</h3>
                <p className={hint}>What the top bar, the browser tab and the About page call this app. Changes show at once.</p>
                {([
                  ['appName', 'App name', 40, 'Shown top left and in the browser tab.'],
                  ['tagline', 'Tag line', 80, 'The line under the name. Leave empty for none.'],
                  ['badge', 'Badge letters', 3, 'The small square next to the name.']
                ] as const).map(([key, label, max, help]) => (
                  <div key={key} className="space-y-1">
                    <label htmlFor={`set-${key}`} className="block text-sm text-slate-800">{label}</label>
                    <input
                      id={`set-${key}`}
                      type="text"
                      maxLength={max}
                      value={draft.display[key] ?? ''}
                      onChange={(e) => edit((d) => { d.display[key] = e.target.value; })}
                      aria-invalid={key !== 'tagline' && (draft.display[key] ?? '').trim() === ''}
                      className={`${input} w-full max-w-md ${key === 'badge' ? 'max-w-[8rem] uppercase' : ''}`}
                    />
                    <span className={hint}>{help}{key !== 'tagline' && (draft.display[key] ?? '').trim() === '' ? ' Cannot be empty.' : ''}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Logo</h3>
                <p className={hint}>Upload your own logo (PNG, JPEG, WebP, GIF or a plain SVG, up to 512 KB). It replaces the badge letters in the top bar and becomes the browser tab icon.</p>
                <div className="flex flex-wrap items-center gap-3">
                  {draft.display.logoVersion > 0 ? (
                    <img src={`/api/logo?v=${draft.display.logoVersion}`} alt="Your logo" className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200" />
                  ) : (
                    <span className="w-12 h-12 rounded-lg bg-slate-900 text-white text-sm font-bold flex items-center justify-center" aria-hidden>{(draft.display.badge || 'MB').toUpperCase()}</span>
                  )}
                  <label className={`${btnPlain} inline-flex items-center`}>
                    {logoBusy ? 'Uploading...' : draft.display.logoVersion > 0 ? 'Replace logo' : 'Upload logo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      className="sr-only"
                      disabled={logoBusy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void changeLogo(() => harvestApi.uploadLogo(file));
                      }}
                    />
                  </label>
                  {draft.display.logoVersion > 0 && (
                    <button type="button" className={btnPlain} disabled={logoBusy} onClick={() => void changeLogo(() => harvestApi.removeLogo())}>Remove logo</button>
                  )}
                  {draft.display.logoVersion === 0 && <span className={hint}>No logo uploaded: the badge letters are shown.</span>}
                </div>
                {logoError && <div role="alert" className="text-sm text-rose-700">{logoError}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="set-about-tab" className="text-sm text-slate-800">About opens on</label>
                <select id="set-about-tab" className={input} value={draft.display.aboutTab} onChange={(e) => edit((d) => { d.display.aboutTab = Number(e.target.value); })}>
                  {ABOUT_TABS.map((t, i) => <option key={t} value={i}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="set-analytics-tab" className="text-sm text-slate-800">Analytics opens on</label>
                <select id="set-analytics-tab" className={input} value={draft.display.analyticsTab} onChange={(e) => edit((d) => { d.display.analyticsTab = Number(e.target.value); })}>
                  {ANALYTICS_TABS.map((t, i) => <option key={t} value={i}>{t}</option>)}
                </select>
              </div>
              {footer}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
