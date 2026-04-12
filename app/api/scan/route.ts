import { NextResponse } from "next/server";
import { scanSmartContract } from "@/lib/scanner";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = body?.code;

    if (typeof code !== "string") {
      return NextResponse.json(
        { error: "Invalid code input." },
        { status: 400 }
      );
    }

    const result = scanSmartContract(code);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while scanning." },
      { status: 500 }
    );
  }
}