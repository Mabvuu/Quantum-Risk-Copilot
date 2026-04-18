import {
  OverallRisk,
  ScanStatus,
  Severity,
  SystemScanInput,
  SystemScanResult,
} from "@/types/report";

import { scanModule } from "./moduleScanner";
import { detectCrossModuleRisks } from "./quantumAnalyzer";

function getScore(items: Array<{ severity: Severity }>): number {
  const weights: Record<Severity, number> = {
    High: 25,
    Medium: 12,
    Low: 5,
  };

  const penalty = items.reduce((sum, item) => sum + weights[item.severity], 0);
  return Math.max(0, 100 - penalty);
}

function getOverallRisk(items: Array<{ severity: Severity }>): OverallRisk {
  if (items.some((item) => item.severity === "High")) return "High";
  if (items.some((item) => item.severity === "Medium")) return "Medium";
  if (items.some((item) => item.severity === "Low")) return "Low";
  return "None";
}

function getStatus(score: number): ScanStatus {
  if (score >= 80) return "Good";
  if (score >= 50) return "Warning";
  return "Risky";
}

function buildCounts(items: Array<{ severity: Severity }>) {
  return {
    high: items.filter((item) => item.severity === "High").length,
    medium: items.filter((item) => item.severity === "Medium").length,
    low: items.filter((item) => item.severity === "Low").length,
  };
}

export function scanSystem(input: SystemScanInput): SystemScanResult {
  const moduleResults = input.modules.map((module, index) =>
    scanModule(
      module.code,
      module.id || `module-${index + 1}`,
      module.name || `Module ${index + 1}`
    )
  );

  const crossModuleRisks = detectCrossModuleRisks(input);
  const issues = moduleResults.flatMap((module) => module.issues);
  const quantumRisks = moduleResults.flatMap((module) => module.quantumRisks);
  const cryptoTouchpoints = moduleResults.flatMap(
    (module) => module.cryptoTouchpoints
  );
  const pqcMigrations = moduleResults.flatMap(
    (module) => module.pqcMigrations
  );

  const allSignals: Array<{ severity: Severity }> = [
    ...issues,
    ...quantumRisks,
    ...cryptoTouchpoints,
    ...crossModuleRisks,
  ];

  const score = getScore(allSignals);

  return {
    issues,
    quantumRisks,
    summary:
      allSignals.length === 0
        ? "No major system-wide crypto or quantum clues detected"
        : "System-wide language-agnostic crypto discovery and quantum-risk mapping complete",
    overallRisk: getOverallRisk(allSignals),
    score,
    status: getStatus(score),
    contractType: moduleResults.length > 1 ? "System" : "System Module",
    tips: [
      "Search across all modules for crypto libraries, signing flows, certificates, and key material",
      "Treat public-key cryptography as the highest priority for PQC planning",
      "Document where keys are generated, stored, distributed, and rotated",
    ],
    counts: buildCounts(issues),
    quantumCounts: buildCounts(quantumRisks),
    systemName: input.systemName || "System",
    systemSummary:
      "The backend scanned multiple modules and searched for language-agnostic cryptographic clues across code, config, keys, signing, encryption, and certificates.",
    architectureNotes: input.architectureNotes || "",
    touchpoints: input.touchpoints || [],
    modulesScanned: moduleResults.length,
    moduleResults,
    crossModuleRisks,
    cryptoTouchpoints,
    pqcMigrations,
  };
}