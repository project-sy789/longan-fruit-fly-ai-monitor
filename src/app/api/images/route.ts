import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { addReading } from "@/lib/trap-store";

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-trap-token");
  const expected = process.env.TRAP_API_TOKEN;
  if (expected && token !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const trapId = request.headers.get("x-trap-id") || "ESP32-A1";
  const trapName = request.headers.get("x-trap-name") || `กับดัก ${trapId}`;
  const location = request.headers.get("x-trap-location") || "สวนลำไย อำเภอซับใหญ่ จังหวัดชัยภูมิ";
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) {
    return NextResponse.json({ ok: false, error: "empty image body" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  const filename = `${trapId}_${Date.now()}.jpg`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, Buffer.from(bytes));
  const imageUrl = `/uploads/${filename}`;

  const reading = await addReading({
    trapId,
    trapName,
    location,
    count: 0,
    imageUrl,
    source: "esp32-cam",
  });

  return NextResponse.json({ ok: true, imageUrl, reading }, { status: 201 });
}
