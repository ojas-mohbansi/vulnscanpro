
export type Framework = 'auto' | 'react' | 'flask' | 'django';

export interface ScanOptions {
  depth: number;
  maxPages: number;
  rateLimitRps: number;
  subdomains: boolean;
}

export interface ScanRequest {
  url: string;
  framework: Framework;
  options: ScanOptions;
  activeRulePackIds?: string[]; // New: Client sends active packs
}

export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ScanEvent {
  scanId: string;
  module: string;
  status: 'started' | 'completed' | 'warning' | 'error';
  progressPct: number;
  message: string;
  timestamp: string;
}

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface RiskDetails {
  score: number; // 0-10
  vector: string; // CVSS Vector if available
  factors: string[]; // ["Exploit Available", "High Business Impact"]
  baseScore: number;
  exploitabilityScore: number;
  impactScore: number;
}

export interface Finding {
  id: string;
  scanId: string;
  module: string;
  title: string;
  severity: Severity;
  confidence: number; // 0-1
  description: string;
  whyMatters?: string; // New: Developer empathy field
  evidence: Record<string, unknown> & { screenshot?: string }; // Added screenshot support
  remediation: string;
  reproSteps?: string;
  refs: string[];
  source: {
    api: string;
    fallbackUsed?: string;
    latencyMs?: number;
  };
  risk?: RiskDetails; // New: Risk Scoring Engine output
  createdAt: string;
}

export interface ComplianceControl {
  id: string;
  code: string; // e.g., "A01:2021"
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  relatedFindings: string[]; // Finding IDs
}

export interface ComplianceStandard {
  id: string;
  name: string; // e.g., "OWASP Top 10"
  version: string;
  controls: ComplianceControl[];
  score: number; // 0-100
}

export interface ScanBenchmark {
  baselineLatencyMs: number;
  avgRequestLatencyMs: number;
  requestsPerSecond: number;
  totalRequests: number;
  fallbackUsagePercent: number;
  telemetrySource: string;
}

// Insight Engine Types
export interface Insight {
  id: string;
  type: 'stat' | 'trend' | 'warning' | 'positive' | 'action';
  title: string;
  description: string;
  metric?: string | number;
  source?: string;
  priority?: number;
}

export interface InsightReport {
  summary: string;
  insights: Insight[];
  topVulnCategory: string;
  riskTrend: 'increasing' | 'decreasing' | 'stable';
  generatedAt: string;
}

export interface ScanResult {
  id: string;
  target: string;
  status: ScanStatus;
  startTime: string;
  endTime?: string;
  findings: Finding[];
  events: ScanEvent[];
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    modulesCompleted: number;
    durationMs: number;
  };
  compliance?: ComplianceStandard[]; 
  activeRulePackIds?: string[];
  benchmark?: ScanBenchmark; // New: Performance metrics
  insights?: InsightReport; // New: Yielded Insights
}

export type Language = 'en' | 'es' | 'fr' | 'hi';

export interface NotificationSettings {
  enabled: boolean;
  browserNotifications: boolean;
  webhookEnabled: boolean;
  webhookUrl: string;
  notifyOnFinish: boolean;
  notifyOnFinding: boolean; // High/Critical only
}

export interface UserPreferences {
  defaultFramework: Framework;
  defaultScanOptions: ScanOptions;
  defaultReportFormat: 'json' | 'html' | 'md';
  chartLibrary: 'recharts' | 'chartjs' | 'fallback';
  autoScrollLog: boolean;
  theme: 'dark' | 'light';
  lastSync?: string;
  learningMode: boolean; // Gamification toggle
  xp: number;
  unlockedBadges: string[];
  installedPacks: string[]; // List of installed RulePack IDs
  language: Language; // i18n
  notifications: NotificationSettings;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  xpReward: number;
  conditionDescription: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

// Marketplace Types
export type RuleTarget = 'body' | 'header' | 'url';

export interface Rule {
  id: string;
  title: string;
  severity: Severity;
  pattern: string; // Regex string
  target?: RuleTarget; // Default to body
  description: string;
  remediation: string;
  refs?: string[];
}

export interface RulePack {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  rules: Rule[];
  sourceUrl?: string; // For updates
}

export interface MarketplaceEntry {
  pack: RulePack;
  installed: boolean;
  isOfficial: boolean;
}

// Batch & Enrichment Types
export interface EnrichmentResult {
  dns: {
    ip: string;
    provider: string;
    raw?: any;
  };
  geo: {
    country: string;
    isp: string;
    provider: string;
  };
}

export interface BatchTarget {
  id: string;
  url: string;
  status: 'pending' | 'enriching' | 'scanning' | 'completed' | 'failed';
  enrichment?: EnrichmentResult;
  scanId?: string;
  result?: ScanResult;
  error?: string;
}

// Scheduler Types
export type Frequency = 'daily' | 'weekly' | 'manual';

export interface ScheduledScan {
  id: string;
  target: string;
  frequency: Frequency;
  framework: Framework;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'paused';
  createdAt: string;
}

// Threat Intelligence Types
export type ThreatType = 'ip' | 'domain' | 'url' | 'hash' | 'cve';

export interface ThreatIndicator {
  id: string;
  indicator: string;
  type: ThreatType;
  source: string;
  category: string; // e.g. "Malware", "Phishing", "Botnet"
  confidence: number; // 0-1
  timestamp: string;
  tags: string[];
}

export interface ThreatStats {
  total: number;
  byCategory: { name: string; value: number }[];
  byType: { name: string; value: number }[];
  lastUpdated: string;
  source: string;
}

export interface ZeroDayCandidate {
  id: string;
  cveId?: string; // May be null for true 0-day
  summary: string;
  source: string;
  confidence: 'confirmed' | 'suspected' | 'rumor';
  date: string;
  refs: string[];
}

// Dependency Scanning Types
export interface Dependency {
  name: string;
  version: string;
  ecosystem: 'npm' | 'PyPI' | 'Maven' | 'Go' | 'unknown';
}

export interface DependencyVulnerability {
  id: string; // CVE or OSV ID
  dependency: string;
  version: string;
  severity: Severity;
  title: string;
  summary: string;
  fixedIn?: string;
  refs: string[];
  source: string;
}

export interface DependencyScanResult {
  dependencies: Dependency[];
  vulnerabilities: DependencyVulnerability[];
  summary: {
    totalDependencies: number;
    vulnerableDependencies: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// Benchmarking Types
export interface BenchmarkMetric {
  id: string;
  timestamp: string;
  endpoint: string;
  source: string;
  latencyMs: number;
  status: number;
  isFallback: boolean;
  method: string;
}

export interface ModuleBenchmark {
  moduleName: string;
  avgDurationMs: number;
  calls: number;
}

// Graph Visualization Types
export interface SimulationNodeDatum {
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface SimulationLinkDatum<NodeDatum> {
  source: NodeDatum | string | number;
  target: NodeDatum | string | number;
  index?: number;
}

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  type: 'target' | 'finding' | 'ip' | 'threat' | 'cve' | 'cwe' | 'framework' | 'mitigation';
  label: string;
  severity?: Severity;
  details?: string;
  provenance?: string;
  val?: number; // Visual size weight
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: 'relates_to' | 'hosted_on' | 'vulnerable_to' | 'mitigates' | 'parent_of';
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Education Types
export interface EducationResource {
  id: string;
  title: string;
  url: string;
  type: 'article' | 'video' | 'docs' | 'cheatsheet';
  description: string;
  tags: string[];
  source: string;
}

// Simulation Types
export type SimulationType = 'xss' | 'sqli' | 'csrf' | 'rce' | 'misconfig';

export interface SimulationScenario {
  id: string;
  name: string;
  type: SimulationType;
  description: string;
  payload: string; // The "safe" payload
  risk: string;
  difficulty: 'easy' | 'medium' | 'hard';
  source: string;
}

export interface SimulationLog {
  timestamp: string;
  step: string;
  details: string;
  status: 'info' | 'success' | 'blocked' | 'error';
}

export interface SimulationResult {
  scenarioId: string;
  success: boolean; // Was the simulation "successful" (i.e., demonstrated vulnerability)
  logs: SimulationLog[];
  mitigationAdvice: string;
}

// Trend Analytics Types
export interface TrendPoint {
  date: string; // YYYY-MM
  count: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface TrendData {
  framework: string;
  timeline: TrendPoint[];
  totalCves: number;
  peakMonth: string;
  source: string;
}

// DAST Types
export interface PageContext {
  url: string;
  html: string;
  headers: Record<string, string>;
  forms: FormDefinition[];
  screenshot?: string; // base64
}

export interface FormDefinition {
  action: string;
  method: string;
  inputs: { name: string; type: string }[];
  html: string;
}
