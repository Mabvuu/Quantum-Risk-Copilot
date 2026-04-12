type ReportCardProps = {
  title: string;
  severity: "Low" | "Medium" | "High";
  description: string;
  recommendation: string;
  line?: number;
  snippet?: string;
};

function getSeverityClasses(severity: "Low" | "Medium" | "High") {
  if (severity === "High") {
    return "border-red-800 text-red-300 bg-red-950/20";
  }

  if (severity === "Medium") {
    return "border-yellow-800 text-yellow-300 bg-yellow-950/20";
  }

  return "border-blue-800 text-blue-300 bg-blue-950/20";
}

export default function ReportCard({
  title,
  severity,
  description,
  recommendation,
  line,
  snippet,
}: ReportCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${getSeverityClasses(
            severity
          )}`}
        >
          {severity}
        </span>
      </div>

      {line && (
        <p className="mb-2 text-xs font-medium text-zinc-500">
          Line {line}
        </p>
      )}

      <p className="mb-3 text-sm text-zinc-400">{description}</p>

      {snippet && (
        <div className="mb-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Matched Code
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-zinc-300">
            <code>{snippet}</code>
          </pre>
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Recommendation
        </p>
        <p className="mt-1 text-sm text-zinc-300">{recommendation}</p>
      </div>
    </div>
  );
}