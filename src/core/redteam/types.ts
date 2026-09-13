export type RedTeamProfile =
  | 'passive'
  | 'api-logic'
  | 'comprehensive'
  | 'orchestrated'
  | 'playbook';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingCategory =
  | 'auth-bypass'
  | 'idor-bola'
  | 'injection'
  | 'ssrf'
  | 'security-headers'
  | 'sensitive-exposure'
  | 'cors-misconfiguration'
  | 'llm-prompt-injection'
  | 'business-logic'
  | 'mass-assignment'
  | 'session-management';

export type EvidenceLevel = 'observed' | 'reproduced' | 'inferred' | 'hypothetical';

export type FindingLifecycle =
  | 'new'
  | 'reproduced'
  | 'confirmed'
  | 'false-positive'
  | 'accepted-risk'
  | 'fixed'
  | 'regression-failed'
  | 'verified-fixed';

export interface MaintenanceWindow {
  startUtcHour: number; // 0 - 23
  endUtcHour: number;   // 0 - 23
  enforce?: boolean;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThresholdPercent: number; // e.g. 20 (20%)
  sampleWindowSize: number;        // e.g. 20 requests
  recoveryTimeoutMs: number;       // e.g. 5000 ms
}

export interface ScopeConfig {
  allowedHosts: string[];
  allowedPorts?: number[];
  allowedCidrs?: string[];         // e.g. ["10.0.0.0/8", "192.168.1.0/24"]
  allowPrivateIps?: boolean;       // Set true to explicitly allow internal/private IP probing
  allowLocalhost?: boolean;
  maxRequestsPerSecond?: number;
  safeMode?: boolean;
  excludedPaths?: string[];
  maintenanceWindow?: MaintenanceWindow;
  suppressedFingerprints?: string[];
}

export interface ExecutionEnvelope {
  allowedHosts: string[];
  allowedPorts?: number[];
  allowedProtocols?: ('http:' | 'https:')[];
  allowedMethods?: string[];
  maxRequestsPerSecond: number;
  maxConcurrency: number;
  maxTotalRequests?: number;
  maxDurationMs: number;
  maxResponseBytes: number;
  networkEgress: 'loopback-only' | 'scoped-hosts-only' | 'isolated';
  strippedEnvVars: string[];
  filesystemIsolation?: boolean;
  circuitBreaker?: CircuitBreakerConfig;
}

export interface EnvironmentPolicy {
  forbidColima: boolean;
  allowedContainerRuntimes?: ('docker' | 'podman' | 'orbstack' | 'none')[];
  enforceExecutionEnvelope?: boolean;
}

export interface FindingEvidence {
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  };
  response?: {
    status: number;
    headers?: Record<string, string>;
    snippet?: string;
  };
  reproCurl?: string;
  rawOutput?: string;
  sourceTool?: string;
  timestamp?: string;
  evidenceLevel?: EvidenceLevel;
  confidence?: number;
}

export interface FindingProvenance {
  tool: string;
  toolVersion?: string;
  timestamp: string;
  profile?: RedTeamProfile;
  identity?: string;
  target: string;
  rawEvidenceHash?: string;
  reproCommand?: string;
  reproSucceeded?: boolean;
}

export interface PriorityBreakdown {
  severityWeight: number; // 0.0 - 1.0
  confidence: number;     // 0.0 - 1.0
  exploitability: number; // 0.0 - 1.0
  exposure: number;       // 0.0 - 1.0
  assetCriticality: number; // 0.0 - 1.0
  score: number;          // composite 0.0 - 1.0
}

export interface ComplianceTag {
  owaspTop10?: string;      // e.g. "A01:2021-Broken Access Control"
  owaspApi?: string;        // e.g. "API1:2023-Broken Object Level Authorization"
  pciDss?: string;          // e.g. "Req 6.2.4"
  soc2?: string;            // e.g. "CC6.1"
  cweTitle?: string;
}

export interface CvssScore {
  vector: string;           // e.g. "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N"
  score: number;            // 0.0 - 10.0
  rating: 'None' | 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface RedTeamFinding {
  id: string;
  fingerprint?: string; // Canonical SHA-256 fingerprint
  familyId?: string;    // Normalized vulnerability family identifier
  title: string;
  category: FindingCategory;
  severity: FindingSeverity;
  description: string;
  target: string;
  evidence: FindingEvidence;
  evidenceList?: FindingEvidence[]; // Multi-tool aggregated evidence sources
  remediation: string;
  cwe?: string;
  sourceTool?: ToolAdapterId | string;
  lifecycle?: FindingLifecycle;
  evidenceLevel?: EvidenceLevel;
  confidence?: number; // Calibrated probability 0.0 to 1.0
  priority?: PriorityBreakdown;
  provenance?: FindingProvenance;
  cvss?: CvssScore;
  compliance?: ComplianceTag;
}

export interface RedTeamSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

export interface AttackNode {
  id: string;
  label: string;
  type: 'entrypoint' | 'service' | 'endpoint' | 'parameter' | 'database' | 'secret';
  metadata?: Record<string, unknown>;
}

export interface AttackEdge {
  source: string;
  target: string;
  relationship: string;
  riskScore: number;
  evidenceLevel?: EvidenceLevel;
  confidence?: number; // 0.0 to 1.0
  prerequisites?: string[];
  sourceFindings?: string[];
}

export interface AttackPath {
  path: string[];
  riskScore: number;
  confidence?: number; // Chain-weighted probability
  evidenceLevel?: EvidenceLevel;
  description: string;
  reproducible?: boolean;
}

export interface AttackGraph {
  nodes: AttackNode[];
  edges: AttackEdge[];
  attackPaths: AttackPath[];
}

export interface RunAttestation {
  attestationVersion: '1.0.0';
  target: string;
  profile: RedTeamProfile;
  scanTimestamp: string;
  activeAdapters: string[];
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  attestationHash: string; // SHA-256 integrity hash
  scopeDigest: string;
  generatedBy: 'get-fable-redteam';
}

export interface BaselineDiffResult {
  baselineFile: string;
  newFindings: RedTeamFinding[];
  persistentFindings: RedTeamFinding[];
  resolvedFindings: RedTeamFinding[];
  suppressedCount: number;
  hasRegressions: boolean;
}

export interface RedTeamResult {
  target: string;
  profile: RedTeamProfile;
  startTime: string;
  endTime: string;
  findings: RedTeamFinding[];
  summary: RedTeamSummary;
  attackGraph?: AttackGraph;
  activeAdapters?: string[];
  attestation?: RunAttestation;
  baselineDiff?: BaselineDiffResult;
  executiveGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  estimatedMttrHours?: number;
}

export type ToolAdapterId =
  | 'native'
  | 'hexstrike'
  | 'akto'
  | 'cyberstrike'
  | 'claude-red'
  | 'pentagi'
  | 'pentestagent';

export interface ToolAdapterStatus {
  id: ToolAdapterId;
  name: string;
  available: boolean;
  runtime: string;
  details?: string;
  latencyMs?: number;
}

export interface AdapterContext {
  target: string;
  profile: RedTeamProfile;
  scopeConfig: ScopeConfig;
  authToken?: string;
  secondAuthToken?: string;
  safeMode: boolean;
  timeoutMs?: number;
  cwd?: string;
  envelope?: ExecutionEnvelope;
  policy?: EnvironmentPolicy;
}

export interface RedTeamToolAdapter {
  readonly id: ToolAdapterId;
  readonly name: string;
  readonly description: string;
  isAvailable(context?: AdapterContext): Promise<boolean>;
  getStatus(context?: AdapterContext): Promise<ToolAdapterStatus>;
  run(context: AdapterContext): Promise<RedTeamFinding[]>;
}

export interface SetupDiagnostics {
  colimaDetected: boolean;
  colimaDetails?: string;
  containerRuntime: 'docker' | 'podman' | 'orbstack' | 'none';
  pythonRuntime?: string;
  mcpClients: string[];
  readyForOrchestration: boolean;
}

export interface SetupOptions {
  generateCompose?: boolean;
  generateMcp?: boolean;
  generateScope?: boolean;
  force?: boolean;
  cwd?: string;
  policy?: EnvironmentPolicy;
}

export interface SetupResult {
  diagnostics: SetupDiagnostics;
  generatedFiles: string[];
  success: boolean;
  error?: string;
}

export interface RemediationWorkCard {
  id: string;
  fingerprint?: string;
  title: string;
  severity: FindingSeverity;
  priorityScore?: number;
  confidence?: number;
  evidenceLevel?: EvidenceLevel;
  description: string;
  cwe?: string;
  reproCurl?: string;
  remediation: string;
  targetFile?: string;
  suggestedTestCode?: string;
  status?: 'open' | 'in-progress' | 'reproduced' | 'verified-fixed';
}

export interface ScanOptions {
  target: string;
  profile?: RedTeamProfile;
  scopeConfig?: ScopeConfig;
  scopeFilePath?: string;
  authToken?: string;
  secondAuthToken?: string;
  timeoutMs?: number;
  safeMode?: boolean;
  orchestrate?: boolean;
  adapters?: string[];
  playbook?: string;
  outputFormat?: 'json' | 'text' | 'sarif';
  outputFile?: string;
  crawl?: boolean;
  rateLimit?: number;
  concurrency?: number;
  generateTests?: boolean;
  envelope?: Partial<ExecutionEnvelope>;
  policy?: EnvironmentPolicy;
  baselinePath?: string;
  failOnCvss?: number;
  allowedCidrs?: string[];
  suppressedFingerprints?: string[];
  generateAttestation?: boolean;
}

export interface DiscoveredParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'body';
  required?: boolean;
  schemaType?: string;
}

export interface DiscoveredEndpoint {
  url: string;
  path: string;
  method: string;
  parameters?: DiscoveredParameter[];
  hasAuth?: boolean;
  summary?: string;
  source: 'html' | 'openapi' | 'robots' | 'probe' | 'sitemap';
}

export interface DiscoveredSurface {
  endpoints: DiscoveredEndpoint[];
  links: string[];
  forms: { action: string; method: string; fields: string[] }[];
  openApiSpec?: Record<string, unknown>;
}

export interface VerificationOptions {
  target?: string;
  findings?: RedTeamFinding[];
  reportPath?: string;
  findingsPath?: string;
  authToken?: string;
  secondAuthToken?: string;
  generateTests?: boolean;
  testOutputPath?: string;
  safeMode?: boolean;
  envelope?: Partial<ExecutionEnvelope>;
  scopeConfig?: ScopeConfig;
}

export interface VerificationItem {
  id: string;
  fingerprint?: string;
  title: string;
  target: string;
  previousStatus: FindingLifecycle;
  newStatus: 'verified-fixed' | 'regression-failed';
  verifiedAt: string;
  message: string;
  reproCurl?: string;
}

export interface VerificationResult {
  total: number;
  fixed: number;
  regressions: number;
  status: 'clean' | 'regressions-detected';
  items: VerificationItem[];
  testFilePath?: string;
  timestamp: string;
}
