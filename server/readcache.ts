// Saved readings of sketch PDFs. A PDF read gives the same answer every time, so both readings (without AI, and with AI per page and
// model) are kept on disk, keyed by the PDF's content: the same PDF in another style, or on another day, costs nothing.
// The no-AI reading is dropped when the reader scripts change; an AI page reading is kept per model and prompt version.
// "Read again" (fresh) ignores what is saved and saves the new result.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { APP_ROOT, SCRIPT_DIR } from './config';

const DIR = path.join(APP_ROOT, 'memory', 'pdf-reads');
/** bump when the legend prompt or its checks change, so earlier AI readings are not reused */
export const LEGEND_VERSION = 'legend-v1';
const READER_FILES = ['read_sketch_pdf.py', 'legend_rules.py', 'legend_extract.py', 'corpus_report.py', 'sketch_reader.py'];

export interface StoredAiPage {
  savedAt: string;
  provider: string;
  model: string;
  entries: unknown[];
  rejected: number;
}
export interface StoredRead {
  pdfSha: string;
  readerVersion: string;
  savedAt: string;
  python?: unknown;
  /** page text hash → "provider/model|prompt version" → that model's reading of the page */
  ai: Record<string, Record<string, StoredAiPage>>;
}

const shaByStamp = new Map<string, string>();

/** SHA-256 of the PDF's bytes (remembered while the file does not change). */
export async function pdfSha(file: string): Promise<string> {
  const st = fs.statSync(file);
  const stamp = `${file}|${st.mtimeMs}|${st.size}`;
  const known = shaByStamp.get(stamp);
  if (known) return known;
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(file).on('data', (c) => hash.update(c)).on('end', () => resolve()).on('error', reject);
  });
  const sha = hash.digest('hex');
  shaByStamp.set(stamp, sha);
  return sha;
}

/** Changes whenever one of the Python reader scripts changes. */
export function readerVersion(): string {
  const hash = createHash('sha256');
  for (const f of READER_FILES) {
    try {
      hash.update(fs.readFileSync(path.join(SCRIPT_DIR, f)));
    } catch {
      hash.update(f);
    }
  }
  return hash.digest('hex').slice(0, 16);
}

export function loadRead(sha: string): StoredRead | undefined {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, `${sha}.json`), 'utf8')) as StoredRead;
  } catch {
    return undefined;
  }
}

export function saveRead(entry: StoredRead): void {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    const file = path.join(DIR, `${entry.pdfSha}.json`);
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(entry));
    fs.renameSync(`${file}.tmp`, file);
  } catch {
    /* a failed save only means the next run reads again */
  }
}

export const pageSha = (text: string) => createHash('sha256').update(text).digest('hex');
export const aiKey = (provider: string, model: string) => `${provider}/${model}|${LEGEND_VERSION}`;
