"use client";

import type { SystemScanResult } from "@/types/report";

type Props = {
  result: SystemScanResult | null;
  touchpoints: string[];
  hasScanned: boolean;
};

function getRiskClasses(risk: "Low" | "Medium" | "High" | "None") {
  if (risk === "High") return "border-white/25 bg-white text-black";
  if (risk === "Medium") return "border-white/20 bg-white/10 text-white";
  if (risk === "Low") return "border-white/20 bg-white/5 text-zinc-200";
  return "border-white/15 bg-white/[0.03] text-zinc-300";
}

export default function SystemSummary({
  result,
  touchpoints,
  hasScanned,
}: Props) {
  if (!hasScanned) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-black p-5 text-sm text-zinc-500">
        Run an audit first.
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-xl border border-white/10 bg-black p-5 text-sm text-zinc-400">
        No result returned.
      </div>
    );
  }

  return (
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
          <p className="text-[11px] uppercase tracking-[0.18em]">Risk</p>
          <p className="mt-2 text-lg font-semibold">{result.overallRisk}</p>
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

      {result.cryptoTouchpoints.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-black p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Crypto Found
          </p>
          <div className="mt-3 space-y-2">
            {result.cryptoTouchpoints.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-white/10 bg-[#070707] p-3"
              >
                <p className="text-sm font-medium text-white">
                  {item.moduleName} — {item.algorithm}
                </p>
                <p className="mt-1 text-xs text-zinc-400">{item.usage}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {touchpoints.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-black p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Input Touchpoints
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
  );
}