import type { DevObjectParts, PluginMaterial, PluginPart, TechEngineInput } from '../types';

/** Local shape of the Illustrator plugin file (pluginData.json); not in types.ts. */
export interface PluginDataFile {
  schema?: string;
  schemaVersion?: string | number;
  pluginVersion?: string;
  parts?: PluginPart[];
  devObjects?: DevObjectParts[];
}

type Doc = Record<string, unknown>;

export const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const isObj = (v: unknown): v is Doc => !!v && typeof v === 'object' && !Array.isArray(v);

/** Each distinct devObjectId once, the last saved copy winning; order = first appearance. `collapsed` = extra copies dropped. */
export function dedupeDevObjects<T extends { devObjectId: string }>(list: T[] | undefined | null): { items: T[]; collapsed: number } {
  const byId = new Map<string, T>();
  let total = 0;
  for (const d of list ?? []) {
    if (!d || typeof d.devObjectId !== 'string') continue;
    total++;
    byId.set(d.devObjectId, d); // re-set keeps the original insertion position, replaces the value
  }
  return { items: [...byId.values()], collapsed: total - byId.size };
}

const countMaterials = (d: DevObjectParts) => (d.parts ?? []).reduce((n, p) => n + (p.materials?.length ?? 0), 0);
const countInDev = (d: DevObjectParts) =>
  (d.parts ?? []).reduce((n, p) => n + (p.materials ?? []).filter((m) => m.isInDevelopment).length, 0);

export interface DevObjectRow {
  devObjectId: string;
  name?: string;
  confirmed: boolean;
  /** false when the dev object is only listed by PDAM and has no plugin parts saved */
  hasParts: boolean;
  materialCount: number;
  inDevCount: number;
}
export interface StyleRow {
  styleId: string;
  devObjects: DevObjectRow[];
}

export function shapeStyles(t: TechEngineInput): { styles: StyleRow[]; unlinked: DevObjectRow[]; collapsed: number } {
  const { items, collapsed } = dedupeDevObjects(t.developmentObjectParts);
  const used = new Set<string>();
  const toRow = (d: DevObjectParts, confirmed: boolean): DevObjectRow => ({
    devObjectId: d.devObjectId, name: d.name, confirmed, hasParts: true, materialCount: countMaterials(d), inDevCount: countInDev(d)
  });
  const styles = (t.styleIds ?? []).map((styleId): StyleRow => {
    const listed = t.styleDevelopmentObjects?.[styleId] ?? [];
    const rows: DevObjectRow[] = [];
    for (const id of listed) {
      if (used.has(id)) continue;
      used.add(id);
      const d = items.find((x) => x.devObjectId === id);
      rows.push(d ? toRow(d, true) : { devObjectId: id, confirmed: true, hasParts: false, materialCount: 0, inDevCount: 0 });
    }
    for (const d of items) {
      if (d.styleId === styleId && !used.has(d.devObjectId)) {
        used.add(d.devObjectId);
        rows.push(toRow(d, false));
      }
    }
    return { styleId, devObjects: rows };
  });
  const unlinked = items.filter((d) => !used.has(d.devObjectId)).map((d) => toRow(d, false));
  return { styles, unlinked, collapsed };
}

export interface SeasonalDev { id: string; name: string; status: string }
export interface SeasonalView {
  title: string;
  fields: { label: string; value: string }[];
  devObjects: SeasonalDev[];
}

const SEASONAL_FIELDS: [string, string[]][] = [
  ['Style id', ['productHierarchy:styleID']],
  ['Season', ['productHierarchy:seasonDescription', 'productHierarchy:flexSeasonCode']],
  ['Brand', ['productHierarchy:brandName', 'productHierarchy:brandId']],
  ['Division', ['productHierarchy:divisionName', 'productHierarchy:divisionID']],
  ['Department', ['productHierarchy:departmentName', 'productHierarchy:departmentID']],
  ['Class', ['productHierarchy:className', 'productHierarchy:classID']],
  ['Subclass', ['productHierarchy:subclassName', 'productHierarchy:subClassID']],
  ['Style name', ['productHierarchy:flexStyleName', 'productHierarchy:plimStyleName']]
];

export function shapeSeasonalDoc(doc: unknown, index: number): SeasonalView {
  const d: Doc = isObj(doc) ? doc : {};
  const p: Doc = isObj(d.properties) ? d.properties : {};
  const first = (keys: string[]) => keys.map((k) => str(p[k])).find(Boolean) ?? '';
  const styleId = first(['productHierarchy:styleID']);
  const season = first(['productHierarchy:seasonDescription', 'productHierarchy:flexSeasonCode']);
  const head = [styleId, season].filter(Boolean).join(' - ');
  const title = head || str(d.title) || str(p['dc:title']) || `Document ${index + 1}`;
  const fields = SEASONAL_FIELDS.map(([label, keys]) => ({ label, value: first(keys) })).filter((f) => f.value);
  const rawDevs = Array.isArray(p['st:developmentObjects']) ? (p['st:developmentObjects'] as unknown[]) : [];
  const devObjects = rawDevs.filter(isObj).map((o) => ({
    id: str(o.objectId) || str(o.id) || '(no id)',
    name: str(o.description) || str(o.name),
    status: str(o.status)
  }));
  return { title, fields, devObjects };
}

export interface PluginMaterialRow extends PluginMaterial { partName: string; placement: string }
export interface PluginView {
  parts: (PluginPart & { usedBy: string[] })[];
  devObjects: { devObjectId: string; name?: string; styleId?: string; materials: PluginMaterialRow[] }[];
  collapsed: number;
}

export function shapePlugin(data: PluginDataFile | null): PluginView | null {
  if (!data || typeof data !== 'object') return null;
  const partsList = Array.isArray(data.parts) ? data.parts : [];
  const partById = new Map(partsList.map((p) => [p.partId, p]));
  const { items, collapsed } = dedupeDevObjects(Array.isArray(data.devObjects) ? data.devObjects : []);
  const devObjects = items.map((d) => ({
    devObjectId: d.devObjectId,
    name: d.name,
    styleId: d.styleId,
    materials: (d.parts ?? []).flatMap((dp) => {
      const part = partById.get(dp.partId);
      return (dp.materials ?? []).map((m) => ({ ...m, partName: part?.name ?? dp.partId, placement: part?.placement ?? '' }));
    })
  }));
  const parts = partsList.map((p) => ({
    ...p,
    usedBy: items.filter((d) => (d.parts ?? []).some((dp) => dp.partId === p.partId && (dp.materials?.length ?? 0) > 0)).map((d) => d.devObjectId)
  }));
  return { parts, devObjects, collapsed };
}
