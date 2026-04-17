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

type FunctionBlock = {
  name: string;
  headerLine: number;
  header: string;
  body: string;
};

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

function extractFunctionBlocks(code: string): FunctionBlock[] {
  const lines = code.split("\n");
  const indexes: number[] = [];

  lines.forEach((line, i) => {
    if (/\bfunction\s+\w+\s*\(/.test(line)) indexes.push(i);
  });

  return indexes.map((start, idx) => {
    const end = indexes[idx + 1] ?? lines.length;
    const chunk = lines.slice(start, end);
    const header = chunk[0] || "";
    const name = header.match(/\bfunction\s+(\w+)/)?.[1] || "unknown";

    return {
      name,
      headerLine: start + 1,
      header,
      body: chunk.join("\n"),
    };
  });
}

function scanSingleModule(
  code: string,
  moduleId: string,
  moduleName: string
): ModuleScanResult {
  const issues: ScanIssue[] = [];
  const blocks = extractFunctionBlocks(code);

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

  blocks.forEach((block) => {
    const body = block.body;

    if (/call\(|transfer\(|send\(/i.test(body) && !/require\(/i.test(body)) {
      issues.push({
        id: `unsafe-call-${block.name}`,
        title: "External call risk",
        severity: "High",
        description: "External call without checks",
        recommendation: "Add checks-effects-interactions",
        line: block.headerLine,
        snippet: block.header,
      });
    }

    if (/random|block\.timestamp/i.test(body)) {
      issues.push({
        id: `weak-random-${block.name}`,
        title: "Weak randomness",
        severity: "High",
        description: "Uses predictable randomness",
        recommendation: "Use secure randomness",
        line: block.headerLine,
      });
    }
  });

  const quantum = scanQuantum(code);
  const cryptoTouchpoints = detectCryptoTouchpoints(
    code,
    moduleId,
    moduleName
  );
  const pqcMigrations = buildPqcMigrations(cryptoTouchpoints);
  const all = [...issues, ...quantum.risks, ...cryptoTouchpoints];
  const score = getScore(all);

  return {
    issues: sortBySeverity(issues),
    quantumRisks: quantum.risks,
    summary:
      issues.length === 0 &&
      quantum.risks.length === 0 &&
      cryptoTouchpoints.length === 0
        ? "No major issues"
        : "Crypto touchpoints and risks detected",
    overallRisk: getOverallRisk(all),
    score,
    status: getStatus(score),
    contractType: "System Module",
    tips: [
      "Review cryptographic inventory",
      "Prioritize classical public-key usage",
      "Plan phased PQC migration",
    ],
    counts: buildCounts(issues),
    quantumCounts: quantum.counts,
    moduleId,
    moduleName,
    cryptoTouchpoints,
    pqcMigrations,
  };
}

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
    summary: "System scan complete",
    overallRisk: getOverallRisk(allSignals),
    score,
    status: getStatus(score),
    contractType: moduleResults.length > 1 ? "System" : "System Module",
    tips: [
      "Inventory all cryptographic usage",
      "Prioritize RSA and ECC migration paths",
      "Use hybrid rollout before full PQC replacement",
    ],
    counts: buildCounts(moduleResults.flatMap((m) => m.issues)),
    quantumCounts: buildCounts(moduleResults.flatMap((m) => m.quantumRisks)),
    systemName: system.systemName || "System",
    systemSummary:
      "Full-system crypto discovery complete with quantum-risk mapping and PQC migration guidance.",
    architectureNotes: system.architectureNotes || "",
    touchpoints: system.touchpoints || [],
    modulesScanned: moduleResults.length,
    moduleResults,
    crossModuleRisks,
    cryptoTouchpoints,
    pqcMigrations,
  };
}