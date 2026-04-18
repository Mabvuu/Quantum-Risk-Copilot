import {
  CryptoTouchpoint,
  ModuleScanResult,
  OverallRisk,
  ScanIssue,
  ScanStatus,
  Severity,
} from "@/types/report";

import { detectCryptoTouchpoints } from "./cryptoDetector";
import { buildPqcMigrations } from "./pqc-migration";
import { scanQuantum } from "./quantumAnalyzer";

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

function detectModuleSignals(code: string): ScanIssue[] {
  const issues: ScanIssue[] = [];

  if (
    /\b(private[_-]?key|secret[_-]?key|client[_-]?secret|api[_-]?key|password)\b\s*[:=]/i.test(
      code
    )
  ) {
    issues.push({
      id: "hardcoded-secret",
      title: "Possible hardcoded secret or key material",
      severity: "High",
      description:
        "This module appears to contain key material, password-like data, or secret configuration directly in code or config content.",
      recommendation:
        "Move secrets to secure storage and keep sensitive material out of source code.",
    });
  }

  if (
    /\b(sign|verify|signature|createSign|createVerify|SigningKey|ecrecover)\b/i.test(
      code
    )
  ) {
    issues.push({
      id: "signing-flow",
      title: "Signing or signature verification flow detected",
      severity: "Medium",
      description:
        "This module appears to handle signing or signature verification.",
      recommendation:
        "Map the algorithm, key source, and verification path for PQC planning.",
    });
  }

  if (
    /\b(certificate|cert\b|x509|x\.509|pem\b|crt\b|jks\b|p12\b|pkcs12|truststore|keystore)\b/i.test(
      code
    )
  ) {
    issues.push({
      id: "certificate-flow",
      title: "Certificate or trust-store usage detected",
      severity: "Medium",
      description:
        "This module appears to reference certificates, trust stores, or key stores.",
      recommendation:
        "Review certificate chains, trust anchors, and public-key dependencies.",
    });
  }

  if (
    /\b(config|yaml|yml|toml|ini|env|dotenv|application\.properties|appsettings\.json|settings\.json)\b/i.test(
      code
    )
  ) {
    issues.push({
      id: "config-crypto-clues",
      title: "Config-based crypto clues detected",
      severity: "Low",
      description:
        "This module appears to contain configuration references that may point to cryptographic settings or trust material.",
      recommendation:
        "Review configs for ciphers, keys, certificates, endpoints, and protocol settings.",
    });
  }

  return issues;
}

export function scanModule(
  code: string,
  moduleId: string,
  moduleName: string
): ModuleScanResult {
  const issues = detectModuleSignals(code);
  const quantum = scanQuantum(code);

  const cryptoTouchpoints: CryptoTouchpoint[] = detectCryptoTouchpoints(
    code,
    moduleId,
    moduleName
  );

  const pqcMigrations = buildPqcMigrations(cryptoTouchpoints);

  const allSignals: Array<{ severity: Severity }> = [
    ...issues,
    ...quantum.risks,
    ...cryptoTouchpoints,
  ];

  const score = getScore(allSignals);

  return {
    issues,
    quantumRisks: quantum.risks,
    summary:
      allSignals.length === 0
        ? "No major crypto or quantum clues detected"
        : "Language-agnostic crypto, key, signing, encryption, and certificate clues detected",
    overallRisk: getOverallRisk(allSignals),
    score,
    status: getStatus(score),
    contractType: "System Module",
    tips: [
      "Inventory crypto usage across code, config, and library references",
      "Flag public-key algorithms first because they carry the biggest quantum risk",
      "Map where keys, certificates, signing, and encryption are handled",
    ],
    counts: buildCounts(issues),
    quantumCounts: quantum.counts,
    moduleId,
    moduleName,
    cryptoTouchpoints,
    pqcMigrations,
  };
}