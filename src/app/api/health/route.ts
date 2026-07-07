import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "longan-fruit-fly-ai-monitor", time: new Date().toISOString() });
}
