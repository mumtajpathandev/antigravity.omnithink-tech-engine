# MasterStyleToBOM

(Reads PDAM sketches and plugin data and builds the BOM; compared against OmniThink / OmniTechPack.)

A small local app that reads master style sketches from PDAM and shows, step by step:

1. **Pick** an environment and a master style (saved data, or fetched live with **Live re-run**).
2. **Sketch**: the technical sketch PDF stored in PDAM.
3. **Harvested data**: parts, dev objects and materials (`tech-engine-input.json`).
4. **BOM & Flex payload**: per dev object, the BOM and the payload built from it.

You can also load your own sketch PDF and a single `tech-engine-input.json`.

## Run

```
npm install
npm run dev
```

Open http://127.0.0.1:3000. The server listens on 127.0.0.1 only.

## Signing in to PDAM

- **PREPROD**: signs in with the shared OAuth client from the script's `config.json`. Nothing to paste.
- **Other environments**: paste a browser session cookie (the whole `Cookie` header value) or a bearer token.

Credentials go to the local server, stay in its memory, and are never saved, logged or sent back to the browser.

## Data

- Environment URLs, discovery queries and the OAuth client come from the standalone Python script's `config.json`
  (`HARVEST_SCRIPT_DIR` / `HARVEST_CONFIG`, see `.env.example`).
- Saved runs written by that script (`reference-data/`, `PREPROD/`, ...) are listed automatically.
- What this app fetches or loads is saved under `harvest-data/`. **Purge History** deletes that folder's runs only;
  the script's runs are never touched.
- Only fields present in the harvested data are shown. Supplier, usage, price and colourway values are not invented.
