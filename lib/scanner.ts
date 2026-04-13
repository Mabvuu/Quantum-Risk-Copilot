import {
  CountBuckets,
  CrossModuleRisk,
  ModuleScanResult,
  OverallRisk,
  ScanIssue,
  ScanResult,
  ScanStatus,
  Severity,
  SystemScanInput,
  SystemScanResult,
} from "@/types/report";
import { scanQuantum } from "./quantumScanner";

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

function scanSingleModule(code: string): ScanResult {
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
  const all = [...issues, ...quantum.risks];
  const score = getScore(all);

  return {
    issues: sortBySeverity(issues),
    quantumRisks: quantum.risks,
    summary:
      issues.length === 0 && quantum.risks.length === 0
        ? "No major issues"
        : "Issues detected",
    overallRisk: getOverallRisk(all),
    score,
    status: getStatus(score),
    contractType: "Smart Contract",
    tips: ["Review access control", "Avoid unsafe calls"],
    counts: buildCounts(issues),
    quantumCounts: quantum.counts,
  };
}

function detectCrossModuleRisks(
  input: SystemScanInput
): CrossModuleRisk[] {
  const risks: CrossModuleRisk[] = [];

  if (input.modules.length > 1) {
    risks.push({
      id: "multi-module-risk",
      title: "Multiple module interaction risk",
      severity: "Medium",
      description: "Modules interacting increase attack surface",
      recommendation: "Review trust boundaries",
      modules: input.modules.map((m) => m.name),
    });
  }

  if (input.touchpoints?.some((t) => /bridge|oracle|offchain/i.test(t))) {
    risks.push({
      id: "quantum-touchpoint",
      title: "Quantum-sensitive touchpoint",
      severity: "High",
      description: "Off-chain + signatures = quantum risk",
      recommendation: "Plan quantum-safe upgrade",
      modules: input.modules.map((m) => m.name),
    });
  }

  return risks;
}

function toSystemInput(input: string | SystemScanInput): SystemScanInput {
  if (typeof input === "string") {
    return {
      systemName: "Single Contract",
      modules: [{ name: "Main", code: input }],
    };
  }

  return input;
}

export function scanSmartContract(
  input: string | SystemScanInput
): SystemScanResult {
  const system = toSystemInput(input);

  const moduleResults: ModuleScanResult[] = system.modules.map((m, i) => {
    const res = scanSingleModule(m.code);

    return {
      ...res,
      moduleId: m.id || `module-${i}`,
      moduleName: m.name,
    };
  });

  const cross = detectCrossModuleRisks(system);

  const allSignals = [
    ...moduleResults.flatMap((m) => m.issues),
    ...moduleResults.flatMap((m) => m.quantumRisks),
    ...cross,
  ];

  const score = getScore(allSignals);

  return {
    issues: moduleResults.flatMap((m) => m.issues),
    quantumRisks: moduleResults.flatMap((m) => m.quantumRisks),
    summary: "System scan complete",
    overallRisk: getOverallRisk(allSignals),
    score,
    status: getStatus(score),
    contractType: moduleResults.length > 1 ? "System" : "Smart Contract",
    tips: ["Review system interactions"],
    counts: buildCounts(moduleResults.flatMap((m) => m.issues)),
    quantumCounts: buildCounts(moduleResults.flatMap((m) => m.quantumRisks)),
    systemName: system.systemName || "System",
    systemSummary: "Multi-module analysis complete",
    architectureNotes: system.architectureNotes || "",
    touchpoints: system.touchpoints || [],
    modulesScanned: moduleResults.length,
    moduleResults,
    crossModuleRisks: cross,
  };
}