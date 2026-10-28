import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { fileToBase64, harvestApi, loadSettingsOnce, SESSION_LOST, SETTINGS_CHANGED } from './api';
import { BomPanel, PdfPanel } from './HarvestPanels';
import { clearPlace, readPlace, savePlace } from './place';
import { CorrectionsPanel } from './screens/CorrectionsPanel';
import { StructuredInputPanel } from './screens/StructuredInputPanel';
import { ReadPdfPanel } from './screens/ReadPdfPanel';
import {
  ENVIRONMENTS,
  type AppConfig,
  type AuthMode,
  type DataSource,
  type DevObjectBom,
  type Enrichment,
  type Env,
  type MasterStyleRow,
  type StyleDetail,
  type StyleSummary,
  type TechEngineInput
} from './types';

const card = 'bg-white rounded-lg border border-slate-200 shadow-xs p-4';
const field = 'px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500';
const label = 'block text-xs uppercase tracking-wider text-slate-600 font-semibold mb-1';
const btn =
  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1';
const btnPrimary = `${btn} text-white bg-slate-900 hover:bg-slate-800`;
const btnGhost = `${btn} text-slate-700 bg-white border border-slate-300 hover:bg-slate-50`;

const STEPS = [
  { id: 1, title: 'Structured input', hint: 'The structured data for this master style, as read from PDAM and saved: its styles, the style seasonal documents and the plugin data. Click an item to open it.' },
  { id: 2, title: 'Read the PDF', hint: 'The sketch PDF and what can be read from it, first without AI, then with AI for the pages the other methods could not read, compared with the plugin rows.' },
  { id: 3, title: 'Enrich', hint: 'The BOM JSON and the Flex payload (its exact format is still to be confirmed with Flex), updated as you apply past corrections, the PDAM lookup and AI matching.' },
  { id: 4, title: 'BOM PDF', hint: 'The BOM as a PDF, built on the spot from the previous step, with or without the AI picks.' },
  { id: 5, title: 'Review & correct', hint: 'Correct the final rows in a table. Corrections are remembered and applied to later BOMs, and the final PDF is rebuilt with them.' }
] as const;

/** A Cookie header starts with "name=value"; a bearer token does not (base64 padding "==" is not a cookie). */
// How to sign in: SSO window, then a token (the shared login, or a pasted bearer token), then a pasted cookie.
type SignInMethod = 'sso' | 'token' | 'cookie';
const DEFAULT_ORDER: SignInMethod[] = ['sso', 'token', 'cookie'];
const METHOD_LABEL: Record<SignInMethod, string> = { sso: 'SSO', token: 'token', cookie: 'cookie' };
const methodOrder = (preferred: SignInMethod | null): SignInMethod[] => (preferred ? [preferred, ...DEFAULT_ORDER.filter((m) => m !== preferred)] : DEFAULT_ORDER);

// The method that worked last is remembered per environment in this browser. It is a preference, not a secret.
const prefKey = (env: Env) => `omnithink.signin.${env}`;
function loadPref(env: Env): SignInMethod | null {
  try {
    const v = localStorage.getItem(prefKey(env));
    return v === 'sso' || v === 'token' || v === 'cookie' ? v : null;
  } catch {
    return null; // storage blocked: fall back to the default order
  }
}
function savePref(env: Env, method: SignInMethod) {
  try {
    localStorage.setItem(prefKey(env), method);
  } catch {
    /* ignore */
  }
}

const detectMode = (value: string): AuthMode => (!/^bearer\s/i.test(value) && /^[\w.%-]+=[^=\s]/.test(value) ? 'cookie' : 'token');

const styleLabel = (s: StyleSummary) =>
  `${s.masterStyleID} · ${s.season ?? 'no season'} · ${s.devObjectCount ? `${s.devObjectCount} dev object${s.devObjectCount > 1 ? 's' : ''}` : 'no BOM data'}` +
  (s.origin === 'loaded' ? ' · loaded file' : '') +
  (s.isDraft ? ' · draft' : '');

const isLiveDraft = (r: MasterStyleRow) => !!r.path && !r.path.startsWith('/Domain/ProductLibrary');

export const HarvestWorkspace: React.FC<{ purgeVersion?: number; purgedRuns?: number; purgedStyles?: number }> = ({
  purgeVersion = 0,
  purgedRuns = 0,
  purgedStyles = 0
}) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  // Where the user was before a reload (this tab only); null on a normal first visit.
  const [boot] = useState(readPlace);
  const [env, setEnv] = useState<Env>(boot?.env ?? 'PREPROD');
  // What is still to be put back, in order: the style once the list is in, then the step and dev object once its detail is in.
  const pending = useRef<{ style: string; step: 1 | 2 | 3 | 4 | 5; dev: string | null } | null>(
    boot && boot.style ? { style: boot.style, step: boot.step, dev: boot.devObject } : null
  );
  const [placeNote, setPlaceNote] = useState<'full' | 'partial' | null>(null);
  // The saved list remembers which environment it was loaded for, so a list from another environment can never be shown.
  const [styleSet, setStyleSet] = useState<{ env: Env | null; list: StyleSummary[] }>({ env: null, list: [] });
  const styles = styleSet.env === env ? styleSet.list : [];
  const [fetchingStyles, setFetchingStyles] = useState(true);
  const [listFailed, setListFailed] = useState(false);
  const stylesLoading = fetchingStyles || (styleSet.env !== env && !listFailed);
  const [liveRows, setLiveRows] = useState<MasterStyleRow[]>([]);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  /** a saved style's ref, or "live:<uid>" for a style that is in PDAM but not harvested yet */
  const [selected, setSelected] = useState('');
  const [secret, setSecret] = useState('');

  const [detail, setDetail] = useState<StyleDetail | null>(null);
  const [boms, setBoms] = useState<DevObjectBom[]>([]);
  const [bomsLoading, setBomsLoading] = useState(false);
  const [detailFailed, setDetailFailed] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  // Shared by the BOM and PDF steps: which dev object is open, and what the PDAM lookup / AI picks have added to each one's BOM.
  const [activeDev, setActiveDev] = useState<string | null>(null);
  const [enrichment, setEnrichment] = useState<Record<string, Enrichment>>({});

  const [sketchFile, setSketchFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const session = config?.sessions[env];
  // The shared OAuth client only works for the environment it was issued for (the server enforces this too).
  const oauthAvailable = !!config?.configAuthAvailable && config.configAuthEnv === env;
  const needsSecret = !session; // every environment: SSO first, then token, then cookie
  const [pasteOpen, setPasteOpen] = useState(false);
  const [lastMethod, setLastMethod] = useState<SignInMethod | null>(() => loadPref('PREPROD'));
  useEffect(() => setLastMethod(loadPref(env)), [env]);

  const refreshConfig = useCallback(() => harvestApi.config().then(setConfig).catch((e) => setError(e.message)), []);

  const run = useCallback(
    async (what: string, fn: () => Promise<void>) => {
      setBusy(what);
      setError(null);
      setNotice(null);
      try {
        await fn();
      } catch (err) {
        const message = (err as Error).message;
        setError(message);
        // The server may have restarted and forgotten the login: re-read what it thinks is connected.
        if (/not connected|expired|login page|rejected/i.test(message)) refreshConfig();
      } finally {
        setBusy(null);
      }
    },
    [refreshConfig]
  );

  // Only the newest list request may update the page (switching environments quickly must not mix lists).
  const listRequest = useRef(0);
  const [source, setSource] = useState<DataSource>(boot?.source ?? 'latest');
  const sourceRef = useRef<DataSource>(boot?.source ?? 'latest'); // read by loadStyles without re-running the environment reset
  const loadStyles = useCallback(
    (preferRef?: string, src?: DataSource) => {
      const mine = ++listRequest.current;
      setFetchingStyles(true);
      setListFailed(false);
      return harvestApi
        .styles(env, src ?? sourceRef.current)
        .then((list) => {
          if (mine !== listRequest.current) return;
          setStyleSet({ env, list });
          setSelected((prev) => {
            const want = preferRef ?? prev;
            // Nothing is chosen for the user: they pick a master style first. A selection is kept only when it still exists.
            if (want && (want.startsWith('live:') || list.some((s) => s.ref === want))) return want;
            return '';
          });
        })
        .catch((e) => {
          if (mine !== listRequest.current) return;
          setListFailed(true);
          setError(e.message);
        })
        .finally(() => mine === listRequest.current && setFetchingStyles(false));
    },
    [env]
  );

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  // The server keeps connections in memory only. If it was restarted, refresh the status as soon as a call says so, and
  // whenever the page is looked at again, so "Connected" is never shown for a connection that is gone.
  useEffect(() => {
    const refresh = () => void refreshConfig();
    window.addEventListener(SESSION_LOST, refresh);
    window.addEventListener(SETTINGS_CHANGED, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener(SESSION_LOST, refresh);
    window.removeEventListener(SETTINGS_CHANGED, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refreshConfig]);

  const offline = config?.offline?.[env];

  /** Switch between the newest saved copy of each style and the environment's offline snapshot. */
  const chooseSource = useCallback(
    (next: DataSource) => {
      sourceRef.current = next;
      setSource(next);
      pending.current = null; // a source chosen on purpose is not the one to go back to
      setStyleSet({ env: null, list: [] });
      setSelected('');
      setDetail(null);
      setBoms([]);
      setError(null);
      setNotice(null);
      setStep(1);
      void loadStyles(undefined, next);
    },
    [loadStyles]
  );

  // The data source the style list starts on comes from Settings (once; a failure keeps 'latest').
  const startedOn = useRef(false);
  useEffect(() => {
    if (startedOn.current) return;
    startedOn.current = true;
    if (boot) return; // the source was restored with the place
    void loadSettingsOnce().then((st) => {
      if (st && st.data.defaultSource === 'offline' && sourceRef.current === 'latest') chooseSource('offline');
    });
  }, [chooseSource]);

  // An environment with no offline link cannot stay on the offline view.
  useEffect(() => {
    if (source === 'offline' && config && !config.offline?.[env]) chooseSource('latest');
  }, [env, config, source, chooseSource]);

  // New environment (or purge): drop everything from the previous one, then load this one's saved styles.
  useEffect(() => {
    if (purgeVersion) {
      pending.current = null;
      clearPlace();
    }
    setStyleSet({ env: null, list: [] });
    setLiveRows([]);
    setSecret('');
    setSelected('');
    setDetail(null);
    setBoms([]);
    setError(null);
    setNotice(null);
    setStep(1);
    loadStyles(pending.current?.style || undefined);
  }, [loadStyles, purgeVersion]);

  useEffect(() => {
    if (!purgeVersion) return;
    setNotice(`Purged ${purgedRuns} saved run(s) with ${purgedStyles} style(s). Nothing in PDAM was changed.`);
  }, [purgeVersion, purgedRuns, purgedStyles]);

  useEffect(() => {
    setDetail(null);
    setBoms([]);
    setDetailFailed(false);
    if (!selected || selected.startsWith('live:')) {
      setBomsLoading(false); // a load that was cancelled by this change must not leave "Loading..." behind
      return;
    }
    let cancelled = false;
    setError(null);
    setBomsLoading(true);
    Promise.all([harvestApi.style(selected), harvestApi.boms(selected)])
      .then(([d, b]) => {
        if (cancelled) return;
        setDetail(d);
        setBoms(b);
      })
      .catch((e) => {
        if (cancelled) return;
        setDetailFailed(true);
        setError(e.message);
      })
      .finally(() => !cancelled && setBomsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selected]);

  /**
   * Sign in to PDAM if needed, the same way for every environment:
   *   1. SSO: a browser window for the company sign-in;
   *   2. token: the shared OAuth login when this environment has one (a pasted bearer token is used as soon as it is entered);
   *   3. cookie: ask for one (the paste box opens).
   * Something pasted into the box is used straight away, without trying the earlier steps.
   */
  const ensureConnected = async (): Promise<boolean> => {
    if (session) return true;
    const value = secret.trim();
    const done = async (method: SignInMethod) => {
      savePref(env, method); // the method that worked becomes this environment's default next time
      setLastMethod(method);
      setSecret(''); // the server holds it now; do not keep it in the page
      setPasteOpen(false);
      await refreshConfig();
      return true;
    };
    if (value) {
      const mode = detectMode(value);
      await harvestApi.connect(env, mode, value);
      return done(mode === 'cookie' ? 'cookie' : 'token');
    }

    // Start with the method that worked last time for this environment, then the usual order.
    const failures: string[] = [];
    for (const method of methodOrder(loadPref(env))) {
      if (method === 'sso') {
        try {
          setNotice(`A sign-in window is opening for ${env}. Sign in with your company account there; this page continues by itself.`);
          await harvestApi.ssoSignIn(env);
          setNotice(null);
          return done('sso');
        } catch (e) {
          const message = (e as Error).message;
          if (/cancelled/i.test(message)) throw e; // the user said stop: do not carry on with other methods
          failures.push(`SSO: ${message}`);
        }
      } else if (method === 'token' && oauthAvailable) {
        try {
          await harvestApi.connect(env, 'config');
          if (failures.length) setNotice(`${failures.join('; ')}. Connected to ${env} with the shared token instead.`);
          return done('token');
        } catch (e) {
          failures.push(`Token: ${(e as Error).message}`);
        }
      } else {
        // a bearer token (no shared login here) or a cookie has to be pasted: ask for it
        break;
      }
    }
    setPasteOpen(true);
    setNotice(null);
    setError(`${failures.length ? `${failures.join('; ')}. ` : ''}Paste a session cookie or bearer token below, then press the button again.`);
    return false;
  };

  // Sign in automatically: when the page opens (or is refreshed) and whenever another environment is chosen, as long as that
  // environment has no connection yet. It tries each environment once per choice, so a failed or cancelled sign-in does not
  // loop; pressing the button tries again.
  const autoSignInFor = useRef<Env | null>(null);
  useEffect(() => {
    if (!config || session || busy || autoSignInFor.current === env) return;
    autoSignInFor.current = env;
    void run('Signing in', async () => {
      await ensureConnected();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, env, session, busy]);

  // Moving to another environment closes a sign-in window that is still open for the one being left.
  useEffect(() => {
    return () => {
      void harvestApi.cancelSso(env).catch(() => undefined);
    };
  }, [env]);

  // The server lost its connection (it was restarted): sign in again on its own.
  useEffect(() => {
    const again = () => {
      autoSignInFor.current = null;
    };
    window.addEventListener(SESSION_LOST, again);
    return () => window.removeEventListener(SESSION_LOST, again);
  }, []);

  const loadList = (drafts: boolean = includeDrafts) =>
    run('Loading master styles from PDAM', async () => {
      if (!(await ensureConnected())) return;
      const rows = await harvestApi.liveStyles(env, drafts);
      setLiveRows(rows);
      setNotice(
        rows.length
          ? `${rows.length} master style(s) found in ${env}${drafts ? ' (drafts included)' : ''}. Styles not saved yet are marked "in PDAM only".`
          : `${env} returned no master styles for this filter.`
      );
    });

  // A file you loaded has no PDAM document in this environment, so it cannot be re-fetched from PDAM.
  const fromFile = styles.find((s) => s.ref === selected)?.origin === 'loaded';
  const liveUid = selected.startsWith('live:') ? selected.slice(5) : fromFile ? undefined : detail?.techInput.mstsDocumentUid;

  const rerun = () =>
    run('Fetching from PDAM', async () => {
      if (!liveUid) {
        throw new Error(
          selected
            ? 'This entry came from a file you loaded, so there is nothing to re-fetch from PDAM.'
            : 'Choose a master style first (use "Load list from PDAM" if the list is empty).'
        );
      }
      if (!(await ensureConnected())) return;
      const result = await harvestApi.harvest(env, [liveUid]);
      if (result.errors.length) throw new Error(result.errors.map((e) => e.error).join('; '));
      sourceRef.current = 'latest'; // the fresh copy lives in the latest data, not in the offline snapshot
      setSource('latest');
      await loadStyles(result.styles[0]?.ref, 'latest');
      setStep(1);
      setNotice(`Fetched ${result.styles[0]?.masterStyleID} from ${env} just now.${result.warnings.length ? ` Note: ${result.warnings.join(' ')}` : ''}`);
    });

  const loadInputs = () =>
    run('Loading your files', async () => {
      if (!jsonFile) throw new Error('Choose a tech-engine-input.json first');
      let techInput: TechEngineInput;
      try {
        techInput = JSON.parse(await jsonFile.text());
      } catch {
        throw new Error('That file is not valid JSON');
      }
      const result = await harvestApi.loadInput(techInput, sketchFile ? await fileToBase64(sketchFile) : undefined);
      sourceRef.current = 'latest';
      setSource('latest');
      await loadStyles(result.style.ref, 'latest');
      setStep(sketchFile ? 1 : 2);
      setNotice(`Loaded ${result.style.masterStyleID}${sketchFile ? '' : ' (no sketch PDF)'}.`);
    });

  const disconnect = () =>
    run('Disconnecting', async () => {
      await harvestApi.disconnect(env);
      await refreshConfig();
      setLiveRows([]);
      setSelected((prev) => (prev.startsWith('live:') ? '' : prev));
    });

  // Workspace drafts are hidden unless the box is ticked: in the saved list and in the live list.
  const visibleStyles = useMemo(() => styles.filter((s) => includeDrafts || !s.isDraft), [styles, includeDrafts]);
  const hiddenDrafts = styles.length - visibleStyles.length;
  const liveOnly = useMemo(
    () => liveRows.filter((r) => !styles.some((s) => s.uid === r.uid) && (includeDrafts || !isLiveDraft(r))),
    [liveRows, styles, includeDrafts]
  );
  const nothingToPick = !stylesLoading && !visibleStyles.length && !liveOnly.length;

  // If the selected style just got hidden (box unticked), fall back to a visible one.
  useEffect(() => {
    if (!selected || stylesLoading) return;
    const stillThere = selected.startsWith('live:')
      ? liveOnly.some((r) => `live:${r.uid}` === selected)
      : visibleStyles.some((s) => s.ref === selected);
    if (!stillThere) setSelected((visibleStyles.find((s) => s.classification === 'BOM_READY') ?? visibleStyles[0])?.ref ?? '');
  }, [selected, stylesLoading, visibleStyles, liveOnly]);

  const showSteps = !!detail || (bomsLoading && !!selected && !selected.startsWith('live:'));

  // Put the user back where they were: the style once the list is in (if it still exists), then step and dev object.
  useEffect(() => {
    const p = pending.current;
    if (!p || stylesLoading) return;
    if (!visibleStyles.some((s) => s.ref === p.style)) {
      pending.current = null;
      setPlaceNote('partial');
    }
  }, [stylesLoading, visibleStyles]);
  useEffect(() => {
    const p = pending.current;
    if (!p || selected !== p.style) return;
    if (detailFailed) {
      pending.current = null;
      setPlaceNote('partial');
    } else if (detail) {
      pending.current = null;
      setStep(p.step);
      setActiveDev(p.dev && boms.some((b) => b.devObjectId === p.dev) ? p.dev : null);
      setPlaceNote('full');
    }
  }, [selected, detail, detailFailed, boms]);

  // Remember the place on every change, but never before a restore has finished (that would overwrite what is to be restored).
  useEffect(() => {
    if (pending.current) return;
    savePlace({ env, source, style: selected.startsWith('live:') ? '' : selected, step, devObject: activeDev });
  }, [env, source, selected, step, activeDev, placeNote]);

  return (
    <div className="space-y-5">
      <h1 className="sr-only">SketchToBOM: From Master Style to a refined BOM</h1>

      {placeNote && (
        <div role="status" className="text-sm px-3 py-2 rounded-md border flex items-center gap-2 text-slate-700 bg-white border-slate-200">
          <span className="flex-1">
            {placeNote === 'full' ? 'The page was refreshed; you are back where you were.' : 'The page was refreshed. Choose your master style again.'}
          </span>
          <button className="underline hover:text-slate-900 cursor-pointer" onClick={() => setPlaceNote(null)} aria-label="Dismiss this note">Dismiss</button>
        </div>
      )}

      {config && !config.scriptDirFound && (
        <div role="alert" className="text-sm px-3 py-2 rounded-md border text-amber-900 bg-amber-50 border-amber-200">
          The script folder was not found at <span className="font-mono">{config.scriptDir}</span>. Set HARVEST_SCRIPT_DIR to the folder that holds config.json, then restart.
        </div>
      )}

      {/* Step 1: pick */}
      <div className={`${card} space-y-3`}>
        <h2 className="text-sm font-semibold text-slate-800">Choose a master style</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="env-select" className={label}>Environment</label>
            <select id="env-select" className={field} value={env} onChange={(e) => {
                pending.current = null;
                clearPlace();
                setPlaceNote(null);
                setEnv(e.target.value as Env);
              }}>
              {ENVIRONMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="source-select" className={label}>Saved data</label>
            <select
              id="source-select"
              className={field}
              value={source}
              onChange={(e) => chooseSource(e.target.value as DataSource)}
              title="Latest = newest saved copy of each style. Pinned = the fixed snapshot to fall back on."
            >
              <option value="latest">Latest</option>
              <option value="offline" disabled={!offline}>
                {offline ? `Pinned snapshot (${offline.run})` : 'Pinned snapshot (none for this environment)'}
              </option>
            </select>
          </div>
          <div className="min-w-[280px] flex-1 max-w-lg">
            <label htmlFor="style-select" className={label}>Master style</label>
            <select id="style-select" className={`${field} w-full`} value={selected} onChange={(e) => {
                pending.current = null;
                setSelected(e.target.value);
              }}
            >
              {stylesLoading && !visibleStyles.length && <option value="">Loading...</option>}
              {!stylesLoading && (visibleStyles.length > 0 || liveOnly.length > 0) && <option value="">Select a master style...</option>}
              {nothingToPick && (
                <option value="">
                  {hiddenDrafts ? `Only drafts are saved for ${env}: tick "Show drafts"` : `Nothing saved for ${env}. Press "Load list from PDAM".`}
                </option>
              )}
              {visibleStyles.map((s) => {
                const twin = visibleStyles.some((o) => o !== s && o.masterStyleID === s.masterStyleID && o.season === s.season);
                return <option key={s.ref} value={s.ref}>{styleLabel(s)}{twin && s.uid ? ` · #${s.uid.slice(0, 6)}` : ''}</option>;
              })}
              {liveOnly.map((r) => (
                <option key={r.uid} value={`live:${r.uid}`}>
                  {r.masterStyleID} · {r.season ?? 'no season'} · in PDAM only{r.hasPluginData ? '' : ' (no plugin data)'}{isLiveDraft(r) ? ' · draft' : ''}
                </option>
              ))}
            </select>
          </div>
          <button className={btnGhost} disabled={!!busy} onClick={rerun} title="Fetch this master style again from PDAM, right now">
            <RefreshCw className="w-4 h-4" /> Live re-run
          </button>
          <button className={nothingToPick ? btnPrimary : btnGhost} disabled={!!busy} onClick={() => loadList()} title="Ask PDAM which master styles it has">
            Load list from PDAM
          </button>
          <label className="flex items-center gap-1.5 text-sm text-slate-600 pb-1.5" title="Drafts are sketches in a workspace that are not yet published to the Product Library">
            <input
              type="checkbox"
              checked={includeDrafts}
              onChange={(e) => {
                setIncludeDrafts(e.target.checked);
                if (session && liveRows.length) loadList(e.target.checked); // refresh the live list with the new filter
              }}
            />
            Show drafts{!includeDrafts && hiddenDrafts > 0 ? ` (${hiddenDrafts} hidden)` : ' (not yet published)'}
          </label>
        </div>

        {needsSecret && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <button className={btnPrimary} disabled={!!busy} onClick={() => loadList()} title={`Signs in to ${env}: SSO window first, then a token, then a cookie`}>
                Sign in and load list
              </button>
              {busy && (
                <button className={btnGhost} onClick={() => void harvestApi.cancelSso(env)} title="Close the sign-in window">Cancel sign-in</button>
              )}
              <span className="text-xs text-slate-600">
                Order: <b>1 SSO</b> (a window for your company sign-in, including MFA), then <b>2 token</b>{oauthAvailable ? ' (the shared login for this environment)' : ' (a bearer token you paste)'}, then <b>3 cookie</b> (you paste it).
                {lastMethod ? <> Last time on {env}: <b>{METHOD_LABEL[lastMethod]}</b>, so that goes first.</> : null}
                Needed only to fetch fresh data from {env}; saved data above works without it. The session stays in this app's memory and is forgotten when the app stops.
              </span>
            </div>
            <details className="text-xs text-slate-600" open={pasteOpen} onToggle={(e) => setPasteOpen((e.target as HTMLDetailsElement).open)}>
              <summary className="cursor-pointer">Paste a bearer token or session cookie instead</summary>
              <div className="mt-2">
                <label htmlFor="secret-input" className={label}>Bearer token or session cookie for {env}</label>
                <input
                  id="secret-input"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Paste session cookie or token"
                  className={`${field} w-full max-w-xl font-mono`}
                />
              </div>
            </details>
          </div>
        )}
        {session && (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="text-emerald-700 font-medium">Connected to {env}</span>
            <button className="underline hover:text-slate-900 cursor-pointer" onClick={disconnect}>Disconnect</button>
          </div>
        )}
      </div>

      <div role={error ? 'alert' : 'status'} aria-live="polite">
        {(busy || error || notice) && (
          <div
            className={`text-sm px-3 py-2 rounded-md border flex items-center gap-2 ${
              error ? 'text-rose-800 bg-rose-50 border-rose-200' : busy ? 'text-slate-700 bg-slate-50 border-slate-200' : 'text-emerald-800 bg-emerald-50 border-emerald-200'
            }`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{error ?? (busy ? `${busy}...` : notice)}</span>
          </div>
        )}
      </div>

      {/* Steps 2-4 */}
      {showSteps ? (
        <div className="space-y-4">
          <nav aria-label="Steps" className="flex flex-wrap items-center gap-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                {i > 0 && <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden />}
                <button
                  onClick={() => setStep(s.id)}
                  aria-current={step === s.id ? 'step' : undefined}
                  className={`px-3.5 py-1.5 text-sm rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${
                    step === s.id ? 'bg-slate-900 text-white font-semibold' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-mono mr-1.5 opacity-70">{s.id}</span>
                  {s.title}
                </button>
              </React.Fragment>
            ))}
          </nav>
          <p className="text-sm text-slate-600">{STEPS[step - 1].hint}</p>

          {detail ? (
            <>
              {step === 1 && <StructuredInputPanel detail={detail} styleRef={detail.ref} />}
              {step === 2 && (
                <ReadPdfPanel
                  detail={detail}
                  styleRef={detail.ref}
                  boms={boms}
                  activeId={activeDev}
                  onActive={setActiveDev}
                  aiAvailable={!!config?.aiAvailable}
                  aiLabel={config?.aiModel ? `${config.aiModel}${config.aiProvider ? ` via ${config.aiProvider}` : ''}` : undefined}
                />
              )}
              {step === 3 && <BomPanel boms={boms} styleRef={detail.ref} loading={bomsLoading} env={env} connected={!!session} ai={config ? { available: config.aiAvailable, model: config.aiModel, provider: config.aiProvider, keySource: config.aiKeySource } : undefined} activeId={activeDev} onActive={setActiveDev} enrichment={enrichment} onEnrichment={(key, e) => setEnrichment((all) => ({ ...all, [key]: e }))} />}
              {step === 4 && <PdfPanel boms={boms} styleRef={detail.ref} loading={bomsLoading} env={env} activeId={activeDev} onActive={setActiveDev} enrichment={enrichment} />}
              {step === 5 && <CorrectionsPanel boms={boms} styleRef={detail.ref} env={env} activeId={activeDev} onActive={setActiveDev} enrichment={enrichment} loading={bomsLoading} />}
            </>
          ) : (
            <div className={`${card} text-sm text-slate-600`}>Loading...</div>
          )}

          <div className="flex justify-between pt-1">
            <button className={btnGhost} disabled={step === 1} onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4)}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              className={btnPrimary}
              disabled={step === 5 || !detail}
              title={!detail ? 'Available once the master style data has loaded' : undefined}
              aria-description={!detail ? 'Available once the master style data has loaded' : undefined}
              onClick={() => setStep((step + 1) as 2 | 3 | 4 | 5)}
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className={`${card} text-sm text-slate-600`}>
          {selected.startsWith('live:')
            ? 'This master style is in PDAM but has not been fetched yet. Press "Live re-run" to fetch it.'
            : detailFailed
              ? 'This style could not be loaded. Pick another one.'
              : (
                <>
                  <p className="font-medium text-slate-700">Choose a master style above to begin.</p>
                  {!stylesLoading && !visibleStyles.length && (
                    <p className="mt-1">Nothing saved yet? Use "Load list from PDAM", or load your own files below.</p>
                  )}
                </>
              )}
        </div>
      )}

      {/* Your own files */}
      <details className={card}>
        <summary className="text-sm font-medium text-slate-700 cursor-pointer">Or use your own files: a sketch PDF and a tech-engine-input.json</summary>
        <div className="flex flex-wrap items-end gap-4 mt-3">
          <div>
            <label htmlFor="sketch-file" className={label}>Sketch PDF (optional)</label>
            <input id="sketch-file" type="file" accept="application/pdf,.pdf" className="text-sm" onChange={(e) => setSketchFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label htmlFor="json-file" className={label}>tech-engine-input.json</label>
            <input id="json-file" type="file" accept="application/json,.json" className="text-sm" onChange={(e) => setJsonFile(e.target.files?.[0] ?? null)} />
          </div>
          <button className={btnGhost} disabled={!jsonFile || !!busy} onClick={loadInputs}>Load</button>
        </div>
      </details>
    </div>
  );
};
