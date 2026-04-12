import { Severity } from "./report";

export type QuantumRisk = {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  recommendation: string;
  line?: number;
  snippet?: string;
};

export type QuantumResult = {
  risks: QuantumRisk[];
  counts: {
    high: number;
    medium: number;
    low: number;
  };
};