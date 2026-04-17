import type { SystemModuleInput, SystemScanInput } from "@/types/report";

export function normalizeModule(
  module: Partial<SystemModuleInput>,
  index: number
): SystemModuleInput {
  return {
    id:
      typeof module.id === "string" && module.id.trim()
        ? module.id.trim()
        : `module-${index + 1}`,
    name:
      typeof module.name === "string" && module.name.trim()
        ? module.name.trim()
        : `Module ${index + 1}`,
    code: typeof module.code === "string" ? module.code : "",
  };
}

export function normalizeModules(modules: unknown): SystemModuleInput[] {
  if (!Array.isArray(modules)) return [];

  return modules
    .map((module, index) =>
      normalizeModule((module ?? {}) as Partial<SystemModuleInput>, index)
    )
    .filter((module) => module.code.trim().length > 0);
}

export function toSystemInput(input: string | SystemScanInput): SystemScanInput {
  if (typeof input === "string") {
    return {
      systemName: "Single Module",
      architectureNotes: "",
      touchpoints: [],
      modules: [
        {
          id: "module-1",
          name: "Main Module",
          code: input,
        },
      ],
    };
  }

  return {
    systemName: input.systemName || "System",
    architectureNotes: input.architectureNotes || "",
    touchpoints: Array.isArray(input.touchpoints) ? input.touchpoints : [],
    modules: normalizeModules(input.modules),
  };
}

export function isValidModuleArray(
  value: unknown
): value is SystemScanInput["modules"] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { name?: unknown }).name === "string" &&
        typeof (item as { code?: unknown }).code === "string"
    )
  );
}