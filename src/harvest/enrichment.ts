import type { Enrichment } from './types';

// Past corrections are applied from the start: they are local, instant and what the person already decided, so a style that was corrected before
// opens corrected. The Enrich step can switch them off.
export const NO_ENRICHMENT: Enrichment = { lookup: false, history: true, ai: [] };
export const enrichmentKey = (styleRef: string, devObjectId: string) => `${styleRef}|${devObjectId}`;
