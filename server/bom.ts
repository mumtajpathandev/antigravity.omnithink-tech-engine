// Dev object -> BOM -> Flex payload. Port of build_bom_rows / write_boms in the standalone
// Python script (build_tech_engine_input.py), so the UI shows the same rows and payload shape.
// Only data that exists in tech-engine-input.json is used: nothing is invented.

import type { AiPick, AiProviderId, Bom, RowEdits, RowFields, BomRow, CatalogRow, DevObjectBom, DevObjectParts, EnrichedView, FlexPayload, FlexRow, PluginPart, TechEngineInput } from '../src/harvest/types';
import { applyCandidate } from './catalog';
import type { HistoryHit } from './corrections';

/** The article is only the material name again (case, punctuation and spacing aside). */
export const articleIsName = (article: string | null | undefined, materialName: string) => {
  const k = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return Boolean(article) && k(article!) === k(materialName);
};

const SECTION_MAP: Record<string, string> = {
  'Fabric part': 'fabric',
  Trim: 'trim',
  Lining: 'lining',
  Print: 'print',
  Graphics: 'graphics',
  Stitch: 'stitch',
  Bonding: 'bonding'
};
const DEFAULT_SECTION = 'other';

/** The plugin can save a dev object several times; keep the last copy of each id. */
export function dedupeDevObjects(list: DevObjectParts[]): DevObjectParts[] {
  const latest = new Map<string, DevObjectParts>();
  for (const d of list ?? []) if (d?.devObjectId && String(d.devObjectId).trim()) latest.set(d.devObjectId, d);
  return [...latest.values()];
}

function buildRows(devObject: DevObjectParts, parts: Map<string, PluginPart>, warnings: string[]): BomRow[] {
  const rows: BomRow[] = [];
  for (const ref of devObject.parts ?? []) {
    const part = parts.get(ref.partId);
    if (!part) {
      warnings.push(`partId ${ref.partId} is not in the parts list; section and placement left blank`);
    }
    const type = part?.partType ?? '';
    const section = Object.hasOwn(SECTION_MAP, type) ? SECTION_MAP[type] : DEFAULT_SECTION; // not "constructor" etc.
    const trim = (v?: string) => (typeof v === 'string' ? v.trim() : v); // PDAM text sometimes has stray spaces
    for (const m of ref.materials ?? []) {
      rows.push({
        section,
        standardPlacement: trim(part?.placement),
        placement: trim(part?.name),
        materialName: trim(m.materialName) as string,
        articleNumber: trim(m.articleNumber),
        label: trim(m.label),
        isInDevelopment: Boolean(m.isInDevelopment)
      });
    }
  }
  return rows;
}

const FLEX_HEADER = { eventSource: 'OmniThink', eventEntity: 'Development BOM', eventType: 'Create' };

/**
 * Draft Flex payload for one dev object. In-development materials are included and processed like the others (the screens
 * show them struck through; OmniTechPack leaves them out "pending agreed Flex handling": to be agreed). Supplier names are null: they come from a
 * Material-Supplier catalog we do not have. Nothing here is invented from other fields.
 */
function buildFlexPayload(
  t: TechEngineInput,
  devObject: DevObjectParts,
  rows: BomRow[],
  confirmed: boolean,
  warnings: string[]
): { payload: FlexPayload; excluded: number } {
  const devObjectId = devObject.devObjectId;
  // In-development materials are processed like the others (lookup, history, AI, edits); the screens only strike them through.
  const ready = rows;
  const excluded = 0;
  const now = new Date().toISOString();
  const bom = ready.map((r) => ({
    section: r.section, // plugin values as stored: no code-to-name conversion until the real vocabulary is known
    standardPlacement: r.standardPlacement ?? null,
    placement: r.placement ?? null,
    supplierArticle: r.articleNumber || null,
    supplierName: null,
    materialName: r.materialName,
    omniMatchScore: '100%' // rows from validated plugin metadata; OmniTechPack scores those 100%
  }));
  return {
    excluded,
    payload: {
      header: { ...FLEX_HEADER },
      parentId: t.mstsDocumentUid ?? null,
      type: 'FileMasterStyleTechnicalSketch',
      devObjectId,
      seasonCode: t.seasonYear ?? null,
      dateRequested: now,
      dateReceived: now,
      dateSentToFlex: '',
      errorCode: null,
      message: `Processing completed successfully; ${bom.length} BOM row(s) produced.`,
      bom,
      _sketch: {
        source_id: t.mstsDocumentUid ?? null,
        target_id: devObjectId,
        source_sha256: null, // needs the sketch PDF bytes
        target: {
          label: devObject.name ?? null,
          identity_status: confirmed ? 'confirmed' : 'inferred', // OmniTechPack's wording
          style_id: devObject.styleId ?? null,
          dev_object_id: devObjectId,
          metadata_source: 'pluginData.devObjects[0]',
          mapping_revision: 'plugin-exact-dev-object-v1',
          bom_row_count: bom.length,
          review_warnings: []
        },
        publication_allowed: confirmed,
        review_warnings: [...warnings],
        needs_review: !confirmed || warnings.length > 0
      }
    }
  };
}

export function buildDevObjectBoms(techInput: TechEngineInput): DevObjectBom[] {
  const parts = new Map((techInput.parts ?? []).filter((p) => p.partId).map((p) => [p.partId, p]));
  return dedupeDevObjects(techInput.developmentObjectParts).map((devObject) => {
    const warnings: string[] = [];
    const bom: Bom = {
      masterStyleID: techInput.masterStyleID,
      seasonYear: techInput.seasonYear,
      devObjectId: devObject.devObjectId,
      bomRows: buildRows(devObject, parts, warnings)
    };
    if (!bom.bomRows.length) warnings.push('No materials are assigned to any part of this dev object, so the BOM is empty.');
    const confirmed = (techInput.developmentObjects ?? []).includes(devObject.devObjectId);
    if (!confirmed) {
      warnings.push(
        "PDAM's style data does not list this dev object, so it is not confirmed. OmniTechPack would hold it back (AWAITING_TARGET_MAPPING) and not send it to Flex."
      );
    }
    if (!techInput.mstsDocumentUid) warnings.push('This data has no PDAM document id, so parentId is empty in the payload.');
    const { payload, excluded } = buildFlexPayload(techInput, devObject, bom.bomRows, confirmed, warnings);
    return {
      devObjectId: devObject.devObjectId,
      name: devObject.name,
      styleId: devObject.styleId,
      comment: devObject.comment,
      bom,
      flexPayload: payload,
      excludedInDevelopment: excluded,
      confirmed,
      warnings
    };
  });
}

/** What the PDF builder is told about a row the enrichment or an edit changed (index = position in the full BOM, in-development rows included). */
export interface PdfOverride {
  index?: number;
  supplier?: string | null;
  articleNumber?: string | null;
  section?: string;
  standardPlacement?: string | null;
  placement?: string | null;
  materialName?: string;
  matchScore?: string;
  by?: 'pdam' | 'ai' | 'history' | 'edit';
  /** the row was removed in an edit */
  deleted?: boolean;
  /** a row added in an edit (no index) */
  added?: RowFields;
}

/** The extra facts the payload records when something was applied (which model, how many rows). */
export interface AiProvenance {
  provider: AiProviderId;
  model: string;
}

/**
 * The BOM, the Flex payload and the PDF overrides after the PDAM catalog lookup and the AI suggestions the user accepted.
 * AI picks are only taken from the candidates the lookup offered, so nothing is invented. Pure: no network.
 */
type Source = 'plugin' | 'pdam' | 'history' | 'ai' | 'edit';

export function applyEnrichment(
  db: DevObjectBom,
  lookup: CatalogRow[] | null,
  picks: AiPick[],
  ai?: AiProvenance,
  history?: (row: BomRow) => HistoryHit[],
  edits?: RowEdits
): EnrichedView & { overrides: PdfOverride[] } {
  const readyIndex = db.bom.bomRows.map((_, i) => i); // payload row i = BOM row readyIndex[i] (in-development rows are processed too)
  const source: Source[] = [];
  let aiApplied = 0;
  let historyApplied = 0;
  let overrodeLookup = 0;
  let rows: FlexRow[] = db.flexPayload.bom.map((base, i) => {
    const found = lookup?.[i];
    let row = found ? found.row : base;
    source[i] = found && found.chosen !== null ? 'pdam' : 'plugin';
    // The plugin's "article" is sometimes just the material name; then PDAM's supplier article number is the real one. A real article is never replaced.
    if (found && found.chosen !== null) {
      const pluginArticle = base.supplierArticle?.trim() ?? '';
      const pdamArticle = found.candidates[found.chosen]?.supplierArticle?.trim() ?? '';
      if (pluginArticle && !articleIsName(pluginArticle, base.materialName)) row = { ...row, supplierArticle: base.supplierArticle };
      else if (pluginArticle && pdamArticle && pdamArticle !== pluginArticle) row = { ...row, supplierArticle: pdamArticle };
    }
    // A past correction for this very material beats the catalog lookup; the person made it knowing the catalog.
    const hits = history ? history(db.bom.bomRows[readyIndex[i]]) : [];
    if (hits.length) {
      row = { ...row };
      for (const h of hits) {
        if (h.field === 'supplierName') row.supplierName = h.value;
        else if (h.field === 'supplierArticle') row.supplierArticle = h.value;
        else if (h.field === 'section') row.section = h.value;
      }
      row.omniMatchScore = '100%';
      if (source[i] === 'pdam') overrodeLookup++;
      source[i] = 'history';
      historyApplied++;
    }
    // An AI suggestion the person ticked is applied last of the automatic steps.
    const pick = picks.find((p) => p.index === i);
    if (found && pick && Number.isInteger(pick.candidate) && pick.candidate >= 0 && pick.candidate < found.candidates.length) {
      const confidence = Math.max(0, Math.min(100, Math.round(Number(pick.confidence) || 0)));
      row = applyCandidate(found.baseline, found.candidates[pick.candidate], `${confidence}%`);
      source[i] = 'ai';
      aiApplied++;
    }
    return row;
  });

  // A person's edits come last and win over everything above.
  let changed = 0;
  for (const e of edits?.rows ?? []) {
    if (!Number.isInteger(e.index) || e.index < 0 || e.index >= rows.length) continue;
    rows[e.index] = { ...rows[e.index], ...e.fields, omniMatchScore: '100%' };
    source[e.index] = 'edit';
    changed++;
  }
  const deleted = new Set((edits?.deleted ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < rows.length));
  const bomRows: BomRow[] = db.bom.bomRows.map((r) => ({ ...r }));
  const overrides: PdfOverride[] = [];
  rows.forEach((row, i) => {
    const target = bomRows[readyIndex[i]];
    if (deleted.has(i)) {
      overrides.push({ index: readyIndex[i], deleted: true });
      return;
    }
    if (source[i] === 'plugin' && !lookup) return;
    target.section = row.section;
    target.standardPlacement = row.standardPlacement ?? target.standardPlacement;
    target.placement = row.placement ?? target.placement;
    target.materialName = row.materialName;
    target.articleNumber = row.supplierArticle ?? target.articleNumber;
    target.supplierName = row.supplierName;
    target.omniMatchScore = row.omniMatchScore;
    if (source[i] !== 'plugin') {
      target.enrichedBy = source[i] as BomRow['enrichedBy'];
      overrides.push({
        index: readyIndex[i], supplier: row.supplierName, articleNumber: row.supplierArticle, section: row.section, standardPlacement: row.standardPlacement,
        placement: row.placement, materialName: row.materialName, matchScore: row.omniMatchScore, by: source[i] as PdfOverride['by']
      });
    }
  });
  const finalBomRows = bomRows.filter((_, i) => !readyIndex.some((ri, k) => ri === i && deleted.has(k)));
  rows = rows.filter((_, i) => !deleted.has(i));
  const added = (edits?.added ?? []).filter((r) => r && typeof r.materialName === 'string' && r.materialName.trim());
  for (const a of added) {
    rows.push({ ...a, omniMatchScore: '100%' });
    finalBomRows.push({
      section: a.section, standardPlacement: a.standardPlacement ?? undefined, placement: a.placement ?? undefined, materialName: a.materialName,
      articleNumber: a.supplierArticle ?? undefined, supplierName: a.supplierName, omniMatchScore: '100%', enrichedBy: 'edit', isInDevelopment: false
    });
    overrides.push({ added: a, matchScore: '100%', by: 'edit' });
  }

  const flexPayload: FlexPayload = {
    ...db.flexPayload,
    bom: rows,
    message: `Processing completed successfully; ${rows.length} BOM row(s) produced.`,
    _sketch: {
      ...db.flexPayload._sketch,
      target: { ...db.flexPayload._sketch.target, bom_row_count: rows.length },
      enrichment: {
        ...(lookup ? { pdamLookup: { resolved: lookup.filter((c) => c.chosen !== null).length, of: lookup.length } } : {}),
        ...(history ? { history: { applied: historyApplied, of: db.flexPayload.bom.length, overrodeLookup } } : {}),
        ...(aiApplied && ai ? { ai: { provider: ai.provider, model: ai.model, applied: aiApplied } } : {}),
        ...(changed || deleted.size || added.length ? { edits: { changed, deleted: deleted.size, added: added.length } } : {})
      }
    }
  };
  return { bom: { ...db.bom, bomRows: finalBomRows }, flexPayload, overrides };
}
