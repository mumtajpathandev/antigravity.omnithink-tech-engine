// Local harvest server for the OmniThink PoC: serves the UI (Vite) and a small /api that talks to
// PDAM. It listens on localhost only, because it holds login credentials in memory.

import express from 'express';
import { getSettings } from './server/settings';
import path from 'node:path';
import { APP_ROOT } from './server/config';
import { router } from './server/routes';
import { warmCache } from './server/store';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';

async function main() {
  const app = express();

  // The server holds PDAM logins in memory, so only this exact local address may talk to it. This stops a web
  // page in the user's browser from reaching the API by DNS rebinding (its Host would be its own domain) and
  // refuses state-changing requests that come from another site (their Origin would not match).
  const allowedHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`, `${HOST}:${PORT}`]);
  app.use((req, res, next) => {
    if (!allowedHosts.has(String(req.headers.host))) return res.status(403).json({ error: 'Unexpected Host header' });
    const origin = req.headers.origin;
    if (origin && req.method !== 'GET' && req.method !== 'HEAD') {
      let host = '';
      try {
        host = new URL(origin).host;
      } catch {
        /* "null" and other unparseable origins are refused below */
      }
      if (!allowedHosts.has(host)) return res.status(403).json({ error: 'Cross-site request refused' });
    }
    next();
  });

  app.use(express.json({ limit: '60mb' })); // sketch PDFs travel as base64 in /api/inputs
  app.use('/api', router);
  // Body-parser and other errors on /api answer in JSON (the UI shows the message) instead of an HTML stack trace.
  app.use((err: { status?: number; statusCode?: number; type?: string; message?: string }, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.path.startsWith('/api')) return next(err);
    const status = err.status ?? err.statusCode ?? 500;
    const error = err.type === 'entity.too.large' ? 'That file is too large (limit 60 MB).' : status < 500 ? 'The request could not be read.' : 'Something went wrong on the server.';
    res.status(status).json({ error });
  });

  if (process.env.NODE_ENV === 'production') {
    const dist = path.join(APP_ROOT, 'dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      root: APP_ROOT,
      configFile: path.join(APP_ROOT, 'vite.config.ts'),
      // Data the app writes while it runs (call records, saved readings, settings, harvested runs) must never reload the page: a changed
      // file in the watched folder makes the dev server reload the browser, which sent people back to Home in the middle of an AI call.
      server: {
        middlewareMode: true,
        watch: { ignored: ['**/memory/**', '**/harvest-data/**', '**/get-poc-data/**', '**/sample-pdfs/**', '**/.ai-key.dat', '**/*.jsonl'] }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`${getSettings().display.appName} server: http://${HOST}:${PORT}`);
    setTimeout(warmCache, 50); // after the port is open, so startup is not delayed
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
