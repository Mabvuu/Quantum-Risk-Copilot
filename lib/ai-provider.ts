import { ScanIssue } from "@/types/report";

type Severity = "None" | "Low" | "Medium" | "High";
type Status = "Good" | "Warning" | "Risky";

type QuantumRisk = {
  id: string;
  title: string;
  severity: "Low" | "Medium" | "High";
  description: string;
  recommendation: string;
  line?: number;
  snippet?: string;
};

type CrossModuleRisk = {
  id: string;
  title: string;
  severity: "Low" | "Medium" | "High";
  description: string;
  recommendation: string;
  modules: string[];
};

type ModuleScanResult = {
  moduleId: string;
  moduleName: string;
  issues: ScanIssue[];
  quantumRisks: QuantumRisk[];
  summary: string;
  overallRisk: Severity;
  score: number;
  status: Status;
  contractType: string;
  tips: string[];
  counts: {
    high: number;
    medium: number;
    low: number;
  };
  quantumCounts: {
    high: number;
    medium: number;
    low: number;
  };
};

type ExplainIssuesParams = {
  code: string;
  issues: ScanIssue[];
  quantumRisks: QuantumRisk[];
  crossModuleRisks: CrossModuleRisk[];
  moduleResults: ModuleScanResult[];
  contractType: string;
  overallRisk: Severity;
  score: number;
  status: Status;
  systemName: string;
  architectureNotes: string;
  touchpoints: string[];
};

function formatIssues(issues: ScanIssue[]) {
  if (issues.length === 0) {
    return "No standard security issues were detected by the rule-based scanner.";
  }

  return issues
    .map((issue, index) => {
      return `${index + 1}. ${issue.title}
Severity: ${issue.severity}
Description: ${issue.description}
Recommendation: ${issue.recommendation}
Line: ${issue.line ?? "Unknown"}
Snippet: ${issue.snippet ?? "N/A"}`;
    })
    .join("\n\n");
}

function formatQuantumRisks(risks: QuantumRisk[]) {
  if (risks.length === 0) {
    return "No quantum risks were detected by the scanner.";
  }

  return risks
    .map((risk, index) => {
      return `${index + 1}. ${risk.title}
Severity: ${risk.severity}
Description: ${risk.description}
Recommendation: ${risk.recommendation}
Line: ${risk.line ?? "Unknown"}
Snippet: ${risk.snippet ?? "N/A"}`;
    })
    .join("\n\n");
}

function formatCrossModuleRisks(risks: CrossModuleRisk[]) {
  if (risks.length === 0) {
    return "No cross-module risks were detected.";
  }

  return risks
    .map((risk, index) => {
      return `${index + 1}. ${risk.title}
Severity: ${risk.severity}
Description: ${risk.description}
Recommendation: ${risk.recommendation}
Modules: ${risk.modules.join(", ") || "N/A"}`;
    })
    .join("\n\n");
}

function formatModuleResults(moduleResults: ModuleScanResult[]) {
  if (moduleResults.length === 0) {
    return "No module-level scan breakdown was provided.";
  }

  return moduleResults
    .map((module, index) => {
      return `${index + 1}. ${module.moduleName}
Contract type: ${module.contractType}
Overall risk: ${module.overallRisk}
Score: ${module.score}/100
Status: ${module.status}
Summary: ${module.summary}
Issue count: ${module.issues.length}
Quantum risk count: ${module.quantumRisks.length}`;
    })
    .join("\n\n");
}

function buildPrompt({
  code,
  issues,
  quantumRisks,
  crossModuleRisks,
  moduleResults,
  contractType,
  overallRisk,
  score,
  status,
  systemName,
  architectureNotes,
  touchpoints,
}: ExplainIssuesParams) {
  return `
You are helping explain a blockchain system security scan.

Your job:
- Explain the result in simple English.
- Be practical and short.
- Use plain language.
- Do not invent vulnerabilities that were not listed.
- If the scanner may be wrong, say it may need human review.
- Mention quantum-risk planning where relevant.
- Focus on the bigger system too, not only one code block.
- End with a short "What to fix first" section.

System name: ${systemName}
System type: ${contractType}
Overall risk: ${overallRisk}
Security score: ${score}/100
Status: ${status}
Architecture notes: ${architectureNotes || "N/A"}
Touchpoints: ${touchpoints.length > 0 ? touchpoints.join(", ") : "None"}

Detected standard issues:
${formatIssues(issues)}

Detected quantum risks:
${formatQuantumRisks(quantumRisks)}

Detected cross-module risks:
${formatCrossModuleRisks(crossModuleRisks)}

Module summaries:
${formatModuleResults(moduleResults)}

Scanned code or combined modules:
${code}

Return clean plain text with these headings:
1. Overall explanation
2. Why these issues matter
3. System-level concerns
4. What to fix first
`.trim();
}

export async function explainScanWithGemini(params: ExplainIssuesParams) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const prompt = buildPrompt(params);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message || "Gemini failed to generate an explanation.";
    throw new Error(message);
  }

  const explanation =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    "No explanation was returned.";

  return {
    explanation,
  };
}