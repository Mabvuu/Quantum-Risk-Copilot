import { ScanIssue, ScanResult, Severity } from "@/types/report";
import { scanQuantum } from "./quantumScanner";

function hasPattern(code: string, pattern: RegExp): boolean {
  return pattern.test(code);
}

function getOverallRisk(issues: ScanIssue[]): Severity | "None" {
  if (issues.some((issue) => issue.severity === "High")) return "High";
  if (issues.some((issue) => issue.severity === "Medium")) return "Medium";
  if (issues.some((issue) => issue.severity === "Low")) return "Low";
  return "None";
}

function getSeverityWeight(severity: Severity): number {
  if (severity === "High") return 25;
  if (severity === "Medium") return 12;
  return 5;
}

function getScore(issues: ScanIssue[]): number {
  const totalPenalty = issues.reduce(
    (sum, issue) => sum + getSeverityWeight(issue.severity),
    0
  );

  const score = 100 - totalPenalty;
  return score < 0 ? 0 : score;
}

function getStatus(score: number): "Good" | "Warning" | "Risky" {
  if (score >= 80) return "Good";
  if (score >= 50) return "Warning";
  return "Risky";
}

function sortIssues(issues: ScanIssue[]): ScanIssue[] {
  const order: Record<Severity, number> = {
    High: 0,
    Medium: 1,
    Low: 2,
  };

  return [...issues].sort((a, b) => order[a.severity] - order[b.severity]);
}

function detectContractType(lowerCode: string): string {
  if (
    lowerCode.includes("erc721") ||
    lowerCode.includes("nft") ||
    lowerCode.includes("ownerof") ||
    lowerCode.includes("safetransferfrom")
  ) {
    return "NFT Contract";
  }

  if (
    lowerCode.includes("erc20") ||
    lowerCode.includes("transfer(") ||
    lowerCode.includes("approve(") ||
    lowerCode.includes("allowance")
  ) {
    return "Token Contract";
  }

  if (
    lowerCode.includes("proxy") ||
    lowerCode.includes("initializer") ||
    lowerCode.includes("upgrade")
  ) {
    return "Upgradeable Contract";
  }

  if (
    lowerCode.includes("onlyowner") ||
    lowerCode.includes("accesscontrol") ||
    lowerCode.includes("role")
  ) {
    return "Access-Control Contract";
  }

  return "General Smart Contract";
}

function getTips(lowerCode: string, contractType: string): string[] {
  const tips: string[] = [];

  if (contractType === "Token Contract") {
    tips.push("Check mint, burn, and transfer rules carefully.");
    tips.push("Make sure token supply logic cannot be abused.");
  }

  if (contractType === "NFT Contract") {
    tips.push("Check mint permissions and NFT transfer safety.");
    tips.push("Make sure metadata logic cannot be abused or broken.");
  }

  if (contractType === "Upgradeable Contract") {
    tips.push("Make sure upgrade authority is tightly controlled.");
    tips.push("Check initializer logic so it cannot be called wrongly.");
  }

  if (contractType === "Access-Control Contract") {
    tips.push("Review all admin and role-based permissions carefully.");
  }

  if (!lowerCode.includes("event ") && !lowerCode.includes("emit ")) {
    tips.push("Consider adding events for important actions.");
  }

  if (!lowerCode.includes("require(")) {
    tips.push("Add validation where needed.");
  }

  if (
    !lowerCode.includes("//") &&
    !lowerCode.includes("/*")
  ) {
    tips.push("Add comments for important logic.");
  }

  return tips;
}

function findLineInfo(code: string, matcher: (line: string) => boolean) {
  const lines = code.split("\n");

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    if (matcher(line)) {
      return {
        line: index + 1,
        snippet: line.trim(),
      };
    }
  }

  return { line: undefined, snippet: undefined };
}

export function scanSmartContract(code: string): ScanResult {
  let issues: ScanIssue[] = [];
  const lowerCode = code.toLowerCase();

  // === EXISTING RULES (UNCHANGED) ===
  if (hasPattern(code, /tx\.origin/)) {
    const info = findLineInfo(code, (line) => /tx\.origin/.test(line));

    issues.push({
      id: "tx-origin",
      title: "Use of tx.origin",
      severity: "High",
      description: "Using tx.origin is unsafe.",
      recommendation: "Use msg.sender instead.",
      line: info.line,
      snippet: info.snippet,
    });
  }

  // (keep all your other rules exactly as they are)

  // === END RULES ===

  issues = sortIssues(issues);

  const counts = {
    high: issues.filter((i) => i.severity === "High").length,
    medium: issues.filter((i) => i.severity === "Medium").length,
    low: issues.filter((i) => i.severity === "Low").length,
  };

  const overallRisk = getOverallRisk(issues);
  const score = getScore(issues);
  const status = getStatus(score);
  const contractType = detectContractType(lowerCode);
  const tips = getTips(lowerCode, contractType);

  // ✅ QUANTUM SCAN
  const quantum = scanQuantum(code);
  const quantumRisks = quantum.risks;
  const quantumCounts = quantum.counts;

  // ✅ FIXED RETURN (NO ISSUES)
  if (issues.length === 0) {
    return {
      issues: [],
      quantumRisks,
      summary: "No obvious issues found.",
      overallRisk,
      score,
      status,
      contractType,
      tips,
      counts,
      quantumCounts,
    };
  }

  // ✅ FIXED RETURN (WITH ISSUES)
  return {
    issues,
    quantumRisks,
    summary: `Scan finished. ${issues.length} issues. ${quantumRisks.length} quantum risks.`,
    overallRisk,
    score,
    status,
    contractType,
    tips,
    counts,
    quantumCounts,
  };
}