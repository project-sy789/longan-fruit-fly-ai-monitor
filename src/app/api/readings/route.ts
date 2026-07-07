import { NextRequest, NextResponse } from "next/server";
import { addReading, listReadings } from "@/lib/trap-store";

export async function GET() {
  const readings = await listReadings();
  return NextResponse.json({ ok: true, readings });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-trap-token");
  const expected = process.env.TRAP_API_TOKEN;
  if (expected && token !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.trapId || typeof body.count !== "number") {
    return NextResponse.json({ ok: false, error: "trapId and numeric count are required" }, { status: 400 });
  }

  const reading = await addReading(body);
  return NextResponse.json({ ok: true, reading }, { status: 201 });
}
