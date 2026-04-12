export type Severity = "Low" | "Medium" | "High";

export type CountBuckets = {
  high: number;
  medium: number;
  low: number;
};

export type QuantumRisk = {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  recommendation: string;
  line?: number;
  snippet?: string;
};

export type QuantumCounts = CountBuckets;

export type QuantumResult = {
  risks: QuantumRisk[];
  counts: QuantumCounts;
};