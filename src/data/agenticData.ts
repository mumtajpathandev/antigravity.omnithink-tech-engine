import { AgentNode, AgentExecutionStep, SelfHostedHardwarePlan, MarkerNestingSpec, CostingSamBreakdown, EsgCarbonLca } from '../types/agentic';

export const AGENT_TOPOLOGY_NODES: AgentNode[] = [
  {
    id: 'Supervisor',
    name: 'OmniThink Multi-Agent Orchestrator',
    category: 'Core Orchestrator',
    modelEngine: 'DeepSeek-R1-Distill-Qwen-32B (Local vLLM)',
    tools: ['StateGraphEngine', 'HumanInTheLoopGate', 'TaskRouter', 'RollbackManager'],
    responsibilities: [
      'Coordinates end-to-end BOM generation workflow across specialized agents',
      'Evaluates confidence scores (>0.90 auto-approves, <0.90 gates for human sign-off)',
      'Maintains transactional state machine and orchestrates fan-out parallelism'
    ],
    selfHostedRuntime: 'Python 3.11 / LangGraph / Celery Workers',
    vramRequirementGb: 32
  },
  {
    id: 'IngestionAgent',
    name: 'CAD & PDF Ingestion Agent',
    category: 'Perception & CAD',
    modelEngine: 'Native Binary DOM Parser + Qwen2.5-VL-7B (Fallback)',
    tools: ['AdobeXmpParser', 'PdfStreamDecompressor', 'VectorCadDomExtractor', 'SvgBezierTracer'],
    responsibilities: [
      'Scans binary PDF streams for embedded msts:pluginData in 2ms without LLM overhead',
      'Parses Adobe Illustrator XML layers and validates against PDAM schema v1.0.0',
      'Emits validated parts tree (Upper, Waistband, Pocket) into global context'
    ],
    selfHostedRuntime: 'Rust / WebAssembly libai-vector-dom + PyMuPDF',
    vramRequirementGb: 8
  },
  {
    id: 'GeometryAgent',
    name: 'Pattern Geometry & Seam Agent',
    category: 'Perception & CAD',
    modelEngine: 'Geometric Math Solver + ASTM D6959 CAD Core',
    tools: ['BezierPerimeterCalculator', 'IsoStitchClassifier', 'SeamAllowanceSolver', 'GrainlineValidator'],
    responsibilities: [
      'Calculates exact perimeter lengths (cm) and surface areas (cm²) of 2D pattern pieces',
      'Detects stroke dash patterns and assigns ISO stitch codes (ISO 504, ISO 406, ISO 301)',
      'Validates grainline orientation against fabric roll elasticity parameters'
    ],
    selfHostedRuntime: 'C++ Geometry Kernel / Shapely Python Bindings',
    vramRequirementGb: 0
  },
  {
    id: 'MaterialResolutionAgent',
    name: 'DO Fan-Out & Sourcing Agent',
    category: 'PLM & Sourcing',
    modelEngine: 'Llama-3.3-70B-Instruct (4-bit AWQ / vLLM)',
    tools: ['KeystoneCatalogResolver', 'PantoneTcxMatcher', 'DevObjectFanOutEngine', 'SwatchLibrary'],
    responsibilities: [
      'Resolves Master Style into N independent Development Objects (DO-001, DO-002, DO-003)',
      'Maps material article numbers (MAT-001 NULU, MAT-002 Power Mesh) to colorways',
      'Generates Section, Placement, and Standard Placement mappings'
    ],
    selfHostedRuntime: 'FastAPI / RabbitMQ Async Worker Nodes',
    vramRequirementGb: 40
  },
  {
    id: 'ComplianceValidationAgent',
    name: 'FlexPLM Rules & RSL Agent',
    category: 'Cost & Compliance',
    modelEngine: 'Deterministic Rule Engine + Local Embeddings',
    tools: ['FlexPlmRuleInspector', 'RestrictedSubstanceListValidator', 'SupplierTierChecker', 'LifecycleStatusEvaluator'],
    responsibilities: [
      'Verifies material status: Approved (Pass), In Development (Warn), Rejected (Block)',
      'Screens chemicals against ZDHC / OEKO-TEX Standard 100 Restricted Substances Lists',
      'Blocks dropped materials from entering production BOM payloads'
    ],
    selfHostedRuntime: 'Datalog / OPA (Open Policy Agent) + PostgreSQL',
    vramRequirementGb: 4
  },
  {
    id: 'CostingEngineeringAgent',
    name: 'Cut Yield & Costing SAM Agent',
    category: 'Cost & Compliance',
    modelEngine: 'DeepSeek-R1-Reasoning (Cost Optimizer)',
    tools: ['MarkerNestingSolver', 'SamLaborCalculator', 'FobCostAggregator', 'DutyFreightEstimator'],
    responsibilities: [
      'Simulates 2D fabric marker nesting efficiency (89.2% cut yield, 11.8% scrap)',
      'Calculates Standard Allowed Minutes (SAM) and sewing labor cost per garment',
      'Flags margin variance if estimated FOB exceeds target product margin'
    ],
    selfHostedRuntime: 'Linear Programming Solver (GLPK) + Python',
    vramRequirementGb: 16
  },
  {
    id: 'ContinuousLearningAgent',
    name: 'Memory & Learning Loop Agent',
    category: 'Memory & Learning',
    modelEngine: 'BGE-Large-v1.5 + Qdrant Vector DB + LoRA Fine-tuner',
    tools: ['QdrantVectorStore', 'UserFeedbackReplayBuffer', 'PreferenceDpoTrainer', 'HistoricalBomRAG'],
    responsibilities: [
      'Captures user corrections (Power Mesh → Recycled Power Mesh) into persistent vector memory',
      'Embeds 10,000+ historical season tech packs to provide instant historical context',
      'Schedules weekly local LoRA fine-tuning checkpoints to continuously reduce human touch'
    ],
    selfHostedRuntime: 'Qdrant / Milvus + PyTorch PEFT (Private VPC)',
    vramRequirementGb: 24
  }
];

export const SELF_HOSTED_DOCKER_COMPOSE_YML = `# =======================================================================
# SP28 OmniThink Tech Pack Engine - Self-Hosted Air-Gapped Stack
# Privacy: 100% On-Premise / Private Cloud VPC (No external SaaS calls)
# =======================================================================
version: '3.9'

services:
  # -------------------------------------------------------------------
  # 1. Local LLM / VLM Inference Runtime (vLLM with Tensor Parallelism)
  # -------------------------------------------------------------------
  vllm-deepseek-reasoning:
    image: vllm/vllm-openai:latest
    container_name: omnithink-vllm-reasoning
    restart: always
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 2
              capabilities: [gpu]
    environment:
      - MODEL=deepseek-ai/DeepSeek-R1-Distill-Qwen-32B
      - TENSOR_PARALLEL_SIZE=2
      - MAX_MODEL_LEN=8192
      - GPU_MEMORY_UTILIZATION=0.92
    ports:
      - "8001:8000"
    volumes:
      - /opt/omnithink/models:/root/.cache/huggingface

  vllm-qwen-vision:
    image: vllm/vllm-openai:latest
    container_name: omnithink-vllm-vision
    restart: always
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    environment:
      - MODEL=Qwen/Qwen2.5-VL-7B-Instruct
      - MAX_MODEL_LEN=4096
    ports:
      - "8002:8000"
    volumes:
      - /opt/omnithink/models:/root/.cache/huggingface

  # -------------------------------------------------------------------
  # 2. Self-Hosted Vector Database (Historical BOMs & Learning Memory)
  # -------------------------------------------------------------------
  qdrant-vector-memory:
    image: qdrant/qdrant:v1.9.0
    container_name: omnithink-qdrant
    restart: always
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage

  # -------------------------------------------------------------------
  # 3. Message Broker for Parallel DO Fan-Out Tasks
  # -------------------------------------------------------------------
  rabbitmq-event-bus:
    image: rabbitmq:3.13-management-alpine
    container_name: omnithink-rabbitmq
    restart: always
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      - RABBITMQ_DEFAULT_USER=omnithink
      - RABBITMQ_DEFAULT_PASS=sp28_airgap_secret

  # -------------------------------------------------------------------
  # 4. S3-Compatible Object Store (Sketches, PDFs, CAD Bezier Meshes)
  # -------------------------------------------------------------------
  minio-cad-store:
    image: minio/minio:RELEASE.2024-05-10T01-41-38Z
    container_name: omnithink-minio
    restart: always
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=minio_admin
      - MINIO_ROOT_PASSWORD=minio_sp28_master_key
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  # -------------------------------------------------------------------
  # 5. Core Multi-Agent Orchestration Engine (FastAPI + LangGraph)
  # -------------------------------------------------------------------
  omnithink-agent-gateway:
    build:
      context: ./backend
      dockerfile: Dockerfile.agent
    container_name: omnithink-core-engine
    restart: always
    depends_on:
      - vllm-deepseek-reasoning
      - qdrant-vector-memory
      - rabbitmq-event-bus
      - minio-cad-store
    environment:
      - INFERENCE_ENDPOINT=http://vllm-deepseek-reasoning:8000/v1
      - VISION_ENDPOINT=http://vllm-qwen-vision:8000/v1
      - QDRANT_HOST=qdrant-vector-memory
      - RABBITMQ_URI=amqp://omnithink:sp28_airgap_secret@rabbitmq-event-bus:5672/
      - MINIO_ENDPOINT=minio-cad-store:9000
      - FLEXPLM_INTEGRATION_URL=http://flexplm.enterprise.internal/Windchill/ptc/
    ports:
      - "8080:8080"

volumes:
  qdrant_storage:
  minio_data:
`;

export function calculateHardwarePlan(stylesPerDay: number, concurrency: number): SelfHostedHardwarePlan {
  // Compute GPU sizing based on throughput requirements
  let recommendedGpu = 'NVIDIA RTX 4090 (24GB VRAM)';
  let gpuCount = 1;
  let totalVramGb = 24;
  let systemRamGb = 64;
  let storageFastNvmeGb = 1000;
  let monthlyHwCost = 450;
  let cloudCost = stylesPerDay * 30 * 2.80; // $2.80 estimated multi-agent tokens on commercial cloud APIs

  if (stylesPerDay > 500 || concurrency > 8) {
    recommendedGpu = 'NVIDIA H100 SXM5 (80GB VRAM)';
    gpuCount = 2;
    totalVramGb = 160;
    systemRamGb = 256;
    storageFastNvmeGb = 4000;
    monthlyHwCost = 3800;
  } else if (stylesPerDay > 150 || concurrency > 3) {
    recommendedGpu = 'NVIDIA A100 Tensor Core (80GB VRAM)';
    gpuCount = 1;
    totalVramGb = 80;
    systemRamGb = 128;
    storageFastNvmeGb = 2000;
    monthlyHwCost = 1450;
  }

  const annualSavings = Math.max(0, (cloudCost - monthlyHwCost) * 12);

  return {
    stylesPerDay,
    concurrencyLevel: concurrency,
    recommendedGpu,
    gpuCount,
    totalVramGb,
    systemRamGb,
    storageFastNvmeGb,
    estimatedMonthlyHardwareCostUsd: monthlyHwCost,
    cloudSaasEquivalentCostUsd: Math.round(cloudCost),
    annualSavingsUsd: Math.round(annualSavings)
  };
}

export function generateMarkerNestingMetrics(styleName: string): MarkerNestingSpec {
  const isJacket = styleName.toLowerCase().includes('jacket') || styleName.toLowerCase().includes('hoodie');
  return {
    fabricWidthInches: isJacket ? 60 : 58,
    totalLengthYards: isJacket ? 2.45 : 1.38,
    patternPiecesCount: isJacket ? 18 : 12,
    markerEfficiencyPercent: isJacket ? 87.4 : 91.2,
    fabricWastePercent: isJacket ? 12.6 : 8.8,
    grainlineAlignment: 'Strict Warp',
    rollUtilizationSqMeters: isJacket ? 2.85 : 1.62
  };
}

export function generateCostingBreakdown(styleName: string): CostingSamBreakdown {
  const isJacket = styleName.toLowerCase().includes('jacket') || styleName.toLowerCase().includes('hoodie');
  const sam = isJacket ? 28.5 : 14.2;
  const ratePerMin = 0.42;
  const labor = Number((sam * ratePerMin).toFixed(2));
  const mat = isJacket ? 24.50 : 12.80;
  const trims = isJacket ? 6.20 : 1.95;
  const packaging = 0.75;
  const dutyFreight = isJacket ? 4.80 : 2.40;
  const totalFob = Number((labor + mat + trims + packaging + dutyFreight).toFixed(2));
  const targetFob = Number((totalFob * 0.95).toFixed(2));
  const variance = Number((((totalFob - targetFob) / targetFob) * 100).toFixed(1));

  return {
    samMinutes: sam,
    laborRatePerMinuteUsd: ratePerMin,
    laborCostUsd: labor,
    materialCostUsd: mat,
    trimsCostUsd: trims,
    packagingCostUsd: packaging,
    landedDutyFreightUsd: dutyFreight,
    totalEstimatedFobUsd: totalFob,
    targetFobUsd: targetFob,
    marginVariancePercent: variance
  };
}

export function generateEsgLcaMetrics(styleName: string): EsgCarbonLca {
  const isJacket = styleName.toLowerCase().includes('jacket');
  return {
    carbonFootprintKgCo2e: isJacket ? 14.8 : 6.4,
    waterConsumptionLiters: isJacket ? 184 : 92,
    higgMsiScore: isJacket ? 42.1 : 28.5,
    recycledContentPercent: isJacket ? 68 : 84,
    circularityIndex: 'A (High)',
    tier1SupplierRenewableEnergyPercent: 88
  };
}
