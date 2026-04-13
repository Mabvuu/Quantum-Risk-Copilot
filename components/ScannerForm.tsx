"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Severity,
  SystemModuleInput,
  ModuleScanResult,
  CrossModuleRisk,
  SystemScanResult,
} from "@/types/report";
import {
  saferSampleContract,
  vulnerableSampleContract,
} from "@/lib/sampleContracts";
import FullReportModal, { ReportSlide } from "./FullReportModal";

type Status = "Good" | "Warning" | "Risky";

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

function slugifyFileName(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "quantum-risk-report"
  );
}

function getRiskClasses(risk: Severity | "None") {
  if (risk === "High") return "border-white/25 bg-white text-black";
  if (risk === "Medium") return "border-white/20 bg-white/10 text-white";
  if (risk === "Low") return "border-white/20 bg-white/5 text-zinc-200";
  return "border-white/15 bg-white/[0.03] text-zinc-300";
}

function getStatusClasses(status: Status) {
  if (status === "Risky") return "border-white/25 bg-white text-black";
  if (status === "Warning") return "border-white/20 bg-white/10 text-white";
  return "border-white/15 bg-white/[0.03] text-zinc-300";
}

function parseTouchpoints(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/\n|,/g)
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

function combineModulesForAI(moduleList: SystemModuleInput[]) {
  return moduleList
    .filter((moduleItem) => moduleItem.code.trim())
    .map(
      (moduleItem) =>
        `// MODULE: ${moduleItem.name}\n${moduleItem.code.trim()}`
    )
    .join("\n\n");
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function buildReportSlides(scanResult: SystemScanResult | null): ReportSlide[] {
  if (!scanResult) return [];

  const slides: ReportSlide[] = [
    {
      id: "summary-slide",
      title: "System Summary",
      severity: scanResult.overallRisk,
      description:
        scanResult.systemSummary || scanResult.summary || "No summary available.",
      recommendation:
        scanResult.tips?.length > 0
          ? `Start with these:\n• ${scanResult.tips.join("\n• ")}`
          : "Review each finding in order and fix the highest-risk items first.",
      kind: "summary",
    },
  ];

  const moduleResults: ModuleScanResult[] = scanResult.moduleResults || [];

  if (moduleResults.length > 0) {
    for (const moduleItem of moduleResults) {
      for (const issueItem of moduleItem.issues || []) {
        slides.push({
          id: `issue-${moduleItem.moduleId}-${issueItem.id}`,
          title: issueItem.title,
          severity: issueItem.severity,
          description: issueItem.description,
          recommendation: issueItem.recommendation,
          moduleName: moduleItem.moduleName,
          line: issueItem.line,
          snippet: issueItem.snippet,
          kind: "issue",
        });
      }

      for (const quantumRiskItem of moduleItem.quantumRisks || []) {
        slides.push({
          id: `quantum-${moduleItem.moduleId}-${quantumRiskItem.id}`,
          title: quantumRiskItem.title,
          severity: quantumRiskItem.severity,
          description: quantumRiskItem.description,
          recommendation: quantumRiskItem.recommendation,
          moduleName: moduleItem.moduleName,
          line: quantumRiskItem.line,
          snippet: quantumRiskItem.snippet,
          kind: "quantum",
        });
      }
    }
  } else {
    for (const issueItem of scanResult.issues || []) {
      slides.push({
        id: `issue-${issueItem.id}`,
        title: issueItem.title,
        severity: issueItem.severity,
        description: issueItem.description,
        recommendation: issueItem.recommendation,
        line: issueItem.line,
        snippet: issueItem.snippet,
        kind: "issue",
      });
    }

    for (const quantumRiskItem of scanResult.quantumRisks || []) {
      slides.push({
        id: `quantum-${quantumRiskItem.id}`,
        title: quantumRiskItem.title,
        severity: quantumRiskItem.severity,
        description: quantumRiskItem.description,
        recommendation: quantumRiskItem.recommendation,
        line: quantumRiskItem.line,
        snippet: quantumRiskItem.snippet,
        kind: "quantum",
      });
    }
  }

  for (const crossRiskItem of scanResult.crossModuleRisks || []) {
    slides.push({
      id: `cross-${crossRiskItem.id}`,
      title: crossRiskItem.title,
      severity: crossRiskItem.severity,
      description:
        crossRiskItem.modules?.length > 0
          ? `${crossRiskItem.description}\n\nAffected modules: ${crossRiskItem.modules.join(
              ", "
            )}`
          : crossRiskItem.description,
      recommendation: crossRiskItem.recommendation,
      kind: "cross-module",
    });
  }

  if (slides.length === 1 && scanResult.overallRisk === "None") {
    slides.push({
      id: "clean-result-slide",
      title: "No Obvious Issues Found",
      severity: "None",
      description:
        "This scan did not find obvious rule-based issues in the submitted code.",
      recommendation:
        "You can still review manually, but this result looks clean from the current scanner rules.",
      kind: "summary",
    });
  }

  return slides;
}

function getReportButtonState(
  hasScanned: boolean,
  scanResult: SystemScanResult | null,
  error: string
) {
  if (error || !hasScanned || !scanResult) {
    return {
      label: "Full Report",
      disabled: true,
      className:
        "border-white/10 bg-white/[0.04] text-zinc-500 cursor-not-allowed",
    };
  }

  return {
    label: "Full Report",
    disabled: false,
    className: "border-white bg-white text-black hover:bg-zinc-200",
  };
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d0d0d]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-medium tracking-wide text-white">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-zinc-500">
      {children}
    </label>
  );
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white ${
        props.className || ""
      }`}
    />
  );
}

function FieldTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white ${
        props.className || ""
      }`}
    />
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "secondary",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit" | "reset";
}) {
  const styles = {
    primary: "border-white bg-white text-black hover:bg-zinc-200",
    secondary: "border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.10]",
    ghost: "border-white/10 bg-black text-zinc-300 hover:bg-white/[0.04]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-medium transition ${styles[variant]} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
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
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [saveFileName, setSaveFileName] = useState("quantum-risk-report");

  const touchpoints = useMemo(
    () => parseTouchpoints(touchpointsText),
    [touchpointsText]
  );

  const reportSlides = useMemo(() => buildReportSlides(result), [result]);

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
    setHistory((current) => {
      const updated = [item, ...current].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  function resetReport() {
    setHasScanned(false);
    setResult(null);
    setError("");
    setAiExplanation("");
    setAiError("");
    setIsReportOpen(false);
  }

  function updateModule(id: string, field: "name" | "code", value: string) {
    setModules((current) =>
      current.map((moduleItem) =>
        (moduleItem.id ?? "") === id
          ? { ...moduleItem, [field]: value }
          : moduleItem
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
      const next = current.filter((moduleItem) => (moduleItem.id ?? "") !== id);
      return next.length > 0 ? next : [createEmptyModule(1)];
    });

    resetReport();
  }

  function handleClear() {
    setSystemName("Quantum Risk Copilot System");
    setArchitectureNotes("");
    setTouchpointsText("");
    setModules([createEmptyModule(1)]);
    setSaveFileName("quantum-risk-report");
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
    setSaveFileName("single-contract-report");
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
    setSaveFileName("treasury-relay-report");
    resetReport();
  }

  async function handleScan() {
    setHasScanned(true);
    setError("");
    setAiError("");
    setAiExplanation("");
    setIsReportOpen(false);

    const cleanedModules = modules
      .map((moduleItem, index) => ({
        ...moduleItem,
        id: moduleItem.id?.trim() || `module-${index + 1}`,
        name: moduleItem.name.trim() || "Unnamed Module",
        code: moduleItem.code,
      }))
      .filter((moduleItem) => moduleItem.code.trim().length > 0);

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

      const data = (await response.json()) as
        | SystemScanResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data ? data.error || "Scan failed." : "Scan failed."
        );
      }

      const scanResult = data as SystemScanResult;

      setResult(scanResult);
      setSaveFileName(slugifyFileName(systemName));

      const historyItem: ScanHistoryItem = {
        id: `${Date.now()}`,
        savedAt: new Date().toISOString(),
        systemName,
        architectureNotes,
        touchpoints,
        modules: cleanedModules,
        result: scanResult,
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

    const cleanedModules = modules
      .map((moduleItem, index) => ({
        ...moduleItem,
        id: moduleItem.id?.trim() || `module-${index + 1}`,
        name: moduleItem.name.trim() || "Unnamed Module",
      }))
      .filter((moduleItem) => moduleItem.code.trim());

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

      const data = (await response.json()) as {
        explanation?: string;
        error?: string;
      };

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
    setSaveFileName(slugifyFileName(item.systemName));
    setIsReportOpen(false);
  }

  function handleDeleteHistoryItem(id: string) {
    const updated = history.filter((item) => item.id !== id);
    saveHistoryList(updated);
  }

  function handleClearHistory() {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  function handleSaveReport() {
    if (!result) return;

    const safeName =
      saveFileName.trim().replace(/[^a-zA-Z0-9-_]/g, "-") ||
      "quantum-risk-report";

    const payload = {
      exportedAt: new Date().toISOString(),
      fileName: safeName,
      systemName,
      architectureNotes,
      touchpoints,
      modules,
      result,
      aiExplanation,
      slides: reportSlides,
    };

    downloadTextFile(`${safeName}.json`, JSON.stringify(payload, null, 2));
  }

  const moduleResults: ModuleScanResult[] = result?.moduleResults || [];
  const crossModuleRisks: CrossModuleRisk[] = result?.crossModuleRisks || [];
  const reportButton = getReportButtonState(hasScanned, result, error);

  return (
    <>
      <section className="min-h-screen w-full bg-black text-white">
        <div className="w-full px-3 py-3 sm:px-4 lg:px-6 2xl:px-8">
          <div className="mb-4 rounded-2xl border border-white/10 bg-[#0b0b0b] px-4 py-4">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">
                  Quantum Risk Copilot
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Full System Scanner
                </h1>
                <p className="mt-2 max-w-4xl text-sm text-zinc-400">
                  Paste smart contracts, scan the whole system, and review the report cleanly.
                </p>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 xl:grid-cols-5 2xl:max-w-[980px]">
                <ActionButton
                  onClick={handleScan}
                  disabled={isLoading}
                  variant="primary"
                >
                  {isLoading ? "Scanning..." : "Quick Scan"}
                </ActionButton>

                <button
                  type="button"
                  onClick={() => setIsReportOpen(true)}
                  disabled={reportButton.disabled}
                  className={`inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-medium transition ${reportButton.className}`}
                >
                  {reportButton.label}
                </button>

                <ActionButton
                  onClick={handleExplainWithAI}
                  disabled={isExplaining || !hasScanned || !result}
                  variant="secondary"
                >
                  {isExplaining ? "Explaining..." : "Explain with API"}
                </ActionButton>

                <ActionButton onClick={handleLoadSingleSample} variant="ghost">
                  Load Single Sample
                </ActionButton>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-2">
                  <ActionButton onClick={handleLoadSystemSample} variant="ghost">
                    Load Multi
                  </ActionButton>
                  <ActionButton onClick={handleClear} variant="ghost">
                    Clear
                  </ActionButton>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.9fr)_420px]">
            <div className="space-y-4 min-w-0">
              <SectionCard
                title="System Modules"
                action={
                  <ActionButton onClick={addModule} variant="secondary">
                    Add Module
                  </ActionButton>
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {modules.map((moduleItem, index) => {
                    const moduleId = moduleItem.id ?? `module-${index + 1}`;

                    return (
                      <div
                        key={moduleId}
                        className="flex min-h-[600px] min-w-0 flex-col rounded-2xl border border-white/10 bg-black"
                      >
                        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3">
                          <FieldInput
                            value={moduleItem.name}
                            onChange={(event) =>
                              updateModule(moduleId, "name", event.target.value)
                            }
                            placeholder={`Module ${index + 1}`}
                            className="h-10 min-w-0"
                          />

                          <button
                            type="button"
                            onClick={() => removeModule(moduleId)}
                            disabled={modules.length === 1}
                            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="flex-1 p-3">
                          <FieldTextarea
                            value={moduleItem.code}
                            onChange={(event) =>
                              updateModule(moduleId, "code", event.target.value)
                            }
                            placeholder={`Paste Solidity code for ${
                              moduleItem.name || `Module ${index + 1}`
                            }...`}
                            className="h-full min-h-[510px] resize-none font-mono text-[13px] leading-6"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <SectionCard title="System Details">
                  <div className="space-y-4">
                    <div>
                      <Label>System Name</Label>
                      <FieldInput
                        value={systemName}
                        onChange={(event) => {
                          setSystemName(event.target.value);
                          resetReport();
                        }}
                        placeholder="My blockchain system"
                      />
                    </div>

                    <div>
                      <Label>Architecture Notes</Label>
                      <FieldTextarea
                        value={architectureNotes}
                        onChange={(event) => {
                          setArchitectureNotes(event.target.value);
                          resetReport();
                        }}
                        placeholder="Describe how the modules connect."
                        className="min-h-[150px] resize-y"
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Touchpoints">
                  <div>
                    <Label>System Touchpoints</Label>
                    <FieldTextarea
                      value={touchpointsText}
                      onChange={(event) => {
                        setTouchpointsText(event.target.value);
                        resetReport();
                      }}
                      placeholder={`bridge\noracle\nrelayer`}
                      className="min-h-[150px] resize-y"
                    />
                  </div>
                </SectionCard>
              </div>

              {(error || aiError || aiExplanation) && (
                <div className="space-y-4">
                  {error && (
                    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-sm text-zinc-200">
                      {error}
                    </div>
                  )}

                  {aiError && (
                    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-sm text-zinc-200">
                      {aiError}
                    </div>
                  )}

                  {aiExplanation && (
                    <SectionCard title="AI Explanation">
                      <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300">
                        {aiExplanation}
                      </pre>
                    </SectionCard>
                  )}
                </div>
              )}

              {result && (
                <SectionCard title="Scan View">
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-white/10 bg-black p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          Score
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {result.score}
                        </p>
                      </div>

                      <div
                        className={`rounded-xl border p-4 ${getStatusClasses(
                          result.status
                        )}`}
                      >
                        <p className="text-[11px] uppercase tracking-[0.18em]">
                          Status
                        </p>
                        <p className="mt-2 text-lg font-semibold">
                          {result.status}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          Modules
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {result.modulesScanned || moduleResults.length}
                        </p>
                      </div>

                      <div
                        className={`rounded-xl border p-4 ${getRiskClasses(
                          result.overallRisk
                        )}`}
                      >
                        <p className="text-[11px] uppercase tracking-[0.18em]">
                          Overall Risk
                        </p>
                        <p className="mt-2 text-lg font-semibold">
                          {result.overallRisk}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/10 bg-black p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          High
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {result.counts.high}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          Medium
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {result.counts.medium}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          Low
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {result.counts.low}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Summary
                      </p>
                      <p className="mt-3 text-sm leading-7 text-zinc-300">
                        {result.systemSummary || result.summary}
                      </p>
                    </div>

                    {result.tips?.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-black p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          Tips
                        </p>
                        <div className="mt-3 space-y-2">
                          {result.tips.map((tipItem, index) => (
                            <p
                              key={`${tipItem}-${index}`}
                              className="text-sm leading-7 text-zinc-300"
                            >
                              • {tipItem}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {moduleResults.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-black p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          Module Results
                        </p>

                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          {moduleResults.map((moduleItem) => (
                            <div
                              key={moduleItem.moduleId}
                              className="rounded-xl border border-white/10 bg-[#080808] p-4"
                            >
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-white">
                                  {moduleItem.moduleName}
                                </p>
                                <span
                                  className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${getRiskClasses(
                                    moduleItem.overallRisk
                                  )}`}
                                >
                                  {moduleItem.overallRisk}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-lg border border-white/10 bg-black p-3">
                                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                                    High
                                  </p>
                                  <p className="mt-2 text-lg font-semibold text-white">
                                    {moduleItem.counts.high}
                                  </p>
                                </div>

                                <div className="rounded-lg border border-white/10 bg-black p-3">
                                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                                    Medium
                                  </p>
                                  <p className="mt-2 text-lg font-semibold text-white">
                                    {moduleItem.counts.medium}
                                  </p>
                                </div>

                                <div className="rounded-lg border border-white/10 bg-black p-3">
                                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                                    Low
                                  </p>
                                  <p className="mt-2 text-lg font-semibold text-white">
                                    {moduleItem.counts.low}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {crossModuleRisks.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-black p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          Cross-Module Risks
                        </p>
                        <div className="mt-3 space-y-3">
                          {crossModuleRisks.map((risk) => (
                            <div
                              key={risk.id}
                              className="rounded-xl border border-white/10 bg-[#080808] p-4"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-white">
                                  {risk.title}
                                </p>
                                <span
                                  className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${getRiskClasses(
                                    risk.severity
                                  )}`}
                                >
                                  {risk.severity}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-7 text-zinc-300">
                                {risk.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>
              )}
            </div>

            <div className="space-y-4">
              <SectionCard title="Live Summary">
                {!hasScanned ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black p-5 text-sm text-zinc-500">
                    Scan something first.
                  </div>
                ) : !result ? (
                  <div className="rounded-xl border border-white/10 bg-black p-5 text-sm text-zinc-400">
                    No result returned.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-white/10 bg-black p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          Score
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {result.score}
                        </p>
                      </div>

                      <div
                        className={`rounded-xl border p-4 ${getRiskClasses(
                          result.overallRisk
                        )}`}
                      >
                        <p className="text-[11px] uppercase tracking-[0.18em]">
                          Risk
                        </p>
                        <p className="mt-2 text-lg font-semibold">
                          {result.overallRisk}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Summary
                      </p>
                      <p className="mt-3 text-sm leading-7 text-zinc-300">
                        {result.systemSummary || result.summary}
                      </p>
                    </div>

                    {touchpoints.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-black p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          Touchpoints
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {touchpoints.map((touchpointItem) => (
                            <span
                              key={touchpointItem}
                              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-zinc-300"
                            >
                              {touchpointItem}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Previous Scans"
                action={
                  history.length > 0 ? (
                    <ActionButton onClick={handleClearHistory} variant="ghost">
                      Clear
                    </ActionButton>
                  ) : undefined
                }
              >
                {history.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black p-4 text-sm text-zinc-500">
                    No previous scans yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-white/10 bg-black p-4"
                      >
                        <button
                          type="button"
                          onClick={() => handleLoadFromHistory(item)}
                          className="block w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">
                                {item.systemName}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {new Date(item.savedAt).toLocaleString()}
                              </p>
                            </div>

                            <div
                              className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-medium ${getRiskClasses(
                                item.result.overallRisk
                              )}`}
                            >
                              {item.result.overallRisk}
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-lg border border-white/10 bg-[#070707] p-3">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                                Score
                              </p>
                              <p className="mt-2 text-sm font-semibold text-white">
                                {item.result.score}
                              </p>
                            </div>

                            <div className="rounded-lg border border-white/10 bg-[#070707] p-3">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                                Modules
                              </p>
                              <p className="mt-2 text-sm font-semibold text-white">
                                {item.result.modulesScanned || item.modules.length}
                              </p>
                            </div>

                            <div className="rounded-lg border border-white/10 bg-[#070707] p-3">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                                Issues
                              </p>
                              <p className="mt-2 text-sm font-semibold text-white">
                                {item.result.issues.length}
                              </p>
                            </div>
                          </div>

                          <p className="mt-3 text-xs leading-6 text-zinc-500">
                            {item.result.systemSummary ||
                              item.result.summary ||
                              "No summary."}
                          </p>
                        </button>

                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteHistoryItem(item.id)}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.10]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </div>
      </section>

      <FullReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        slides={reportSlides}
        systemName={systemName}
        fileName={saveFileName}
        onFileNameChange={setSaveFileName}
        onSave={handleSaveReport}
      />
    </>
  );
}