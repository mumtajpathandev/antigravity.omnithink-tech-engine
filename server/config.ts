// Shared harvest configuration: environment URLs, discovery queries and (optionally) the OAuth
// client. By default this is the config.json of the standalone Python script, so both tools
// target the same environments. The file is only read here, on the server; its contents are
// never sent to the browser.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENVIRONMENTS, type Env } from '../src/harvest/types';

/** The PoC folder, wherever the server was started from. */
export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const SCRIPT_DIR = process.env.HARVEST_SCRIPT_DIR || 'C:\\Users\\mpathan\\claude-projects\\bom-generation';
export const CONFIG_PATH = process.env.HARVEST_CONFIG || path.join(SCRIPT_DIR, 'config.json');

export interface HarvestConfig {
  /** the environment the OAuth client in `auth` was issued for (the script's default environment) */
  environment?: string;
  datasetVersion?: string;
  environments: Record<string, { nuxeoBaseUrl: string; kongBaseUrl?: string }>;
  queries: { msts: string; styleSeasonal: string };
  limits?: { maxDocuments?: number };
  auth?: {
    tokenEndpoint?: string;
    grantType?: string;
    clientId?: string;
    clientSecret?: string;
    assertion?: string;
  };
}

export function loadConfig(): HarvestConfig {
  let raw: string;
  try {
    raw = fs.readFileSync(CONFIG_PATH, 'utf-8').replace(/^\uFEFF/, '');
  } catch {
    throw new Error(`Cannot read the harvest config at ${CONFIG_PATH}. Set HARVEST_CONFIG or HARVEST_SCRIPT_DIR.`);
  }
  const cfg = JSON.parse(raw) as HarvestConfig;
  if (!cfg.environments || !cfg.queries?.msts || !cfg.queries?.styleSeasonal) {
    throw new Error(`The harvest config at ${CONFIG_PATH} is missing environments or queries.`);
  }
  return cfg;
}

export function envUrl(cfg: HarvestConfig, env: Env): string {
  const url = cfg.environments[env]?.nuxeoBaseUrl;
  if (!url) throw new Error(`Environment ${env} has no nuxeoBaseUrl in the harvest config.`);
  return url;
}

/** The only environment the shared OAuth client may be used against (its secret is never sent to another host). */
export function configAuthEnv(cfg: HarvestConfig): Env | undefined {
  return ENVIRONMENTS.find((e) => e === cfg.environment);
}

export function configAuthAvailable(cfg: HarvestConfig): boolean {
  const a = cfg.auth;
  return Boolean(a?.tokenEndpoint && a.grantType && a.clientId && a.clientSecret && a.assertion);
}
