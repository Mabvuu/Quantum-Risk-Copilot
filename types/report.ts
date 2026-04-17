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

export type CryptoTouchpointType =
  | "digital-signature"
  | "wallet-signing"
  | "key-exchange"
  | "tls"
  | "api-auth"
  | "password-hashing"
  | "data-encryption"
  | "certificate"
  | "blockchain-consensus"
  | "unknown";

export type CryptoTouchpoint = {
  id: string;
  moduleId: string;
  moduleName: string;
  type: CryptoTouchpointType;
  algorithm: string;
  usage: string;
  severity: Severity;
  reason: string;
  line?: number;
  snippet?: string;
};

export type PQCMigrationItem = {
  id: string;
  moduleId?: string;
  moduleName?: string;
  currentAlgorithm: string;
  recommendedPqc: string;
  priority: Severity;
  reason: string;
  action: string;
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
  cryptoTouchpoints: CryptoTouchpoint[];
  pqcMigrations: PQCMigrationItem[];
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
  cryptoTouchpoints: CryptoTouchpoint[];
  pqcMigrations: PQCMigrationItem[];
};

export type AIExplainResult = {
  explanation: string;
};