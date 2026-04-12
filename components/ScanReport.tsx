"use client";

type Issue = {
  id: string;
  title: string;
  severity: string;
  description: string;
  recommendation: string;
  line?: number;
  snippet?: string;
};

type QuantumRisk = Issue;

type Props = {
  data: {
    issues: Issue[];
    quantumRisks: QuantumRisk[];
    summary: string;
    score: number;
    status: string;
  };
};

export default function ScanReport({ data }: Props) {
  return (
    <div className="mt-6 space-y-6">

      {/* SUMMARY */}
      <div className="p-4 border rounded-lg">
        <h2 className="text-lg font-bold">Summary</h2>
        <p>{data.summary}</p>
        <p>Score: {data.score}</p>
        <p>Status: {data.status}</p>
      </div>

      {/* NORMAL ISSUES */}
      <div className="p-4 border rounded-lg">
        <h2 className="text-lg font-bold">Security Issues</h2>

        {data.issues.length === 0 && <p>No issues found</p>}

        {data.issues.map((issue) => (
          <div key={issue.id} className="mt-3 p-3 border rounded">
            <p className="font-semibold">{issue.title}</p>
            <p>Severity: {issue.severity}</p>
            <p>{issue.description}</p>
            <p className="text-sm text-green-600">
              Fix: {issue.recommendation}
            </p>
          </div>
        ))}
      </div>

      {/* QUANTUM RISKS */}
      <div className="p-4 border rounded-lg bg-yellow-50">
        <h2 className="text-lg font-bold">Quantum Risks</h2>

        {data.quantumRisks.length === 0 && <p>No quantum risks</p>}

        {data.quantumRisks.map((risk) => (
          <div key={risk.id} className="mt-3 p-3 border rounded">
            <p className="font-semibold">{risk.title}</p>
            <p>Severity: {risk.severity}</p>
            <p>{risk.description}</p>
            <p className="text-sm text-blue-600">
              Fix: {risk.recommendation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}