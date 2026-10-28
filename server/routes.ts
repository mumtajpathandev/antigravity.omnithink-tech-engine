import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import { analytics } from './analytics';
import { readLogo, removeLogo, saveLogo } from './logo';
import { clearLog, readSince } from './ailog';
import { callSummary, readCalls } from './aicalls';
import { activeLocalModel, aiKeySource, aiModel, aiProvider, aiReady, ENV_NAMES, envKeysOf, effectiveModels, hostedModels, localModelOptions, openRouterModels, suggest } from './ai';
import { forgetKey, saveKey, setModel, storedKeys, storedKeySource } from './aikey';
import { getSettings, DEFAULT_SETTINGS, updateSettings } from './settings';
import { localStatus } from './local';
import { historyFor, recordAll, stats as correctionStats, type CorrectionField, type CorrectionRecord } from './corrections';
import { readSketchNoAi, readSketchWithAi } from './pdfread';
import { structureLegend } from './legend';
import { applyEnrichment, buildDevObjectBoms } from './bom';
import { lookupRows } from './catalog';
import { cancelSso, ssoSignIn } from './sso';
import { APP_ROOT, configAuthAvailable, configAuthEnv, envUrl, loadConfig, SCRIPT_DIR } from './config';
import { harvestStyle, listMasterStyles } from './harvest';
import { PdamClient, PdamError, type PdamAuth } from './pdam';
import { bomPdfs, createRun, listEnvStyles, offlineInfo, purgeHistory, readStyle, resolveStyle, safeName, styleFile, summarize, writeStyleFiles } from './store';
import { AI_PROVIDERS, ENVIRONMENTS, type AiPick, type AiProviderId, type ProviderStatus, type SettingsView, type AppConfig, type BomRow, type RowEdits, type RowFields, type AuthMode, type Env, type HarvestResult, type TechEngineInput } from '../src/harvest/types';

interface Session {
  client: PdamClient;
  mode: AuthMode;
  since: string;
}
// Credentials live here, in memory, per environment. Nothing is persisted or logged.
const sessions = new Map<Env, Session>();

class BadRequest extends Error {}

function envOf(value: unknown): Env {
  if (!ENVIRONMENTS.includes(value as Env)) throw new BadRequest('Unknown environment');
  return value as Env;
}

function sessionFor(env: Env): Session {
  const s = sessions.get(env);
  if (!s) throw new PdamError(`Not connected to ${env}. Connect first.`, 401);
  return s;
}

function authFor(mode: AuthMode, secret: string | undefined, env: Env): PdamAuth {
  if (mode === 'config') {
    const cfg = loadConfig();
    const a = cfg.auth;
    if (!configAuthAvailable(cfg) || !a) throw new BadRequest('The shared config has no OAuth client details');
    // The client secret is posted to the environment's host, so it may only go to the one it was issued for.
    if (configAuthEnv(cfg) !== env) {
      throw new BadRequest(`The shared OAuth client is only valid for ${configAuthEnv(cfg) ?? 'one environment'}. Sign in to ${env} with a session cookie or token.`);
    }
    return {
      mode: 'oauth',
      tokenEndpoint: a.tokenEndpoint!,
      grantType: a.grantType!,
      clientId: a.clientId!,
      clientSecret: a.clientSecret!,
      assertion: a.assertion!
    };
  }
  const value = (secret ?? '').trim();
  if (!value) throw new BadRequest(mode === 'cookie' ? 'Paste the Cookie header value' : 'Paste the bearer token');
  return mode === 'cookie' ? { mode: 'cookie', cookie: value } : { mode: 'token', token: value.replace(/^bearer\s+/i, '') };
}

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown> | unknown) =>
  async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (err) {
      const e = err as Error;
      const status = err instanceof BadRequest ? 400 : err instanceof PdamError ? (err.status === 401 || err.status === 403 ? err.status : 502) : /not found|Unknown|Invalid|not allowed/i.test(e.message) ? 404 : 500;
      res.status(status).json({ error: e.message });
    }
  };

export const router = Router();

router.get('/config', wrap(async (_req, res) => {
  await aiReady();
  const cfg = loadConfig();
  const out: AppConfig = {
    environments: ENVIRONMENTS,
    configAuthAvailable: configAuthAvailable(cfg),
    configAuthEnv: configAuthEnv(cfg),
    sessions: Object.fromEntries([...sessions].map(([env, s]) => [env, { mode: s.mode, since: s.since }])),
    scriptDir: SCRIPT_DIR,
    scriptDirFound: fs.existsSync(SCRIPT_DIR),
    offline: offlineInfo(),
    aiAvailable: await aiReady(),
    aiModel: aiModel(),
    aiProvider: aiProvider(),
    aiKeySource: aiKeySource()
  };
  res.json(out);
}));

router.post('/session', wrap(async (req, res) => {
  const env = envOf(req.body?.env);
  const mode = req.body?.mode as AuthMode;
  if (!['config', 'cookie', 'token'].includes(mode)) throw new BadRequest('Unknown auth mode');
  const client = new PdamClient(envUrl(loadConfig(), env), authFor(mode, req.body?.secret, env));
  await client.connect();
  await client.nxql('SELECT * FROM FileMasterStyleTechnicalSketch WHERE ecm:isTrashed = 0', 1); // proves the credential works
  sessions.set(env, { client, mode, since: new Date().toISOString() });
  res.json({ ok: true, env, mode });
}));

/** Add an AI key in the page (several per provider; kept in memory; saved encrypted for this Windows user only when asked). Never echoed back. */
router.post('/ai/key', wrap((req, res) => {
  let id: string;
  try {
    id = saveKey({ provider: req.body?.provider, key: req.body?.key, model: req.body?.model, label: req.body?.label, remember: Boolean(req.body?.remember) });
  } catch (err) {
    throw new BadRequest((err as Error).message);
  }
  res.json({ ok: true, id });
}));

/** Models the page offers for the chosen provider. Only OpenRouter publishes a list without a key; the others are typed in. */
router.get('/ai/models', wrap(async (req, res) => {
  if (req.query.provider === 'local') return res.json(await localModelOptions());
  if (req.query.provider === 'openrouter') return res.json(await openRouterModels());
  // the other providers list what the saved key may use; no key, or a refused request, just means no list (the id can be typed)
  const id = AI_PROVIDERS.find((x) => x.id === req.query.provider)?.id;
  res.json(id ? await hostedModels(id).catch(() => []) : []);
}));

/** Structure one legend page's text (text only, every value checked against the page). Used by the corpus batch tool. */
router.post('/legend/structure', wrap(async (req, res) => {
  if (!(await aiReady())) throw new BadRequest('AI is not enabled: install a local model (Ollama), or enter a key in the AI card.');
  res.json(await structureLegend(String(req.body?.text ?? '')));
}));

/** An optional provider id from the request (query or body): undefined when absent, a 400 when it is not a known provider. */
function providerOf(value: unknown): AiProviderId | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (!AI_PROVIDERS.some((p) => p.id === value)) throw new BadRequest('Unknown provider');
  return value as AiProviderId;
}

router.post('/ai/model', wrap((req, res) => {
  const id = typeof req.body?.id === 'string' && req.body.id ? req.body.id : undefined;
  try {
    setModel(req.body?.model, id);
  } catch (err) {
    throw new BadRequest((err as Error).message);
  }
  res.json({ ok: true, provider: aiProvider(), model: aiModel() });
}));

/** Forget one key (?id=), every key of a provider (?provider=), or every key when none is given. */
router.delete('/ai/key', wrap((req, res) => {
  const id = typeof req.query.id === 'string' && req.query.id ? req.query.id : undefined;
  forgetKey({ id, provider: providerOf(req.query.provider) });
  res.json({ ok: true });
}));

/** What the Settings screen shows: the saved settings, the defaults, every provider (never a key) and the local model server. */
async function settingsView(): Promise<SettingsView> {
  const stored = storedKeys();
  const providers: ProviderStatus[] = AI_PROVIDERS.map((p) => {
    const envKeys = p.noKey ? 0 : envKeysOf(p.id).length;
    const mine = stored.filter((k) => k.provider === p.id);
    const keys = mine.map((k) => ({ id: k.id, label: k.label, source: storedKeySource(k.id) ?? 'session' }));
    const models = p.noKey ? [] : effectiveModels(p.id);
    return {
      id: p.id,
      label: p.label,
      keyHint: p.keyHint,
      defaultModel: p.defaultModel,
      noKey: p.noKey,
      keySource: p.noKey ? null : envKeys ? 'env' : keys[0]?.source ?? null,
      keys,
      envKeys,
      models,
      model: p.noKey ? mine[0]?.legacyModel || getSettings().ai.localModel || '' : models[0] ?? ''
    };
  });
  const [status, active] = await Promise.all([localStatus(), activeLocalModel()]);
  return {
    settings: getSettings(),
    defaults: DEFAULT_SETTINGS,
    providers,
    local: { running: status.running, version: status.version ?? null, models: status.models.map((m) => ({ name: m.name, gb: Math.round((m.sizeBytes / 1e9) * 10) / 10 })), active }
  };
}

router.get('/settings', wrap(async (_req, res) => res.json(await settingsView())));

/** Change settings: the body is a partial AppSettings; every value is checked (a bad one is a 400 and nothing is saved). */
/** The uploaded logo (base64 in JSON, like the sketch PDFs). Only a PNG, JPEG, WebP, GIF or a plain SVG up to 512 KB is accepted. */
router.post('/logo', wrap((req, res) => {
  const data = typeof req.body?.dataBase64 === 'string' ? req.body.dataBase64 : '';
  if (!data) throw new BadRequest('No image was sent.');
  try {
    res.json({ ok: true, ...saveLogo(Buffer.from(data, 'base64')) });
  } catch (err) {
    throw new BadRequest((err as Error).message);
  }
}));
router.delete('/logo', wrap((_req, res) => {
  removeLogo();
  res.json({ ok: true });
}));
/** Served for an <img> only: no scripts, no sniffing, and the page's own address is the only place it can be used from. */
router.get('/logo', wrap((_req, res) => {
  const logo = readLogo();
  if (!logo) return void res.status(404).json({ error: 'No logo has been uploaded.' });
  res.setHeader('Content-Type', logo.type);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable'); // the address carries ?v=<version>, so a new upload is a new address
  res.sendFile(logo.file);
}));

router.put('/settings', wrap(async (req, res) => {
  try {
    // the logo version belongs to the logo routes: a page cannot set it
    if (req.body?.display && typeof req.body.display === 'object') delete req.body.display.logoVersion;
    updateSettings(req.body);
  } catch (err) {
    throw new BadRequest((err as Error).message);
  }
  res.json(await settingsView());
}));

/** Delete the saved PDF readings (memory/pdf-reads): the next reading of each PDF is made again. */
router.post('/settings/clear-pdf-readings', wrap((_req, res) => {
  const dir = path.join(APP_ROOT, 'memory', 'pdf-reads');
  let removed = 0;
  for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!name.endsWith('.json')) continue;
    fs.rmSync(path.join(dir, name), { force: true });
    removed++;
  }
  res.json({ removed });
}));

/** Sign in with SSO: opens a browser window and waits (up to 4 minutes) for the user to finish. */
router.post('/session/sso', wrap(async (req, res) => {
  const env = envOf(req.body?.env);
  const cookie = await ssoSignIn(env);
  const client = new PdamClient(envUrl(loadConfig(), env), { mode: 'cookie', cookie });
  await client.nxql('SELECT * FROM FileMasterStyleTechnicalSketch WHERE ecm:isTrashed = 0', 1); // proves the session works
  sessions.set(env, { client, mode: 'sso', since: new Date().toISOString() });
  res.json({ ok: true, env, mode: 'sso' });
}));

router.delete('/session/sso/:env', wrap((req, res) => res.json({ ok: true, cancelled: cancelSso(envOf(req.params.env)) })));

router.delete('/session/:env', wrap((req, res) => {
  sessions.delete(envOf(req.params.env));
  res.json({ ok: true });
}));

/** Saved master styles for one environment (newest copy of each), plus any loaded inputs. */
router.get('/styles', wrap((req, res) => res.json(listEnvStyles(envOf(req.query.env), req.query.source === 'offline' ? 'offline' : 'latest'))));

/** Purge History: removes this app's own saved runs only (see purgeHistory). */
router.delete('/history', wrap((_req, res) => res.json({ ok: true, ...purgeHistory() })));

router.post('/live/styles', wrap(async (req, res) => {
  const env = envOf(req.body?.env);
  const masterStyles = Array.isArray(req.body?.masterStyles) ? req.body.masterStyles.map(String) : [];
  res.json(await listMasterStyles(sessionFor(env).client, loadConfig(), { anyPath: Boolean(req.body?.anyPath), masterStyles }));
}));

router.post('/live/harvest', wrap(async (req, res) => {
  const env = envOf(req.body?.env);
  const uids: string[] = Array.isArray(req.body?.uids) ? req.body.uids.map(String) : [];
  if (!uids.length) throw new BadRequest('Select a master style to harvest');
  const { client } = sessionFor(env);
  const cfg = loadConfig();
  const { runId, goldenDir } = createRun(env);
  const result: HarvestResult = { runId, styles: [], errors: [], warnings: [] };
  for (const uid of uids) {
    try {
      const h = await harvestStyle(client, cfg, uid);
      const dir = writeStyleFiles(goldenDir, h.folder, h.files);
      result.styles.push(summarize(`${runId}|${h.folder}`, h.folder, dir, h.techInput));
      result.warnings.push(...h.warnings.map((w) => `${h.techInput.masterStyleID}: ${w}`));
    } catch (err) {
      result.errors.push({ uid, error: (err as Error).message });
    }
  }
  if (!result.styles.length) fs.rmSync(path.dirname(goldenDir), { recursive: true, force: true }); // nothing saved: leave no empty run behind
  res.json(result);
}));

router.get('/style', wrap((req, res) => {
  const { techInput, summary, hasSketch } = readStyle(String(req.query.ref ?? ''));
  res.json({ ref: req.query.ref, techInput, summary, hasSketch });
}));

router.get('/style/boms', wrap((req, res) => {
  const { dir, techInput } = readStyle(String(req.query.ref ?? ''));
  const pdfs = bomPdfs(dir);
  res.json(buildDevObjectBoms(techInput).map((b) => ({ ...b, pdfName: pdfs[safeName(b.devObjectId)] })));
}));

/**
 * The dev object's BOM, Flex payload and PDF rows after the PDAM lookup (when asked for) and the AI picks the user accepted.
 * The lookup is re-done here (it is cached for a few minutes) and the picks are checked against its candidates, so nothing the
 * page sends can put a value into the payload or the PDF that PDAM did not offer.
 */
const clip = (v: unknown, max = 300): string => String(v ?? '').slice(0, max);
const orNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? clip(v.trim()) : null);

/** The edits a person made on screen 5, cleaned: only known fields, strings of sane length, indexes as integers. */
function cleanEdits(raw: unknown): RowEdits | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const e = raw as Record<string, unknown>;
  const fieldsOf = (f: Record<string, unknown>): Partial<RowFields> => {
    const out: Partial<RowFields> = {};
    if ('section' in f && typeof f.section === 'string' && f.section.trim()) out.section = clip(f.section.trim(), 40);
    if ('standardPlacement' in f) out.standardPlacement = orNull(f.standardPlacement);
    if ('placement' in f) out.placement = orNull(f.placement);
    if ('supplierArticle' in f) out.supplierArticle = orNull(f.supplierArticle);
    if ('supplierName' in f) out.supplierName = orNull(f.supplierName);
    if ('materialName' in f && typeof f.materialName === 'string' && f.materialName.trim()) out.materialName = clip(f.materialName.trim());
    return out;
  };
  const rows = (Array.isArray(e.rows) ? e.rows : []).flatMap((r: Record<string, unknown>) =>
    Number.isInteger(r?.index) && r.fields && typeof r.fields === 'object' ? [{ index: r.index as number, fields: fieldsOf(r.fields as Record<string, unknown>) }] : []
  );
  const deleted = (Array.isArray(e.deleted) ? e.deleted : []).filter((i: unknown): i is number => Number.isInteger(i));
  const added = (Array.isArray(e.added) ? e.added : []).flatMap((r: Record<string, unknown>) => {
    const f = fieldsOf(r ?? {});
    return f.materialName ? [{ section: f.section ?? 'trim', standardPlacement: f.standardPlacement ?? null, placement: f.placement ?? null, supplierArticle: f.supplierArticle ?? null, supplierName: f.supplierName ?? null, materialName: f.materialName }] : [];
  });
  return rows.length || deleted.length || added.length ? { rows, deleted, added } : undefined;
}

/**
 * The dev object's BOM, Flex payload and PDF rows after the PDAM lookup (when asked for), past corrections (when asked for), the AI
 * picks the user accepted and the user's own edits. The lookup is re-done here (it is cached for a few minutes) and the picks are checked
 * against its candidates, so nothing the page sends can put a value into the payload or the PDF that PDAM or the memory did not offer;
 * edits are the person's own words and are only length-checked.
 */
async function enrichedFor(req: Request, opts: { withEdits?: boolean; withAi?: boolean } = {}) {
  const { techInput } = readStyle(String(req.body?.ref ?? ''));
  const db = buildDevObjectBoms(techInput).find((b) => b.devObjectId === String(req.body?.devObjectId ?? ''));
  if (!db) throw new Error('Unknown dev object');
  const picks: AiPick[] = (Array.isArray(req.body?.ai) ? req.body.ai : []).map((p: Record<string, unknown>) => ({
    index: Number(p?.index),
    candidate: Number(p?.candidate),
    confidence: Number(p?.confidence)
  }));
  const wantLookup = Boolean(req.body?.lookup);
  const lookup = wantLookup ? await lookupRows(sessionFor(envOf(req.body?.env)).client, db.flexPayload.bom) : null;
  const provider = aiProvider();
  const model = aiModel();
  const history = req.body?.history ? (row: BomRow) => historyFor(row.materialName, row.articleNumber) : undefined;
  const edits = opts.withEdits === false ? undefined : cleanEdits(req.body?.edits);
  const usePicks = opts.withAi === false ? [] : lookup ? picks : [];
  return { db, techInput, lookup, picks: usePicks, ...applyEnrichment(db, lookup, usePicks, provider && model ? { provider, model } : undefined, history, edits) };
}

router.post('/style/enriched', wrap(async (req, res) => {
  const { bom, flexPayload } = await enrichedFor(req);
  res.json({ bom, flexPayload });
}));

/** The BOM PDF, built on the spot from the enriched view (nothing is read from a saved PDF). */
router.post('/style/bom-pdf', wrap(async (req, res) => {
  const { db, overrides } = await enrichedFor(req, { withAi: req.body?.includeAi !== false });
  if (!db.bom.bomRows.length) throw new BadRequest('This dev object has no BOM rows, so there is no PDF to make.');
  const { dir } = readStyle(String(req.body?.ref ?? ''));
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'omnithink-pdf-'));
  try {
    const out = path.join(work, 'bom.pdf');
    const overridesFile = path.join(work, 'overrides.json');
    fs.writeFileSync(overridesFile, JSON.stringify(overrides));
    await new Promise<void>((resolve, reject) => {
      execFile(
        process.env.PYTHON || 'python',
        ['render_bom_pdf.py', dir, db.devObjectId, out, overridesFile],
        { cwd: SCRIPT_DIR, timeout: 60_000, windowsHide: true },
        (err, _stdout, stderr) => (err ? reject(new Error(`The PDF could not be built: ${String(stderr || err.message).split('\n').filter(Boolean).pop()}`)) : resolve())
      );
    });
    res.type('application/pdf').setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(fs.readFileSync(out));
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}));

/** A saved file of the style, as JSON (screen 1: plugin data, style seasonal documents, the source document, the summary). */
const STYLE_JSON: Record<string, string> = { pluginData: 'pluginData.json', styleSeasonal: 'styleSeasonal.json', sourceDocument: 'source-document.json', summary: 'summary.json' };
router.get('/style/json', wrap((req, res) => {
  const file = STYLE_JSON[String(req.query.name ?? '')];
  if (!file) throw new BadRequest('Unknown file');
  const { dir } = readStyle(String(req.query.ref ?? ''));
  const full = path.join(dir, file);
  if (!fs.existsSync(full)) return res.json(null);
  res.type('application/json').send(fs.readFileSync(full, 'utf8'));
}));

/** Screen 2: everything the no-AI methods read from the sketch PDF, compared with the plugin BOM rows of one dev object. */
function bomRowsOf(req: Request): { dir: string; rows: BomRow[] } {
  const { dir, techInput } = readStyle(String(req.body?.ref ?? ''));
  const db = buildDevObjectBoms(techInput).find((b) => b.devObjectId === String(req.body?.devObjectId ?? ''));
  return { dir, rows: db?.bom.bomRows ?? [] };
}
router.post('/style/pdf-read', wrap(async (req, res) => {
  const { dir, rows } = bomRowsOf(req);
  res.json(await readSketchNoAi(dir, rows, req.body?.fresh === true));
}));
/** The same, plus the text model reading the pages the no-AI methods could not (the page text goes out redacted). */
router.post('/style/pdf-read-ai', wrap(async (req, res) => {
  if (!(await aiReady())) throw new BadRequest('AI is not enabled: install a local model (Ollama), or enter a key in the AI card.');
  const { dir, rows } = bomRowsOf(req);
  res.json(await readSketchWithAi(dir, rows, req.body?.compareRead !== false, req.body?.fresh === true));
}));

/**
 * Screen 5: record the person's edits as corrections. The "before" of each edit is the row as the pipeline produced it (lookup, history
 * and AI picks as the person saw them), so what is remembered is exactly what the person changed.
 */
router.post('/corrections', wrap(async (req, res) => {
  const edits = cleanEdits(req.body?.edits);
  if (!edits) throw new BadRequest('There is nothing to record: no row was changed.');
  const before = await enrichedFor(req, { withEdits: false });
  const rows = before.flexPayload.bom;
  const ready = before.db.bom.bomRows; // in-development rows are corrected like the others
  const sourceOf = (i: number) => before.bom.bomRows[before.db.bom.bomRows.indexOf(ready[i])]?.enrichedBy ?? 'plugin';
  const common = { masterStyleID: before.db.bom.masterStyleID, devObjectId: before.db.devObjectId };
  const records: Omit<CorrectionRecord, 'id' | 'at' | 'user'>[] = [];
  const reason = typeof req.body?.reason === 'string' && req.body.reason.trim() ? clip(req.body.reason.trim(), 200) : undefined;
  for (const e of edits.rows) {
    const row = rows[e.index];
    const plugin = ready[e.index];
    if (!row || !plugin) continue;
    for (const [field, after] of Object.entries(e.fields) as [CorrectionField, string | null][]) {
      const prior = (row as unknown as Record<string, string | null>)[field] ?? null;
      if ((prior ?? '') === (after ?? '')) continue;
      records.push({ ...common, material: plugin.materialName, article: plugin.articleNumber ?? '', field, before: prior, after, source: sourceOf(e.index), reason });
    }
  }
  for (const i of edits.deleted) {
    const plugin = ready[i];
    if (plugin) records.push({ ...common, material: plugin.materialName, article: plugin.articleNumber ?? '', field: 'row', before: JSON.stringify(rows[i] ?? null), after: null, source: sourceOf(i), reason });
  }
  for (const a of edits.added) records.push({ ...common, material: a.materialName, article: a.supplierArticle ?? '', field: 'row', before: null, after: JSON.stringify(a), source: 'edit', reason });
  const saved = recordAll(records);
  res.json({ saved: saved.length, total: correctionStats().total });
}));
/** What the AI calls have cost so far (time, failures, memory), per model: the data for choosing models. */
router.get('/ai/log', wrap((req, res) => res.json(readSince(Number(req.query.since) || 0))));
router.post('/ai/log/clear', wrap((_req, res) => {
  clearLog();
  res.json({ ok: true });
}));
router.get('/ai/calls/summary', wrap((_req, res) => res.json({ total: readCalls().length, models: callSummary() })));
/** Everything the page's Analytics section shows. */
router.get('/analytics', wrap(async (_req, res) => res.json(await analytics())));
router.get('/corrections/summary', wrap((_req, res) => res.json(correctionStats())));

/** The dev object's draft Flex rows run through the PDAM Material catalog. Needs a connection to the environment. */
async function catalogRows(req: Request) {
  const env = envOf(req.body?.env);
  const { techInput } = readStyle(String(req.body?.ref ?? ''));
  const bom = buildDevObjectBoms(techInput).find((b) => b.devObjectId === String(req.body?.devObjectId ?? ''));
  if (!bom) throw new Error('Unknown dev object');
  return lookupRows(sessionFor(env).client, bom.flexPayload.bom);
}

router.post('/style/catalog', wrap(async (req, res) => res.json({ rows: await catalogRows(req) })));

/** Optional AI step: suggestions only, on request, never changes saved data. */
router.post('/style/ai', wrap(async (req, res) => {
  if (!(await aiReady())) throw new BadRequest('AI is not enabled: install a local model (Ollama), or enter a key in the AI card.');
  res.json(await suggest(await catalogRows(req), typeof req.body?.model === 'string' ? req.body.model.trim() : undefined));
}));

router.get('/style/file',wrap((req, res) => {
  const file = styleFile(String(req.query.ref ?? ''), String(req.query.name ?? ''));
  res.type('application/pdf').setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(file);
}));

/** Load a sketch PDF and/or a single tech-engine-input.json the user already has. */
router.post('/inputs', wrap((req, res) => {
  const raw = req.body?.techInput as TechEngineInput | undefined;
  if (!raw || typeof raw !== 'object' || !raw.masterStyleID || !Array.isArray(raw.parts) || !Array.isArray(raw.developmentObjectParts)) {
    throw new BadRequest('Not a tech-engine-input.json (needs masterStyleID, parts and developmentObjectParts)');
  }
  // Tolerate sloppy files: drop null entries and make sure every list the UI reads is a list.
  const ti: TechEngineInput = {
    ...raw,
    masterStyleID: String(raw.masterStyleID),
    parts: raw.parts.filter((p) => p && typeof p === 'object' && p.partId),
    developmentObjectParts: raw.developmentObjectParts
      .filter((d) => d && typeof d === 'object' && d.devObjectId)
      .map((d) => ({
        ...d,
        parts: (Array.isArray(d.parts) ? d.parts : [])
          .filter((p) => p && typeof p === 'object' && p.partId)
          .map((p) => ({ ...p, materials: (Array.isArray(p.materials) ? p.materials : []).filter((m) => m && typeof m === 'object' && m.materialName) }))
      }))
  };
  let sketch: Buffer | null = null;
  if (req.body?.sketchBase64) {
    sketch = Buffer.from(String(req.body.sketchBase64), 'base64');
    if (sketch.subarray(0, 5).toString('latin1') !== '%PDF-') throw new BadRequest('The sketch file is not a PDF');
  }
  const { runId, goldenDir } = createRun('INPUT');
  const folder = `${safeName(ti.masterStyleID)}-${safeName(ti.mstsDocumentUid ?? 'input')}`;
  const dir = writeStyleFiles(goldenDir, folder, { 'tech-engine-input.json': JSON.stringify(ti, null, 2), 'sketch.pdf': sketch });
  const ref = `${runId}|${folder}`;
  resolveStyle(ref); // fails loudly if the folder was not written as expected
  res.json({ runId, style: summarize(ref, folder, dir, ti) });
}));
