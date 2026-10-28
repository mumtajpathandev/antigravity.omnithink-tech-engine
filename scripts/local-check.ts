// Offline check of the local (Ollama) provider against a FAKE Ollama-like server on a random port: nothing real is contacted.
// Run: npx tsx scripts/local-check.ts   (exits non-zero if any check fails)

import http from 'node:http';
import type { AddressInfo } from 'node:net';

interface Seen { url: string; headers: http.IncomingHttpHeaders; body: any }
const seen: Seen[] = [];
let chatMode: 'content' | 'tools' = 'content';
const DECISIONS = [{ row: 1, candidate: 0, confidence: 90, reason: 'same article' }];

const fake = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (d) => (raw += d));
  req.on('end', () => {
    const body = raw ? JSON.parse(raw) : undefined;
    seen.push({ url: req.url ?? '', headers: req.headers, body });
    const send = (code: number, obj: unknown) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.url === '/api/tags') return send(200, { models: [{ name: 'granite3.3:2b', size: 1_500_000_000 }, { name: 'nomic-embed-text:latest', size: 274_000_000 }] });
    if (req.url === '/api/version') return send(200, { version: '0.9.9' });
    if (req.url === '/api/embed') {
      if (body.model === 'missing-model') return send(404, { error: 'model "missing-model" not found, try pulling it first' });
      return send(200, { embeddings: (body.input as string[]).map((t) => [t.length, Number(t.replace(/\D/g, '')) || 0, 0.5]) });
    }
    if (req.url === '/v1/chat/completions') {
      const message = chatMode === 'content'
        ? { role: 'assistant', content: `Here you go:\n\`\`\`json\n${JSON.stringify({ decisions: DECISIONS })}\n\`\`\`` }
        : { role: 'assistant', content: null, tool_calls: [{ function: { name: 'report_matches', arguments: JSON.stringify({ decisions: DECISIONS }) } }] };
      return send(200, { choices: [{ message }] });
    }
    send(404, { error: 'not found' });
  });
});

let failed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  try { await fn(); console.log(`PASS  ${name}`); } catch (err) { failed++; console.log(`FAIL  ${name}: ${(err as Error).message}`); }
}
function assert(cond: unknown, msg: string): asserts cond { if (!cond) throw new Error(msg); }

await new Promise<void>((r) => fake.listen(0, '127.0.0.1', r));
const port = (fake.address() as AddressInfo).port;
process.env.OLLAMA_HOST = `127.0.0.1:${port}`; // before the modules read it
for (const k of ['ANTHROPIC_API_KEY', 'OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'AI_PROVIDER', 'LOCAL_MODEL']) delete process.env[k];

const { LOCAL_BASE, localStatus, embed } = await import('../server/local');
const ai = await import('../server/ai');
const aikey = await import('../server/aikey');
(await import('../server/settings')).useSettingsFile((await import('node:path')).join((await import('node:os')).tmpdir(), `local-check-settings-${process.pid}.json`)); // never the real settings

await check('LOCAL_BASE follows OLLAMA_HOST', () => assert(LOCAL_BASE === `http://127.0.0.1:${port}`, LOCAL_BASE));

await check('localStatus reports running, version and models', async () => {
  const s = await localStatus();
  assert(s.running && s.version === '0.9.9', JSON.stringify(s));
  assert(s.models.length === 2 && s.models[0].name === 'granite3.3:2b' && s.models[0].sizeBytes === 1_500_000_000, JSON.stringify(s.models));
});

await check('embed returns one vector per text', async () => {
  const v = await embed(['a1', 'bb22']);
  assert(v.length === 2 && v[0].length === 3 && v[1][0] === 4 && v[1][1] === 22, JSON.stringify(v));
});

await check('embed batches 70 inputs as 32+32+6, in order', async () => {
  seen.length = 0;
  const texts = Array.from({ length: 70 }, (_, i) => `t${i}`);
  const v = await embed(texts);
  const sizes = seen.filter((s) => s.url === '/api/embed').map((s) => s.body.input.length);
  assert(sizes.join() === '32,32,6', sizes.join());
  assert(v.length === 70 && v.every((e, i) => e[1] === i), 'order or count wrong');
  assert(seen[0].body.model === 'nomic-embed-text', seen[0].body.model);
});

await check('embed with a missing model says to ollama pull it', async () => {
  try { await embed(['x'], 'missing-model'); } catch (err) { assert(/missing-model is not installed: run ollama pull missing-model/.test((err as Error).message), (err as Error).message); return; }
  throw new Error('did not throw');
});

await check('not chosen just because Ollama is running', () => assert(ai.aiProvider() !== 'local', String(ai.aiProvider())));

await check('cloud key present: local is not the default', () => {
  process.env.OPENROUTER_API_KEY = 'sk-or-test';
  try { assert(ai.aiProvider() === 'openrouter', String(ai.aiProvider())); } finally { delete process.env.OPENROUTER_API_KEY; }
});

await check('AI_PROVIDER=local resolves provider and default model', () => {
  process.env.AI_PROVIDER = 'local';
  assert(ai.aiAvailable() && ai.aiProvider() === 'local' && ai.aiModel() === 'granite3.3:2b' && ai.aiKeySource() === 'env', `${ai.aiProvider()} ${ai.aiModel()}`);
  process.env.LOCAL_MODEL = 'qwen2.5:3b';
  assert(ai.aiModel() === 'qwen2.5:3b', String(ai.aiModel()));
  delete process.env.LOCAL_MODEL;
});

await check('AI_PROVIDER=local beats a cloud key in the environment', () => {
  process.env.OPENROUTER_API_KEY = 'sk-or-test';
  try { assert(ai.aiProvider() === 'local', String(ai.aiProvider())); } finally { delete process.env.OPENROUTER_API_KEY; }
});

const task = { system: 'sys', toolName: 'report_matches', toolDescription: 'd', schema: { type: 'object' }, listKey: 'decisions' };

await check('request: no Authorization, no tool_choice, temperature 0, JSON reminder; content JSON parses', async () => {
  seen.length = 0;
  chatMode = 'content';
  const r = await ai.askStructured(task, 'Row 1');
  const req = seen.find((s) => s.url === '/v1/chat/completions')!;
  assert(!('authorization' in req.headers), 'Authorization header sent');
  assert(!('tool_choice' in req.body), 'tool_choice sent');
  assert(req.body.temperature === 0 && req.body.model === 'granite3.3:2b' && Array.isArray(req.body.tools), JSON.stringify(req.body).slice(0, 200));
  assert(/JSON only/.test(req.body.messages[0].content) && req.body.messages[0].content.startsWith('sys'), req.body.messages[0].content);
  assert(r.provider === 'local' && JSON.stringify(r.list) === JSON.stringify(DECISIONS), JSON.stringify(r.list));
});

await check('tool_calls answer parses', async () => {
  chatMode = 'tools';
  const r = await ai.askStructured(task, 'Row 1');
  assert(JSON.stringify(r.list) === JSON.stringify(DECISIONS), JSON.stringify(r.list));
});

await check('localModelOptions lists installed models', async () => {
  const o = await ai.localModelOptions();
  assert(o.length === 2 && o[0].id === 'granite3.3:2b' && o[0].label === 'installed · 1.5 GB' && o[0].free, JSON.stringify(o));
});

await check('aikey: local saved with an empty key; others still need one', () => {
  delete process.env.AI_PROVIDER;
  aikey.saveKey({ provider: 'local', key: '', remember: false });
  assert(aikey.storedKey()?.provider === 'local' && aikey.storedKey()?.key === '', JSON.stringify(aikey.storedKey()));
  assert(ai.aiProvider() === 'local' && ai.aiModel() === 'granite3.3:2b' && ai.aiKeySource() === 'session', `${ai.aiProvider()} ${ai.aiModel()} ${ai.aiKeySource()}`);
  aikey.setModel('qwen2.5:3b');
  assert(ai.aiModel() === 'qwen2.5:3b', String(ai.aiModel()));
  let threw = false;
  try { aikey.saveKey({ provider: 'openai', key: '', model: 'm', remember: false }); } catch { threw = true; }
  assert(threw, 'empty key accepted for openai');
});

fake.close();
fake.closeAllConnections();

await check('server closed: localStatus not running, embed throws a clear error', async () => {
  const s = await localStatus();
  assert(!s.running && s.models.length === 0, JSON.stringify(s));
  try { await embed(['x']); } catch (err) { assert(/Ollama is not running at http:\/\/127\.0\.0\.1:\d+/.test((err as Error).message), (err as Error).message); return; }
  throw new Error('did not throw');
});

console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
