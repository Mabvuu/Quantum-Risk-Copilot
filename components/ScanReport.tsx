"use client";

import ReportCard from "./ReportCard";
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

type Props = {
  data: {
    issues: ScanIssue[];
    quantumRisks: QuantumRisk[];
    summary: string;
    score: number;
    status: Status;
    overallRisk?: Severity;
    contractType?: string;
    systemName?: string;
    systemSummary?: string;
    modulesScanned?: number;
    touchpoints?: string[];
    crossModuleRisks?: CrossModuleRisk[];
    moduleResults?: ModuleScanResult[];
    counts?: {
      high: number;
      medium: number;
      low: number;
    };
    quantumCounts?: {
      high: number;
      medium: number;
      low: number;
    };
  };
};

function getRiskClasses(risk: Severity) {
  if (risk === "High") return "border-red-800 bg-red-950/20 text-red-300";
  if (risk === "Medium") {
    return "border-yellow-800 bg-yellow-950/20 text-yellow-300";
  }
  if (risk === "Low") return "border-blue-800 bg-blue-950/20 text-blue-300";
  return "border-green-800 bg-green-950/20 text-green-300";
}

function getStatusClasses(status: Status) {
  if (status === "Risky") return "border-red-800 bg-red-950/20 text-red-300";
  if (status === "Warning") {
    return "border-yellow-800 bg-yellow-950/20 text-yellow-300";
  }
  return "border-green-800 bg-green-950/20 text-green-300";
}

export default function ScanReport({ data }: Props) {
  const moduleResults = data.moduleResults || [];
  const crossModuleRisks = data.crossModuleRisks || [];
  const touchpoints = data.touchpoints || [];
  const overallRisk = data.overallRisk || "None";
  const counts = data.counts || { high: 0, medium: 0, low: 0 };
  const quantumCounts = data.quantumCounts || { high: 0, medium: 0, low: 0 };

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <h2 className="text-lg font-bold text-white">Summary</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-black p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              System
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {data.systemName || "Unnamed System"}
            </p>
          </div>

          <div
            className={`rounded-lg border p-3 ${getRiskClasses(overallRisk)}`}
          >
            <p className="text-xs uppercase tracking-wide">Overall Risk</p>
            <p className="mt-1 text-sm font-semibold">{overallRisk}</p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Score
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {data.score}/100
            </p>
          </div>

          <div
            className={`rounded-lg border p-3 ${getStatusClasses(data.status)}`}
          >
            <p className="text-xs uppercase tracking-wide">Status</p>
            <p className="mt-1 text-sm font-semibold">{data.status}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-800 bg-black p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            System Summary
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            {data.systemSummary || data.summary}
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-black p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Modules
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {data.modulesScanned || moduleResults.length}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Issues
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {data.issues.length}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Quantum Risks
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {data.quantumRisks.length}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Cross-Module Risks
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {crossModuleRisks.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-red-900 bg-red-950/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
            High Issues
          </p>
          <p className="mt-2 text-2xl font-bold text-red-300">{counts.high}</p>
        </div>

        <div className="rounded-xl border border-yellow-900 bg-yellow-950/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow-400">
            Medium Issues
          </p>
          <p className="mt-2 text-2xl font-bold text-yellow-300">
            {counts.medium}
          </p>
        </div>

        <div className="rounded-xl border border-blue-900 bg-blue-950/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
            Low Issues
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-300">{counts.low}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-red-900 bg-red-950/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
            High Quantum
          </p>
          <p className="mt-2 text-2xl font-bold text-red-300">
            {quantumCounts.high}
          </p>
        </div>

        <div className="rounded-xl border border-yellow-900 bg-yellow-950/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow-400">
            Medium Quantum
          </p>
          <p className="mt-2 text-2xl font-bold text-yellow-300">
            {quantumCounts.medium}
          </p>
        </div>

        <div className="rounded-xl border border-blue-900 bg-blue-950/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
            Low Quantum
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-300">
            {quantumCounts.low}
          </p>
        </div>
      </div>

      {touchpoints.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="text-lg font-bold text-white">Touchpoints</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {touchpoints.map((item) => (
              <span
                key={item}
                className="rounded-full border border-zinc-700 bg-black px-3 py-1 text-xs text-zinc-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <h2 className="text-lg font-bold text-white">Security Issues</h2>

        {data.issues.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">No issues found</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.issues.map((issue) => (
              <ReportCard
                key={issue.id}
                title={issue.title}
                severity={issue.severity}
                description={issue.description}
                recommendation={issue.recommendation}
                line={issue.line}
                snippet={issue.snippet}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-yellow-800 bg-yellow-950/10 p-4">
        <h2 className="text-lg font-bold text-white">Quantum Risks</h2>

        {data.quantumRisks.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">No quantum risks</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.quantumRisks.map((risk) => (
              <ReportCard
                key={risk.id}
                title={risk.title}
                severity={risk.severity}
                description={risk.description}
                recommendation={risk.recommendation}
                line={risk.line}
                snippet={risk.snippet}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-purple-800 bg-purple-950/10 p-4">
        <h2 className="text-lg font-bold text-white">Cross-Module Risks</h2>

        {crossModuleRisks.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">No cross-module risks</p>
        ) : (
          <div className="mt-4 space-y-3">
            {crossModuleRisks.map((risk) => (
              <div
                key={risk.id}
                className="rounded-xl border border-zinc-800 bg-black p-4"
              >
                <ReportCard
                  title={risk.title}
                  severity={risk.severity}
                  description={risk.description}
                  recommendation={risk.recommendation}
                />

                {risk.modules.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {risk.modules.map((module) => (
                      <span
                        key={module}
                        className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
                      >
                        {module}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <h2 className="text-lg font-bold text-white">Module Results</h2>

        {moduleResults.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">No module results</p>
        ) : (
          <div className="mt-4 space-y-4">
            {moduleResults.map((module) => (
              <div
                key={module.moduleId}
                className="rounded-xl border border-zinc-800 bg-black p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {module.moduleName}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {module.contractType}
                    </p>
                  </div>

                  <div
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${getRiskClasses(
                      module.overallRisk
                    )}`}
                  >
                    {module.overallRisk}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Score
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {module.score}/100
                    </p>
                  </div>

                  <div
                    className={`rounded-lg border p-3 ${getStatusClasses(
                      module.status
                    )}`}
                  >
                    <p className="text-xs uppercase tracking-wide">Status</p>
                    <p className="mt-1 text-sm font-semibold">{module.status}</p>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Issues
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {module.issues.length}
                    </p>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Quantum
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {module.quantumRisks.length}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Module Summary
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">{module.summary}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}