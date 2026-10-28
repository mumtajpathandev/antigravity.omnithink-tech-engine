import type { Enrichment } from './types';

export const NO_ENRICHMENT: Enrichment = { lookup: false, history: false, ai: [] };
export const enrichmentKey = (styleRef: string, devObjectId: string) => `${styleRef}|${devObjectId}`;
