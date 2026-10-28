// Live harvest from PDAM: discover BOM-ready master style sketches, then for each one fetch the
// document, its plugin data, its StyleSeasonal documents and the sketch PDF, and assemble the
// same tech-engine-input.json the standalone Python script writes. Read-only against PDAM.

import type { HarvestConfig } from './config';
import type { NxEntry, PdamClient } from './pdam';
import { dedupeDevObjects } from './bom';
import { safeName } from './store';
import type { DevObjectParts, MasterStyleRow, PluginPart, TechEngineInput } from '../src/harvest/types';

const asList = <T>(v: T | T[] | null | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const nxqlEscape = (v: unknown) => String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

export function buildMstsQuery(cfg: HarvestConfig, masterStyles: string[], anyPath: boolean): string {
  let query = cfg.queries.msts;
  if (masterStyles.length) query += ` AND msts:masterStyleID IN (${masterStyles.map((s) => `'${nxqlEscape(s)}'`).join(', ')})`;
  if (anyPath) {
    // "Show drafts": sketches outside the Product Library, which are usually not flagged BOM-ready yet either.
    query = query.replace(/\s+AND\s+ecm:path\s+STARTSWITH\s+'[^']*'/i, '');
    query = query.replace(/(WHERE\s+)msts:bomReadiness\s*=\s*1\s+AND\s+/i, '$1');
  }
  return query;
}

/** Read-only discovery: what the harvest query returns, without fetching or writing anything. */
export async function listMasterStyles(
  client: PdamClient,
  cfg: HarvestConfig,
  opts: { masterStyles?: string[]; anyPath?: boolean; limit?: number }
): Promise<MasterStyleRow[]> {
  const entries = await client.nxql(
    buildMstsQuery(cfg, opts.masterStyles ?? [], Boolean(opts.anyPath)),
    opts.limit ?? cfg.limits?.maxDocuments
  );
  return entries
    .map((e) => {
      const p = e.properties ?? {};
      return {
        masterStyleID: p['msts:masterStyleID'] ?? null,
        uid: e.uid,
        season: p['relations:parentSeasonYear'] ?? null,
        bomReady: p['msts:bomReadiness'] ?? null,
        hasPluginData: Boolean(p['illustrator_plugin:pluginData']),
        styleCount: asList(p['msts:styleIDs']).length,
        path: e.path ?? null,
        title: e.title ?? null
      };
    })
    .sort((a, b) => String(a.masterStyleID).localeCompare(String(b.masterStyleID)));
}

interface PluginData {
  parsed: Record<string, unknown>;
  parts: PluginPart[];
  devObjects: DevObjectParts[];
  materialCount: number;
}

function parsePluginData(raw: unknown, warnings: string[]): PluginData | null {
  if (raw == null || (typeof raw === 'string' && !raw.trim())) return null;
  try {
    const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, any>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('pluginData is not a JSON object');
    const all = asList<DevObjectParts>(parsed.devObjects);
    const devObjects = dedupeDevObjects(all);
    if (devObjects.length < all.length) {
      warnings.push(`pluginData lists ${all.length} dev objects but only ${devObjects.length} distinct ids; used the last copy of each`);
    }
    const materialCount = devObjects.reduce((n, d) => n + asList(d.parts).reduce((m, p) => m + asList(p.materials).length, 0), 0);
    return { parsed, parts: asList<PluginPart>(parsed.parts), devObjects, materialCount };
  } catch (err) {
    warnings.push(`Could not parse pluginData: ${(err as Error).message}`);
    return null;
  }
}

async function fetchStyleSeasonal(client: PdamClient, cfg: HarvestConfig, styleIds: string[], season: string | null) {
  const out = { payload: [] as NxEntry[], docIds: [] as string[], devObjectMap: {} as Record<string, string[]> };
  for (const s of styleIds) out.devObjectMap[s] = [];
  if (!styleIds.length || !season) return out;
  for (const styleId of styleIds) {
    const query =
      `${cfg.queries.styleSeasonal} AND productHierarchy:styleID = '${nxqlEscape(styleId)}'` +
      ` AND productHierarchy:flexSeasonCode = '${nxqlEscape(season)}'`;
    for (const entry of await client.nxql(query)) {
      out.docIds.push(entry.uid);
      const doc = await client.getDoc(entry.uid);
      out.payload.push(doc);
      for (const d of asList<any>(doc.properties?.['st:developmentObjects'])) {
        if (d?.objectId) out.devObjectMap[styleId].push(d.objectId);
      }
    }
    out.devObjectMap[styleId] = [...new Set(out.devObjectMap[styleId])];
  }
  return out;
}

export interface Harvested {
  folder: string;
  techInput: TechEngineInput;
  summary: Record<string, unknown>;
  files: Record<string, string | Buffer | null>;
  warnings: string[];
}

export async function harvestStyle(client: PdamClient, cfg: HarvestConfig, uid: string): Promise<Harvested> {
  const warnings: string[] = [];
  const doc = await client.getDoc(uid);
  const props = doc.properties ?? {};
  const master: string = props['msts:masterStyleID'];
  if (!master || !String(master).trim()) throw new Error('Document has no msts:masterStyleID');
  const styleIds = asList<string>(props['msts:styleIDs']);
  const season: string | null = props['relations:parentSeasonYear'] ?? null;

  const plugin = parsePluginData(props['illustrator_plugin:pluginData'], warnings);
  if (!plugin) warnings.push('No usable pluginData: parts and materials are empty, so no BOM can be built.');
  const seasonal = await fetchStyleSeasonal(client, cfg, styleIds, season);
  const developmentObjects = [...new Set(Object.values(seasonal.devObjectMap).flat())].sort();

  let sketch: Buffer | null = null;
  try {
    sketch = await client.downloadBlob(uid);
  } catch (err) {
    warnings.push(`Sketch PDF download failed: ${(err as Error).message}`);
  }

  const devObjectParts = plugin?.devObjects ?? [];
  const classification = devObjectParts.length ? 'BOM_READY' : 'NO_DEV_OBJECTS';
  const seasonalIds = [...new Set(seasonal.docIds)].sort();
  const techInput: TechEngineInput = {
    mstsDocumentUid: uid,
    documentTitle: doc.title,
    datasetVersion: cfg.datasetVersion ?? null,
    masterStyleID: master,
    classification,
    seasonYear: season,
    styleIds,
    styleDevelopmentObjects: seasonal.devObjectMap,
    styleSeasonalDocumentIds: seasonalIds,
    developmentObjects,
    pluginDevelopmentObjects: [...new Set(devObjectParts.map((d) => d.devObjectId))].sort(),
    parts: plugin?.parts ?? [],
    developmentObjectParts: devObjectParts,
    summary: {
      styleCount: styleIds.length,
      developmentObjectCount: developmentObjects.length,
      partCount: plugin?.parts.length ?? 0,
      materialCount: plugin?.materialCount ?? 0
    }
  };
  const summary = {
    mstsDocumentUid: uid,
    documentTitle: doc.title,
    masterStyleID: master,
    classification,
    seasonYear: season,
    styleIds,
    styleCount: styleIds.length,
    developmentObjects,
    styleDevelopmentObjects: seasonal.devObjectMap,
    styleSeasonalDocumentIds: seasonalIds,
    partCount: plugin?.parts.length ?? 0,
    materialCount: plugin?.materialCount ?? 0,
    pluginDevObjects: devObjectParts.length,
    styleSeasonalDevObjects: developmentObjects.length,
    pdfDownloaded: Boolean(sketch),
    warnings
  };
  const json = (v: unknown) => JSON.stringify(v, null, 2);
  return {
    folder: `${safeName(master)}-${safeName(uid)}`,
    techInput,
    summary,
    warnings,
    files: {
      'tech-engine-input.json': json(techInput),
      'summary.json': json(summary),
      'source-document.json': json(doc),
      'pluginData.json': plugin ? json(plugin.parsed) : null,
      'styleSeasonal.json': seasonal.payload.length ? json(seasonal.payload) : null,
      'sketch.pdf': sketch
    }
  };
}
