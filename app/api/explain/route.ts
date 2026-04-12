import { NextResponse } from "next/server";
import { explainScanWithGemini } from "@/lib/ai-provider";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const code = body?.code;
    const issues = body?.issues;
    const contractType = body?.contractType;
    const overallRisk = body?.overallRisk;
    const score = body?.score;
    const status = body?.status;

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

    const result = await explainScanWithGemini({
      code,
      issues,
      contractType,
      overallRisk,
      score,
      status,
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