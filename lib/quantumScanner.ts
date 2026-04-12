import { QuantumResult, QuantumRisk, QuantumCounts } from "@/types/quantum";
import { detectQuantumRisks } from "./quantumRules";

function sortQuantumRisks(risks: QuantumRisk[]): QuantumRisk[] {
  const order = {
    High: 0,
    Medium: 1,
    Low: 2,
  } as const;

  return [...risks].sort((a, b) => order[a.severity] - order[b.severity]);
}

function getCounts(risks: QuantumRisk[]): QuantumCounts {
  return {
    high: risks.filter((risk) => risk.severity === "High").length,
    medium: risks.filter((risk) => risk.severity === "Medium").length,
    low: risks.filter((risk) => risk.severity === "Low").length,
  };
}

export function scanQuantum(code: string): QuantumResult {
  const risks = sortQuantumRisks(detectQuantumRisks(code));
  const counts = getCounts(risks);

  return {
    risks,
    counts,
  };
}