import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Circle, Loader2, X } from 'lucide-react';
import { harvestApi } from './api';
import type { AiLogEvent, AiRunning } from './types';
import { runningText, useNow } from './aiLogHooks';


const clock = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '--:--:--' : d.toLocaleTimeString([], { hour12: false });
};
const seconds = (ms?: number) => (ms === undefined ? '' : `${(ms / 1000).toFixed(1)} s`);

const Mark: React.FC<{ kind: AiLogEvent['kind'] }> = ({ kind }) => {
  const cls = 'w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600';
  switch (kind) {
    case 'try': return <><Loader2 className={`${cls} animate-spin motion-reduce:animate-none`} aria-hidden="true" /><span className="sr-only">trying</span></>;
    case 'ok': return <><Check className={cls} aria-hidden="true" /><span className="sr-only">succeeded</span></>;
    case 'fail': return <><X className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-700" aria-hidden="true" /><span className="sr-only">failed</span></>;
    case 'skip': return <><ArrowRight className={cls} aria-hidden="true" /><span className="sr-only">skipped</span></>;
    default: return <><Circle className="w-2 h-2 shrink-0 mt-1.5 ml-0.5 mr-0.5 fill-slate-400 text-slate-400" aria-hidden="true" /><span className="sr-only">{kind}</span></>;
  }
};

const eventText = (e: AiLogEvent) =>
  `${clock(e.at)} [${e.kind}] ${[e.provider, e.model, e.account].filter(Boolean).join(' · ')}${e.provider || e.model ? ' ' : ''}${e.message}${e.ms !== undefined ? ` (${seconds(e.ms)})` : ''}${e.detail ? `\n    ${e.detail}` : ''}`;

/** The live log: events after `since` (all when omitted), newest at the bottom, plus a ticking line for each attempt in flight. */
export const AiLogView: React.FC<{
  events: AiLogEvent[];
  running: AiRunning[];
  since?: number;
  unavailable?: boolean;
  onClear?: () => void;
  label?: string;
}> = ({ events, running, since, unavailable, onClear, label = 'AI log' }) => {
  const shown = since === undefined ? events : events.filter((e) => e.seq > since);
  const now = useNow(running.length > 0);
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [copied, setCopied] = useState(false);

  useLayoutEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [shown.length, running.length]);

  const onScroll = () => {
    const el = box.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  const copy = async () => {
    const text = shown.map(eventText).join('\n') + running.map((r) => `\n${runningText(r, now)}`).join('');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard not allowed: nothing to do */ }
  };

  if (unavailable) {
    return <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">The log needs the server to be restarted.</p>;
  }

  const btn = 'px-2 py-0.5 text-xs text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={copy} className={btn}>{copied ? 'Copied' : 'Copy log'}</button>
        {onClear && <button type="button" onClick={onClear} className={btn}>Clear</button>}
      </div>
      <div
        ref={box}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label={label}
        tabIndex={0}
        className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 space-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
      >
        {shown.length === 0 && running.length === 0 && <div className="text-slate-500">Nothing yet.</div>}
        {shown.map((e) => (
          <div key={e.seq} className="flex gap-2 items-start">
            <span className="font-mono text-slate-500 shrink-0">{clock(e.at)}</span>
            <Mark kind={e.kind} />
            <div className="min-w-0 flex-1">
              {(e.provider || e.model || e.account) && (
                <span className="font-mono text-slate-600">{[e.provider, e.model, e.account].filter(Boolean).join(' · ')} </span>
              )}
              <span>{e.message}</span>
              {e.ms !== undefined && <span className="font-mono text-slate-500 ml-1">{seconds(e.ms)}</span>}
              {e.kind === 'fail' && e.detail && (
                <details className="mt-0.5">
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 rounded-sm">details</summary>
                  <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-slate-600">{e.detail}</pre>
                </details>
              )}
            </div>
          </div>
        ))}
        {running.map((r) => (
          <div key={`${r.runId}-${r.startedAt}-${r.model}`} aria-live="off" className="flex gap-2 items-start">
            <span className="font-mono text-slate-500 shrink-0">{clock(r.startedAt)}</span>
            <Loader2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <span className="font-mono">{runningText(r, now)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
