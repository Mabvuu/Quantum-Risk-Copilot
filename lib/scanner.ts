import { ScanIssue, ScanResult, Severity } from "@/types/report";

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
    tips.push("The contract has very few visible checks. Add validation where needed.");
  }

  if (
    !lowerCode.includes("comment") &&
    !lowerCode.includes("//") &&
    !lowerCode.includes("/*")
  ) {
    tips.push("Add comments for important security-sensitive logic.");
  }

  return tips;
}

function findLineInfo(code: string, matcher: (line: string) => boolean) {
  const lines = code.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (matcher(line)) {
      return {
        line: index + 1,
        snippet: line.trim(),
      };
    }
  }

  return {
    line: undefined,
    snippet: undefined,
  };
}

export function scanSmartContract(code: string): ScanResult {
  let issues: ScanIssue[] = [];
  const lowerCode = code.toLowerCase();

  if (hasPattern(code, /tx\.origin/)) {
    const info = findLineInfo(code, (line) => /tx\.origin/.test(line));

    issues.push({
      id: "tx-origin",
      title: "Use of tx.origin",
      severity: "High",
      description:
        "Using tx.origin for authorization can be dangerous and can be abused.",
      recommendation:
        "Use msg.sender for access control instead of tx.origin.",
      line: info.line,
      snippet: info.snippet,
    });
  }

  if (hasPattern(code, /selfdestruct\s*\(/i)) {
    const info = findLineInfo(code, (line) => /selfdestruct\s*\(/i.test(line));

    issues.push({
      id: "selfdestruct",
      title: "Use of selfdestruct",
      severity: "High",
      description:
        "selfdestruct can permanently change contract behavior and is risky.",
      recommendation:
        "Avoid selfdestruct unless there is a very strong reason and careful review.",
      line: info.line,
      snippet: info.snippet,
    });
  }

  if (hasPattern(code, /delegatecall/i)) {
    const info = findLineInfo(code, (line) => /delegatecall/i.test(line));

    issues.push({
      id: "delegatecall",
      title: "Use of delegatecall",
      severity: "High",
      description:
        "delegatecall is powerful and dangerous because it can execute external code in your contract context.",
      recommendation:
        "Avoid delegatecall unless absolutely necessary and tightly controlled.",
      line: info.line,
      snippet: info.snippet,
    });
  }

  if (
    hasPattern(code, /block\.timestamp/i) ||
    hasPattern(code, /block\.number/i) ||
    hasPattern(code, /blockhash\s*\(/i)
  ) {
    const info = findLineInfo(
      code,
      (line) =>
        /block\.timestamp/i.test(line) ||
        /block\.number/i.test(line) ||
        /blockhash\s*\(/i.test(line)
    );

    issues.push({
      id: "weak-randomness",
      title: "Possible weak randomness source",
      severity: "Medium",
      description:
        "Using block values for randomness can be predictable or manipulated.",
      recommendation:
        "Do not rely on block.timestamp, block.number, or blockhash for secure randomness.",
      line: info.line,
      snippet: info.snippet,
    });
  }

  const hasExternalCall =
    hasPattern(code, /\.call\s*\{/i) ||
    hasPattern(code, /\.call\s*\(/i) ||
    hasPattern(code, /\.transfer\s*\(/i) ||
    hasPattern(code, /\.send\s*\(/i);

  const hasBalanceUpdate =
    lowerCode.includes("balances[") ||
    lowerCode.includes("balance[") ||
    lowerCode.includes("mapping(address => uint") ||
    lowerCode.includes("mapping (address => uint");

  const hasReentrancyGuard =
    lowerCode.includes("nonreentrant") ||
    lowerCode.includes("reentrancyguard");

  if (hasExternalCall && hasBalanceUpdate && !hasReentrancyGuard) {
    const info = findLineInfo(
      code,
      (line) =>
        /\.call\s*\{/i.test(line) ||
        /\.call\s*\(/i.test(line) ||
        /\.transfer\s*\(/i.test(line) ||
        /\.send\s*\(/i.test(line)
    );

    issues.push({
      id: "reentrancy-risk",
      title: "Possible reentrancy risk",
      severity: "High",
      description:
        "This contract appears to send value and manage balances without an obvious reentrancy guard.",
      recommendation:
        "Use checks-effects-interactions and add a reentrancy guard where needed.",
      line: info.line,
      snippet: info.snippet,
    });
  }

  const hasOwner =
    lowerCode.includes("owner") ||
    hasPattern(code, /onlyowner/i) ||
    hasPattern(code, /require\s*\(.+owner/i);

  if (hasOwner) {
    const info = findLineInfo(
      code,
      (line) => /onlyowner/i.test(line) || /owner/i.test(line)
    );

    issues.push({
      id: "owner-privilege",
      title: "Owner privilege detected",
      severity: "Medium",
      description:
        "This contract appears to give special power to an owner or admin account.",
      recommendation:
        "Make sure admin powers are limited, transparent, and protected.",
      line: info.line,
      snippet: info.snippet,
    });
  }

  const hasPauseFeature =
    lowerCode.includes("pause") ||
    lowerCode.includes("paused") ||
    lowerCode.includes("whennotpaused") ||
    lowerCode.includes("whenpaused");

  if (!hasPauseFeature) {
    issues.push({
      id: "no-pause",
      title: "No emergency pause feature found",
      severity: "Low",
      description:
        "This contract does not appear to include a pause or emergency stop mechanism.",
      recommendation:
        "Consider adding a pause feature for emergencies if it fits the use case.",
    });
  }

  const hasUpgradeWords =
    lowerCode.includes("upgrade") ||
    lowerCode.includes("upgradable") ||
    lowerCode.includes("proxy") ||
    lowerCode.includes("initializer");

  if (!hasUpgradeWords) {
    issues.push({
      id: "no-upgrade-path",
      title: "No visible upgrade path",
      severity: "Low",
      description:
        "The contract does not appear to show any obvious upgrade or migration structure.",
      recommendation:
        "Consider whether future upgrades or migrations will be needed.",
    });
  }

  const hasQuantumTerms =
    lowerCode.includes("rotation") ||
    lowerCode.includes("rotate") ||
    lowerCode.includes("migration") ||
    lowerCode.includes("post-quantum") ||
    lowerCode.includes("pq") ||
    lowerCode.includes("signature scheme");

  if (!hasQuantumTerms) {
    issues.push({
      id: "post-quantum-risk",
      title: "No post-quantum migration signs found",
      severity: "Low",
      description:
        "The contract does not show an obvious path for key rotation or post-quantum migration planning.",
      recommendation:
        "Document or design a future migration and key-rotation strategy.",
    });
  }

  if (
    lowerCode.includes("approve(") &&
    !lowerCode.includes("increaseallowance") &&
    !lowerCode.includes("decreaseallowance")
  ) {
    const info = findLineInfo(code, (line) => /approve\s*\(/i.test(line));

    issues.push({
      id: "approve-pattern",
      title: "Basic approve pattern detected",
      severity: "Low",
      description:
        "Token approve logic can be risky if allowance changes are not handled carefully.",
      recommendation:
        "Review ERC20 allowance handling and consider safer allowance update patterns.",
      line: info.line,
      snippet: info.snippet,
    });
  }

  const hasMintWords = lowerCode.includes("mint(");
  const hasBurnWords = lowerCode.includes("burn(");
  const hasOnlyOwner = lowerCode.includes("onlyowner");
  const hasRoleCheck =
    lowerCode.includes("onlyrole") || lowerCode.includes("accesscontrol");

  if ((hasMintWords || hasBurnWords) && !hasOnlyOwner && !hasRoleCheck) {
    const info = findLineInfo(
      code,
      (line) => /mint\s*\(/i.test(line) || /burn\s*\(/i.test(line)
    );

    issues.push({
      id: "mint-burn-access",
      title: "Mint or burn function may lack clear access control",
      severity: "High",
      description:
        "Minting or burning is sensitive and should be protected by clear access control.",
      recommendation:
        "Restrict mint and burn functions with proper owner or role-based checks.",
      line: info.line,
      snippet: info.snippet,
    });
  }

  if (
    lowerCode.includes("address(0)") === false &&
    (lowerCode.includes("transferownership") ||
      lowerCode.includes("setowner") ||
      lowerCode.includes("newowner") ||
      lowerCode.includes("recipient"))
  ) {
    issues.push({
      id: "missing-zero-address-check",
      title: "Possible missing zero-address validation",
      severity: "Medium",
      description:
        "Sensitive address updates may need zero-address validation to avoid broken state.",
      recommendation:
        "Add checks like require(newAddress != address(0)) where appropriate.",
    });
  }

  const hasAdminActions =
    lowerCode.includes("pause") ||
    lowerCode.includes("unpause") ||
    lowerCode.includes("setowner") ||
    lowerCode.includes("transferownership") ||
    lowerCode.includes("mint(") ||
    lowerCode.includes("burn(");

  const hasEvents = lowerCode.includes("event ") || lowerCode.includes("emit ");

  if (hasAdminActions && !hasEvents) {
    issues.push({
      id: "missing-admin-events",
      title: "Important admin actions may be missing events",
      severity: "Low",
      description:
        "Security-sensitive actions are easier to monitor when events are emitted.",
      recommendation:
        "Emit events for admin actions like pause, ownership transfer, mint, and burn.",
    });
  }

  issues = sortIssues(issues);

  const counts = {
    high: issues.filter((issue) => issue.severity === "High").length,
    medium: issues.filter((issue) => issue.severity === "Medium").length,
    low: issues.filter((issue) => issue.severity === "Low").length,
  };

  const overallRisk = getOverallRisk(issues);
  const score = getScore(issues);
  const status = getStatus(score);
  const contractType = detectContractType(lowerCode);
  const tips = getTips(lowerCode, contractType);

  if (issues.length === 0) {
    return {
      issues: [],
      summary: "No obvious issues were found by this basic scanner.",
      overallRisk,
      score,
      status,
      contractType,
      tips,
      counts,
    };
  }

  return {
    issues,
    summary: `Scan finished. ${issues.length} issue${
      issues.length === 1 ? "" : "s"
    } found in this ${contractType.toLowerCase()}.`,
    overallRisk,
    score,
    status,
    contractType,
    tips,
    counts,
  };
}