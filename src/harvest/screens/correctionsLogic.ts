import type { FlexRow, RowEdits, RowFields } from '../types';

/** Editable text values of one row (empty string = no value). */
export interface DraftFields {
  section: string;
  standardPlacement: string;
  placement: string;
  supplierArticle: string;
  supplierName: string;
  materialName: string;
}
/** One table row: `index` is the position in flexPayload.bom, or null for a row added on screen. */
export interface DraftRow {
  key: string;
  index: number | null;
  removed: boolean;
  fields: DraftFields;
}

const FIELD_KEYS: (keyof DraftFields)[] = ['section', 'standardPlacement', 'placement', 'supplierArticle', 'supplierName', 'materialName'];
const NULLABLE: (keyof DraftFields)[] = ['standardPlacement', 'placement', 'supplierArticle', 'supplierName'];

export const rowToFields = (r: FlexRow): DraftFields => ({
  section: r.section ?? '',
  standardPlacement: r.standardPlacement ?? '',
  placement: r.placement ?? '',
  supplierArticle: r.supplierArticle ?? '',
  supplierName: r.supplierName ?? '',
  materialName: r.materialName ?? ''
});

const toValue = (k: keyof DraftFields, v: string): string | null => (NULLABLE.includes(k) && v === '' ? null : v);

/** The person's changes against the loaded rows, or undefined when nothing changed. */
export function diffRows(loaded: FlexRow[], draft: DraftRow[]): RowEdits | undefined {
  const rows: RowEdits['rows'] = [];
  const deleted: number[] = [];
  const added: RowFields[] = [];
  for (const d of draft) {
    if (d.index === null) {
      if (d.removed || !d.fields.materialName.trim()) continue;
      added.push({
        section: d.fields.section,
        standardPlacement: toValue('standardPlacement', d.fields.standardPlacement),
        placement: toValue('placement', d.fields.placement),
        supplierArticle: toValue('supplierArticle', d.fields.supplierArticle),
        supplierName: toValue('supplierName', d.fields.supplierName),
        materialName: d.fields.materialName
      });
      continue;
    }
    const base = loaded[d.index];
    if (!base) continue;
    if (d.removed) {
      deleted.push(d.index);
      continue;
    }
    const orig = rowToFields(base);
    const fields: Record<string, string | null> = {};
    for (const k of FIELD_KEYS) {
      if (d.fields[k] !== orig[k]) fields[k] = toValue(k, d.fields[k]);
    }
    if (Object.keys(fields).length) rows.push({ index: d.index, fields: fields as Partial<RowFields> });
  }
  if (!rows.length && !deleted.length && !added.length) return undefined;
  return { rows, deleted, added };
}
