// The local model server (Ollama). Everything here talks only to LOCAL_BASE, which is this computer unless OLLAMA_HOST says
// otherwise: nothing goes to the internet, and no key is involved.
//   OLLAMA_HOST        "127.0.0.1:11434" or a full URL         (default http://127.0.0.1:11434)
//   LOCAL_EMBED_MODEL  model used by embed()                    (default nomic-embed-text)

const host = process.env.OLLAMA_HOST?.trim();
export const LOCAL_BASE = (host ? (/^https?:\/\//i.test(host) ? host : `http://${host}`) : 'http://127.0.0.1:11434').replace(/\/+$/, '');

export interface LocalStatus {
  running: boolean;
  version?: string;
  models: { name: string; sizeBytes: number }[];
}

/** Is Ollama up, and which models are installed. Short timeout and never throws: the page calls this just to show a status. */
export async function localStatus(): Promise<LocalStatus> {
  const get = async <T>(p: string): Promise<T> => {
    const res = await fetch(`${LOCAL_BASE}${p}`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  };
  try {
    const tags = await get<{ models?: { name?: string; model?: string; size?: number }[] }>('/api/tags');
    const models = (tags.models ?? []).map((m) => ({ name: String(m.name ?? m.model ?? ''), sizeBytes: Number(m.size) || 0 })).filter((m) => m.name);
    const version = await get<{ version?: string }>('/api/version').then((v) => v.version, () => undefined);
    return { running: true, version, models };
  } catch {
    return { running: false, models: [] };
  }
}

const BATCH = 32;

/** One embedding vector per text, in order. */
export async function embed(texts: string[], model = process.env.LOCAL_EMBED_MODEL?.trim() || 'nomic-embed-text'): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const input = texts.slice(i, i + BATCH);
    let res: Response;
    try {
      res = await fetch(`${LOCAL_BASE}/api/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, input }),
        signal: AbortSignal.timeout(120_000)
      });
    } catch {
      throw new Error(`Ollama is not running at ${LOCAL_BASE}: start it and try again.`);
    }
    if (!res.ok) {
      const said = (await res.text().catch(() => '')).slice(0, 200);
      if (res.status === 404) throw new Error(`The embedding model ${model} is not installed: run ollama pull ${model}`);
      throw new Error(`Ollama embedding request failed (HTTP ${res.status}): ${said}`);
    }
    const body = (await res.json()) as { embeddings?: number[][] };
    if (!Array.isArray(body.embeddings) || body.embeddings.length !== input.length) throw new Error(`Ollama returned ${body.embeddings?.length ?? 0} embeddings for ${input.length} texts.`);
    out.push(...body.embeddings);
  }
  return out;
}
