export type AgentRole =
  | 'Supervisor'
  | 'IngestionAgent'
  | 'GeometryAgent'
  | 'MaterialResolutionAgent'
  | 'ComplianceValidationAgent'
  | 'CostingEngineeringAgent'
  | 'ContinuousLearningAgent';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'waiting_approval' | 'error';

export interface AgentNode {
  id: AgentRole;
  name: string;
  category: 'Core Orchestrator' | 'Perception & CAD' | 'PLM & Sourcing' | 'Cost & Compliance' | 'Memory & Learning';
  modelEngine: string;
  tools: string[];
  responsibilities: string[];
  selfHostedRuntime: string;
  vramRequirementGb: number;
}

export interface AgentExecutionStep {
  agent: AgentRole;
  agentName: string;
  timestamp: string;
  action: string;
  detail: string;
  inputSummary: string;
  outputSummary: string;
  confidence: number;
  tokensConsumed: number;
  durationMs: number;
  status: 'success' | 'warning' | 'needs_review';
}

export interface MarkerNestingSpec {
  fabricWidthInches: number;
  totalLengthYards: number;
  patternPiecesCount: number;
  markerEfficiencyPercent: number;
  fabricWastePercent: number;
  grainlineAlignment: 'Strict Warp' | 'Bias (+/-45°)' | 'Flexible';
  rollUtilizationSqMeters: number;
}

export interface CostingSamBreakdown {
  samMinutes: number;
  laborRatePerMinuteUsd: number;
  laborCostUsd: number;
  materialCostUsd: number;
  trimsCostUsd: number;
  packagingCostUsd: number;
  landedDutyFreightUsd: number;
  totalEstimatedFobUsd: number;
  targetFobUsd: number;
  marginVariancePercent: number;
}

export interface EsgCarbonLca {
  carbonFootprintKgCo2e: number;
  waterConsumptionLiters: number;
  higgMsiScore: number;
  recycledContentPercent: number;
  circularityIndex: 'A (High)' | 'B (Moderate)' | 'C (Low)';
  tier1SupplierRenewableEnergyPercent: number;
}

export interface SelfHostedHardwarePlan {
  stylesPerDay: number;
  concurrencyLevel: number;
  recommendedGpu: string;
  gpuCount: number;
  totalVramGb: number;
  systemRamGb: number;
  storageFastNvmeGb: number;
  estimatedMonthlyHardwareCostUsd: number;
  cloudSaasEquivalentCostUsd: number;
  annualSavingsUsd: number;
}
