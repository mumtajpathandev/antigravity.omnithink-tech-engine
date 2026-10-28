import React from 'react';
import { TopNav } from './components/TopNav';
import { AboutPanel } from './harvest/AboutPanel';
import { AnalyticsPanel } from './harvest/AnalyticsPanel';
import { SettingsPanel } from './harvest/SettingsPanel';
import { HarvestWorkspace } from './harvest/HarvestWorkspace';

/** One bad data file must not blank the whole page: show a message and let the user carry on. */
class Guard extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="text-sm px-3 py-3 rounded-md border text-rose-800 bg-rose-50 border-rose-200">
        Something in the loaded data could not be shown.{' '}
        <button className="underline cursor-pointer" onClick={() => this.setState({ failed: false })}>Try again</button>
        {' '}or pick another master style.
      </div>
    );
  }
}

type View = 'home' | 'about' | 'analytics' | 'settings';
const VIEWS: View[] = ['home', 'about', 'analytics', 'settings'];
const viewFromUrl = (): View => {
  const name = window.location.hash.replace(/^#\/?/, '');
  return (VIEWS as string[]).includes(name) ? (name as View) : 'home';
};

export default function App() {
  // Bumped after Purge History so the workspace drops anything it was showing and reloads its run list.
  const [purge, setPurge] = React.useState<{ version: number; runs: number; styles: number }>({ version: 0, runs: 0, styles: 0 });

  // Home (the main flow), About, Analytics and Settings are separate pages, one at a time. The address bar follows (#/about ...), so the
  // browser's Back button and a bookmark work, and the app name or logo always leads Home.
  const [view, setView] = React.useState<View>(viewFromUrl);
  React.useEffect(() => {
    const sync = () => setView(viewFromUrl());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);
  const go = (next: View) => {
    if (next !== view) window.history.pushState(null, '', next === 'home' ? `${window.location.pathname}${window.location.search}` : `#/${next}`);
    setView(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/60 text-slate-900 font-sans antialiased">
      <TopNav view={view} onNavigate={go} onPurged={(s) => setPurge((p) => ({ version: p.version + 1, ...s }))} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {view === 'about' && <AboutPanel onClose={() => go('home')} />}
        {view === 'analytics' && <AnalyticsPanel onClose={() => go('home')} />}
        {view === 'settings' && <SettingsPanel onClose={() => go('home')} />}
        {/* Home stays mounted while another page is open, so the chosen style, the step and the sign-in are still there on return */}
        <div hidden={view !== 'home'}>
          <Guard>
            <HarvestWorkspace purgeVersion={purge.version} purgedRuns={purge.runs} purgedStyles={purge.styles} />
          </Guard>
        </div>
      </main>
    </div>
  );
}
