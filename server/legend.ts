// Structure a sketch's legend page when it is not in the layout the template parser reads. Text only: the page's own
// text goes in (no image), rows come out, and every value is checked against that text, so the model cannot add a
// material, supplier or article the page does not contain. The result is a suggestion for a person to review.

import { askStructured, type Task } from './ai';
import { getSettings } from './settings';

export interface LegendEntry {
  /** the placement or label the line sits under, e.g. "SELF", "C1", "OUTER WB" */
  heading: string;
  material: string;
  supplier: string | null;
  article: string | null;
  width: string | null;
}

export interface LegendResult {
  entries: LegendEntry[];
  /** entries dropped because a value was not found in the page text */
  rejected: number;
  /** exactly the text that was sent to the model (after redaction) */
  sent: string;
  provider: string;
  model: string;
}

const SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          heading: { type: 'string', description: 'the placement or label the line sits under (SELF, C1, L1, OUTER WB, POCKET BAGS ...), copied from the page' },
          material: { type: 'string', description: 'the material name, copied from the page' },
          supplier: { type: ['string', 'null'], description: 'the supplier named for that material, copied from the page, or null' },
          article: { type: ['string', 'null'], description: 'the supplier article / code, copied from the page, or null' },
          width: { type: ['string', 'null'], description: 'width as written, or null' }
        },
        required: ['heading', 'material', 'supplier', 'article', 'width']
      }
    }
  },
  required: ['entries']
} as const;

const TASK: Task = {
  system:
    'You read the text of a garment tech-pack legend page and list the materials it names. One entry per material line. ' +
    'Copy every value EXACTLY as written on the page (same spelling, punctuation and case); never correct, translate, complete or invent anything. ' +
    'Use null for a value the page does not give. Skip headers, notes, designers, dates and legal text. ' +
    'If the page lists no materials (an empty template, or only "See BOM"), return an empty list.',
  toolName: 'report_legend',
  toolDescription: 'List the materials named on the legend page.',
  schema: SCHEMA,
  listKey: 'entries',
  maxTokens: 8000, // a reasoning model may think for a while before it writes the list
  // a 2B model returned 0 of 15 correct entries on a real page; only a ~7B local model is worth trying first (Settings, default 4 GB; 0 = never skip)
  get localMinBytes() {
    return getSettings().ai.localMinGbForLegend * 1e9;
  }
};

// A line is only dropped when it starts with one of these labels followed by a colon ("DESIGNER: ...", "TD: ..."), so a material
// or article that merely begins with the same letters (TD02303BIQ-M, DA...) is kept.
const PEOPLE_LINE = /^\s*(designer|da|td|technical designer|technical developer|product developer|developer|pattern engineer|updated|date|date last modified)\s*:.*$/gim;
const LEGAL_LINE = /^.*(confidential and proprietary|express consent|reproduction or distribution).*$/gim;
const PRICE = /\$\s?\d[\d,]*(?:\.\d+)?(?:\s?\/\s?[a-z]+)?/gi;

/**
 * What may leave this machine: the legend text without the lines that name people or dates, the confidentiality boilerplate and
 * prices. Materials, suppliers, articles and widths stay, because those are what is being read.
 */
export function redact(text: string): string {
  return text.replace(PEOPLE_LINE, '').replace(LEGAL_LINE, '').replace(PRICE, '[price]').replace(/\n{3,}/g, '\n\n');
}

const norm = (s: string) => s.toLowerCase().replace(/[\s ]+/g, ' ').replace(/[“”"″]/g, '"').replace(/[‘’']/g, "'").trim();

/** True when `value` appears in `text` (case and spacing aside), also when the page broke the value across lines. */
export function appearsIn(value: string, text: string): boolean {
  const v = norm(value);
  if (!v) return false;
  const t = norm(text);
  return t.includes(v) || t.replace(/ /g, '').includes(v.replace(/ /g, ''));
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export async function structureLegend(pageText: string, context?: string): Promise<LegendResult> {
  const text = String(pageText ?? '');
  if (text.trim().length < 20) throw new Error('There is no text to read on this page.');
  if (text.length > 20_000) throw new Error('That page has too much text to be a legend.');
  const shown = redact(text); // this is all the model sees, and all the values are checked against
  const { list, provider, model } = await askStructured(TASK, `Legend page text:\n\n${shown}`, context);
  const entries: LegendEntry[] = [];
  let rejected = 0;
  for (const raw of list as Record<string, unknown>[]) {
    const entry: LegendEntry = {
      heading: asString(raw?.heading) ?? '',
      material: asString(raw?.material) ?? '',
      supplier: asString(raw?.supplier),
      article: asString(raw?.article),
      width: asString(raw?.width)
    };
    // Every value the model gave must be on the page; one that is not means the whole entry cannot be trusted.
    const values = [entry.heading, entry.material, entry.supplier, entry.article, entry.width].filter((v): v is string => Boolean(v));
    if (!entry.material || !values.every((v) => appearsIn(v, shown))) {
      rejected++;
      continue;
    }
    entries.push(entry);
  }
  return { entries, rejected, sent: shown, provider, model };
}
