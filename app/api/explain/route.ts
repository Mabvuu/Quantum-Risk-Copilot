import { NextResponse } from "next/server";
import { explainScanWithGemini } from "@/lib/ai-provider";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const code = body?.code;
    const issues = body?.issues;
    const quantumRisks = body?.quantumRisks;
    const crossModuleRisks = body?.crossModuleRisks;
    const moduleResults = body?.moduleResults;
    const contractType = body?.contractType;
    const overallRisk = body?.overallRisk;
    const score = body?.score;
    const status = body?.status;
    const systemName = body?.systemName;
    const architectureNotes = body?.architectureNotes;
    const touchpoints = body?.touchpoints;

    if (typeof code !== "string") {
      return NextResponse.json(
        { error: "Invalid code input." },
        { status: 400 }
      );
    }

    if (!Array.isArray(issues)) {
      return NextResponse.json(
        { error: "Invalid issues input." },
        { status: 400 }
      );
    }

    if (quantumRisks !== undefined && !Array.isArray(quantumRisks)) {
      return NextResponse.json(
        { error: "Invalid quantumRisks input." },
        { status: 400 }
      );
    }

    if (crossModuleRisks !== undefined && !Array.isArray(crossModuleRisks)) {
      return NextResponse.json(
        { error: "Invalid crossModuleRisks input." },
        { status: 400 }
      );
    }

    if (moduleResults !== undefined && !Array.isArray(moduleResults)) {
      return NextResponse.json(
        { error: "Invalid moduleResults input." },
        { status: 400 }
      );
    }

    if (touchpoints !== undefined && !isStringArray(touchpoints)) {
      return NextResponse.json(
        { error: "Invalid touchpoints input." },
        { status: 400 }
      );
    }

    const result = await explainScanWithGemini({
      code,
      issues,
      quantumRisks: Array.isArray(quantumRisks) ? quantumRisks : [],
      crossModuleRisks: Array.isArray(crossModuleRisks) ? crossModuleRisks : [],
      moduleResults: Array.isArray(moduleResults) ? moduleResults : [],
      contractType:
        typeof contractType === "string" ? contractType : "General Smart Contract",
      overallRisk:
        overallRisk === "None" ||
        overallRisk === "Low" ||
        overallRisk === "Medium" ||
        overallRisk === "High"
          ? overallRisk
          : "None",
      score: typeof score === "number" ? score : 100,
      status:
        status === "Good" || status === "Warning" || status === "Risky"
          ? status
          : "Good",
      systemName: typeof systemName === "string" ? systemName : "System Scan",
      architectureNotes:
        typeof architectureNotes === "string" ? architectureNotes : "",
      touchpoints: Array.isArray(touchpoints) ? touchpoints : [],
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while generating the explanation.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}