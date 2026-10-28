// PDAM (Nuxeo) client for the local harvest server. Port of the PDAMClient in the standalone
// Python script. Credentials (OAuth client, bearer token or session cookie) stay in this
// process's memory: they are never logged, written to disk or returned to the browser.

export type PdamAuth =
  | { mode: 'oauth'; tokenEndpoint: string; grantType: string; clientId: string; clientSecret: string; assertion: string }
  | { mode: 'token'; token: string }
  | { mode: 'cookie'; cookie: string };

export class PdamError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
const PAGE_SIZE = 100;
const MAX_ATTEMPTS = 5;
const MAX_REDIRECTS = 5;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface NxEntry {
  uid: string;
  path?: string;
  title?: string;
  properties?: Record<string, any>;
  [key: string]: any;
}

// OAuth tokens are kept in memory (never on disk, never logged) and shared by every client for the same environment and
// OAuth client, so a new connection reuses the token until it expires or PDAM rejects it. Only then is a new one created.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();
const EXPIRY_MARGIN_MS = 60_000; // treat a token as expired a minute early
const DEFAULT_TTL_S = 600; // when the token response does not say how long it lives

export class PdamClient {
  private token: string | null = null;
  private expiresAt = 0; // 0 = unknown (static tokens and cookies never expire by the clock)

  constructor(
    public readonly baseUrl: string,
    private readonly auth: PdamAuth
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    if (auth.mode === 'token') this.token = auth.token;
  }

  private cacheKey(): string | null {
    return this.auth.mode === 'oauth' ? `${this.baseUrl}|${this.auth.clientId}` : null;
  }

  /** Log in (OAuth) so a bad credential fails at connect time, not on the first query. Reuses a still-valid token. */
  async connect(): Promise<void> {
    if (this.auth.mode !== 'oauth') return;
    const hit = tokenCache.get(this.cacheKey()!);
    if (hit && hit.expiresAt > Date.now()) {
      this.token = hit.token;
      this.expiresAt = hit.expiresAt;
      return;
    }
    await this.refreshToken(hit ? 'expired' : 'none cached');
  }

  private async refreshToken(reason = 'rejected by PDAM'): Promise<void> {
    if (this.auth.mode !== 'oauth') {
      throw new PdamError('The supplied token or cookie was rejected (expired or invalid). Connect again with a fresh one.', 401);
    }
    const a = this.auth;
    const res = await this.send('POST', `${this.baseUrl}${a.tokenEndpoint}`, {
      authed: false,
      form: { grant_type: a.grantType, client_id: a.clientId, client_secret: a.clientSecret, assertion: a.assertion }
    });
    const body = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!body.access_token) throw new PdamError('OAuth response had no access_token');
    const ttlMs = (Number(body.expires_in) > 0 ? Number(body.expires_in) : DEFAULT_TTL_S) * 1000;
    this.token = body.access_token;
    this.expiresAt = Date.now() + ttlMs - EXPIRY_MARGIN_MS;
    tokenCache.set(this.cacheKey()!, { token: this.token, expiresAt: this.expiresAt });
    console.log(`PDAM token created for ${new URL(this.baseUrl).host} (reason: ${reason}; valid about ${Math.round(ttlMs / 60000)} min)`); // never the token
  }

  private authHeaders(): Record<string, string> {
    if (this.auth.mode === 'cookie') return { Cookie: this.auth.cookie };
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  /** One HTTP call with backoff on transient failures, one re-login on 401, manual redirects. */
  private async send(
    method: string,
    url: string,
    opts: { authed?: boolean; json?: unknown; form?: Record<string, string>; reauthed?: boolean } = {}
  ): Promise<Response> {
    const authed = opts.authed !== false;
    // A token past its expiry is replaced before the call instead of waiting for PDAM to answer 401.
    if (authed && this.auth.mode === 'oauth' && this.token && this.expiresAt && Date.now() >= this.expiresAt) await this.refreshToken('expired');
    let attempt = 0;
    for (;;) {
      attempt++;
      const headers: Record<string, string> = { 'X-NXproperties': '*' };
      let body: string | undefined;
      if (opts.json !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(opts.json);
      } else if (opts.form) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        body = new URLSearchParams(opts.form).toString();
      }
      let res: Response | null = null;
      let failure: PdamError | null = null;
      try {
        res = await this.follow(method, url, headers, body, authed);
      } catch (err) {
        failure = err instanceof PdamError ? err : new PdamError(`Network error: ${(err as Error).message}`);
      }
      if (res) {
        if (res.ok) return res;
        if (res.status === 401 && authed && !opts.reauthed) {
          await res.arrayBuffer().catch(() => undefined);
          await this.refreshToken();
          return this.send(method, url, { ...opts, reauthed: true });
        }
        const text = (await res.text().catch(() => '')).slice(0, 300);
        failure = new PdamError(`HTTP ${res.status} ${method} ${new URL(url).pathname}: ${text}`, res.status);
        if (!RETRYABLE.has(res.status)) throw failure;
      }
      if (attempt >= MAX_ATTEMPTS) throw failure!;
      const retryAfter = res ? Number(res.headers.get('retry-after')) : NaN;
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 120) * 1000 : 2000 * 2 ** (attempt - 1));
    }
  }

  /** fetch with manual redirects; credentials are only sent to the PDAM origin. */
  private async follow(method: string, url: string, headers: Record<string, string>, body: string | undefined, authed: boolean): Promise<Response> {
    const origin = new URL(this.baseUrl).origin;
    let current = url;
    let sendBody = body;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const sameOrigin = new URL(current).origin === origin;
      const res = await fetch(current, {
        method,
        body: sendBody,
        redirect: 'manual',
        headers: authed && sameOrigin ? { ...headers, ...this.authHeaders() } : headers,
        signal: AbortSignal.timeout(120_000)
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        await res.arrayBuffer().catch(() => undefined);
        const next = new URL(res.headers.get('location')!, current).toString();
        // A redirect back to a login page on the PDAM host means the session is not valid.
        if (new URL(next).origin === origin && /login|saml|sso|auth/i.test(new URL(next).pathname) && this.auth.mode !== 'oauth') {
          throw new PdamError('Redirected to a login page: the session cookie or token is expired or invalid.', 401);
        }
        current = next;
        if (res.status !== 307 && res.status !== 308) {
          method = 'GET'; // 301/302/303 turn the request into a GET without a body; 307/308 repeat it as is
          sendBody = undefined;
        }
        continue;
      }
      return res;
    }
    throw new PdamError('Too many redirects');
  }

  private async jsonOf<T>(res: Response): Promise<T> {
    const type = res.headers.get('content-type') || '';
    if (!type.includes('json')) {
      await res.arrayBuffer().catch(() => undefined);
      throw new PdamError('Expected JSON but got a web page: the session is probably expired (login page).', 401);
    }
    return (await res.json()) as T;
  }

  /** Run an NXQL query through Document.Query, following pagination. */
  async nxql(query: string, maxResults?: number): Promise<NxEntry[]> {
    const entries: NxEntry[] = [];
    for (let page = 0; ; page++) {
      const pageSize = maxResults && maxResults < PAGE_SIZE ? maxResults : PAGE_SIZE; // a probe of 1 should not pull 100 documents
      const res = await this.send('POST', `${this.baseUrl}/api/v1/automation/Document.Query`, {
        json: { params: { query, pageSize, currentPageIndex: page } }
      });
      const result = await this.jsonOf<{ entries?: NxEntry[]; isNextPageAvailable?: boolean }>(res);
      const batch = result.entries ?? [];
      entries.push(...batch);
      if (maxResults && entries.length >= maxResults) return entries.slice(0, maxResults);
      if (!batch.length || !result.isNextPageAvailable) return entries;
    }
  }

  /** Read-only GET of any JSON endpoint under the PDAM base URL (e.g. "/api/v1/config/types"). */
  async getJson<T = any>(path: string): Promise<T> {
    return this.jsonOf<T>(await this.send('GET', `${this.baseUrl}${path}`));
  }

  async getDoc(uid: string): Promise<NxEntry> {
    const res = await this.send('GET', `${this.baseUrl}/api/v1/id/${encodeURIComponent(uid)}`);
    return this.jsonOf<NxEntry>(res);
  }

  /** The main blob (the sketch PDF) as bytes. */
  async downloadBlob(uid: string): Promise<Buffer> {
    const res = await this.send('GET', `${this.baseUrl}/api/v1/id/${encodeURIComponent(uid)}/@blob/file:content`);
    const bytes = Buffer.from(await res.arrayBuffer());
    // An expired login can answer 200 with a web page; never store that as the sketch.
    if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new PdamError('PDAM returned something other than a PDF (probably a login page: the session may have expired).');
    }
    return bytes;
  }
}
