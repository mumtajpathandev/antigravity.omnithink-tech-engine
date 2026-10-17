import React, { useState } from 'react';
import { useTechPack } from '../context/TechPackContext';
import {
  X,
  Cpu,
  Server,
  Layers,
  ShieldCheck,
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Terminal,
  Activity,
  DollarSign,
  TrendingUp,
  Sliders,
  Sparkles,
  GitBranch,
  Lock,
  ArrowRight
} from 'lucide-react';
import {
  AGENT_TOPOLOGY_NODES,
  SELF_HOSTED_DOCKER_COMPOSE_YML,
  calculateHardwarePlan
} from '../data/agenticData';
import { AgentRole, AgentExecutionStep } from '../types/agentic';
import { StageDataFlowVisualizer } from './StageDataFlowVisualizer';

interface AgenticArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgenticArchitectureModal: React.FC<AgenticArchitectureModalProps> = ({
  isOpen,
  onClose
}) => {
  const { selectedMasterStyle } = useTechPack();

  const [activeTab, setActiveTab] = useState<'topology' | 'live_simulation' | 'docker_compose' | 'hardware_calculator' | 'd3_stage_flow'>('topology');
  const [selectedAgentId, setSelectedAgentId] = useState<AgentRole>('Supervisor');
  const [autonomyMode, setAutonomyMode] = useState<'autonomous' | 'copilot' | 'deterministic'>('copilot');
  const [copied, setCopied] = useState(false);

  // Live simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSimIndex, setActiveSimIndex] = useState<number>(-1);
  const [simSteps, setSimSteps] = useState<AgentExecutionStep[]>([]);

  // Hardware sizing calculator state
  const [stylesPerDay, setStylesPerDay] = useState<number>(120);
  const [concurrency, setConcurrency] = useState<number>(4);

  if (!isOpen) return null;

  const hardwarePlan = calculateHardwarePlan(stylesPerDay, concurrency);
  const activeAgent = AGENT_TOPOLOGY_NODES.find((a) => a.id === selectedAgentId) || AGENT_TOPOLOGY_NODES[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runMultiAgentPipeline = () => {
    setIsSimulating(true);
    setActiveSimIndex(0);
    setSimSteps([]);

    const stepsToRun: AgentExecutionStep[] = [
      {
        agent: 'Supervisor',
        agentName: 'OmniThink Multi-Agent Orchestrator',
        timestamp: '00:00.012',
        action: 'Ingest Trigger & Graph Initialization',
        detail: `Received CAD document package for ${selectedMasterStyle.name} (${selectedMasterStyle.masterStyleId}). Initialized LangGraph state machine.`,
        inputSummary: `MasterStyle: ${selectedMasterStyle.masterStyleId}, Season: ${selectedMasterStyle.season}`,
        outputSummary: 'Dispatched to IngestionAgent & GeometryAgent in parallel',
        confidence: 0.99,
        tokensConsumed: 0,
        durationMs: 4,
        status: 'success'
      },
      {
        agent: 'IngestionAgent',
        agentName: 'CAD & PDF Ingestion Agent',
        timestamp: '00:00.038',
        action: 'Native In-Stream XMP Parsing',
        detail: 'Scanned binary PDF byte buffer. Found msts:pluginData at byte offset 0x000150. Parsed 3 parts without token latency.',
        inputSummary: 'Binary PDF Stream (2.8 MB)',
        outputSummary: 'Extracted: Upper (Fabric), Waistband (Fabric), Pocket (Trim)',
        confidence: 1.0,
        tokensConsumed: 0,
        durationMs: 2,
        status: 'success'
      },
      {
        agent: 'GeometryAgent',
        agentName: 'Pattern Geometry & Seam Agent',
        timestamp: '00:00.092',
        action: 'Bezier Seam & Stitch Classification',
        detail: 'Calculated 157.7 cm perimeter for Upper leg panels. Classified stroke dash to ISO 406 4-Thread Flatlock.',
        inputSummary: 'Vector CAD Paths & Bezier Anchors',
        outputSummary: 'Surface Area: 1420 cm², Seam allowance: 0.6cm, ISO 406 Flatlock',
        confidence: 0.98,
        tokensConsumed: 0,
        durationMs: 14,
        status: 'success'
      },
      {
        agent: 'MaterialResolutionAgent',
        agentName: 'DO Fan-Out & Sourcing Agent',
        timestamp: '00:00.280',
        action: 'Development Object Parallel Fan-Out',
        detail: `Resolved 3 Development Objects (DO-001 Black, DO-002 Bright, DO-003 Print). Mapped NULU (MAT-001) and Power Mesh (MAT-002).`,
        inputSummary: 'Master Style + Parts Spec',
        outputSummary: 'Generated 3 independent FlexPLM BOM branch payloads',
        confidence: 0.94,
        tokensConsumed: 420,
        durationMs: 180,
        status: 'success'
      },
      {
        agent: 'ComplianceValidationAgent',
        agentName: 'FlexPLM Rules & RSL Agent',
        timestamp: '00:00.320',
        action: 'Material Lifecycle & RSL Audit',
        detail: 'Validated NULU (Approved). Flagged Power Mesh as In Development (Non-blocking). Verified OEKO-TEX Standard 100 compliance.',
        inputSummary: 'Fan-Out BOM Payloads (DO-001 to DO-003)',
        outputSummary: 'Status: PASS with 1 advisory warning (Pocket Bag)',
        confidence: 0.97,
        tokensConsumed: 110,
        durationMs: 28,
        status: 'warning'
      },
      {
        agent: 'CostingEngineeringAgent',
        agentName: 'Cut Yield & Costing SAM Agent',
        timestamp: '00:00.410',
        action: '2D Marker Nesting & Labor Estimation',
        detail: 'Simulated 58" roll cut marker. Yield: 91.2% efficiency (8.8% scrap). Calculated Standard Allowed Minutes: 14.2 min.',
        inputSummary: 'Pattern Geometries & Supplier Yardage Rates',
        outputSummary: 'Estimated FOB: $24.86 vs Target FOB: $23.62 (+5.2% variance)',
        confidence: 0.92,
        tokensConsumed: 260,
        durationMs: 65,
        status: 'success'
      },
      {
        agent: 'ContinuousLearningAgent',
        agentName: 'Memory & Learning Loop Agent',
        timestamp: '00:00.480',
        action: 'Vector RAG Query & Replay Indexing',
        detail: 'Indexed current tech pack in local Qdrant memory. Retrieved ALIGN PANT SP27 (92% structural similarity) to calibrate seam allowances.',
        inputSummary: 'Final Consolidated Tech Pack Payload',
        outputSummary: 'Persisted to Qdrant vector memory. Confidence baseline elevated to 88%.',
        confidence: 0.96,
        tokensConsumed: 85,
        durationMs: 35,
        status: 'success'
      },
      {
        agent: 'Supervisor',
        agentName: 'OmniThink Multi-Agent Orchestrator',
        timestamp: '00:00.510',
        action: 'Final Consensus Evaluation & FlexPLM Dispatch',
        detail: 'All specialized agents reached consensus. Global confidence 0.95 exceeds co-pilot threshold (0.90). Payload dispatched to FlexPLM.',
        inputSummary: 'All Agent Sub-Payloads',
        outputSummary: 'FlexPLM REST Event: CreateDevelopmentBOM dispatched successfully',
        confidence: 0.95,
        tokensConsumed: 120,
        durationMs: 12,
        status: 'success'
      }
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < stepsToRun.length) {
        setSimSteps((prev) => [...prev, stepsToRun[current]]);
        setActiveSimIndex(current);
        setSelectedAgentId(stepsToRun[current].agent);
        current++;
      } else {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 450);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-6xl w-full p-6 text-slate-900 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
                Self-Hosted Agentic AI Architecture
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                100% Private VPC / Air-Gapped
              </span>
              <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Zero 3rd-Party SaaS Calls
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <Server className="w-5 h-5 text-slate-800" />
              <span>OmniThink Private Multi-Agent PLM Engine</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulating an enterprise on-premise deployment: DeepSeek-R1 reasoning + Qwen2.5-VL perception served via local vLLM, Qdrant vector memory, and LangGraph orchestration.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 py-2 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('topology')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'topology' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>1. Multi-Agent DAG Topology</span>
          </button>

          <button
            onClick={() => setActiveTab('live_simulation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'live_simulation' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
            <span>2. Live Multi-Agent Simulation</span>
            {simSteps.length > 0 && (
              <span className="ml-1 text-[10px] bg-emerald-700 text-white px-1.5 py-0.2 rounded-full">
                {simSteps.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('docker_compose')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'docker_compose' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>3. Self-Hosted Docker Compose Stack</span>
          </button>

          <button
            onClick={() => setActiveTab('hardware_calculator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'hardware_calculator' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>4. Hardware Sizing & TCO Savings</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* TAB 1: Multi-Agent DAG Topology */}
          {activeTab === 'topology' && (
            <div className="space-y-6">
              {/* Agent Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {AGENT_TOPOLOGY_NODES.map((agent) => {
                  const isSelected = selectedAgentId === agent.id;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                          {agent.category}
                        </span>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}>
                          {agent.vramRequirementGb > 0 ? `${agent.vramRequirementGb}GB VRAM` : '0GB (CPU Math)'}
                        </span>
                      </div>

                      <h4 className={`text-xs font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {agent.name}
                      </h4>
                      <span className={`text-[11px] font-mono block mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {agent.modelEngine}
                      </span>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/40 flex flex-wrap gap-1">
                        {agent.tools.slice(0, 3).map((tool) => (
                          <span
                            key={tool}
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Inspector for selected agent */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs uppercase font-mono text-slate-400 font-semibold">
                      Agent Profile & Tool Execution Contract
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {activeAgent.name} ({activeAgent.id})
                    </h3>
                  </div>
                  <span className="text-xs font-mono bg-white px-2.5 py-1 rounded border border-slate-200 text-slate-700">
                    Runtime: {activeAgent.selfHostedRuntime}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-slate-700 block mb-2">Core Responsibilities:</span>
                    <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                      {activeAgent.responsibilities.map((r, i) => (
                        <li key={i} className="leading-relaxed">{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700 block mb-2">Internal Tool APIs:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeAgent.tools.map((tool) => (
                        <span key={tool} className="font-mono text-[11px] bg-white border border-slate-200 px-2 py-1 rounded text-slate-800">
                          {tool}()
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 p-3 rounded bg-white border border-slate-200 text-[11px] text-slate-600">
                      <strong>Air-Gapped Privacy Guarantee:</strong> All vector operations and LLM tokens execute strictly within your local GPU compute node. No proprietary sketch curves or supplier pricing ever egresses your VPC.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Live Multi-Agent Simulation */}
          {activeTab === 'live_simulation' && (
            <div className="space-y-4">
              {/* Simulation Controls */}
              <div className="bg-slate-900 text-white p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">Target Style: {selectedMasterStyle.name} ({selectedMasterStyle.masterStyleId})</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      {selectedMasterStyle.season}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Watch the 6 specialized self-hosted agents collaborate in real-time to parse CAD, resolve DOs, validate RSL, and generate FlexPLM payloads.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 p-0.5 bg-slate-800 rounded text-xs font-mono">
                    <button
                      onClick={() => setAutonomyMode('autonomous')}
                      className={`px-2 py-1 rounded cursor-pointer ${autonomyMode === 'autonomous' ? 'bg-white text-slate-900 font-bold' : 'text-slate-400'}`}
                    >
                      Autonomous
                    </button>
                    <button
                      onClick={() => setAutonomyMode('copilot')}
                      className={`px-2 py-1 rounded cursor-pointer ${autonomyMode === 'copilot' ? 'bg-white text-slate-900 font-bold' : 'text-slate-400'}`}
                    >
                      Co-Pilot
                    </button>
                    <button
                      onClick={() => setAutonomyMode('deterministic')}
                      className={`px-2 py-1 rounded cursor-pointer ${autonomyMode === 'deterministic' ? 'bg-white text-slate-900 font-bold' : 'text-slate-400'}`}
                    >
                      Rules-Only
                    </button>
                  </div>

                  <button
                    onClick={runMultiAgentPipeline}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 fill-current ${isSimulating ? 'animate-spin' : ''}`} />
                    <span>{isSimulating ? 'Executing Graph...' : 'Run Agent Pipeline'}</span>
                  </button>
                </div>
              </div>

              {/* Execution Steps Ticker */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-slate-800" />
                    <span>Multi-Agent Execution Event Stream ({simSteps.length} Steps)</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Mode: {autonomyMode.toUpperCase()}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {simSteps.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Click <strong>"Run Agent Pipeline"</strong> above to observe live state transitions, token counts, and agent consensus.
                    </div>
                  ) : (
                    simSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`p-3 text-xs transition-colors ${
                          idx === activeSimIndex ? 'bg-emerald-50/60' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-[10px] text-slate-400">[{step.timestamp}]</span>
                            <strong className="text-slate-900 font-bold">{step.agentName}</strong>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                              {step.action}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono">
                            <span className="text-slate-500">{step.durationMs}ms</span>
                            <span className="text-emerald-700 font-semibold">{(step.confidence * 100).toFixed(0)}% Conf</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${step.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {step.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-600 mt-1 font-sans">{step.detail}</p>

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 p-2 rounded border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[10px]">INPUT</span>
                            <span className="text-slate-700 truncate block">{step.inputSummary}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">OUTPUT</span>
                            <span className="text-emerald-800 font-semibold truncate block">{step.outputSummary}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Self-Hosted Docker Compose Stack */}
          {activeTab === 'docker_compose' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="font-bold text-slate-800">Air-Gapped Private Stack: docker-compose.self-hosted.yml</span>
                  <p className="text-[11px] text-slate-500">
                    Includes local vLLM (DeepSeek + Qwen-VL), Qdrant vector memory, RabbitMQ event bus, MinIO CAD object store, and FastAPI orchestrator.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(SELF_HOSTED_DOCKER_COMPOSE_YML)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied YAML' : 'Copy docker-compose.yml'}</span>
                </button>
              </div>

              <div className="bg-slate-950 text-slate-200 rounded-lg border border-slate-800 overflow-hidden">
                <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-400 leading-relaxed max-h-96">
                  {SELF_HOSTED_DOCKER_COMPOSE_YML}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: Hardware Sizing & TCO Savings */}
          {activeTab === 'hardware_calculator' && (
            <div className="space-y-6">
              {/* Sliders */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-800">Garment Styles Processed Per Day:</label>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {stylesPerDay} styles/day
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={stylesPerDay}
                    onChange={(e) => setStylesPerDay(Number(e.target.value))}
                    className="w-full accent-slate-900 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Calculates token throughput, vector embedding storage, and concurrent DO fan-outs.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-800">Peak Concurrency Target:</label>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {concurrency} concurrent streams
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    step="1"
                    value={concurrency}
                    onChange={(e) => setConcurrency(Number(e.target.value))}
                    className="w-full accent-slate-900 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Ensures sub-second latency SLA during peak seasonal tech pack deadlines.
                  </span>
                </div>
              </div>

              {/* Hardware Sizing Results */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <span className="text-xs uppercase font-mono text-slate-400 font-semibold block mb-1">
                    Recommended GPU Node
                  </span>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {hardwarePlan.recommendedGpu}
                  </div>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Count: <strong>{hardwarePlan.gpuCount}x</strong> · Total VRAM: <strong>{hardwarePlan.totalVramGb} GB</strong>
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <span className="text-xs uppercase font-mono text-slate-400 font-semibold block mb-1">
                    System Host Resources
                  </span>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {hardwarePlan.systemRamGb} GB RAM · {hardwarePlan.storageFastNvmeGb} GB NVMe
                  </div>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Supports 500k+ historical vector embeddings in Qdrant
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 shadow-xs">
                  <span className="text-xs uppercase font-mono text-emerald-800 font-semibold block mb-1">
                    Enterprise Annual Savings
                  </span>
                  <div className="text-xl font-bold text-emerald-900 font-mono">
                    ${hardwarePlan.annualSavingsUsd.toLocaleString()} / year
                  </div>
                  <span className="text-xs text-emerald-700 mt-1 block">
                    Self-hosted hardware (${hardwarePlan.estimatedMonthlyHardwareCostUsd}/mo) vs Cloud SaaS (${hardwarePlan.cloudSaasEquivalentCostUsd}/mo)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>Enterprise architecture complies with SP28 GTM Evolution and FlexPLM schema standards</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
