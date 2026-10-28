import React, { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { harvestApi } from '../harvest/api';

export const TopNav: React.FC<{
  onPurged?: (summary: { runs: number; styles: number }) => void;
  view?: 'home' | 'about' | 'analytics' | 'settings';
  onNavigate?: (v: 'home' | 'about' | 'analytics' | 'settings') => void;
}> = ({ onPurged, view = 'home', onNavigate }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);

  const close = () => {
    setConfirmOpen(false);
    opener.current?.focus(); // hand focus back to the button that opened the dialog
  };

  // Escape closes the dialog; the safe choice (Cancel) is focused when it opens.
  useEffect(() => {
    if (!confirmOpen) return;
    cancelBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !purging) close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmOpen, purging]);

  const purge = async () => {
    setPurging(true);
    setError(null);
    try {
      const result = await harvestApi.purgeHistory();
      setConfirmOpen(false);
      onPurged?.({ runs: result.runs, styles: result.styles });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPurging(false);
    }
  };

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-3 bg-white border-b border-slate-200 sticky top-0 z-40">
      <a
        href="#/"
        onClick={(e) => {
          e.preventDefault();
          onNavigate?.('home');
        }}
        aria-label="SketchToBOM, from Master Style to a refined BOM. Go to Home"
        className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
      >
        <div className="w-8 h-8 rounded bg-slate-900 text-white text-sm font-bold flex items-center justify-center shrink-0" aria-hidden>SB</div>
        <span className="flex flex-col leading-tight">
          <span className="font-bold text-base">SketchToBOM</span>
          <span className="text-xs font-normal text-slate-600 tracking-normal">From Master Style to a refined BOM</span>
        </span>
      </a>

      <div className="flex items-center gap-2">
        <nav aria-label="Pages" className="flex items-center gap-1">
          {(['home', 'about', 'analytics', 'settings'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onNavigate?.(v)}
              aria-current={view === v ? 'page' : undefined}
              className={`px-3 py-1.5 text-sm rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${
                view === v ? 'bg-slate-900 text-white font-semibold' : 'font-medium text-slate-700 hover:bg-slate-100'
              }`}
            >
              {v === 'home' ? 'Home' : v === 'about' ? 'About' : v === 'analytics' ? 'Analytics' : 'Settings'}
            </button>
          ))}
        </nav>
      <button
        ref={opener}
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        title="Delete the runs and loaded files this app has saved"
      >
        <Trash2 className="w-4 h-4 text-slate-500" />
        <span>Purge History</span>
      </button>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !purging) close(); // click on the backdrop
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="purge-title" aria-describedby="purge-desc" className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-900 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center" aria-hidden>
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 id="purge-title" className="text-base font-bold text-slate-900">Purge saved history?</h3>
                <p className="text-sm text-slate-600">Deletes what this app has saved</p>
              </div>
            </div>

            <p id="purge-desc" className="text-sm text-slate-600 leading-relaxed">
              This deletes every master style this app fetched from PDAM and every file you loaded, including their sketches. Data saved
              by the command-line tool is not touched, and nothing in PDAM is changed. Logins stay as they are; use Disconnect to drop one.
            </p>
            {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                ref={cancelBtn}
                onClick={close}
                disabled={purging}
                className="px-3.5 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={purge}
                disabled={purging}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1"
              >
                {purging ? 'Purging...' : 'Yes, purge saved history'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
