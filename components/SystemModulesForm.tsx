"use client";

import type { SystemModuleInput } from "@/types/report";

type Props = {
  modules: SystemModuleInput[];
  onAddModule: () => void;
  onRemoveModule: (id: string) => void;
  onUpdateModule: (
    id: string,
    field: "name" | "code",
    value: string
  ) => void;
};

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white ${
        props.className || ""
      }`}
    />
  );
}

function FieldTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white ${
        props.className || ""
      }`}
    />
  );
}

export default function SystemModulesForm({
  modules,
  onAddModule,
  onRemoveModule,
  onUpdateModule,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium tracking-wide text-white">
          System Modules
        </h2>

        <button
          type="button"
          onClick={onAddModule}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white transition hover:bg-white/[0.10]"
        >
          Add Module
        </button>
      </div>

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
                    onUpdateModule(moduleId, "name", event.target.value)
                  }
                  placeholder={`Module ${index + 1}`}
                  className="min-w-0"
                />

                <button
                  type="button"
                  onClick={() => onRemoveModule(moduleId)}
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
                    onUpdateModule(moduleId, "code", event.target.value)
                  }
                  placeholder={`Paste code for ${
                    moduleItem.name || `Module ${index + 1}`
                  }...`}
                  className="h-full min-h-[510px] resize-none font-mono text-[13px] leading-6"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}