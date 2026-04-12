import { detectQuantumRisks } from "./quantumRules";
import { QuantumResult } from "@/types/quantum";

export function scanQuantum(code: string): QuantumResult {
  const risks = detectQuantumRisks(code);

  const counts = {
    high: risks.filter((r) => r.severity === "High").length,
    medium: risks.filter((r) => r.severity === "Medium").length,
    low: risks.filter((r) => r.severity === "Low").length,
  };

  return {
    risks,
    counts,
  };
}