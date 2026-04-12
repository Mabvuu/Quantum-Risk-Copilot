import { ScanIssue } from "@/types/report";

type ExplainIssuesParams = {
  code: string;
  issues: ScanIssue[];
  contractType: string;
  overallRisk: "None" | "Low" | "Medium" | "High";
  score: number;
  status: "Good" | "Warning" | "Risky";
};

function buildPrompt({
  code,
  issues,
  contractType,
  overallRisk,
  score,
  status,
}: ExplainIssuesParams) {
  const formattedIssues =
    issues.length === 0
      ? "No issues were detected by the rule-based scanner."
      : issues
          .map((issue, index) => {
            return `${index + 1}. ${issue.title}
Severity: ${issue.severity}
Description: ${issue.description}
Recommendation: ${issue.recommendation}
Line: ${issue.line ?? "Unknown"}
Snippet: ${issue.snippet ?? "N/A"}`;
          })
          .join("\n\n");

  return `
You are helping explain a blockchain smart contract security scan.

Your job:
- Explain the scan result in simple English.
- Be practical and short.
- Use plain language.
- Do not invent vulnerabilities that were not listed.
- If the scanner may be wrong, say it may need human review.
- Mention quantum-risk or upgrade planning briefly if relevant.
- End with a short "What to fix first" section.

Contract type: ${contractType}
Overall risk: ${overallRisk}
Security score: ${score}/100
Status: ${status}

Detected issues:
${formattedIssues}

Smart contract code:
${code}

Return clean plain text with these headings:
1. Overall explanation
2. Why these issues matter
3. What to fix first
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