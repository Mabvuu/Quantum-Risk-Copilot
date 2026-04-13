"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Severity } from "@/types/report";

export type ReportSlide = {
  id: string;
  title: string;
  severity: Severity | "None";
  description: string;
  recommendation: string;
  kind: "summary" | "issue" | "quantum" | "cross-module";
  moduleName?: string;
  line?: number;
  snippet?: string;
};

type FullReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  slides: ReportSlide[];
  systemName: string;
  fileName: string;
  onFileNameChange: (value: string) => void;
  onSave: () => void;
};

function getSeverityBadgeClasses(level: Severity | "None") {
  if (level === "High") {
    return "border-white bg-white text-black";
  }

  if (level === "Medium") {
    return "border-zinc-300 bg-zinc-200 text-black";
  }

  if (level === "Low") {
    return "border-zinc-700 bg-zinc-800 text-white";
  }

  return "border-white/10 bg-zinc-900 text-white";
}

function getKindLabel(kind: ReportSlide["kind"]) {
  if (kind === "cross-module") return "Cross Module";
  if (kind === "quantum") return "Quantum Risk";
  if (kind === "issue") return "Finding";
  return "Summary";
}

export default function FullReportModal({
  isOpen,
  onClose,
  slides,
  systemName,
  fileName,
  onFileNameChange,
  onSave,
}: FullReportModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const safeIndex = useMemo(() => {
    if (slides.length === 0) return 0;
    if (activeIndex < 0) return 0;
    if (activeIndex > slides.length - 1) return slides.length - 1;
    return activeIndex;
  }, [activeIndex, slides.length]);

  const activeSlide = slides[safeIndex];
  const isLastSlide = safeIndex === slides.length - 1;
  const progress = slides.length > 0 ? ((safeIndex + 1) / slides.length) * 100 : 0;

  const handleClose = useCallback(() => {
    setActiveIndex(0);
    onClose();
  }, [onClose]);

  const goPrevious = useCallback(() => {
    setActiveIndex((current) => (current > 0 ? current - 1 : current));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((current) =>
      current < slides.length - 1 ? current + 1 : current
    );
  }, [slides.length]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }

      if (event.key === "ArrowRight") {
        goNext();
      }

      if (event.key === "ArrowLeft") {
        goPrevious();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose, goNext, goPrevious]);

  if (!isOpen || slides.length === 0 || !activeSlide) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-3 text-white backdrop-blur-sm sm:p-4">
      <div className="mx-auto flex h-full max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 sm:text-xs">
                Full Scanner Report
              </p>
              <h2 className="mt-1 truncate text-base font-semibold text-white sm:text-lg">
                {systemName}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Close
            </button>
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <div className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300">
              <span className="text-zinc-500">Slide </span>
              <span className="font-semibold text-white">
                {safeIndex + 1}/{slides.length}
              </span>
            </div>

            <div className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300">
              <span className="text-zinc-500">Type </span>
              <span className="font-semibold text-white">
                {getKindLabel(activeSlide.kind)}
              </span>
            </div>

            <div className="max-w-full rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300">
              <span className="text-zinc-500">Module </span>
              <span className="font-semibold text-white">
                {activeSlide.moduleName || "System"}
              </span>
            </div>

            <div
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getSeverityBadgeClasses(
                activeSlide.severity
              )}`}
            >
              {activeSlide.severity}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(460px,1fr)]">
            <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="space-y-4">
                <section className="rounded-2xl bg-zinc-950 p-4 sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 sm:text-xs">
                    Title
                  </p>
                  <h3 className="mt-2 text-xl font-semibold leading-tight text-white sm:text-2xl">
                    {activeSlide.title}
                  </h3>
                </section>

                <section className="rounded-2xl bg-zinc-950 p-4 sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 sm:text-xs">
                    What this means
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-200 sm:text-[15px]">
                    {activeSlide.description}
                  </p>
                </section>

                <section className="rounded-2xl bg-zinc-950 p-4 sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 sm:text-xs">
                    What to do
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-200 sm:text-[15px]">
                    {activeSlide.recommendation}
                  </p>
                </section>
              </div>
            </div>

            <aside className="min-h-0 border-t border-white/10 bg-zinc-950/50 lg:border-l lg:border-t-0">
              <div className="flex h-full min-h-0 flex-col">
                <div className="border-b border-white/10 px-4 py-4 sm:px-5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 sm:text-xs">
                    Details
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-black px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        Kind
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {getKindLabel(activeSlide.kind)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-black px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        Severity
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {activeSlide.severity}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-xl bg-black px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        Module
                      </p>
                      <p className="mt-1 truncate text-sm font-medium text-white">
                        {activeSlide.moduleName || "System"}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-xl bg-black px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        Line
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {activeSlide.line ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                  <div className="space-y-4">
                    {activeSlide.snippet ? (
                      <section className="rounded-2xl bg-black p-4">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 sm:text-xs">
                          Relevant Snippet
                        </p>
                        <pre className="mt-3 min-h-[340px] overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs leading-6 text-zinc-200 sm:min-h-[420px] sm:text-[13px]">
                          {activeSlide.snippet}
                        </pre>
                      </section>
                    ) : (
                      <section className="rounded-2xl bg-black p-4">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 sm:text-xs">
                          Relevant Snippet
                        </p>
                        <p className="mt-3 text-sm text-zinc-400">
                          No snippet for this slide.
                        </p>
                      </section>
                    )}

                    <section className="rounded-2xl bg-black p-4">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 sm:text-xs">
                        Navigation
                      </p>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">
                        Use the buttons below or your keyboard arrows.
                      </p>
                    </section>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={goPrevious}
                disabled={safeIndex === 0}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={safeIndex === slides.length - 1}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={fileName}
                onChange={(event) => onFileNameChange(event.target.value)}
                placeholder="report-name"
                className="w-full min-w-0 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-white/30 sm:min-w-[220px]"
              />

              <button
                type="button"
                onClick={onSave}
                disabled={!isLastSlide}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save To Computer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}