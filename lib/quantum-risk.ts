import type {
  CrossModuleRisk,
  CryptoTouchpoint,
  QuantumRisk,
  SystemScanInput,
} from "@/types/report";

export function buildQuantumRisksFromTouchpoints(
  touchpoints: CryptoTouchpoint[]
): QuantumRisk[] {
  return touchpoints.map((item, index) => ({
    id: `${item.moduleId}-quantum-risk-${index + 1}`,
    title: `${item.algorithm} quantum exposure`,
    severity: item.severity,
    description: `${item.moduleName} uses ${item.algorithm} for ${item.usage}. ${item.reason}`,
    recommendation:
      item.severity === "High"
        ? "Prioritize this cryptographic usage for PQC migration."
        : item.severity === "Medium"
        ? "Review this flow and prepare a hybrid migration path."
        : "Track this usage and confirm stronger configuration where needed.",
    line: item.line,
    snippet: item.snippet,
  }));
}

export function detectCrossModuleRisks(
  input: SystemScanInput
): CrossModuleRisk[] {
  const risks: CrossModuleRisk[] = [];

  if (input.modules.length > 1) {
    risks.push({
      id: "multi-module-risk",
      title: "Multiple module interaction risk",
      severity: "Medium",
      description: "Modules interacting increase attack surface.",
      recommendation: "Review trust boundaries between modules.",
      modules: input.modules.map((m) => m.name),
    });
  }

  if (input.touchpoints?.some((t) => /bridge|oracle|offchain|relayer/i.test(t))) {
    risks.push({
      id: "quantum-touchpoint",
      title: "Quantum-sensitive touchpoint",
      severity: "High",
      description:
        "Off-chain systems, bridges, relayers, or oracle flows may rely on vulnerable signature and certificate chains.",
      recommendation:
        "Plan hybrid and post-quantum migration for these trust paths.",
      modules: input.modules.map((m) => m.name),
    });
  }

  return risks;
}