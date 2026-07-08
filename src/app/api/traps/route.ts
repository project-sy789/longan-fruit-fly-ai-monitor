import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = process.env.TRAP_DATA_DIR || path.join(process.cwd(), "data");
const REGISTRY_FILE = path.join(DATA_DIR, "trap-registry.json");

export type TrapEntry = {
  id: string;
  name: string;
  location: string;
  createdAt: string;
};

async function readRegistry(): Promise<TrapEntry[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(REGISTRY_FILE, "utf8");
    return JSON.parse(raw || "[]") as TrapEntry[];
  } catch {
    return [];
  }
}

async function writeRegistry(entries: TrapEntry[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(REGISTRY_FILE, JSON.stringify(entries, null, 2), "utf8");
}

export async function GET() {
  const traps = await readRegistry();
  return NextResponse.json({ ok: true, traps });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = String(body.id || "").trim();
  const name = String(body.name || `กับดัก ${id}`).trim();
  const location = String(body.location || "สวนลำไย อำเภอซับใหญ่ จังหวัดชัยภูมิ").trim();

  if (!id) {
    return NextResponse.json({ ok: false, error: "ต้องระบุ trapId" }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ ok: false, error: "trapId ใช้ได้เฉพาะ A-Z, 0-9, _, -" }, { status: 400 });
  }

  const traps = await readRegistry();
  const existing = traps.find((t) => t.id === id);
  if (existing) {
    // Update existing
    existing.name = name;
    existing.location = location;
  } else {
    traps.push({ id, name, location, createdAt: new Date().toISOString() });
  }

  await writeRegistry(traps);
  return NextResponse.json({ ok: true, trap: traps.find((t) => t.id === id) });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("trapId") || "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "ต้องระบุ trapId" }, { status: 400 });
  }

  const traps = await readRegistry();
  const filtered = traps.filter((t) => t.id !== id);
  if (filtered.length === traps.length) {
    return NextResponse.json({ ok: false, error: "ไม่พบกับดักนี้" }, { status: 404 });
  }

  await writeRegistry(filtered);
  return NextResponse.json({ ok: true, removed: id });
}
