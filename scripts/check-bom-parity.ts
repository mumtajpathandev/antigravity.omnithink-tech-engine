// Guards against drift between the two BOM builders: the Python script (build_tech_engine_input.py) and
// server/bom.ts. Both start from the same tech-engine-input.json; this compares the BOM rows each produced.
//
//   npm run check:parity                     newest REBUILD run written by the Python script
//   npm run check:parity -- <run folder>     any run folder that holds golden-dataset/<style>/boms/
//
// Exit code 0 = identical, 1 = a difference was found.

import fs from 'node:fs';
import path from 'node:path';
import { buildDevObjectBoms } from '../server/bom';
import { SCRIPT_DIR } from '../server/config';

const arg = process.argv[2];
let run = arg ? path.resolve(arg) : '';
if (!run) {
  const rebuilds = path.join(SCRIPT_DIR, 'REBUILD');
  const newest = fs.existsSync(rebuilds) ? fs.readdirSync(rebuilds).sort().pop() : undefined;
  if (!newest) {
    console.error(`No run folder given and no REBUILD runs under ${SCRIPT_DIR}. Run the Python script once, or pass a run folder.`);
    process.exit(1);
  }
  run = path.join(rebuilds, newest);
}

const golden = path.join(run, 'golden-dataset');
const safe = (s: string) => s.replace(/[<>:"/\\|?*]/g, '_');
const rows = (list: any[]) =>
  list.map((r) =>
    JSON.stringify({
      section: r.section ?? null,
      standardPlacement: r.standardPlacement ?? null,
      placement: r.placement ?? null,
      materialName: r.materialName ?? null,
      articleNumber: r.articleNumber ?? null,
      label: r.label ?? null,
      isInDevelopment: !!r.isInDevelopment
    })
  );

let compared = 0;
let rowCount = 0;
const problems: string[] = [];
for (const style of fs.existsSync(golden) ? fs.readdirSync(golden) : []) {
  const dir = path.join(golden, style);
  const input = path.join(dir, 'tech-engine-input.json');
  if (!fs.existsSync(input)) continue;
  const boms = buildDevObjectBoms(JSON.parse(fs.readFileSync(input, 'utf-8')));
  const pyIds = fs.existsSync(path.join(dir, 'boms')) ? fs.readdirSync(path.join(dir, 'boms')) : [];
  if (boms.length !== pyIds.length) problems.push(`${style}: ${boms.length} BOMs in TypeScript, ${pyIds.length} from Python`);
  for (const b of boms) {
    const base = path.join(dir, 'boms', safe(b.devObjectId));
    if (!fs.existsSync(path.join(base, 'bom.json'))) {
      problems.push(`${style}/${b.devObjectId}: no Python bom.json`);
      continue;
    }
    const py = JSON.parse(fs.readFileSync(path.join(base, 'bom.json'), 'utf-8'));
    compared++;
    rowCount += b.bom.bomRows.length;
    if (JSON.stringify(rows(py.bomRows)) !== JSON.stringify(rows(b.bom.bomRows))) problems.push(`${style}/${b.devObjectId}: BOM rows differ`);
    // The Flex payload is deliberately NOT compared: the app's draft follows OmniTechPack's documented contract
    // (header, parentId, devObjectId, errorCode/message), while the script still writes its older flex-payload.json.
  }
}

console.log(`Compared ${compared} BOMs (${rowCount} rows) in ${run}`);
if (problems.length) {
  console.error(problems.map((p) => `  DIFF ${p}`).join('\n'));
  process.exit(1);
}
console.log('TypeScript and Python produce identical BOM rows.');
