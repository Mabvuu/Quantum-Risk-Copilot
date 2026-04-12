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

type FunctionBlock = {
  name: string;
  headerLine: number;
  header: string;
  body: string;
};

function hasPattern(code: string, pattern: RegExp): boolean {
  return pattern.test(code);
}

function sortBySeverity<T extends { severity: Severity }>(items: T[]): T[] {
  const order: Record<Severity, number> = {
    High: 0,
    Medium: 1,
    Low: 2,
  };

  return [...items].sort((a, b) => order[a.severity] - order[b.severity]);
}

function getOverallRisk(items: Array<{ severity: Severity }>): OverallRisk {
  if (items.some((item) => item.severity === "High")) return "High";
  if (items.some((item) => item.severity === "Medium")) return "Medium";
  if (items.some((item) => item.severity === "Low")) return "Low";
  return "None";
}

function getSeverityWeight(severity: Severity): number {
  if (severity === "High") return 25;
  if (severity === "Medium") return 12;
  return 5;
}

function getScore(items: Array<{ severity: Severity }>): number {
  const totalPenalty = items.reduce(
    (sum, item) => sum + getSeverityWeight(item.severity),
    0
  );

  const score = 100 - totalPenalty;
  return score < 0 ? 0 : score;
}

function getStatus(score: number): ScanStatus {
  if (score >= 80) return "Good";
  if (score >= 50) return "Warning";
  return "Risky";
}

function buildCounts(items: Array<{ severity: Severity }>): CountBuckets {
  return {
    high: items.filter((item) => item.severity === "High").length,
    medium: items.filter((item) => item.severity === "Medium").length,
    low: items.filter((item) => item.severity === "Low").length,
  };
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
    lowerCode.includes("onlyrole") ||
    lowerCode.includes("owner")
  ) {
    return "Access-Control Contract";
  }

  if (
    lowerCode.includes("vault") ||
    lowerCode.includes("treasury") ||
    lowerCode.includes("escrow")
  ) {
    return "Treasury Contract";
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

  if (!lowerCode.includes("//") && !lowerCode.includes("/*")) {
    tips.push("Add comments for important logic.");
  }

  if (lowerCode.includes(".call{value:") || lowerCode.includes(".call(")) {
    tips.push("Review checks-effects-interactions around external value transfers.");
  }

  return [...new Set(tips)];
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

function makeIssueId(base: string, line?: number, suffix?: string) {
  return `${base}-${line ?? "match"}${suffix ? `-${suffix}` : ""}`;
}

function addIssue(
  issues: ScanIssue[],
  code: string,
  config: {
    id: string;
    title: string;
    severity: Severity;
    description: string;
    recommendation: string;
    matcher: RegExp;
  }
) {
  if (!hasPattern(code, config.matcher)) return;

  const info = findLineInfo(code, (line) => config.matcher.test(line));

  issues.push({
    id: makeIssueId(config.id, info.line),
    title: config.title,
    severity: config.severity,
    description: config.description,
    recommendation: config.recommendation,
    line: info.line,
    snippet: info.snippet,
  });
}

function extractFunctionBlocks(code: string): FunctionBlock[] {
  const lines = code.split("\n");
  const functionIndexes: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (/\bfunction\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(lines[i])) {
      functionIndexes.push(i);
    }
  }

  return functionIndexes.map((start, index) => {
    const end = index + 1 < functionIndexes.length ? functionIndexes[index + 1] : lines.length;
    const chunk = lines.slice(start, end);
    const header = chunk[0] || "";
    const match = header.match(/\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);

    return {
      name: match?.[1] || `function-${start + 1}`,
      headerLine: start + 1,
      header,
      body: chunk.join("\n"),
    };
  });
}

function hasAccessControl(text: string): boolean {
  return (
    /\bonlyOwner\b|\bonlyRole\b|\bAccessControl\b|\baccesscontrol\b/i.test(text) ||
    /\brequire\s*\(\s*msg\.sender\s*==/i.test(text) ||
    /\brequire\s*\(\s*_msgSender\(\)\s*==/i.test(text) ||
    /\bif\s*\(\s*msg\.sender\s*!=/i.test(text)
  );
}

function hasZeroAddressCheck(text: string): boolean {
  return /address\s*\(\s*0\s*\)/i.test(text);
}

function getSensitiveFunctionBlocks(blocks: FunctionBlock[]) {
  return blocks.filter((block) =>
    /^(mint|burn|pause|unpause|upgrade|upgradeTo|upgradeToAndCall|setOwner|transferOwnership|setAdmin|changeAdmin|updateAdmin|setSigner|updateSigner|updateBridgeSigner|kill|destroy|withdrawAll|sweep|emergencyWithdraw|emergencyBridgeRelease|initialize)$/i.test(
      block.name
    )
  );
}

function addFunctionIssue(
  issues: ScanIssue[],
  block: FunctionBlock,
  config: {
    id: string;
    title: string;
    severity: Severity;
    description: string;
    recommendation: string;
  }
) {
  issues.push({
    id: makeIssueId(config.id, block.headerLine, block.name),
    title: config.title,
    severity: config.severity,
    description: config.description,
    recommendation: config.recommendation,
    line: block.headerLine,
    snippet: block.header.trim(),
  });
}

function scanSingleModule(code: string): ScanResult {
  const issues: ScanIssue[] = [];
  const lowerCode = code.toLowerCase();
  const functionBlocks = extractFunctionBlocks(code);

  addIssue(issues, code, {
    id: "tx-origin",
    title: "Use of tx.origin",
    severity: "High",
    description: "Using tx.origin for authorization is unsafe.",
    recommendation: "Use msg.sender instead.",
    matcher: /tx\.origin/,
  });

  addIssue(issues, code, {
    id: "delegatecall",
    title: "Use of delegatecall",
    severity: "High",
    description: "delegatecall can execute external logic in your contract context.",
    recommendation: "Use it only with very strict trust and upgrade controls.",
    matcher: /delegatecall/,
  });

  addIssue(issues, code, {
    id: "selfdestruct",
    title: "Use of selfdestruct",
    severity: "High",
    description: "selfdestruct can break assumptions and destroy contract state.",
    recommendation: "Avoid selfdestruct unless absolutely required.",
    matcher: /selfdestruct|suicide\s*\(/,
  });

  addIssue(issues, code, {
    id: "block-timestamp",
    title: "Use of block.timestamp",
    severity: "Medium",
    description: "block.timestamp can be influenced slightly by validators.",
    recommendation: "Do not use it for sensitive randomness or critical logic.",
    matcher: /block\.timestamp|\bnow\b/,
  });

  addIssue(issues, code, {
    id: "low-level-call",
    title: "Low-level call detected",
    severity: "Medium",
    description: "Low-level calls can fail silently or widen attack surface.",
    recommendation: "Check return values and protect external interactions carefully.",
    matcher: /\.call\s*\{|\.\s*call\s*\(/,
  });

  addIssue(issues, code, {
    id: "unchecked-block",
    title: "Unchecked block used",
    severity: "Low",
    description: "unchecked disables Solidity overflow checks.",
    recommendation: "Use unchecked only when you are fully sure it is safe.",
    matcher: /\bunchecked\s*\{/,
  });

  addIssue(issues, code, {
    id: "inline-assembly",
    title: "Inline assembly detected",
    severity: "Low",
    description: "Assembly can bypass Solidity safety checks and make review harder.",
    recommendation: "Review assembly carefully and keep it as small as possible.",
    matcher: /\bassembly\s*\{/,
  });

  addIssue(issues, code, {
    id: "loop-over-dynamic-data",
    title: "Loop over dynamic data",
    severity: "Low",
    description: "Loops over dynamic arrays can become gas-heavy and cause failed transactions.",
    recommendation: "Be careful with unbounded loops over user-controlled arrays.",
    matcher: /\bfor\s*\(.*\.length|while\s*\(/,
  });

  for (const block of functionBlocks) {
    const blockText = block.body;
    const lowerBlock = blockText.toLowerCase();
    const transferIndex = blockText.search(/\.call\s*\{[^}]*value\s*:|\.call\s*\(|\.transfer\s*\(|\.send\s*\(/i);
    const stateUpdateIndex = blockText.search(
      /balances\s*\[[^\]]+\]\s*=\s*0|balances\s*\[[^\]]+\]\s*-=|delete\s+balances\s*\[|amounts\s*\[[^\]]+\]\s*=\s*0|credits\s*\[[^\]]+\]\s*=\s*0/i
    );

    if (transferIndex !== -1 && stateUpdateIndex > transferIndex) {
      addFunctionIssue(issues, block, {
        id: "reentrancy-pattern",
        title: "Possible reentrancy pattern",
        severity: "High",
        description:
          "This function appears to send value before updating state.",
        recommendation:
          "Update state before the external call and consider a reentrancy guard.",
      });
    }

    const isRandomnessFunction =
      /(random|winner|lottery|raffle|pickwinner|pickrandom)/i.test(block.name) ||
      /%\s*[A-Za-z0-9_().]+/.test(blockText);

    if (
      /(block\.timestamp|blockhash|block\.prevrandao)/i.test(blockText) &&
      isRandomnessFunction
    ) {
      addFunctionIssue(issues, block, {
        id: "weak-randomness",
        title: "Weak randomness source",
        severity: "High",
        description:
          "This function appears to use block data for randomness, which is predictable or influenceable.",
        recommendation:
          "Do not use block variables for secure randomness. Use a safer randomness design.",
      });
    }

    if (
      /target\s*\.call\s*\(|address\s*\([^)]+\)\.call\s*\(/i.test(blockText) &&
      !hasAccessControl(blockText)
    ) {
      addFunctionIssue(issues, block, {
        id: "arbitrary-external-call",
        title: "Arbitrary external call without clear access control",
        severity: "High",
        description:
          "This function appears to let the contract call an external target without obvious access control.",
        recommendation:
          "Restrict arbitrary external call paths to trusted admins and validate targets carefully.",
      });
    }

    if (
      /delegatecall/i.test(blockText) &&
      !hasAccessControl(blockText)
    ) {
      addFunctionIssue(issues, block, {
        id: "unprotected-delegatecall",
        title: "delegatecall without clear access control",
        severity: "High",
        description:
          "This function appears to expose delegatecall without clear authorization.",
        recommendation:
          "Do not expose delegatecall to arbitrary callers.",
      });
    }

    if (
      /^(initialize)$/i.test(block.name) &&
      !hasAccessControl(blockText)
    ) {
      addFunctionIssue(issues, block, {
        id: "unprotected-initialize",
        title: "Initializer may be unprotected",
        severity: "High",
        description:
          "An initialize function was found without obvious authorization checks.",
        recommendation:
          "Protect initialize logic so it cannot be called by arbitrary users.",
      });
    }

    if (
      /^(setOwner|transferOwnership|setAdmin|changeAdmin|updateAdmin|setSigner|updateSigner|updateBridgeSigner)$/i.test(
        block.name
      ) &&
      !hasZeroAddressCheck(blockText)
    ) {
      addFunctionIssue(issues, block, {
        id: "missing-zero-address-check",
        title: "Missing zero-address validation",
        severity: "Medium",
        description:
          "This admin update function does not show an obvious zero-address check.",
        recommendation:
          "Validate new admin or signer addresses before saving them.",
      });
    }

    if (
      /^(withdraw|withdrawAll|sweep|emergencyWithdraw|emergencyBridgeRelease)$/i.test(
        block.name
      ) &&
      !hasAccessControl(blockText) &&
      /(to\.transfer|msg\.sender\.call|payable\s*\([^)]+\)\.call|\.transfer\s*\(|\.send\s*\()/i.test(
        blockText
      )
    ) {
      addFunctionIssue(issues, block, {
        id: "withdrawal-without-clear-access-control",
        title: "Withdrawal path without clear access control",
        severity: "High",
        description:
          "This withdrawal-like function performs a value transfer without obvious authorization checks.",
        recommendation:
          "Protect emergency or admin withdrawal flows with strict access control.",
      });
    }

    if (
      /\bpublic\b|\bexternal\b/i.test(block.header) &&
      /return\s+uint256\s*\(\s*keccak256|keccak256\s*\(/i.test(lowerBlock) &&
      /(block\.timestamp|blockhash|block\.prevrandao)/i.test(blockText)
    ) {
      addFunctionIssue(issues, block, {
        id: "predictable-randomness-output",
        title: "Predictable randomness output",
        severity: "Medium",
        description:
          "This public randomness-like output appears derived from predictable block values.",
        recommendation:
          "Do not expose security decisions based on predictable block-derived values.",
      });
    }
  }

  for (const block of getSensitiveFunctionBlocks(functionBlocks)) {
    if (!hasAccessControl(block.body)) {
      addFunctionIssue(issues, block, {
        id: "missing-sensitive-access-control",
        title: "Sensitive function may lack access control",
        severity: "High",
        description:
          "A sensitive function was found without obvious access control nearby.",
        recommendation:
          "Protect admin, signer, pause, upgrade, destroy, and emergency paths with strict authorization.",
      });
    }
  }

  const sortedIssues = sortBySeverity(
    issues.filter(
      (issue, index, list) =>
        list.findIndex((item) => item.id === issue.id) === index
    )
  );

  const counts = buildCounts(sortedIssues);

  const quantum = scanQuantum(code);
  const quantumRisks = sortBySeverity(quantum.risks);
  const quantumCounts = quantum.counts;

  const allSignals = [...sortedIssues, ...quantumRisks];
  const overallRisk = getOverallRisk(allSignals);
  const score = getScore(allSignals);
  const status = getStatus(score);
  const contractType = detectContractType(lowerCode);
  const tips = getTips(lowerCode, contractType);

  return {
    issues: sortedIssues,
    quantumRisks,
    summary:
      sortedIssues.length === 0 && quantumRisks.length === 0
        ? "No obvious issues found."
        : `Scan finished. ${sortedIssues.length} issues. ${quantumRisks.length} quantum risks.`,
    overallRisk,
    score,
    status,
    contractType,
    tips,
    counts,
    quantumCounts,
  };
}

function normalizeTouchpoints(touchpoints?: string[]): string[] {
  if (!Array.isArray(touchpoints)) return [];

  return [...new Set(touchpoints.map((item) => item.trim()).filter(Boolean))];
}

function detectCrossModuleRisks(input: SystemScanInput): CrossModuleRisk[] {
  const risks: CrossModuleRisk[] = [];
  const touchpoints = normalizeTouchpoints(input.touchpoints);
  const joinedTouchpoints = touchpoints.join(" ").toLowerCase();
  const joinedNotes =
    `${input.architectureNotes || ""} ${joinedTouchpoints}`.toLowerCase();
  const moduleNames = input.modules.map((module) => module.name);
  const modulesWithPrivilegedLogic = input.modules.filter((module) =>
    /(owner|admin|accesscontrol|onlyowner|onlyrole|upgrade|proxy)/i.test(
      module.code
    )
  );

  const assetModules = input.modules.filter((module) =>
    /(erc20|erc721|treasury|vault|escrow|transfer\()/i.test(module.code)
  );

  const signatureModules = input.modules.filter((module) =>
    /(ecrecover|signature|permit\s*\(|ecdsa)/i.test(module.code)
  );

  if (input.modules.length > 1 && modulesWithPrivilegedLogic.length > 1) {
    risks.push({
      id: "shared-privileged-surface",
      title: "Privileged logic spread across modules",
      severity: "Medium",
      description:
        "Multiple modules appear to contain owner/admin/upgrade logic, which increases coordination and control risk.",
      recommendation:
        "Map admin boundaries clearly and reduce shared privileged paths where possible.",
      modules: modulesWithPrivilegedLogic.map((module) => module.name),
    });
  }

  if (
    assetModules.length > 0 &&
    modulesWithPrivilegedLogic.some((module) =>
      /(upgrade|proxy|delegatecall|initializer)/i.test(module.code)
    )
  ) {
    risks.push({
      id: "upgradeable-asset-path",
      title: "Upgradeable path near asset-handling modules",
      severity: "High",
      description:
        "Asset-handling logic appears close to upgrade or proxy logic. That widens the blast radius if admin control is abused or compromised.",
      recommendation:
        "Separate asset custody from upgrade authority and add strict review around upgrade flows.",
      modules: [
        ...new Set([
          ...assetModules.map((module) => module.name),
          ...modulesWithPrivilegedLogic
            .filter((module) =>
              /(upgrade|proxy|delegatecall|initializer)/i.test(module.code)
            )
            .map((module) => module.name),
        ]),
      ],
    });
  }

  if (
    signatureModules.length > 0 &&
    /(bridge|oracle|relayer|keeper|offchain|cross-chain|cross chain)/i.test(
      joinedNotes
    )
  ) {
    risks.push({
      id: "quantum-touchpoint-risk",
      title: "Signature-heavy flow tied to off-chain or cross-chain touchpoints",
      severity: "High",
      description:
        "The system appears to rely on signatures while also interacting with bridges, relayers, or other off-chain touchpoints.",
      recommendation:
        "Document trust assumptions and plan a quantum-safe migration path for authentication and verification flows.",
      modules: signatureModules.map((module) => module.name),
    });
  }

  if (touchpoints.length > 0 && input.modules.length > 1) {
    risks.push({
      id: "integration-boundaries",
      title: "System integration boundaries need explicit review",
      severity: "Low",
      description:
        "This system has multiple modules and declared touchpoints. Integration assumptions can become risks even when single modules look safe.",
      recommendation:
        "Document which module trusts which external touchpoint, and what validation happens at each boundary.",
      modules: moduleNames,
    });
  }

  return sortBySeverity(risks);
}

function aggregateCounts(moduleResults: ModuleScanResult[]) {
  return moduleResults.reduce(
    (totals, result) => ({
      high: totals.high + result.counts.high,
      medium: totals.medium + result.counts.medium,
      low: totals.low + result.counts.low,
    }),
    { high: 0, medium: 0, low: 0 }
  );
}

function aggregateQuantumCounts(moduleResults: ModuleScanResult[]) {
  return moduleResults.reduce(
    (totals, result) => ({
      high: totals.high + result.quantumCounts.high,
      medium: totals.medium + result.quantumCounts.medium,
      low: totals.low + result.quantumCounts.low,
    }),
    { high: 0, medium: 0, low: 0 }
  );
}

function toSystemInput(input: string | SystemScanInput): SystemScanInput {
  if (typeof input === "string") {
    return {
      systemName: "Single Contract Scan",
      architectureNotes: "",
      touchpoints: [],
      modules: [
        {
          id: "module-1",
          name: "Primary Contract",
          code: input,
        },
      ],
    };
  }

  return {
    systemName: input.systemName?.trim() || "System Scan",
    architectureNotes: input.architectureNotes?.trim() || "",
    touchpoints: normalizeTouchpoints(input.touchpoints),
    modules: input.modules
      .map((module, index) => ({
        id: module.id?.trim() || `module-${index + 1}`,
        name: module.name.trim() || `Module ${index + 1}`,
        code: module.code,
      }))
      .filter((module) => module.code.trim().length > 0),
  };
}

export function scanSmartContract(
  input: string | SystemScanInput
): SystemScanResult {
  const systemInput = toSystemInput(input);

  const moduleResults: ModuleScanResult[] = systemInput.modules.map((module) => {
    const result = scanSingleModule(module.code);

    return {
      ...result,
      moduleId: module.id || module.name,
      moduleName: module.name,
    };
  });

  const crossModuleRisks = detectCrossModuleRisks(systemInput);
  const flatIssues = moduleResults.flatMap((result) => result.issues);
  const flatQuantumRisks = moduleResults.flatMap(
    (result) => result.quantumRisks
  );

  const allSignals = [...flatIssues, ...flatQuantumRisks, ...crossModuleRisks];
  const counts = aggregateCounts(moduleResults);
  const quantumCounts = aggregateQuantumCounts(moduleResults);
  const overallRisk = getOverallRisk(allSignals);
  const score = getScore(allSignals);
  const status = getStatus(score);

  const contractType =
    moduleResults.length > 1
      ? "System / Multi-Module"
      : moduleResults[0]?.contractType || "General Smart Contract";

  const tips = [
    ...new Set([
      ...moduleResults.flatMap((result) => result.tips),
      ...(crossModuleRisks.length > 0
        ? [
            "Review how modules trust each other, not just each module by itself.",
            "Document external touchpoints and which module is responsible for validating them.",
          ]
        : []),
    ]),
  ];

  const systemSummary =
    moduleResults.length === 1
      ? moduleResults[0]?.summary || "Scan finished."
      : `System scan finished. ${moduleResults.length} modules scanned. ${flatIssues.length} issues. ${flatQuantumRisks.length} quantum risks. ${crossModuleRisks.length} cross-module risks.`;

  return {
    issues: flatIssues,
    quantumRisks: flatQuantumRisks,
    summary: systemSummary,
    overallRisk,
    score,
    status,
    contractType,
    tips,
    counts,
    quantumCounts,
    systemName: systemInput.systemName || "System Scan",
    systemSummary,
    architectureNotes: systemInput.architectureNotes || "",
    touchpoints: systemInput.touchpoints || [],
    modulesScanned: moduleResults.length,
    moduleResults,
    crossModuleRisks,
  };
}