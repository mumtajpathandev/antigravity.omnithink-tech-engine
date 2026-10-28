import { useCallback, useEffect, useRef, useState } from 'react';
import { SETTINGS_CHANGED, harvestApi } from './api';
import { AI_PROVIDERS } from './types';
import type { AiLogEvent, AiLogReply, AiRunning, SettingsView } from './types';

const MAX_EVENTS = 300;

/** Polls the server's live AI log. Polls every second while `active`; always reads once at mount. */
export function useAiLog(active: boolean) {
  const [events, setEvents] = useState<AiLogEvent[]>([]);
  const [running, setRunning] = useState<AiRunning[]>([]);
  const [last, setLast] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const lastRef = useRef(0);
  const alive = useRef(true);

  const reload = useCallback(async (): Promise<number> => {
    try {
      const res = await fetch(`/api/ai/log?since=${lastRef.current}`);
      const data = (await res.json().catch(() => null)) as AiLogReply | null;
      if (!alive.current) return lastRef.current;
      if (!res.ok || !data || !Array.isArray(data.events)) {
        setUnavailable(true);
        return lastRef.current;
      }
      setUnavailable(false);
      const restarted = data.last < lastRef.current; // the server was restarted: its numbering began again
      setEvents((prev) => (restarted ? data.events : [...prev, ...data.events]).slice(-MAX_EVENTS));
      setRunning(Array.isArray(data.running) ? data.running : []);
      lastRef.current = data.last;
      setLast(data.last);
      return data.last;
    } catch {
      if (alive.current) setUnavailable(true);
      return lastRef.current;
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void reload();
    return () => { alive.current = false; };
  }, [reload]);

  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => void reload(), 1000);
    return () => window.clearInterval(t);
  }, [active, reload]);

  const clear = useCallback(async () => {
    try { await fetch('/api/ai/log/clear', { method: 'POST' }); } catch { /* the view is cleared anyway */ }
    setEvents([]);
  }, []);

  return { events, running, last, unavailable, reload, clear };
}

/** A clock that ticks every second while `on`. */
export function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [on]);
  return now;
}

const providerName = (id: string) => AI_PROVIDERS.find((p) => p.id === id)?.label ?? id;

/** "Trying gemini (key 1) · gemini-3.1-flash-lite ... 8 s" */
export function runningText(r: AiRunning, now: number): string {
  const secs = Math.max(0, Math.floor((now - new Date(r.startedAt).getTime()) / 1000));
  return `Trying ${r.provider}${r.account ? ` (${r.account})` : ''} · ${r.model} ... ${secs} s`;
}

/** What the next question will use first, from the saved settings and the keys the server holds. Null while loading. */
export function useAiPlan(): string | null {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => {
      harvestApi.settings().then((v: SettingsView) => {
        if (!live) return;
        const hasKey = (id: string) => {
          const p = v.providers.find((x) => x.id === id);
          return !!p && (p.keys.length > 0 || p.envKeys > 0 || p.keySource !== null);
        };
        const hosted: string[] = [];
        for (const id of v.settings.ai.hostedOrder) if (hasKey(id)) hosted.push(providerName(id));
        // a local model smaller than the Settings cutoff goes last for this job, never first (server rule)
        const active = v.local.models.find((m) => m.name === (v.settings.ai.localModel || v.local.active));
        const tooSmall = hosted.length > 0 && !!active && active.gb < v.settings.ai.localMinGbForLegend;
        const localName = `the local model (${v.settings.ai.localModel || v.local.active || 'automatic'})`;
        const names: string[] = [];
        if (v.local.running && v.settings.ai.localFirst && !tooSmall) names.push(localName);
        names.push(...hosted);
        if (v.local.running && !names.includes(localName)) names.push(`${localName} as the last resort`);
        if (names.length === 0) setText('no provider is ready yet');
        else setText(names.length === 1 ? names[0] : `${names[0]}, then ${names.slice(1).join(', ')}`);
      }).catch(() => { if (live) setText(null); });
    };
    load();
    window.addEventListener(SETTINGS_CHANGED, load);
    return () => { live = false; window.removeEventListener(SETTINGS_CHANGED, load); };
  }, []);
  return text;
}
