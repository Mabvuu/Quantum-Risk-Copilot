import type { CountBuckets, QuantumRisk, Severity } from "./quantum";

export type { CountBuckets, QuantumRisk, Severity } from "./quantum";

export type OverallRisk = Severity | "None";
export type ScanStatus = "Good" | "Warning" | "Risky";

export type ScanIssue = {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  recommendation: string;
  line?: number;
  snippet?: string;
};

export type ScanResult = {
  issues: ScanIssue[];
  quantumRisks: QuantumRisk[];
  summary: string;
  overallRisk: OverallRisk;
  score: number;
  status: ScanStatus;
  contractType: string;
  tips: string[];
  counts: CountBuckets;
  quantumCounts: CountBuckets;
};

export type SystemModuleInput = {
  id?: string;
  name: string;
  code: string;
};

export type ModuleScanResult = ScanResult & {
  moduleId: string;
  moduleName: string;
};

export type CrossModuleRisk = {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  recommendation: string;
  modules: string[];
};

export type SystemScanInput = {
  systemName?: string;
  architectureNotes?: string;
  touchpoints?: string[];
  modules: SystemModuleInput[];
};

export type SystemScanResult = ScanResult & {
  systemName: string;
  systemSummary: string;
  architectureNotes: string;
  touchpoints: string[];
  modulesScanned: number;
  moduleResults: ModuleScanResult[];
  crossModuleRisks: CrossModuleRisk[];
};

export type AIExplainResult = {
  explanation: string;
};