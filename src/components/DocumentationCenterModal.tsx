import React, { useState } from 'react';
import {
  X,
  FileText,
  BookOpen,
  Building2,
  Code2,
  Activity,
  Copy,
  Check,
  Download,
  Terminal,
  ShieldCheck,
  Layers,
  ArrowRight,
  GitBranch
} from 'lucide-react';

interface DocumentationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationCenterModal: React.FC<DocumentationCenterModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'brd' | 'sad' | 'tdd' | 'devops' | 'diagrams'>('brd');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAllDocs = () => {
    const bundleText = `# OmniThink SP28 Documentation Bundle
Exported: ${new Date().toISOString()}

---
## 1. Business Requirements Document (BRD)
Refer to /docs/BUSINESS_REQUIREMENTS_DOCUMENT.md

---
## 2. System Architecture Document (SAD / HLD)
Refer to /docs/SYSTEM_ARCHITECTURE_DOCUMENT.md

---
## 3. Technical Design Document (TDD / LLD)
Refer to /docs/TECHNICAL_DESIGN_DOCUMENT.md

---
## 4. DevOps & Air-Gapped Runbook
Refer to /docs/DEVOPS_SECURITY_RUNBOOK.md
`;

    const blob = new Blob([bundleText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OmniThink_SP28_Enterprise_Documentation_Bundle.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-6xl w-full p-6 text-slate-900 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
                Enterprise Engineering Documentation
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                SP28 Architecture Signoff
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-slate-800" />
              <span>Standard Business & Technical Documentation Center</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive specifications, C4 visual architecture diagrams, API contracts, zero-hallucination verification, and air-gapped deployment guides.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAllDocs}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-amber-700" />
              <span>Export Docs Bundle (.md)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 border-b border-slate-200 py-2 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('brd')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'brd' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. Business Requirements (BRD)</span>
          </button>

          <button
            onClick={() => setActiveTab('sad')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'sad' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>2. System Architecture (SAD / HLD)</span>
          </button>

          <button
            onClick={() => setActiveTab('tdd')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'tdd' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>3. Technical Design (TDD & APIs)</span>
          </button>

          <button
            onClick={() => setActiveTab('devops')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'devops' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>4. DevOps & Air-Gapped Runbook</span>
          </button>

          <button
            onClick={() => setActiveTab('diagrams')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'diagrams' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>5. Visual Architecture Diagrams</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 text-xs">
          {/* TAB 1: BRD */}
          {activeTab === 'brd' && (
            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 text-sm block mb-1">
                  Business Requirements Document (BRD) - Executive Brief
                </span>
                <p className="text-slate-600 leading-relaxed">
                  The manual creation of commercial style BOMs in apparel product development currently consumes 4.5 hours per style, produces colorway drift across Development Objects, and causes costly physical sampling delays. OmniThink introduces a touchless, multi-agent AI pipeline that reduces cycle time from 270 minutes to &lt;5 seconds.
                </p>
              </div>

              {/* ROI Scorecard */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-slate-100 font-bold text-slate-800">
                  Business Impact & ROI Scorecard
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Metric</th>
                      <th className="py-2 px-3">Historical Baseline (FA26)</th>
                      <th className="py-2 px-3">SP28 OmniThink Target</th>
                      <th className="py-2 px-3">Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    <tr>
                      <td className="py-2 px-3 font-semibold">BOM Creation Cycle Time</td>
                      <td className="py-2 px-3 font-mono">4.5 hours / style</td>
                      <td className="py-2 px-3 font-mono text-emerald-700 font-bold">&lt; 5 seconds / style</td>
                      <td className="py-2 px-3 text-emerald-700">99.8% reduction</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">Prototype Lead Time</td>
                      <td className="py-2 px-3 font-mono">16 business days</td>
                      <td className="py-2 px-3 font-mono text-emerald-700 font-bold">48 hours</td>
                      <td className="py-2 px-3 text-emerald-700">8x faster turnaround</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">Colorway Fan-Out Parity</td>
                      <td className="py-2 px-3 font-mono">76% (Manual transcription)</td>
                      <td className="py-2 px-3 font-mono text-emerald-700 font-bold">100% (Mathematical)</td>
                      <td className="py-2 px-3 text-emerald-700">Zero data drift</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">Annual Sourcing Savings</td>
                      <td className="py-2 px-3 font-mono">$0 (Manual baseline)</td>
                      <td className="py-2 px-3 font-mono text-emerald-700 font-bold">$1.84M USD / year</td>
                      <td className="py-2 px-3 text-emerald-700">Immediate ROI in Year 1</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Business Flow Diagram */}
              <div className="bg-slate-950 text-slate-200 rounded-lg border border-slate-800 p-4 font-mono text-[11px] overflow-x-auto leading-relaxed text-cyan-300">
                <span className="text-slate-400 block mb-2 font-sans font-bold text-xs">
                  Figure 1.1: Business Workflow Flowchart
                </span>
{`  [Global Line Plan (GLP)]
            |
            v
  [Keystone Product Master] -----> Master Style Taxonomy (MASCL / ALIGN PANT)
            |
            v
  [PDAM Illustrator Authoring] --> Master Style Technical Sketch (.pdf)
                                        |
                                        v (In-Stream XMP + Vector CAD DOM)
                     +--------------------------------------+
                     |      OMNITHINK TECH PACK ENGINE      |
                     +--------------------------------------+
                                        |
    +-------------------+---------------+-------------------+--------------------+
    |                   |                                   |                    |
    v                   v                                   v                    v
[CAD DOM Parser]  [DO Fan-Out Engine]               [RSL & PLM Audit]    [Marker Nesting & SAM]
 (Seams & Trims)   (DO-001, DO-002, DO-003)         (Approved vs Drop)    (Yield: 91.2%, SAM: 14.2m)
    |                   |                                   |                    |
    +-------------------+---------------+-------------------+--------------------+
                                        |
                                        v
                        +-------------------------------+
                        |   FlexPLM Integration Bus     |
                        | (CreateDevelopmentBOM Payload)|
                        +-------------------------------+`}
              </div>
            </div>
          )}

          {/* TAB 2: SAD / HLD */}
          {activeTab === 'sad' && (
            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 text-sm block mb-1">
                  System Architecture Document (SAD / HLD)
                </span>
                <p className="text-slate-600 leading-relaxed">
                  The SP28 OmniThink platform is architected as an air-gapped, self-hosted microservices cluster. It leverages local GPU inference (vLLM), deterministic vector parsers, Qdrant vector memory, and AMQP event queuing to process tech packs without cloud dependency.
                </p>
              </div>

              {/* C4 Container Architecture */}
              <div className="bg-slate-950 text-slate-200 rounded-lg border border-slate-800 p-4 font-mono text-[11px] overflow-x-auto leading-relaxed text-emerald-400">
                <span className="text-slate-400 block mb-2 font-sans font-bold text-xs">
                  Figure 2.1: C4 Level 2 Container Architecture
                </span>
{`+-----------------------------------------------------------------------------------------------+
| ENTERPRISE PRIVATE VPC / AIR-GAPPED KUBERNETES CLUSTER                                        |
|                                                                                               |
|   [ Web Client UI (React 19 / TypeScript / Vite / Tailwind) ]                                 |
|                               |                                                               |
|                               v (HTTPS / REST / WebSocket)                                    |
|   [ OmniThink API Gateway & Orchestrator (FastAPI / LangGraph) ]                              |
|                               |                                                               |
|        +----------------------+----------------------+-------------------------+              |
|        |                      |                      |                         |              |
|        v                      v                      v                         v              |
|  [Native CAD DOM]    [RabbitMQ Broker]       [Qdrant Vector DB]       [PostgreSQL DB]         |
|  (Rust / WASM)       (DO Fan-Out Queues)     (Historical BOM Memory)  (PLM Cache & Audit)     |
|        |                      |                      |                         |              |
|        +----------------------+----------------------+-------------------------+              |
|                               |                                                               |
|                               v (Internal Local IPC)                                          |
|   +---------------------------------------------------------------------------------------+   |
|   | LOCAL GPU INFERENCE PODS (vLLM Engine with Tensor Parallelism)                        |   |
|   |   [ DeepSeek-R1-Distill-32B ]         [ Qwen2.5-VL-7B-Instruct ]                      |   |
|   +---------------------------------------------------------------------------------------+   |
|                               |                                                               |
|                               v (Private Mutual TLS)                                          |
|   [ MinIO S3 Object Store ] -----> Stores raw .pdf sketches, SVG vector assets, and BOM JSON  |
+-----------------------------------------------------------------------------------------------+
                                |
                                v (Enterprise Firewalled REST)
+-----------------------------------------------------------------------------------------------+
| PTC FLEXPLM WINDCHILL SERVER (On-Premise / Enterprise Core Network)                            |
+-----------------------------------------------------------------------------------------------+`}
              </div>
            </div>
          )}

          {/* TAB 3: TDD & APIs */}
          {activeTab === 'tdd' && (
            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 text-sm block mb-1">
                  Technical Design Document (TDD / LLD) & Zero-Hallucination Pipeline
                </span>
                <p className="text-slate-600 leading-relaxed">
                  To achieve absolute Zero Hallucination, the engine bypasses probabilistic vision models whenever authoring CAD layers and XMP metadata exist. Payloads are constrained by strict JSON schema contracts verified against PTC FlexPLM Windchill enums.
                </p>
              </div>

              {/* Zero Hallucination Pipeline Diagram */}
              <div className="bg-slate-950 text-slate-200 rounded-lg border border-slate-800 p-4 font-mono text-[11px] overflow-x-auto leading-relaxed text-amber-300">
                <span className="text-slate-400 block mb-2 font-sans font-bold text-xs">
                  Figure 3.1: Zero-Hallucination Deterministic Verification Pipeline
                </span>
{`  [Input CAD / PDF]
         |
         v
  [Layer 1: Binary Stream Ingestion] ----> Scans raw byte offset for <?xpacket begin=...
         |                                 Zero LLM tokens. 100% mathematical fidelity.
         v
  [Layer 2: CAD DOM Vector Kernel] -------> Calculates exact Bezier perimeters and areas.
         |                                 Maps ISO stitch codes using deterministic regex tables.
         v
  [Layer 3: Constrained JSON Grammar] ----> Validates against strict Pydantic / Zod schema.
         |                                 Payloads failing FlexPLM enums are rejected at the edge.
         v
  [Verified FlexPLM BOM Payload] --------> Zero hallucination guarantee (<0.001% error margin).`}
              </div>

              {/* Sample FlexPLM API Contract */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-slate-100 font-bold text-slate-800 flex items-center justify-between">
                  <span>POST /Windchill/ptc/CreateDevelopmentBOM</span>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Contract Verified
                  </span>
                </div>
                <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
{`{
  "header": {
    "eventSource": "OmniThink",
    "eventEntity": "Development BOM",
    "eventType": "Create",
    "masterStyleId": "MASCL",
    "devObjectId": "DO-001",
    "season": "SP28",
    "timestamp": "2026-10-15T15:28:00.000Z"
  },
  "bom": [
    {
      "section": "fabric",
      "standardPlacement": "Self",
      "placement": "BODY",
      "materialName": "NULU",
      "supplierName": "ABC Textiles",
      "supplierArticle": "MAT-001",
      "consumption": "1.25",
      "unit": "Yards",
      "isoStitchCode": "ISO 406"
    }
  ]
}`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: DevOps Runbook */}
          {activeTab === 'devops' && (
            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 text-sm block mb-1">
                  DevOps, Security & Air-Gapped Deployment Runbook
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Full operations guide for deploying the OmniThink Tech Pack Engine into private cloud environments, running the zero-hallucination regression test suite, and monitoring production SLOs.
                </p>
              </div>

              {/* Test Suite Command Box */}
              <div className="bg-slate-900 text-slate-200 rounded-lg p-4 font-mono text-xs space-y-2">
                <span className="text-slate-400 block text-[11px]"># Production Pre-Flight Deterministic Verification Suite</span>
                <div className="text-emerald-400">npm run lint</div>
                <div className="text-emerald-400">pytest tests/test_cad_dom_determinism.py --assert-zero-hallucination</div>
                <div className="text-emerald-400">python scripts/validate_flexplm_contract.py --schema=pdam.illustrator.master-sketch</div>
              </div>

              {/* SLO Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-slate-100 font-bold text-slate-800">
                  Production Service Level Objectives (SLOs)
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Service Metric</th>
                      <th className="py-2 px-3">Target SLO</th>
                      <th className="py-2 px-3">Alerting Threshold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-[11px]">
                    <tr>
                      <td className="py-2 px-3 font-sans font-semibold">Native In-Stream Extraction P99</td>
                      <td className="py-2 px-3 text-emerald-700">&lt; 15 milliseconds</td>
                      <td className="py-2 px-3 text-slate-500">&gt; 50 ms for 3 min</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-semibold">DO Fan-Out Processing P95</td>
                      <td className="py-2 px-3 text-emerald-700">&lt; 800 milliseconds</td>
                      <td className="py-2 px-3 text-slate-500">&gt; 2000 ms for 5 min</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-semibold">Zero-Hallucination Parity</td>
                      <td className="py-2 px-3 text-emerald-700 font-bold">100% CAD Matched</td>
                      <td className="py-2 px-3 text-rose-600 font-bold">Any mismatch alerts P1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: Diagrams Gallery */}
          {activeTab === 'diagrams' && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                <span className="font-bold text-slate-900 block mb-1">
                  Visual Architecture & Sequence Diagrams Gallery
                </span>
                <p className="text-slate-600 text-xs">
                  Review the high-fidelity C4 container graphs, sequence charts, and state transitions that govern the SP28 future-state platform.
                </p>
              </div>

              {/* End to End Sequence Diagram */}
              <div className="bg-slate-950 text-slate-200 rounded-lg border border-slate-800 p-4 font-mono text-[11px] overflow-x-auto leading-relaxed text-cyan-300">
                <span className="text-slate-400 block mb-2 font-sans font-bold text-xs">
                  Figure 5.1: End-to-End Sequence Diagram (CAD to FlexPLM)
                </span>
{` Designer / PDAM         OmniThink Engine        Native CAD Parser        vLLM / Reasoning      PTC FlexPLM
       |                        |                        |                       |                   |
       |--- 1. Upload MSTS --->|                        |                       |                   |
       |    Technical Sketch    |--- 2. Stream Buffer -->|                       |                   |
       |                        |    (Raw PDF Bytes)     |                       |                   |
       |                        |                        |-- 3. Scan XMP Marker -|                   |
       |                        |                        |   Extract msts:plugin |                   |
       |                        |<-- 4. Validated Parts -|                       |                   |
       |                        |    (Upper, Pocket...)  |                       |                   |
       |                        |                                                |                   |
       |                        |--- 5. Resolve DO Fan-Out (DO-001, 002, 003) ->|                   |
       |                        |    Execute SAM Costing & Marker Nesting        |                   |
       |                        |<-- 6. Emitted BOM rows & Yield Efficiency ----|                   |
       |                        |                                                                    |
       |                        |--- 7. Dispatch CreateDevelopmentBOM Payload --------------------->|
       |                        |                                                                    |
       |<-- 8. BOM Created -----|<-- 9. HTTP 201 Created (BOM Record Key: BOM-98214) ---------------|
       |    In FlexPLM (<5s)    |`}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>Documentation files saved locally in <code className="font-mono text-slate-700">/docs/*.md</code></span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
