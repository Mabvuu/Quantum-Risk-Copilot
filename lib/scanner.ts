import {
  CountBuckets,
  ModuleScanResult,
  OverallRisk,
  ScanIssue,
  ScanStatus,
  Severity,
  SystemScanInput,
  SystemScanResult,
} from "@/types/report";

import { scanQuantum } from "./quantumScanner";
import { detectCryptoTouchpoints } from "./crypto-discovery";
import { buildPqcMigrations } from "./pqc-migration";
import { detectCrossModuleRisks } from "./quantum-risk";
import { toSystemInput } from "./system-input";

export type { SystemScanInput, SystemScanResult } from "@/types/report";

/* ------------------ HELPERS ------------------ */

function sortBySeverity<T extends { severity: Severity }>(items: T[]): T[] {
  const order: Record<Severity, number> = { High: 0, Medium: 1, Low: 2 };
  return [...items].sort((a, b) => order[a.severity] - order[b.severity]);
}

function getOverallRisk(items: Array<{ severity: Severity }>): OverallRisk {
  if (items.some((i) => i.severity === "High")) return "High";
  if (items.some((i) => i.severity === "Medium")) return "Medium";
  if (items.some((i) => i.severity === "Low")) return "Low";
  return "None";
}

function getScore(items: Array<{ severity: Severity }>): number {
  const weights: Record<Severity, number> = {
    High: 25,
    Medium: 12,
    Low: 5,
  };

  const penalty = items.reduce((sum, i) => sum + weights[i.severity], 0);
  return Math.max(0, 100 - penalty);
}

function getStatus(score: number): ScanStatus {
  if (score >= 80) return "Good";
  if (score >= 50) return "Warning";
  return "Risky";
}

function buildCounts(items: Array<{ severity: Severity }>): CountBuckets {
  return {
    high: items.filter((i) => i.severity === "High").length,
    medium: items.filter((i) => i.severity === "Medium").length,
    low: items.filter((i) => i.severity === "Low").length,
  };
}

/* ------------------ MODULE SCAN ------------------ */

function scanSingleModule(
  code: string,
  moduleId: string,
  moduleName: string
): ModuleScanResult {
  const issues: ScanIssue[] = [];

  if (/tx\.origin/.test(code)) {
    issues.push({
      id: "tx-origin",
      title: "Unsafe tx.origin",
      severity: "High",
      description: "tx.origin used for auth",
      recommendation: "Use msg.sender",
    });
  }

  if (/delegatecall/.test(code)) {
    issues.push({
      id: "delegatecall",
      title: "delegatecall usage",
      severity: "High",
      description: "delegatecall is dangerous",
      recommendation: "Restrict strictly",
    });
  }

  const quantum = scanQuantum(code);

  const cryptoTouchpoints = detectCryptoTouchpoints(
    code,
    moduleId,
    moduleName
  );

  const pqcMigrations = buildPqcMigrations(cryptoTouchpoints);

  const allSignals = [...issues, ...quantum.risks, ...cryptoTouchpoints];
  const score = getScore(allSignals);

  return {
    issues: sortBySeverity(issues),
    quantumRisks: quantum.risks,
    summary:
      allSignals.length === 0
        ? "No major issues"
        : "Crypto + quantum risks detected",
    overallRisk: getOverallRisk(allSignals),
    score,
    status: getStatus(score),
    contractType: "System Module",
    tips: [
      "Inventory crypto usage",
      "Flag RSA/ECC dependencies",
      "Prepare PQC migration plan",
    ],
    counts: buildCounts(issues),
    quantumCounts: quantum.counts,
    moduleId,
    moduleName,
    cryptoTouchpoints,
    pqcMigrations,
  };
}

/* ------------------ SYSTEM SCAN ------------------ */

export function scanSmartContract(
  input: string | SystemScanInput
): SystemScanResult {
  const system = toSystemInput(input);

  const moduleResults: ModuleScanResult[] = system.modules.map((m, i) => {
    const moduleId = m.id || `module-${i + 1}`;
    return scanSingleModule(m.code, moduleId, m.name);
  });

  const crossModuleRisks = detectCrossModuleRisks(system);

  const cryptoTouchpoints = moduleResults.flatMap((m) => m.cryptoTouchpoints);
  const pqcMigrations = moduleResults.flatMap((m) => m.pqcMigrations);

  const allSignals = [
    ...moduleResults.flatMap((m) => m.issues),
    ...moduleResults.flatMap((m) => m.quantumRisks),
    ...cryptoTouchpoints,
    ...crossModuleRisks,
  ];

  const score = getScore(allSignals);

  return {
    issues: moduleResults.flatMap((m) => m.issues),
    quantumRisks: moduleResults.flatMap((m) => m.quantumRisks),
    summary: "Full system scan complete",
    overallRisk: getOverallRisk(allSignals),
    score,
    status: getStatus(score),
    contractType: moduleResults.length > 1 ? "System" : "Module",
    tips: [
      "Map all crypto dependencies",
      "Prioritize vulnerable algorithms",
      "Phase PQC migration safely",
    ],
    counts: buildCounts(moduleResults.flatMap((m) => m.issues)),
    quantumCounts: buildCounts(moduleResults.flatMap((m) => m.quantumRisks)),
    systemName: system.systemName || "System",
    systemSummary:
      "Multi-module crypto discovery + quantum risk mapping complete.",
    architectureNotes: system.architectureNotes || "",
    touchpoints: system.touchpoints || [],
    modulesScanned: moduleResults.length,
    moduleResults,
    crossModuleRisks,
    cryptoTouchpoints,
    pqcMigrations,
  };
}