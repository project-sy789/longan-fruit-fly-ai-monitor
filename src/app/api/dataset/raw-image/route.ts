import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get("file") || "";
  if (!/^[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(file)) {
    return NextResponse.json({ ok: false, error: "invalid file" }, { status: 400 });
  }
  const filePath = path.join(process.cwd(), "dataset_raw", "images", file);
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(file).toLowerCase();
    const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(data, { headers: { "Content-Type": type } });
  } catch {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }
}
