"use client";

import { useEffect, useMemo, useState } from "react";
import ReportCard from "./ReportCard";
import { ScanIssue } from "@/types/report";
import {
  saferSampleContract,
  vulnerableSampleContract,
} from "@/lib/sampleContracts";

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

type SystemModuleInput = {
  id: string;
  name: string;
  code: string;
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

type CrossModuleRisk = {
  id: string;
  title: string;
  severity: "Low" | "Medium" | "High";
  description: string;
  recommendation: string;
  modules: string[];
};

type SystemScanResult = {
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
  systemName?: string;
  systemSummary?: string;
  architectureNotes?: string;
  touchpoints?: string[];
  modulesScanned?: number;
  moduleResults?: ModuleScanResult[];
  crossModuleRisks?: CrossModuleRisk[];
};

type ScanHistoryItem = {
  id: string;
  savedAt: string;
  systemName: string;
  architectureNotes: string;
  touchpoints: string[];
  modules: SystemModuleInput[];
  result: SystemScanResult;
  aiExplanation: string;
};

const STORAGE_KEY = "scanner-system-scan-history";

function createEmptyModule(index: number): SystemModuleInput {
  return {
    id: `module-${Date.now()}-${index}`,
    name: `Module ${index}`,
    code: "",
  };
}

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

function parseTouchpoints(value: string): string[] {
  return [...new Set(
    value
      .split(/\n|,/g)
      .map((item) => item.trim())
      .filter(Boolean)
  )];
}

function combineModulesForAI(modules: SystemModuleInput[]) {
  return modules
    .filter((module) => module.code.trim())
    .map(
      (module) =>
        `// MODULE: ${module.name}\n${module.code.trim()}`
    )
    .join("\n\n");
}

export default function ScannerForm() {
  const [systemName, setSystemName] = useState("Quantum Risk Copilot System");
  const [architectureNotes, setArchitectureNotes] = useState("");
  const [touchpointsText, setTouchpointsText] = useState(
    "bridge\noracle\nrelayer"
  );
  const [modules, setModules] = useState<SystemModuleInput[]>([
    createEmptyModule(1),
  ]);

  const [hasScanned, setHasScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [error, setError] = useState("");
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiError, setAiError] = useState("");
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [result, setResult] = useState<SystemScanResult | null>(null);

  const touchpoints = useMemo(
    () => parseTouchpoints(touchpointsText),
    [touchpointsText]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as ScanHistoryItem[];
      if (Array.isArray(parsed)) {
        setHistory(parsed);
      }
    } catch {
      setHistory([]);
    }
  }, []);

  function saveHistoryList(items: ScanHistoryItem[]) {
    setHistory(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function saveHistoryItem(item: ScanHistoryItem) {
    const updated = [item, ...history].slice(0, 10);
    saveHistoryList(updated);
  }

  function resetReport() {
    setHasScanned(false);
    setResult(null);
    setError("");
    setAiExplanation("");
    setAiError("");
  }

  function updateModule(id: string, field: "name" | "code", value: string) {
    setModules((current) =>
      current.map((module) =>
        module.id === id ? { ...module, [field]: value } : module
      )
    );
    resetReport();
  }

  function addModule() {
    setModules((current) => [...current, createEmptyModule(current.length + 1)]);
    resetReport();
  }

  function removeModule(id: string) {
    setModules((current) => {
      const next = current.filter((module) => module.id !== id);
      return next.length > 0 ? next : [createEmptyModule(1)];
    });
    resetReport();
  }

  function handleClear() {
    setSystemName("Quantum Risk Copilot System");
    setArchitectureNotes("");
    setTouchpointsText("");
    setModules([createEmptyModule(1)]);
    resetReport();
  }

  function handleLoadSingleSample() {
    setSystemName("Single Contract Prototype");
    setArchitectureNotes("Basic pasted-contract scan.");
    setTouchpointsText("");
    setModules([
      {
        id: "module-sample-1",
        name: "Primary Contract",
        code: vulnerableSampleContract,
      },
    ]);
    resetReport();
  }

  function handleLoadSystemSample() {
    setSystemName("Treasury + Relay System");
    setArchitectureNotes(
      "Token logic interacts with treasury release flow and an off-chain relay path."
    );
    setTouchpointsText("bridge\noracle\nrelayer");
    setModules([
      {
        id: "module-sample-1",
        name: "Token Module",
        code: vulnerableSampleContract,
      },
      {
        id: "module-sample-2",
        name: "Treasury Module",
        code: saferSampleContract,
      },
    ]);
    resetReport();
  }

  async function handleScan() {
    setHasScanned(true);
    setError("");
    setAiError("");
    setAiExplanation("");

    const cleanedModules = modules
      .map((module) => ({
        ...module,
        name: module.name.trim() || "Unnamed Module",
        code: module.code,
      }))
      .filter((module) => module.code.trim().length > 0);

    if (cleanedModules.length === 0) {
      setResult(null);
      setError("Add at least one module with code.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemName,
          architectureNotes,
          touchpoints,
          modules: cleanedModules,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Scan failed.");
      }

      setResult(data);

      const historyItem: ScanHistoryItem = {
        id: `${Date.now()}`,
        savedAt: new Date().toISOString(),
        systemName,
        architectureNotes,
        touchpoints,
        modules: cleanedModules,
        result: data,
        aiExplanation: "",
      };

      saveHistoryItem(historyItem);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExplainWithAI() {
    setAiError("");
    setAiExplanation("");

    const cleanedModules = modules.filter((module) => module.code.trim());

    if (cleanedModules.length === 0) {
      setAiError("Add module code first.");
      return;
    }

    try {
      setIsExplaining(true);

      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: combineModulesForAI(cleanedModules),
          systemName,
          architectureNotes,
          touchpoints,
          modules: cleanedModules,
          issues: result?.issues || [],
          quantumRisks: result?.quantumRisks || [],
          contractType: result?.contractType || "System / Multi-Module",
          overallRisk: result?.overallRisk || "None",
          score: result?.score || 100,
          status: result?.status || "Good",
          crossModuleRisks: result?.crossModuleRisks || [],
          moduleResults: result?.moduleResults || [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "AI explanation failed.");
      }

      const explanation = data.explanation || "No explanation returned.";
      setAiExplanation(explanation);

      if (result) {
        const historyItem: ScanHistoryItem = {
          id: `${Date.now()}`,
          savedAt: new Date().toISOString(),
          systemName,
          architectureNotes,
          touchpoints,
          modules: cleanedModules,
          result,
          aiExplanation: explanation,
        };

        saveHistoryItem(historyItem);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsExplaining(false);
    }
  }

  function handleLoadFromHistory(item: ScanHistoryItem) {
    setSystemName(item.systemName);
    setArchitectureNotes(item.architectureNotes);
    setTouchpointsText(item.touchpoints.join("\n"));
    setModules(item.modules);
    setResult(item.result);
    setAiExplanation(item.aiExplanation || "");
    setAiError("");
    setError("");
    setHasScanned(true);
  }

  function handleDeleteHistoryItem(id: string) {
    const updated = history.filter((item) => item.id !== id);
    saveHistoryList(updated);
  }

  function handleClearHistory() {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  const moduleResults = result?.moduleResults || [];
  const crossModuleRisks = result?.crossModuleRisks || [];

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-lg">
        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              System Name
            </label>
            <input
              value={systemName}
              onChange={(e) => {
                setSystemName(e.target.value);
                resetReport();
              }}
              placeholder="My blockchain system"
              className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Architecture Notes
            </label>
            <textarea
              value={architectureNotes}
              onChange={(e) => {
                setArchitectureNotes(e.target.value);
                resetReport();
              }}
              placeholder="Describe how the modules connect."
              className="min-h-[100px] w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              System Touchpoints
            </label>
            <textarea
              value={touchpointsText}
              onChange={(e) => {
                setTouchpointsText(e.target.value);
                resetReport();
              }}
              placeholder={`bridge\noracle\nrelayer`}
              className="min-h-[100px] w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-600"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleLoadSingleSample}
            className="rounded-xl border border-zinc-700 bg-black px-4 py-2 text-sm font-medium text-white hover:border-zinc-500"
          >
            Load Single Sample
          </button>

          <button
            type="button"
            onClick={handleLoadSystemSample}
            className="rounded-xl border border-zinc-700 bg-black px-4 py-2 text-sm font-medium text-white hover:border-zinc-500"
          >
            Load Multi-Module Sample
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="rounded-xl border border-zinc-700 bg-black px-4 py-2 text-sm font-medium text-white hover:border-zinc-500"
          >
            Clear
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">System Modules</h3>

            <button
              type="button"
              onClick={addModule}
              className="rounded-xl border border-zinc-700 bg-black px-4 py-2 text-sm font-medium text-white hover:border-zinc-500"
            >
              Add Module
            </button>
          </div>

          {modules.map((module, index) => (
            <div
              key={module.id}
              className="rounded-2xl border border-zinc-800 bg-black p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <input
                  value={module.name}
                  onChange={(e) => updateModule(module.id, "name", e.target.value)}
                  placeholder={`Module ${index + 1}`}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-600"
                />

                <button
                  type="button"
                  onClick={() => removeModule(module.id)}
                  disabled={modules.length === 1}
                  className="rounded-xl border border-red-800 bg-red-950/20 px-4 py-3 text-sm font-medium text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove
                </button>
              </div>

              <textarea
                value={module.code}
                onChange={(e) => updateModule(module.id, "code", e.target.value)}
                placeholder={`Paste Solidity code for ${module.name || `Module ${index + 1}`}...`}
                className="min-h-[260px] w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-600"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleScan}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Scanning..." : "Scan System"}
          </button>

          <button
            type="button"
            onClick={handleExplainWithAI}
            disabled={isExplaining || !hasScanned || !result}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExplaining ? "Explaining..." : "Explain with AI"}
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Previous Scans</h3>

            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-xs font-medium text-white hover:border-zinc-500"
              >
                Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-black/40 p-4 text-sm text-zinc-400">
              No previous scans yet.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-zinc-800 bg-black p-4"
                >
                  <button
                    type="button"
                    onClick={() => handleLoadFromHistory(item)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {item.systemName}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {new Date(item.savedAt).toLocaleString()}
                        </p>
                      </div>

                      <div
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold ${getRiskClasses(
                          item.result.overallRisk
                        )}`}
                      >
                        {item.result.overallRisk}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Score
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {item.result.score}/100
                        </p>
                      </div>

                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Modules
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {item.result.modulesScanned || item.modules.length}
                        </p>
                      </div>

                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Issues
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {item.result.issues.length}
                        </p>
                      </div>

                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Status
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {item.result.status}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-zinc-400">
                      {item.result.systemSummary || item.result.summary || "No summary."}
                    </p>
                  </button>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDeleteHistoryItem(item.id)}
                      className="rounded-lg border border-red-800 bg-red-950/20 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-950/40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-white">System Scan Report</h2>

        {!hasScanned ? (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-black/40 p-6 text-sm text-zinc-400">
            No scan yet. Add modules and click <span className="text-white">Scan System</span>.
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-700 bg-red-950/30 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : !result ? (
          <div className="rounded-xl border border-yellow-700 bg-yellow-950/30 p-4 text-sm text-yellow-300">
            No result returned.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  System Summary
                </p>
                <p className="mt-2 text-sm text-zinc-300">
                  {result.systemSummary || result.summary}
                </p>
              </div>

              <div
                className={`rounded-xl border p-4 ${getRiskClasses(result.overallRisk)}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Overall Risk
                </p>
                <p className="mt-2 text-lg font-bold">{result.overallRisk}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Score
                </p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {result.score}/100
                </p>
              </div>

              <div
                className={`rounded-xl border p-4 ${getStatusClasses(result.status)}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Status
                </p>
                <p className="mt-2 text-lg font-bold">{result.status}</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Modules
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {result.modulesScanned || moduleResults.length}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Cross-Module Risks
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {crossModuleRisks.length}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-red-900 bg-red-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                  High
                </p>
                <p className="mt-2 text-2xl font-bold text-red-300">
                  {result.counts.high}
                </p>
              </div>

              <div className="rounded-xl border border-yellow-900 bg-yellow-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-400">
                  Medium
                </p>
                <p className="mt-2 text-2xl font-bold text-yellow-300">
                  {result.counts.medium}
                </p>
              </div>

              <div className="rounded-xl border border-blue-900 bg-blue-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                  Low
                </p>
                <p className="mt-2 text-2xl font-bold text-blue-300">
                  {result.counts.low}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-red-900 bg-red-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                  Quantum High
                </p>
                <p className="mt-2 text-2xl font-bold text-red-300">
                  {result.quantumCounts.high}
                </p>
              </div>

              <div className="rounded-xl border border-yellow-900 bg-yellow-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-400">
                  Quantum Medium
                </p>
                <p className="mt-2 text-2xl font-bold text-yellow-300">
                  {result.quantumCounts.medium}
                </p>
              </div>

              <div className="rounded-xl border border-blue-900 bg-blue-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                  Quantum Low
                </p>
                <p className="mt-2 text-2xl font-bold text-blue-300">
                  {result.quantumCounts.low}
                </p>
              </div>
            </div>

            {touchpoints.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Touchpoints
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {touchpoints.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.tips.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Scan Tips
                </p>
                <div className="mt-3 space-y-2">
                  {result.tips.map((tip, index) => (
                    <p key={index} className="text-sm text-zinc-300">
                      • {tip}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {crossModuleRisks.length > 0 && (
              <div className="rounded-xl border border-purple-800 bg-purple-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-300">
                  Cross-Module Risks
                </p>

                <div className="mt-3 space-y-3">
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
              </div>
            )}

            {aiError && (
              <div className="rounded-xl border border-red-700 bg-red-950/30 p-4 text-sm text-red-300">
                {aiError}
              </div>
            )}

            {aiExplanation && (
              <div className="rounded-xl border border-purple-800 bg-purple-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-300">
                  AI Explanation
                </p>
                <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-zinc-200">
                  {aiExplanation}
                </pre>
              </div>
            )}

            {moduleResults.length > 0 ? (
              <div className="space-y-4">
                {moduleResults.map((module) => (
                  <div
                    key={module.moduleId}
                    className="rounded-xl border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {module.moduleName}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {module.contractType}
                        </p>
                      </div>

                      <div
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold ${getRiskClasses(
                          module.overallRisk
                        )}`}
                      >
                        {module.overallRisk}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Score
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {module.score}/100
                        </p>
                      </div>

                      <div
                        className={`rounded-lg border p-3 ${getStatusClasses(
                          module.status
                        )}`}
                      >
                        <p className="text-[11px] uppercase tracking-wide">
                          Status
                        </p>
                        <p className="mt-1 text-sm font-bold">
                          {module.status}
                        </p>
                      </div>

                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Issues
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {module.issues.length}
                        </p>
                      </div>

                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Quantum Risks
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {module.quantumRisks.length}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Module Summary
                      </p>
                      <p className="mt-2 text-sm text-zinc-300">
                        {module.summary}
                      </p>
                    </div>

                    {module.quantumRisks.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-purple-300">
                          Quantum Risks
                        </p>

                        {module.quantumRisks.map((risk) => (
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

                    {module.issues.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Findings
                        </p>

                        {module.issues.map((issue) => (
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
                    ) : (
                      <div className="mt-4 rounded-xl border border-green-800 bg-green-950/20 p-4 text-sm text-green-300">
                        No obvious module-level issues found.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : result.issues.length > 0 ? (
              result.issues.map((issue) => (
                <ReportCard
                  key={issue.id}
                  title={issue.title}
                  severity={issue.severity}
                  description={issue.description}
                  recommendation={issue.recommendation}
                  line={issue.line}
                  snippet={issue.snippet}
                />
              ))
            ) : (
              <div className="rounded-xl border border-green-800 bg-green-950/20 p-4 text-sm text-green-300">
                No obvious issues were found.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}