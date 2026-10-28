// The app's own logo, uploaded in Settings > Display. One image kept in memory/ (next to the other things the app remembers). It is only ever
// shown through an <img> tag and the route that serves it sends restrictive headers, but an SVG is also checked here: anything that can run
// code or fetch from the internet is refused.

import fs from 'node:fs';
import path from 'node:path';
import { APP_ROOT } from './config';
import { setLogoVersion } from './settings';

const DIR = path.join(APP_ROOT, 'memory');
const MAX_BYTES = 512 * 1024;
const EXTENSIONS = ['png', 'jpg', 'webp', 'gif', 'svg'] as const;
type Ext = (typeof EXTENSIONS)[number];
const TYPES: Record<Ext, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };

/** What kind of image these bytes are, from the bytes themselves (never from the file name). */
function sniff(b: Buffer): Ext | null {
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (b.length > 6 && b.subarray(0, 4).toString('latin1') === 'GIF8') return 'gif';
  const head = b.subarray(0, 2048).toString('utf8').replace(/^﻿/, '');
  if (/^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(head)) return 'svg';
  return null;
}

/** An SVG that could run code or reach out to the internet is not accepted as a logo. */
function unsafeSvg(text: string): string | null {
  const checks: [RegExp, string][] = [
    [/<\s*script/i, 'it contains a script'],
    [/<\s*(foreignObject|iframe|embed|object|audio|video)\b/i, 'it embeds other content'],
    [/\son[a-z]+\s*=/i, 'it has event handlers'],
    [/javascript\s*:/i, 'it has a javascript: link'],
    [/(?:xlink:)?href\s*=\s*["']\s*(?:https?:|\/\/|data:text)/i, 'it links to an outside address'],
    [/url\(\s*["']?\s*(?:https?:|\/\/)/i, 'it loads something from an outside address'],
    [/@import/i, 'it imports a style sheet']
  ];
  for (const [re, why] of checks) if (re.test(text)) return why;
  return null;
}

/** Check and save an uploaded logo. Throws an Error with a plain message when the image is not acceptable. */
export function saveLogo(bytes: Buffer): { version: number; type: string } {
  if (!bytes.length) throw new Error('The file is empty.');
  if (bytes.length > MAX_BYTES) throw new Error(`The logo is ${Math.round(bytes.length / 1024)} KB: the limit is ${MAX_BYTES / 1024} KB. Use a smaller image or an SVG.`);
  const ext = sniff(bytes);
  if (!ext) throw new Error('That does not look like a PNG, JPEG, WebP, GIF or SVG image.');
  if (ext === 'svg') {
    const why = unsafeSvg(bytes.toString('utf8'));
    if (why) throw new Error(`This SVG cannot be used as a logo because ${why}. Save it as a plain SVG (shapes and text only) or as a PNG.`);
  }
  fs.mkdirSync(DIR, { recursive: true });
  for (const e of EXTENSIONS) fs.rmSync(path.join(DIR, `logo.${e}`), { force: true });
  fs.writeFileSync(path.join(DIR, `logo.${ext}`), bytes);
  const version = Date.now();
  setLogoVersion(version);
  return { version, type: TYPES[ext] };
}

/** The saved logo's file and content type, or null when none is saved. */
export function readLogo(): { file: string; type: string } | null {
  for (const e of EXTENSIONS) {
    const file = path.join(DIR, `logo.${e}`);
    if (fs.existsSync(file)) return { file, type: TYPES[e] };
  }
  return null;
}

export function removeLogo(): void {
  for (const e of EXTENSIONS) fs.rmSync(path.join(DIR, `logo.${e}`), { force: true });
  setLogoVersion(0);
}
