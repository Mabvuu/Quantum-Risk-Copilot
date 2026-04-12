"use client";

import { useEffect, useState } from "react";
import ReportCard from "./ReportCard";
import { ScanIssue } from "@/types/report";
import {
  saferSampleContract,
  vulnerableSampleContract,
} from "@/lib/sampleContracts";

type ScanHistoryItem = {
  id: string;
  savedAt: string;
  code: string;
  issues: ScanIssue[];
  summary: string;
  overallRisk: "None" | "Low" | "Medium" | "High";
  score: number;
  status: "Good" | "Warning" | "Risky";
  contractType: string;
  tips: string[];
  counts: {
    high: number;
    medium: number;
    low: number;
  };
  aiExplanation: string;
};

const STORAGE_KEY = "scanner-scan-history";

function getRiskClasses(risk: "None" | "Low" | "Medium" | "High") {
  if (risk === "High") return "border-red-800 bg-red-950/20 text-red-300";
  if (risk === "Medium") {
    return "border-yellow-800 bg-yellow-950/20 text-yellow-300";
  }
  if (risk === "Low") return "border-blue-800 bg-blue-950/20 text-blue-300";
  return "border-green-800 bg-green-950/20 text-green-300";
}

function getStatusClasses(status: "Good" | "Warning" | "Risky") {
  if (status === "Risky") return "border-red-800 bg-red-950/20 text-red-300";
  if (status === "Warning") {
    return "border-yellow-800 bg-yellow-950/20 text-yellow-300";
  }
  return "border-green-800 bg-green-950/20 text-green-300";
}

export default function ScannerForm() {
  const [code, setCode] = useState("");
  const [hasScanned, setHasScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [issues, setIssues] = useState<ScanIssue[]>([]);
  const [summary, setSummary] = useState("");
  const [overallRisk, setOverallRisk] = useState<
    "None" | "Low" | "Medium" | "High"
  >("None");
  const [score, setScore] = useState(100);
  const [status, setStatus] = useState<"Good" | "Warning" | "Risky">("Good");
  const [contractType, setContractType] = useState("Unknown");
  const [tips, setTips] = useState<string[]>([]);
  const [counts, setCounts] = useState({
    high: 0,
    medium: 0,
    low: 0,
  });
  const [error, setError] = useState("");
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiError, setAiError] = useState("");
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

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
    setIssues([]);
    setSummary("");
    setOverallRisk("None");
    setScore(100);
    setStatus("Good");
    setContractType("Unknown");
    setTips([]);
    setCounts({ high: 0, medium: 0, low: 0 });
    setError("");
    setAiExplanation("");
    setAiError("");
  }

  function handleLoadVulnerableSample() {
    setCode(vulnerableSampleContract);
    resetReport();
  }

  function handleLoadSaferSample() {
    setCode(saferSampleContract);
    resetReport();
  }

  function handleClear() {
    setCode("");
    resetReport();
  }

  async function handleScan() {
    setHasScanned(true);
    setError("");
    setAiExplanation("");
    setAiError("");

    if (!code.trim()) {
      setIssues([]);
      setSummary("");
      setOverallRisk("None");
      setScore(100);
      setStatus("Good");
      setContractType("Unknown");
      setTips([]);
      setCounts({ high: 0, medium: 0, low: 0 });
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Scan failed.");
      }

      const nextIssues = data.issues || [];
      const nextSummary = data.summary || "";
      const nextOverallRisk = data.overallRisk || "None";
      const nextScore = typeof data.score === "number" ? data.score : 100;
      const nextStatus = data.status || "Good";
      const nextContractType = data.contractType || "Unknown";
      const nextTips = Array.isArray(data.tips) ? data.tips : [];
      const nextCounts = data.counts || {
        high: 0,
        medium: 0,
        low: 0,
      };

      setIssues(nextIssues);
      setSummary(nextSummary);
      setOverallRisk(nextOverallRisk);
      setScore(nextScore);
      setStatus(nextStatus);
      setContractType(nextContractType);
      setTips(nextTips);
      setCounts(nextCounts);

      const historyItem: ScanHistoryItem = {
        id: `${Date.now()}`,
        savedAt: new Date().toISOString(),
        code,
        issues: nextIssues,
        summary: nextSummary,
        overallRisk: nextOverallRisk,
        score: nextScore,
        status: nextStatus,
        contractType: nextContractType,
        tips: nextTips,
        counts: nextCounts,
        aiExplanation: "",
      };

      saveHistoryItem(historyItem);
    } catch (err) {
      setIssues([]);
      setSummary("");
      setOverallRisk("None");
      setScore(100);
      setStatus("Good");
      setContractType("Unknown");
      setTips([]);
      setCounts({ high: 0, medium: 0, low: 0 });
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExplainWithAI() {
    setAiError("");
    setAiExplanation("");

    if (!code.trim()) {
      setAiError("Paste smart contract code first.");
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
          code,
          issues,
          contractType,
          overallRisk,
          score,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "AI explanation failed.");
      }

      const explanation = data.explanation || "No explanation returned.";
      setAiExplanation(explanation);

      if (hasScanned) {
        const historyItem: ScanHistoryItem = {
          id: `${Date.now()}`,
          savedAt: new Date().toISOString(),
          code,
          issues,
          summary,
          overallRisk,
          score,
          status,
          contractType,
          tips,
          counts,
          aiExplanation: explanation,
        };

        saveHistoryItem(historyItem);
      }
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setIsExplaining(false);
    }
  }

  function handleLoadFromHistory(item: ScanHistoryItem) {
    setCode(item.code);
    setHasScanned(true);
    setIssues(item.issues);
    setSummary(item.summary);
    setOverallRisk(item.overallRisk);
    setScore(item.score);
    setStatus(item.status);
    setContractType(item.contractType);
    setTips(item.tips);
    setCounts(item.counts);
    setAiExplanation(item.aiExplanation || "");
    setAiError("");
    setError("");
  }

  function handleDeleteHistoryItem(id: string) {
    const updated = history.filter((item) => item.id !== id);
    saveHistoryList(updated);
  }

  function handleClearHistory() {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-lg">
        <label
          htmlFor="contractCode"
          className="mb-3 block text-sm font-medium text-zinc-300"
        >
          Smart Contract Code
        </label>

        <div className="mb-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleLoadVulnerableSample}
            className="rounded-xl border border-zinc-700 bg-black px-4 py-2 text-sm font-medium text-white hover:border-zinc-500"
          >
            Load Vulnerable Sample
          </button>

          <button
            type="button"
            onClick={handleLoadSaferSample}
            className="rounded-xl border border-zinc-700 bg-black px-4 py-2 text-sm font-medium text-white hover:border-zinc-500"
          >
            Load Safer Sample
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="rounded-xl border border-zinc-700 bg-black px-4 py-2 text-sm font-medium text-white hover:border-zinc-500"
          >
            Clear
          </button>
        </div>

        <textarea
          id="contractCode"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={`Paste Solidity code here...

Example:
pragma solidity ^0.8.0;

contract Test {
    address public owner;

    constructor() {
        owner = msg.sender;
    }
}`}
          className="min-h-[420px] w-full rounded-xl border border-zinc-800 bg-black p-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-600"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleScan}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Scanning..." : "Scan Contract"}
          </button>

          <button
            type="button"
            onClick={handleExplainWithAI}
            disabled={isExplaining || !hasScanned}
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
                          {item.contractType}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {new Date(item.savedAt).toLocaleString()}
                        </p>
                      </div>

                      <div
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold ${getRiskClasses(
                          item.overallRisk
                        )}`}
                      >
                        {item.overallRisk}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Score
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {item.score}/100
                        </p>
                      </div>

                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Issues
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {item.issues.length}
                        </p>
                      </div>

                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Status
                        </p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {item.status}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 text-xs text-zinc-400">
                      {item.summary || "No summary."}
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
        <h2 className="mb-4 text-xl font-semibold">Scan Report</h2>

        {!hasScanned ? (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-black/40 p-6 text-sm text-zinc-400">
            No scan yet. Paste code and click{" "}
            <span className="text-white">Scan Contract</span>.
          </div>
        ) : code.trim() === "" ? (
          <div className="rounded-xl border border-yellow-700 bg-yellow-950/30 p-4 text-sm text-yellow-300">
            Please paste some smart contract code first.
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-700 bg-red-950/30 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Summary
                </p>
                <p className="mt-2 text-sm text-zinc-300">{summary}</p>
              </div>

              <div
                className={`rounded-xl border p-4 ${getRiskClasses(overallRisk)}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Overall Risk
                </p>
                <p className="mt-2 text-lg font-bold">{overallRisk}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Security Score
                </p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {score}/100
                </p>
              </div>

              <div
                className={`rounded-xl border p-4 ${getStatusClasses(status)}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Status
                </p>
                <p className="mt-2 text-lg font-bold">{status}</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Contract Type
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {contractType}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-red-900 bg-red-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                  High
                </p>
                <p className="mt-2 text-2xl font-bold text-red-300">
                  {counts.high}
                </p>
              </div>

              <div className="rounded-xl border border-yellow-900 bg-yellow-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-400">
                  Medium
                </p>
                <p className="mt-2 text-2xl font-bold text-yellow-300">
                  {counts.medium}
                </p>
              </div>

              <div className="rounded-xl border border-blue-900 bg-blue-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                  Low
                </p>
                <p className="mt-2 text-2xl font-bold text-blue-300">
                  {counts.low}
                </p>
              </div>
            </div>

            {tips.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Scan Tips
                </p>
                <div className="mt-3 space-y-2">
                  {tips.map((tip, index) => (
                    <p key={index} className="text-sm text-zinc-300">
                      • {tip}
                    </p>
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

            {issues.length === 0 ? (
              <div className="rounded-xl border border-green-800 bg-green-950/20 p-4 text-sm text-green-300">
                No obvious issues were found by this basic scanner.
              </div>
            ) : (
              issues.map((issue) => (
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
            )}
          </div>
        )}
      </div>
    </section>
  );
}