export type Severity = "Low" | "Medium" | "High";

export type ScanIssue = {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  recommendation: string;
  line?: number;
  snippet?: string;
};

export type ScanResult = {
  issues: ScanIssue[];
  summary: string;
  overallRisk: Severity | "None";
  score: number;
  status: "Good" | "Warning" | "Risky";
  contractType: string;
  tips: string[];
  counts: {
    high: number;
    medium: number;
    low: number;
  };
};

export type AIExplainResult = {
  explanation: string;
};