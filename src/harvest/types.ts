// Shared by the local harvest server (server/*) and the Harvest workspace UI (src/harvest/*).
// Shapes mirror the standalone Python script's tech-engine-input.json / bom.json / flex-payload.json
// so runs written by either tool can be read by the other.

export type Env = 'DEV' | 'UAT' | 'PREPROD' | 'PROD';
export const ENVIRONMENTS: Env[] = ['DEV', 'UAT', 'PREPROD', 'PROD'];

/** How the server authenticates to PDAM (Nuxeo). Secrets live in server memory only. */
/** AI providers the suggestion step can use. `compat` = OpenAI-style chat completions with function calling. */
export type AiProviderId = 'openrouter' | 'anthropic' | 'openai' | 'gemini' | 'groq' | 'cerebras' | 'mistral' | 'local';
export const AI_PROVIDERS: { id: AiProviderId; label: string; keyHint: string; keyPrefix?: string; defaultModel?: string; compat?: string; noKey?: boolean }[] = [
  { id: 'openrouter', label: 'OpenRouter', keyHint: 'sk-or-...', keyPrefix: 'sk-or-', defaultModel: 'anthropic/claude-sonnet-5.5', compat: 'https://openrouter.ai/api/v1/chat/completions' },
  { id: 'anthropic', label: 'Anthropic', keyHint: 'sk-ant-...', keyPrefix: 'sk-ant-', defaultModel: 'claude-sonnet-5-5' },
  // OpenAI has no default model: enter the model id your account can use. Its calls are not tested yet.
  { id: 'openai', label: 'OpenAI', keyHint: 'sk-...', keyPrefix: 'sk-', compat: 'https://api.openai.com/v1/chat/completions' },
  { id: 'gemini', label: 'Google Gemini', keyHint: 'AIza...', defaultModel: 'gemini-3.1-flash-lite', compat: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' },
  // More providers with a free tier of their own (separate quotas): all OpenAI-compatible. Cerebras has no default model: enter one your account lists.
  { id: 'groq', label: 'Groq', keyHint: 'gsk_...', keyPrefix: 'gsk_', defaultModel: 'llama-3.3-70b-versatile', compat: 'https://api.groq.com/openai/v1/chat/completions' },
  { id: 'cerebras', label: 'Cerebras', keyHint: 'csk-...', keyPrefix: 'csk-', compat: 'https://api.cerebras.ai/v1/chat/completions' },
  { id: 'mistral', label: 'Mistral', keyHint: 'API key', defaultModel: 'mistral-small-latest', compat: 'https://api.mistral.ai/v1/chat/completions' },
  // Runs on this computer (Ollama): no key, nothing leaves the machine. Tried first whenever it is running.
  { id: 'local', label: 'Local (Ollama)', keyHint: 'no key needed', defaultModel: 'granite3.3:2b', compat: 'http://127.0.0.1:11434/v1/chat/completions', noKey: true }
];

/** Which saved data the style list shows: the newest copy of each style, or the environment's offline snapshot. */
export type DataSource = 'latest' | 'offline';

export type AuthMode = 'config' | 'cookie' | 'token' | 'sso';

export interface SessionInfo {
  mode: AuthMode;
  since: string;
}

export interface AppConfig {
  environments: Env[];
  /** true when the shared config file has OAuth client details (never the values themselves) */
  configAuthAvailable: boolean;
  /** the one environment the shared OAuth client was issued for; it is never sent anywhere else */
  configAuthEnv?: Env;
  sessions: Partial<Record<Env, SessionInfo>>;
  scriptDir: string;
  scriptDirFound: boolean;
  /** per environment, the saved run its "offline" link points at (only environments that have one) */
  offline?: Partial<Record<Env, { run: string; styleCount: number }>>;
  /** true when an AI key is available (environment or saved in the app): the optional AI suggestion step is then offered */
  aiAvailable: boolean;
  aiModel?: string;
  /** who the suggestion step would send its questions to */
  aiProvider?: AiProviderId;
  /** where the key in use comes from: environment variable, entered for this session, or saved (encrypted) on this computer */
  aiKeySource?: 'env' | 'session' | 'saved';
}

/** One row of the live "list master styles" query (read-only discovery). */
export interface MasterStyleRow {
  masterStyleID: string | null;
  uid: string;
  season: string | null;
  bomReady: boolean | null;
  hasPluginData: boolean;
  styleCount: number;
  path: string | null;
  title: string | null;
}

export interface PluginPart {
  partId: string;
  name: string;
  partType: string;
  placement?: string;
  linked?: boolean;
}

export interface PluginMaterial {
  uid?: string;
  materialName: string;
  articleNumber?: string;
  label?: string;
  isInDevelopment?: boolean;
}

export interface DevObjectParts {
  devObjectId: string;
  styleId?: string;
  name?: string;
  comment?: string;
  parts: { partId: string; materials: PluginMaterial[] }[];
}

export interface TechEngineInput {
  mstsDocumentUid?: string;
  documentTitle?: string;
  datasetVersion?: string | null;
  masterStyleID: string;
  classification?: string;
  seasonYear?: string | null;
  styleIds?: string[];
  styleDevelopmentObjects?: Record<string, string[]>;
  styleSeasonalDocumentIds?: string[];
  developmentObjects?: string[];
  pluginDevelopmentObjects?: string[];
  parts: PluginPart[];
  developmentObjectParts: DevObjectParts[];
  summary?: { styleCount: number; developmentObjectCount: number; partCount: number; materialCount: number };
}

export interface BomRow {
  section: string;
  standardPlacement?: string;
  placement?: string;
  materialName: string;
  articleNumber?: string;
  label?: string;
  isInDevelopment: boolean;
  /** filled by the PDAM catalog lookup or an accepted AI suggestion; absent on plain plugin rows */
  supplierName?: string | null;
  omniMatchScore?: string;
  enrichedBy?: 'pdam' | 'ai' | 'history' | 'edit';
}

export interface Bom {
  masterStyleID: string;
  seasonYear?: string | null;
  devObjectId: string;
  bomRows: BomRow[];
}

/** One row as the Flex BOM expects it (field names come from the PoC's spec; not yet confirmed with Flex). */
export interface FlexRow {
  // key order mirrors OmniTechPack's BOM.json
  section: string;
  standardPlacement: string | null;
  placement: string | null;
  supplierArticle: string | null;
  /** supplied by the Material-Supplier catalog, which we do not have yet: null here */
  supplierName: string | null;
  materialName: string;
  /** "100%" for rows taken from validated plugin metadata (OmniTechPack scores those 100%) */
  omniMatchScore: string;
}

/** Diagnostics block OmniTechPack adds to its payload; only the fields we can compute are filled. */
export interface FlexSketchInfo {
  source_id: string | null;
  target_id: string;
  source_sha256: string | null;
  target: {
    label: string | null;
    identity_status: 'confirmed' | 'inferred';
    style_id: string | null;
    dev_object_id: string;
    metadata_source: string;
    mapping_revision: string;
    bom_row_count: number;
    review_warnings: string[];
  };
  publication_allowed: boolean;
  review_warnings: string[];
  needs_review: boolean;
  /** present once the PDAM lookup and/or accepted AI suggestions changed rows: what was applied, and by whom */
  enrichment?: {
    pdamLookup?: { resolved: number; of: number };
    history?: { applied: number; of: number; overrodeLookup: number };
    ai?: { provider: AiProviderId; model: string; applied: number };
    edits?: { changed: number; deleted: number; added: number };
  };
}

/**
 * DRAFT of the outbound Flex BOM for one dev object, following OmniTechPack's documented contract:
 * header, parentId (the PDAM document id), devObjectId instead of styleId, errorCode and message.
 * Not yet validated against Flex.
 */
export interface FlexPayload {
  header: { eventSource: string; eventEntity: string; eventType: string };
  parentId: string | null;
  type: string;
  devObjectId: string;
  seasonCode: string | null;
  dateRequested: string;
  dateReceived: string;
  dateSentToFlex: string;
  errorCode: string | null;
  message: string;
  bom: FlexRow[];
  _sketch: FlexSketchInfo;
}

/** One supplier entry of a PDAM Material document (the Material-Supplier catalog). */
export interface CatalogCandidate {
  materialName: string;
  supplierName: string | null;
  supplierArticle: string | null;
  status: string | null;
  /** the material's own subtype in PDAM (lower-cased), e.g. "fabric"; null when PDAM has none */
  section: string | null;
}

/** A Flex row after the PDAM catalog lookup, with how it was matched. */
export interface CatalogRow {
  index: number;
  baseline: FlexRow;
  row: FlexRow;
  /** article = exact supplier article number; name = one catalog material with that name; none = not resolved */
  matchedBy: 'article' | 'name' | 'none';
  candidates: CatalogCandidate[];
  chosen: number | null;
}

export interface AiSuggestion {
  index: number;
  from: FlexRow;
  to: FlexRow;
  /** fields of `to` that differ from `from` */
  changed: (keyof FlexRow)[];
  candidate: number;
  confidence: number;
  reason: string;
}

export interface AiResult {
  model: string;
  provider: AiProviderId;
  suggestions: AiSuggestion[];
  /** rows sent to the model / rows it declined to change */
  asked: number;
  /** rows the model answered with "none of these" */
  declined: number;
  /** rows it never answered, even after asking again */
  unanswered: number;
  /** rows that were sent and came back with NO change (the model found no candidate that fits), with its reason in plain words; `index` is the
   *  catalog row index, as in `suggestions`. The page shows these next to the suggestions so every row that was sent is accounted for. */
  declinedRows?: { index: number; reason: string }[];
  /** time spent waiting for the model(s), in milliseconds, and where: 'local' ran on this computer, anything else is a hosted endpoint */
  ms?: number;
  /** a model that was tried first and failed before this one answered (e.g. the local model, then Groq) */
  triedFirst?: { provider: AiProviderId; model: string; ms: number; error: string }[];
}

/** An AI suggestion the user accepted for one payload row (index = position among the payload rows). */
export interface AiPick {
  index: number;
  candidate: number;
  confidence: number;
}

/** The six fields of a payload row a person can change on screen 5. */
export interface RowFields {
  section: string;
  standardPlacement: string | null;
  placement: string | null;
  supplierArticle: string | null;
  supplierName: string | null;
  materialName: string;
}

/** A person's changes to the enriched rows (screen 5): field edits by payload row index, rows removed, rows added. */
export interface RowEdits {
  rows: { index: number; fields: Partial<RowFields> }[];
  deleted: number[];
  added: RowFields[];
}

/** What to add to the plain BOM: the PDAM catalog lookup, past corrections, the AI suggestions accepted so far, and a person's edits. */
export interface Enrichment {
  lookup: boolean;
  history: boolean;
  ai: AiPick[];
  edits?: RowEdits;
}

/** The BOM and payload after the lookup / accepted AI picks, exactly what the PDF is built from. */
export interface EnrichedView {
  bom: Bom;
  flexPayload: FlexPayload;
}

export interface DevObjectBom {
  devObjectId: string;
  name?: string;
  styleId?: string;
  comment?: string;
  /** every material row, in-development ones included (flagged) */
  bom: Bom;
  flexPayload: FlexPayload;
  /** in-development rows that are in `bom` but left out of the Flex payload */
  excludedInDevelopment: number;
  /** the dev object id is also listed by PDAM's style data (StyleSeasonal), i.e. confirmed rather than inferred */
  confirmed: boolean;
  warnings: string[];
  /** relative file name of a BOM PDF written by the Python script, when one exists */
  pdfName?: string;
}

/** A saved run: a folder holding golden-dataset/<style folders>. */
export interface SourceRun {
  runId: string;
  label: string;
  group: string;
  styleCount: number;
  writable: boolean;
  /** when the run was last written (ms since epoch); used to find the newest copy of a style */
  modified: number;
}

export interface StyleSummary {
  ref: string;
  folder: string;
  masterStyleID: string;
  uid?: string;
  season?: string | null;
  classification?: string;
  partCount: number;
  materialCount: number;
  devObjectCount: number;
  hasSketch: boolean;
  /** where this copy came from: fetched here, saved by the Python script, or loaded from files */
  origin?: 'harvested' | 'saved' | 'loaded';
  /** true for a workspace draft (sketch path outside /Domain/ProductLibrary); undefined when unknown */
  isDraft?: boolean;
}

export interface StyleDetail {
  ref: string;
  techInput: TechEngineInput;
  summary: Record<string, unknown> | null;
  hasSketch: boolean;
}

export interface HarvestResult {
  runId: string;
  styles: StyleSummary[];
  errors: { uid: string; error: string }[];
  /** things that went wrong without failing the harvest (no plugin data, sketch not downloaded, ...) */
  warnings: string[];
}

/** One entry read from a sketch legend (by the template, the rules or the text model). */
export interface PdfLegendEntry {
  heading: string;
  material: string;
  supplier: string | null;
  article: string | null;
  width: string | null;
}

export interface PdfLegendPage {
  page: number;
  /** the first method that read the page; null when none could (a text model may) */
  method: 'template' | 'rules' | 'model' | null;
  entries: PdfLegendEntry[];
  note: string;
}

export interface ReconciledRow {
  index: number;
  label: string;
  materialName: string;
  status: 'in PDF' | 'plugin only';
  via?: 'label' | 'material';
  entry?: { heading: string; material: string; supplier: string | null; article: string | null; page?: number };
}

/** The plugin rows against the PDF legend: matched, only in the plugin, only in the PDF. The plugin stays authoritative. */
export interface Reconciliation {
  rows: ReconciledRow[];
  onlyInPdf: { heading: string; material: string; supplier: string | null; article: string | null; page?: number }[];
}

/** Everything read from the sketch PDF (screen 2). */
export interface PdfRead {
  pdf: { pages: number; profiled: number; kinds: Record<string, number>; rung: string; imagesOnTextPages: number; producer: string };
  header: Record<string, string>;
  legendPages: PdfLegendPage[];
  /** legend pages no no-AI method could read (the AI reading would try these) */
  needsAi: number[];
  /** every page that still has no entries, with the reason (nothing is left unexplained) */
  unread: { page: number; reason: string }[];
  /** why no legend page was found at all, when none was */
  noLegendReason?: string;
  reconciliation: Reconciliation;
  /** the reading without AI: taken from the saved reading of this exact PDF (hit) or made now */
  cache?: { hit: boolean; savedAt: string };
  ai?: {
    /** pages whose AI reading was reused from an earlier run of the same PDF, with when and by which model */
    cached?: { page: number; savedAt: string; provider: string; model: string }[];
    provider: string;
    model: string;
    pages: { page: number; entries: number; rejected: number; error?: string }[];
    /** pages the no-AI methods had already read: what the AI found on them compared with that result */
    comparison?: {
      page: number;
      baseMethod: string;
      baseCount: number;
      aiCount: number;
      same: number;
      onlyAi: PdfLegendEntry[];
      onlyBase: PdfLegendEntry[];
      differs: { heading: string; base: PdfLegendEntry; ai: PdfLegendEntry }[];
      rejected: number;
    }[];
  };
}

// ---- Settings (the Settings screen and GET/PUT /api/settings) ----

/** Everything a user may change. Saved in memory/settings.json (never holds a key); each field has limits the server enforces. */
export interface AppSettings {
  ai: {
    /** try the local model (Ollama) before any hosted endpoint */
    localFirst: boolean;
    /** a specific installed local model; '' = automatic (the best one that fits in free memory) */
    localModel: string;
    /** hosted providers tried after local, in this order (only those with a key are used); never contains 'local' */
    hostedOrder: AiProviderId[];
    /** per hosted provider, the models to use in order (first = preferred, the others are fallbacks); a missing or empty list means the
     *  provider's default model. Key 1 tries every model in this order, then key 2 tries them all, and so on. Up to 8 per provider. */
    models: Partial<Record<AiProviderId, string[]>>;
    /** how long to wait for a local model / a hosted endpoint, in seconds */
    timeoutLocalSeconds: number; // 30..1800, default 600
    timeoutHostedSeconds: number; // 10..600, default 90
    /** most pages sent to the AI in one reading of a PDF */
    pagesPerReading: number; // 1..30, default 8
    /** screen 2: also read pages already read without AI, to compare (testing) */
    compareReadDefault: boolean; // default true
    /** a local model smaller than this many GB is tried last, not first, for matching and legend reading when a hosted key exists */
    localMinGbForLegend: number; // 0..20, default 4
  };
  data: {
    /** which saved data the style list starts on */
    defaultSource: DataSource; // default 'latest'
    /** how long a PDAM catalog lookup is remembered, in minutes (0 = not remembered) */
    catalogCacheMinutes: number; // 0..120, default 10
  };
  reading: {
    /** reuse the saved reading of a PDF that was read before */
    reuseSaved: boolean; // default true
  };
  display: {
    /** the tab About / Analytics open on (index) */
    aboutTab: number;
    analyticsTab: number;
    /** the app's name, shown top left, in the browser tab and in the About text (1..40 characters) */
    appName: string; // default 'MasterStyleToBOM'
    /** the line under the name (0..80 characters) */
    tagline: string; // default 'From Master Style to a refined BOM'
    /** the letters in the small badge next to the name (1..3 characters) */
    badge: string; // default 'MB'
    /** set by the server when a logo is uploaded (0 = none; GET /api/logo?v=<this> serves it). Changing it in a PUT has no effect. */
    logoVersion: number;
  };
}

/** One saved key (an account) of a provider, as the Settings screen shows it. The key itself is never sent to the page.
 *  A key works for every model its account may use: models are chosen per provider (AppSettings.ai.models), not per key. */
export interface ProviderKey {
  /** identifies this key for Forget (assigned by the server; may change after a restart) */
  id: string;
  /** a name the person gave it ("account B"), or '' */
  label: string;
  source: 'session' | 'saved';
}

/** One AI provider as the Settings screen shows it. Never contains a key. */
export interface ProviderStatus {
  id: AiProviderId;
  label: string;
  keyHint: string;
  defaultModel?: string;
  noKey?: boolean;
  /** where its key comes from: the server's environment, entered this session, saved (encrypted), or none */
  keySource: 'env' | 'session' | 'saved' | null;
  /** the keys the app holds for this provider (entered in Settings), in the order they are tried. Never contains the key itself. */
  keys: ProviderKey[];
  /** how many keys come from the server's environment (a comma-separated list is several keys) */
  envKeys: number;
  /** the models tried for this provider, in order (the saved choice, else the default; empty when it has none) */
  models: string[];
  /** the first of them, or '' */
  model: string;
}

export interface SettingsView {
  settings: AppSettings;
  defaults: AppSettings;
  providers: ProviderStatus[];
  local: { running: boolean; version: string | null; models: { name: string; gb: number }[]; active: string | null };
}

// ---- Live AI log (GET /api/ai/log) ----

/** One line of what the AI layer is doing, as it happens: kept in memory on the server (the last 500), polled by the page. */
export interface AiLogEvent {
  /** increases by 1 for every event; the page asks for everything after the last seq it has seen */
  seq: number;
  /** ISO time */
  at: string;
  /** one id per question asked of the AI layer (all attempts for that question share it) */
  runId: string;
  /** start = a question was asked; try = one attempt began; ok / fail = that attempt ended; skip = attempts were skipped on purpose;
   *  info = anything else worth showing; end = the question finished (answered or not) */
  kind: 'start' | 'try' | 'ok' | 'fail' | 'skip' | 'info' | 'end';
  /** the job: report_matches (matching rows), report_legend (reading a legend page) */
  task: string;
  /** what the person asked for in words, e.g. "Matching 9 rows" or "Legend page 13" */
  context?: string;
  provider?: string;
  model?: string;
  /** which key: a label, "key 2" or "env key 1" (never the key itself) */
  account?: string;
  where?: 'local' | 'cloud';
  /** how long this attempt took (ok, fail) or how long the whole question took (end) */
  ms?: number;
  /** a plain-English line for people: "Daily free quota used up (7.2 s): skipping the rest of this key's models" */
  message: string;
  /** the raw error text, up to 600 characters (fail only) */
  detail?: string;
  /** short cause for a failure: "Daily free quota used up", "Provider busy or down", ... */
  category?: string;
}

/** An attempt that is in flight right now, so the page can show a ticking "Trying Gemini (key 1)... 8 s". */
export interface AiRunning {
  runId: string;
  task: string;
  context?: string;
  provider: string;
  model: string;
  account?: string;
  where: 'local' | 'cloud';
  /** ISO time the attempt began */
  startedAt: string;
}

export interface AiLogReply {
  events: AiLogEvent[];
  /** the highest seq in the server's buffer (0 when empty): send it back as ?since= */
  last: number;
  running: AiRunning[];
}
