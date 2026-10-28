import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { loadSettingsOnce } from './api';
import { useBranding } from './branding';

// The project's own description, shown on the main page: why it exists, how it is built and what it runs on. The numbers the app
// measures itself (AI timings, saved work, the PDF corpus) live in the Analytics section.

const card = 'bg-white border border-slate-200 rounded-lg shadow-sm';
const h3 = 'text-base font-bold text-slate-900';
const p = 'text-sm text-slate-700 leading-7';
const th = 'px-3 py-2.5 text-left text-xs font-semibold text-slate-600';
const td = 'px-3 py-2.5 text-sm text-slate-800 align-top leading-6';

export const Table: React.FC<{ head: string[]; rows: React.ReactNode[][]; caption: string; title?: boolean }> = ({ head, rows, caption, title }) => (
  <div>
    {title && <h4 className="text-sm font-semibold text-slate-800 mb-2">{caption}</h4>}
    <div className="overflow-x-auto border border-slate-200 rounded-md">
    <table className="w-full min-w-[32rem]">
      <caption className="sr-only">{caption}</caption>
      <thead className="bg-slate-50">
        <tr>{head.map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j} className={`${td} ${j === 0 ? 'font-medium text-slate-900 whitespace-nowrap' : ''}`}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  </div>
  </div>
);

export const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{children}</code>;

/** Boxes and arrows: where data comes from, what the server does with it and what the page shows. */
const Architecture: React.FC = () => {
  const box = 'fill-white stroke-slate-400';
  const strong = 'fill-sky-50 stroke-sky-600';
  const ai = 'fill-violet-50 stroke-violet-500';
  const mem = 'fill-emerald-50 stroke-emerald-600';
  const t = 'fill-slate-800 text-[11px]';
  const sub = 'fill-slate-500 text-[10px]';
  const arrow = 'stroke-slate-500 fill-none';
  return (
    <svg viewBox="0 0 860 470" role="img" aria-labelledby="arch-title arch-desc" className="w-full h-auto">
      <title id="arch-title">Architecture</title>
      <desc id="arch-desc">
        PDAM and the pinned snapshot feed the Node server. The server reads the sketch PDF with Python, builds the BOM and Flex payload, enriches it
        from past corrections, the PDAM catalog and optional AI, renders the BOM PDF, and serves five screens in the browser. Corrections go to an
        append-only memory that feeds the next run.
      </desc>
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="fill-slate-500" />
        </marker>
      </defs>

      {/* sources */}
      <text x="20" y="20" className="fill-slate-500 text-[11px] font-semibold">SOURCES</text>
      <rect x="20" y="30" width="190" height="64" rx="8" className={box} />
      <text x="115" y="56" textAnchor="middle" className={t}>PDAM (Nuxeo)</text>
      <text x="115" y="72" textAnchor="middle" className={sub}>read-only NXQL: styles, plugin data,</text>
      <text x="115" y="84" textAnchor="middle" className={sub}>Material catalog, sketch PDFs</text>
      <rect x="20" y="108" width="190" height="52" rx="8" className={box} />
      <text x="115" y="132" textAnchor="middle" className={t}>Pinned snapshot</text>
      <text x="115" y="148" textAnchor="middle" className={sub}>one fixed saved run per environment</text>
      <rect x="20" y="174" width="190" height="52" rx="8" className={box} />
      <text x="115" y="198" textAnchor="middle" className={t}>Sign-in</text>
      <text x="115" y="214" textAnchor="middle" className={sub}>SSO window, shared token, cookie</text>

      <rect x="20" y="250" width="190" height="64" rx="8" className={mem} />
      <text x="115" y="272" textAnchor="middle" className={t}>Local files</text>
      <text x="115" y="288" textAnchor="middle" className={sub}>corrections, saved PDF readings,</text>
      <text x="115" y="300" textAnchor="middle" className={sub}>AI call record, settings</text>
      <path d="M210 282 H250" className={arrow} strokeDasharray="4 3" markerStart="url(#ah)" markerEnd="url(#ah)" />

      {/* server */}
      <text x="250" y="20" className="fill-slate-500 text-[11px] font-semibold">LOCAL SERVER (Node + Express, port 3000)</text>
      <rect x="250" y="30" width="360" height="300" rx="10" className="fill-slate-50 stroke-slate-300" />
      <rect x="266" y="44" width="150" height="50" rx="7" className={strong} />
      <text x="341" y="66" textAnchor="middle" className={t}>1 Harvest / store</text>
      <text x="341" y="82" textAnchor="middle" className={sub}>live or saved, per style</text>
      <rect x="444" y="44" width="150" height="50" rx="7" className={strong} />
      <text x="519" y="66" textAnchor="middle" className={t}>2 Read the PDF</text>
      <text x="519" y="82" textAnchor="middle" className={sub}>Python: template, rules</text>
      <rect x="266" y="110" width="150" height="50" rx="7" className={strong} />
      <text x="341" y="132" textAnchor="middle" className={t}>3 BOM + Flex payload</text>
      <text x="341" y="148" textAnchor="middle" className={sub}>from plugin data</text>
      <rect x="444" y="110" width="150" height="50" rx="7" className={strong} />
      <text x="519" y="132" textAnchor="middle" className={t}>4 Enrich, in order</text>
      <text x="519" y="148" textAnchor="middle" className={sub}>history, PDAM, AI, edits</text>
      <rect x="266" y="176" width="150" height="50" rx="7" className={strong} />
      <text x="341" y="198" textAnchor="middle" className={t}>5 BOM PDF</text>
      <text x="341" y="214" textAnchor="middle" className={sub}>Python renderer</text>
      <rect x="444" y="176" width="150" height="50" rx="7" className={mem} />
      <text x="519" y="198" textAnchor="middle" className={t}>Corrections memory</text>
      <text x="519" y="214" textAnchor="middle" className={sub}>append-only, + RAG lookup</text>
      <rect x="266" y="246" width="328" height="70" rx="7" className={ai} />
      <text x="430" y="266" textAnchor="middle" className={t}>AI layer (flag-gated, suggest-only, every call recorded)</text>
      <text x="430" y="284" textAnchor="middle" className={sub}>hosted keys in your order, key by key (Gemini, OpenRouter, Groq…)</text>
      <text x="430" y="298" textAnchor="middle" className={sub}>local Ollama first only if big enough for the job, else last resort</text>
      <text x="430" y="310" textAnchor="middle" className={sub}>values only from PDAM candidates or page text</text>

      {/* browser */}
      <text x="650" y="20" className="fill-slate-500 text-[11px] font-semibold">BROWSER (React 19 + Tailwind 4)</text>
      <rect x="650" y="30" width="190" height="300" rx="10" className="fill-slate-50 stroke-slate-300" />
      {['1 Structured input', '2 Read the PDF', '3 Enrich', '4 BOM PDF', '5 Review & correct'].map((s, i) => (
        <g key={s}>
          <rect x="662" y={44 + i * 56} width="166" height="44" rx="7" className={i === 4 ? mem : strong} />
          <text x="745" y={70 + i * 56} textAnchor="middle" className={t}>{s}</text>
        </g>
      ))}

      {/* arrows */}
      <path d="M210 62 H250" className={arrow} markerEnd="url(#ah)" />
      <path d="M210 134 H250" className={arrow} markerEnd="url(#ah)" />
      <path d="M115 226 V240 H230 V80 H250" className={arrow} strokeDasharray="4 3" markerEnd="url(#ah)" />
      <path d="M416 69 H444" className={arrow} markerEnd="url(#ah)" />
      <path d="M341 94 V110" className={arrow} markerEnd="url(#ah)" />
      <path d="M416 135 H444" className={arrow} markerEnd="url(#ah)" />
      <path d="M519 160 V176" className={arrow} markerStart="url(#ah)" markerEnd="url(#ah)" />
      <path d="M470 160 V168 H341 V176" className={arrow} markerEnd="url(#ah)" />
      <path d="M480 246 V226" className={arrow} strokeDasharray="4 3" markerStart="url(#ah)" markerEnd="url(#ah)" />
      <path d="M610 180 H650" className={arrow} markerStart="url(#ah)" markerEnd="url(#ah)" />
      <path d="M745 330 V366 H630 V201 H594" className={arrow} strokeDasharray="4 3" markerEnd="url(#ah)" />
      <text x="690" y="384" textAnchor="middle" className={sub}>edits on screen 5 are recorded and reused on the next BOM</text>

      {/* legend */}
      <g transform="translate(20 420)">
        <rect width="14" height="14" rx="3" className={strong} /><text x="22" y="11" className={sub}>deterministic pipeline</text>
        <rect x="170" width="14" height="14" rx="3" className={ai} /><text x="192" y="11" className={sub}>AI (optional, suggestions only)</text>
        <rect x="380" width="14" height="14" rx="3" className={mem} /><text x="402" y="11" className={sub}>memory of corrections</text>
        <path d="M560 7 H600" className={arrow} strokeDasharray="4 3" /><text x="608" y="11" className={sub}>feedback / optional path</text>
      </g>
    </svg>
  );
};

/** The Objective tab: it names the app from Settings > Display, so it is a component. */
const ObjectiveTab: React.FC = () => {
  const { appName } = useBranding();
  return (
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className={h3}>What {appName} is for</h3>
          <p className={p}>
            {appName} turns a master style's structured data from PDAM, together with its technical sketch PDF, into a reviewed Bill of Materials (BOM) and a
            Flex-ready payload. Every correction a person makes is remembered, so the next BOM starts from a better place.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className={h3}>Why it exists</h3>
          <p className={p}>
            Today's tool, OmniThink (OmniTechPack on the stage console), reads each sketch PDF with AI. It gets about 80–85% of BOMs right, and the other 15% or so
            need manual fixes, many of them the same fix again and again. {appName} is a proof of concept for a more dependable route to the same result.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className={h3}>What it sets out to do</h3>
          <ul className="list-disc pl-5 space-y-2.5 text-sm text-slate-700 leading-7">
            <li><b>Start from structured data.</b> PDAM's dev objects, parts and materials give the BOM rows directly. The PDF is read to cross-check them, not to guess them.</li>
            <li><b>Enrich in a fixed order of trust.</b> Past corrections come first, then the PDAM catalog lookup, then AI suggestions you choose to apply, then your own edits. Each row shows where its value came from.</li>
            <li><b>Learn from corrections.</b> A fix made once is recorded and reused for the same material on later styles, so the same mistake is not fixed twice.</li>
            <li><b>Use AI only where it helps.</b> It is optional and only suggests. Your hosted keys are tried in the order you set, key by key, and a local model on this computer goes first only when it is big enough for the job (a small one is the last resort). Every call is timed and recorded.</li>
            <li><b>Stay safe.</b> PDAM is only read, never written. Nothing is published to Flex. Sketches and credentials stay on this computer.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className={h3}>How we will know it works</h3>
          <p className={p}>
            By the share of BOM rows that need no edit, the repeat corrections avoided, and the time and cost per style, compared with OmniThink's output for the same
            styles. No final, corrected BOMs are available yet, so no accuracy figure is claimed here.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className={h3}>Where it stands</h3>
          <p className={p}>
            A working proof of concept on PDAM's PREPROD and UAT data, with a pinned snapshot of each to fall back on. Publishing to Flex is not connected.
          </p>
        </section>
      </div>
  );
};

const SECTIONS: { id: string; tab: string; node: React.ReactNode }[] = [
  {
    id: 'about-0',
    tab: 'Objective',
    node: (
      <ObjectiveTab />
    )
  },
  {
    id: 'about-1',
    tab: 'Screens',
    node: (
      <div>
            <h3 className={h3}>How it works: the five screens</h3>
            <Table
              caption="The five screens"
              head={['Screen', 'What it does']}
              rows={[
                ['1 Structured input', 'The structured data saved for the chosen master style (styles, style seasonal documents, plugin data); each item opens on click.'],
                ['2 Read the PDF', 'Opens the sketch PDF; Part 1 reads it without AI (template, then rules); Part 2 reads it with AI and compares with Part 1 page by page; compares both with the plugin rows.'],
                ['3 Enrich', 'Shows the Flex payload and BOM JSON, updated as you apply (1) past corrections, (2) the PDAM catalog lookup, (3) AI matching.'],
                ['4 BOM PDF', 'The BOM as a PDF built from the previous step, with or without the AI picks.'],
                ['5 Review & correct', 'Edit rows in a table, record the corrections, and generate the final PDF. The next BOM starts from what you taught it.'],
              ]}
            />
            <p className="text-sm text-slate-500 mt-2">Trust order when sources disagree: past correction › PDAM lookup › ticked AI pick › the person's own edit. Each row records where its value came from.</p>
      </div>
    )
  },
  {
    id: 'about-2',
    tab: 'Architecture',
    node: (
      <div>
            <h3 className={h3}>Architecture</h3>
            <div className="border border-slate-200 rounded-md p-2 bg-white"><Architecture /></div>
            <p className="text-sm text-slate-500 mt-2">
              One local process serves both the API and the page. Python scripts (PDF reading and rendering) are called as child processes; Ollama runs as its own local service.
              No database: runs are folders, memories are append-only files.
            </p>
      </div>
    )
  },
  {
    id: 'about-3',
    tab: 'Tech specs',
    node: (
      <div>
            <h3 className={h3}>Tech specs</h3>
            <div className="space-y-8">
              <Table
                caption="Technology stack" title
                head={['Layer', 'Technology']}
                rows={[
                  ['Page', 'React 19, TypeScript 7, Vite 8, Tailwind CSS 4, lucide icons'],
                  ['Server', 'Node.js (24 here; 22 or newer), Express 4 (run with tsx), playwright-core for the SSO window (installed Edge or Chrome, throw-away profile)'],
                  ['PDF reading and rendering', 'Python 3.13 with PyMuPDF (text, layout, legends) and a BOM PDF renderer; scripts in claude-projects/bom-generation'],
                  ['Source data', 'PDAM (Nuxeo): read-only NXQL through Document.Query; Material documents carry supplier, article and status'],
                  ['AI, local', 'Ollama 0.40 at 127.0.0.1:11434: granite3.3:2b and qwen2.5:7b (chat), nomic-embed-text (embeddings), granite3.2-vision:2b (opt-in vision)'],
                  ['AI, hosted (fallback)', 'OpenRouter, Anthropic, OpenAI, Gemini, Groq, Cerebras, Mistral; keys are tried in your order, each key with your chosen models in turn; a key out of credits is skipped'],
                  ['Storage', 'Folders per run (golden-dataset/<style>/ with plugin JSON, sketch.pdf), a fixed snapshot link per environment, memory/*.jsonl, optional DPAPI-encrypted key file'],
                ]}
              />
              <Table
                caption="Server components" title
                head={['Component', 'Responsibility']}
                rows={[
                  [<Code key="a">routes.ts</Code>, 'HTTP API, sessions, the enrichment pipeline entry points'],
                  [<Code key="b">harvest.ts · store.ts</Code>, 'Live harvest from PDAM; saved runs and the pinned snapshot, draft handling'],
                  [<Code key="c">bom.ts</Code>, 'Dev object rows → BOM and Flex payload; applies lookup, history, AI picks and edits with provenance'],
                  [<Code key="d">catalog.ts</Code>, 'PDAM Material catalog lookup (article, then name), 10-minute cache, scores 100% / 80% / 0%'],
                  [<Code key="e">pdfread.ts · legend.ts</Code>, 'Sketch PDF reading, reconciliation with plugin rows, AI legend structuring with redaction and grounding'],
                  [<Code key="f">ai.ts · aikey.ts · local.ts · aicalls.ts</Code>, 'Local-first model order with fallback, key handling, Ollama client, per-call record'],
                  [<Code key="g">corrections.ts · rag.ts</Code>, 'Append-only corrections; retrieval ladder exact → normalised → lexical (trigram) → embedding (cosine ≥ 0.82)'],
                  [<Code key="h">pdam.ts · sso.ts</Code>, 'PDAM client with token cache; SSO → token → cookie sign-in, remembered per environment'],
                ]}
              />
              <Table
                caption="Environment variables" title
                head={['Variable', 'Purpose']}
                rows={[
                  [<Code key="1">HARVEST_SCRIPT_DIR</Code>, 'Folder with config.json and the Python scripts'],
                  [<Code key="2">PYTHON</Code>, 'Python program used for the PDF scripts'],
                  [<Code key="3">LOCAL_MODEL</Code>, 'Use this installed local model (wins over the Settings choice)'],
                  [<Code key="4">AI_LOCAL=off</Code>, 'Never use the local model'],
                  [<Code key="5">OLLAMA_HOST</Code>, 'Address of Ollama when it is not the usual one on this computer'],
                  [<Code key="6">LOCAL_EMBED_MODEL</Code>, 'Embedding model for finding past corrections (default nomic-embed-text)'],
                  [<Code key="7">AI_PROVIDER</Code>, 'Which hosted provider is tried first'],
                  [<Code key="8">OPENROUTER_API_KEY</Code>, <>OpenRouter key. Optional model: <Code>OPENROUTER_MODEL</Code></>],
                  [<Code key="9">GROQ_API_KEY</Code>, <>Groq key. Optional model: <Code>GROQ_MODEL</Code></>],
                  [<Code key="10">CEREBRAS_API_KEY</Code>, <>Cerebras key. A model is required: <Code>CEREBRAS_MODEL</Code></>],
                  [<Code key="11">MISTRAL_API_KEY</Code>, <>Mistral key. Optional model: <Code>MISTRAL_MODEL</Code></>],
                  [<Code key="12">GEMINI_API_KEY</Code>, <>Google Gemini key. Optional model: <Code>GEMINI_MODEL</Code></>],
                  [<Code key="13">ANTHROPIC_API_KEY</Code>, <>Anthropic key. Optional model: <Code>ANTHROPIC_MODEL</Code></>],
                  [<Code key="14">OPENAI_API_KEY</Code>, <>OpenAI key. A model is required: <Code>OPENAI_MODEL</Code></>],
                ]}
              />
              <p className="text-sm text-slate-500">Keys can also be entered on the Settings page; one set in the environment takes priority over a saved one.</p>
            </div>
      </div>
    )
  },
  {
    id: 'about-4',
    tab: 'AI policy',
    node: (
      <div>
            <h3 className={h3}>AI policy</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              <li><b>You set the order.</b> Hosted keys are tried in your order, key by key; for each key every chosen model is tried in turn, and a key that is out of credits is skipped. The local model answers first only if Settings say so AND it is big enough for the job (default 4 GB); otherwise it is the last resort. A local model that will not fit in free RAM is skipped for a smaller one.</li>
              <li><b>On demand and suggest-only.</b> Nothing is applied unless ticked; the model can only choose among PDAM's candidates, and legend values must appear in the page text.</li>
              <li><b>Redaction.</b> Text sent to a hosted model has people, emails and similar identifiers removed; local calls send nothing off this computer.</li>
              <li><b>Vision is off by default.</b> A check of 25 distinct PDFs (346 pages) found no image-only page, so text readers cover them; a local vision model is installed for experiments only.</li>
              <li><b>Every call is recorded</b> (time, model, success, rows, free RAM) so choices rest on measurements.</li>
            </ul>
      </div>
    )
  },
  {
    id: 'about-5',
    tab: 'Security',
    node: (
      <div>
            <h3 className={h3}>Security and privacy</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              <li>PDAM access is read-only; the app never writes to PDAM or publishes to Flex.</li>
              <li>Secrets live in server memory only: PDAM tokens and cookies are never logged or returned to the page. A key entered in the page is optionally saved encrypted for this Windows user (DPAPI).</li>
              <li>The server listens on 127.0.0.1 only. Sign-in uses SSO in a throw-away browser profile on every run.</li>
              <li>The memory files hold material names and supplier values from PDAM (internal data); the call record holds none.</li>
            </ul>
      </div>
    )
  },
  {
    id: 'about-6',
    tab: 'Run & test',
    node: (
      <div>
            <h3 className={h3}>Run, test, monitor</h3>
            <Table
              caption="Commands" title
              head={['Command', 'What it does']}
              rows={[
                [<Code key="1">npm run dev</Code>, 'Start the server and the page at http://127.0.0.1:3000 (in the project folder)'],
                [<Code key="2">npm run lint</Code>, 'Type-check the whole app'],
                [<Code key="3">npm run check:parity</Code>, 'Compare the BOM output with the reference OmniTechPack BOM'],
                [<Code key="4">python -m unittest test_build_tech_engine_input test_corpus_report</Code>, 'Python tests (in the bom-generation folder)'],
                [<Code key="5">GET /api/ai/calls/summary</Code>, 'AI timings and failures per model'],
                [<Code key="6">GET /api/corrections/summary</Code>, 'How much the corrections memory holds'],
                [<Code key="7">ollama list · ollama ps</Code>, 'Installed and currently loaded local models'],
              ]}
            />
      </div>
    )
  },
  {
    id: 'about-7',
    tab: 'Limits',
    node: (
      <div>
            <h3 className={h3}>Known limits and open questions</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              <li>Flex's exact payload and the handling of in-development materials are not agreed; they are processed here like the others and shown struck through.</li>
              <li>Plugin placement codes (Self, CONT1…) are sent unconverted; the mapping to names such as "Contrast 1" has no known source.</li>
              <li>PDAM catalog queries are slow on UAT and PREPROD (3–57 s each); PROD data has not been checked.</li>
              <li>Small local models fill in answers but rate their own confidence poorly; treat their scores as unreliable until measured against corrected BOMs.</li>
              <li>OCR is not installed; scanned pages would need it (or vision).</li>
              <li>Without a GPU, vision and larger models are slow; images and video generation are out of scope for this machine.</li>
            </ul>
      </div>
    )
  },
  {
    id: 'about-8',
    tab: 'Roadmap',
    node: (
      <div>
            <h3 className={h3}>Roadmap</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              <li>Run on many styles (hundreds of PDFs) in batches and report success and time per style.</li>
              <li>Wire fuzzy history (RAG) into screen 3 as suggestions; exact matches keep applying automatically.</li>
              <li>Compare against OmniTechPack's exported BOMs once corrected BOMs are available, and set the success target from that.</li>
              <li>Settle model choices from the recorded call data; add more hosted fallbacks only where a local model falls short.</li>
            </ul>
      </div>
    )
  },
];

export const AboutPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [tab, setTab] = useState(0);
  const touched = useRef(false); // a tab the person chose is not overridden when the settings arrive
  useEffect(() => {
    void loadSettingsOnce().then((s) => {
      if (s && !touched.current && Number.isInteger(s.display.aboutTab) && s.display.aboutTab >= 0 && s.display.aboutTab < SECTIONS.length) setTab(s.display.aboutTab);
    });
  }, []);
  const choose = (i: number) => {
    touched.current = true;
    const next = (i + SECTIONS.length) % SECTIONS.length;
    setTab(next);
    document.getElementById(`about-tab-${next}`)?.focus();
  };
  return (
    <section className={`${card} overflow-hidden`} aria-labelledby="about-title">
      <div className="flex items-center gap-2 px-4 py-3">
        <h2 id="about-title" className="text-sm font-bold text-slate-900">About</h2>
        <span className="text-xs text-slate-500">objective, architecture, tech specs, security, roadmap</span>
        <button type="button" onClick={onClose} aria-label="Close" className="ml-auto p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {(
        <div id="about-body" className="border-t border-slate-100">
          <div role="tablist" aria-label="About" className="flex gap-1 overflow-x-auto overflow-y-hidden px-3 pt-2 border-b border-slate-200">
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                id={`about-tab-${i}`}
                role="tab"
                type="button"
                aria-selected={tab === i}
                aria-controls={`about-panel-${i}`}
                tabIndex={tab === i ? 0 : -1}
                onClick={() => choose(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') { e.preventDefault(); choose(i + 1); }
                  else if (e.key === 'ArrowLeft') { e.preventDefault(); choose(i - 1); }
                  else if (e.key === 'Home') { e.preventDefault(); choose(0); }
                  else if (e.key === 'End') { e.preventDefault(); choose(SECTIONS.length - 1); }
                }}
                className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-t-md ${
                  tab === i ? 'border-sky-600 text-sky-800 font-semibold' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {s.tab}
              </button>
            ))}
          </div>
          <div id={`about-panel-${tab}`} role="tabpanel" aria-labelledby={`about-tab-${tab}`} tabIndex={0} className="px-6 py-6 focus:outline-none [&_p]:max-w-3xl [&_ul]:max-w-3xl [&_ul]:space-y-2.5 [&_li]:leading-7 [&_h3]:mb-3">
            {SECTIONS[tab].node}
          </div>
        </div>
      )}
    </section>
  );
};
