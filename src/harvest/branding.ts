import { useEffect, useState } from 'react';
import { loadSettingsOnce, SETTINGS_CHANGED } from './api';

export interface Branding {
  appName: string;
  tagline: string;
  badge: string;
  /** the uploaded logo's address, or null when there is none */
  logoUrl: string | null;
}

/** What shows before Settings have loaded (and if they cannot): the same as the server's defaults. */
export const DEFAULT_BRANDING: Branding = { appName: 'MasterStyleToBOM', tagline: 'From Master Style to a refined BOM', badge: 'MB', logoUrl: null };

/** The app's name, tag line and badge letters from Settings > Display, refreshed when Settings change. */
export function useBranding(): Branding {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  useEffect(() => {
    let live = true;
    const load = () => {
      void loadSettingsOnce().then((s) => {
        if (live && s?.display?.appName) setBranding({ appName: s.display.appName, tagline: s.display.tagline ?? '', badge: (s.display.badge || DEFAULT_BRANDING.badge).toUpperCase(), logoUrl: s.display.logoVersion > 0 ? `/api/logo?v=${s.display.logoVersion}` : null });
      });
    };
    load();
    window.addEventListener(SETTINGS_CHANGED, load);
    return () => {
      live = false;
      window.removeEventListener(SETTINGS_CHANGED, load);
    };
  }, []);
  return branding;
}
