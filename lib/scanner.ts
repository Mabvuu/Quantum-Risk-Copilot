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

function detectGenericModuleIssues(code: string): ScanIssue[] {
  const issues: ScanIssue[] = [];

  if (
    /\b(private[_-]?key|secret[_-]?key|client[_-]?secret|api[_-]?key|password|token)\b\s*[:=]\s*["'`]/i.test(
      code
    )
  ) {
    issues.push({
      id: "hardcoded-secret",
      title: "Hardcoded secret or key material",
      severity: "High",
      description:
        "This module appears to store sensitive key material or secrets directly in code or config-like content.",
      recommendation:
        "Move secrets and keys into secure secret storage or key management systems.",
    });
  }

  if (
    /\b(md5|sha1|sha-1|des|3des|tripledes|rc4)\b/i.test(code)
  ) {
    issues.push({
      id: "legacy-crypto",
      title: "Legacy cryptography detected",
      severity: "High",
      description:
        "This module appears to reference older or weak cryptographic algorithms.",
      recommendation:
        "Replace legacy algorithms with modern approved alternatives and include them in migration planning.",
    });
  }

  if (
    /\b(sign|verify|signature|createSign|createVerify|SigningKey|signMessage|verifyMessage)\b/i.test(
      code
    )
  ) {
    issues.push({
      id: "signature-flow",
      title: "Signature flow detected",
      severity: "Medium",
      description:
        "This module appears to perform signing or signature verification.",
      recommendation:
        "Document the algorithms, keys, and trust paths used for each signing flow.",
    });
  }

  if (
    /\b(certificate|cert\b|x509|x\.509|pem\b|crt\b|jks\b|p12\b|pkcs12|truststore|keystore)\b/i.test(
      code
    )
  ) {
    issues.push({
      id: "certificate-dependency",
      title: "Certificate or trust material detected",
      severity: "Medium",
      description:
        "This module appears to depend on certificates, trust stores, or related trust material.",
      recommendation:
        "Review certificate chains, trust anchors, and handshake dependencies.",
    });
  }

  if (
    /\b(sslv3|tls1\.0|tls1\.1|verify\s*=\s*false|rejectUnauthorized\s*:\s*false|insecureSkipVerify\s*:\s*true)\b/i.test(
      code
    )
  ) {
    issues.push({
      id: "insecure-transport-config",
      title: "Weak or insecure transport security setting",
      severity: "High",
      description:
        "This module appears to disable verification or use outdated transport security settings.",
      recommendation:
        "Enable certificate verification and use modern secure transport settings.",
    });
  }

  if (
    /\b(random\.random|math\.random|rand\(\)|srand\(|weakrandom|predictable random)\b/i.test(
      code
    )
  ) {
    issues.push({
      id: "weak-randomness",
      title: "Weak randomness source detected",
      severity: "Medium",
      description:
        "This module appears to rely on a non-cryptographic or weak random source.",
      recommendation:
        "Use a cryptographically secure random generator for security-sensitive operations.",
    });
  }

  return issues;
}

/* ------------------ MODULE SCAN ------------------ */

function scanSingleModule(
  code: string,
  moduleId: string,
  moduleName: string
): ModuleScanResult {
  const issues = detectGenericModuleIssues(code);

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
        : "Language-agnostic crypto and quantum-risk signals detected",
    overallRisk: getOverallRisk(allSignals),
    score,
    status: getStatus(score),
    contractType: "System Module",
    tips: [
      "Inventory crypto usage across code and config",
      "Prioritize public-key and certificate dependencies",
      "Prepare phased PQC migration guidance by module",
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
      "Map all crypto dependencies across the system",
      "Prioritize vulnerable algorithms and trust chains",
      "Phase PQC migration safely across modules",
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