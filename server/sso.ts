// SSO sign-in: open a real browser window on the environment's PDAM, let the user sign in with their company
// account (including MFA), and take the resulting session for this server's read-only PDAM calls.
//
// Nothing is typed or read by us on the sign-in pages. The browser profile is a throw-away temp folder that is
// deleted when the window closes, and the session lives only in this process's memory (never written to disk,
// logged or sent to the page). Sign in again on each run.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, type BrowserContext } from 'playwright-core';
import { envUrl, loadConfig } from './config';
import type { Env } from '../src/harvest/types';

const TIMEOUT_MS = 4 * 60_000;
const CHANNELS = ['msedge', 'chrome']; // the browsers already installed on the machine; nothing is downloaded
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const open = new Map<Env, { cancel: () => void }>();

async function launch(profile: string): Promise<BrowserContext> {
  let last: unknown;
  for (const channel of CHANNELS) {
    try {
      return await chromium.launchPersistentContext(profile, {
        channel,
        headless: false,
        viewport: null,
        args: ['--no-first-run', '--no-default-browser-check']
      });
    } catch (err) {
      last = err;
    }
  }
  throw new Error(`Could not open Microsoft Edge or Google Chrome for the sign-in window (${(last as Error)?.message?.split('\n')[0] ?? 'unknown error'}).`);
}

/** Throw-away profiles left behind when a browser was still shutting down (best effort; they hold no session once closed). */
function sweepOldProfiles(): void {
  try {
    for (const name of fs.readdirSync(os.tmpdir())) {
      if (!name.startsWith('omnithink-sso-')) continue;
      try {
        fs.rmSync(path.join(os.tmpdir(), name), { recursive: true, force: true });
      } catch {
        /* still in use: leave it */
      }
    }
  } catch {
    /* no temp dir to look in */
  }
}

/** Resolves with a Cookie header value for the environment's PDAM host once the user has signed in. */
export async function ssoSignIn(env: Env): Promise<string> {
  if (open.has(env)) throw new Error(`A sign-in window is already open for ${env}.`);
  if (open.size === 0) sweepOldProfiles();
  const base = envUrl(loadConfig(), env);
  const origin = new URL(base).origin;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'omnithink-sso-'));
  let context: BrowserContext | undefined;
  let cancelled = false;
  // Registered before the browser launches, so a cancel pressed while the window is still opening is honoured too.
  open.set(env, {
    cancel: () => {
      cancelled = true;
      context?.close().catch(() => undefined);
    }
  });
  try {
    context = await launch(profile);
    const ctx = context;
    if (cancelled) throw new Error('Sign-in was cancelled.');
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    await page.goto(`${base}/ui/`, { waitUntil: 'domcontentloaded' }).catch(() => undefined);

    const deadline = Date.now() + TIMEOUT_MS;
    for (;;) {
      if (cancelled) throw new Error('Sign-in was cancelled.');
      if (ctx.pages().length === 0) throw new Error('The sign-in window was closed before signing in.');
      if (Date.now() > deadline) throw new Error('Sign-in timed out after 4 minutes. Press the button to try again.');
      try {
        // Signed in once PDAM itself answers JSON for "who am I" (no redirect to the login page).
        const res = await ctx.request.get(`${base}/api/v1/me`, { headers: { Accept: 'application/json' }, maxRedirects: 0, failOnStatusCode: false });
        if (res.status() === 200 && (res.headers()['content-type'] ?? '').includes('json')) break;
      } catch {
        /* the page is mid-redirect: try again */
      }
      await sleep(1500);
    }
    // Ask for the cookies that apply to PDAM's own address: its session cookies are scoped to the /nuxeo path, which a site-root
    // address would leave out.
    const cookies = (await ctx.cookies(`${base}/`)).filter((c) => `https://${c.domain.replace(/^\./, '')}` === origin || origin.endsWith(c.domain.replace(/^\./, '')));
    if (!cookies.length) throw new Error('Signed in, but PDAM set no session cookie to use.');
    // Only names are ever reported, never values.
    console.log(`SSO ${env}: captured ${cookies.length} cookie(s): ${cookies.map((c) => c.name).join(', ')}`);
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  } finally {
    open.delete(env);
    await context?.close().catch(() => undefined);
    try {
      // The browser can hold its files for a moment after closing: retry, and never let cleanup hide the real result.
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
    } catch {
      /* the folder sits in the OS temp directory and holds no session data once the browser has closed */
    }
  }
}

export function cancelSso(env: Env): boolean {
  const entry = open.get(env);
  entry?.cancel();
  return Boolean(entry);
}
