import { ENVIRONMENTS, type DataSource, type Env } from './types';

/** Where the user was, kept in sessionStorage (this tab only) so a refresh or a reload puts them back. */
export interface Place {
  env: Env;
  source: DataSource;
  /** a saved style's ref, or '' when none was chosen */
  style: string;
  step: 1 | 2 | 3 | 4 | 5;
  devObject: string | null;
}

const KEY = 'sketchtobom.place';

export function readPlace(): Place | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Place> | null;
    if (!v || typeof v !== 'object') return null;
    if (!(ENVIRONMENTS as readonly string[]).includes(v.env as string)) return null;
    const step = Number(v.step);
    return {
      env: v.env as Env,
      source: v.source === 'offline' ? 'offline' : 'latest',
      style: typeof v.style === 'string' && !v.style.startsWith('live:') ? v.style : '',
      step: (step >= 1 && step <= 5 ? step : 1) as Place['step'],
      devObject: typeof v.devObject === 'string' ? v.devObject : null
    };
  } catch {
    return null; // storage blocked or the value is damaged: start fresh
  }
}

export function savePlace(p: Place): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function clearPlace(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
