import { NextResponse } from "next/server";
import { scanSmartContract, type SystemScanInput } from "@/lib/scanner";

function isValidModuleArray(value: unknown): value is SystemScanInput["modules"] {
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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const modules = body?.modules;
    const systemName =
      typeof body?.systemName === "string" ? body.systemName : "";
    const architectureNotes =
      typeof body?.architectureNotes === "string"
        ? body.architectureNotes
        : "";
    const touchpoints = Array.isArray(body?.touchpoints)
      ? body.touchpoints.filter(
          (item: unknown): item is string => typeof item === "string"
        )
      : [];

    if (!isValidModuleArray(modules)) {
      return NextResponse.json(
        {
          error:
            "Invalid scan input. Send { systemName?, architectureNotes?, touchpoints?, modules: [{ name, code }] }.",
        },
        { status: 400 }
      );
    }

    const cleanedModules = modules
      .map((module, index) => ({
        id:
          typeof module.id === "string" && module.id.trim()
            ? module.id.trim()
            : `module-${index + 1}`,
        name: module.name.trim() || `Module ${index + 1}`,
        code: module.code,
      }))
      .filter((module) => module.code.trim().length > 0);

    if (cleanedModules.length === 0) {
      return NextResponse.json(
        { error: "Please add at least one module with code." },
        { status: 400 }
      );
    }

    const result = scanSmartContract({
      systemName,
      architectureNotes,
      touchpoints,
      modules: cleanedModules,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while scanning." },
      { status: 500 }
    );
  }
}