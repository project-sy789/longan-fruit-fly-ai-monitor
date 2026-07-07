import { promises as fs } from "fs";
import path from "path";
import { classifySeverity, CreateTrapReading, TrapReading } from "./trap-types";

const DATA_DIR = process.env.TRAP_DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "trap-readings.json");

const demoReadings: TrapReading[] = [
  { id: "demo-1", trapId: "A1", trapName: "กับดัก A1", location: "สวนลำไยซับใหญ่", recordedAt: "2026-07-15T18:00:00+07:00", count: 7, temperature: 29, humidity: 74, battery: 96, severity: "ต่ำ", source: "demo" },
  { id: "demo-2", trapId: "A1", trapName: "กับดัก A1", location: "สวนลำไยซับใหญ่", recordedAt: "2026-07-16T18:00:00+07:00", count: 13, temperature: 30, humidity: 78, battery: 93, severity: "เฝ้าระวัง", source: "demo" },
  { id: "demo-3", trapId: "B2", trapName: "กับดัก B2", location: "สวนลำไยซับใหญ่", recordedAt: "2026-07-17T18:00:00+07:00", count: 18, temperature: 31, humidity: 80, battery: 91, severity: "เฝ้าระวัง", source: "demo" },
  { id: "demo-4", trapId: "B2", trapName: "กับดัก B2", location: "สวนลำไยซับใหญ่", recordedAt: "2026-07-18T18:00:00+07:00", count: 31, temperature: 32, humidity: 81, battery: 88, severity: "ระบาด", source: "demo" },
  { id: "demo-5", trapId: "C3", trapName: "กับดัก C3", location: "สวนลำไยซับใหญ่", recordedAt: "2026-07-19T18:00:00+07:00", count: 24, temperature: 31, humidity: 76, battery: 87, severity: "เฝ้าระวัง", source: "demo" },
  { id: "demo-6", trapId: "C3", trapName: "กับดัก C3", location: "สวนลำไยซับใหญ่", recordedAt: "2026-07-20T18:00:00+07:00", count: 38, temperature: 33, humidity: 72, battery: 84, severity: "ระบาด", source: "demo" },
  { id: "demo-7", trapId: "A1", trapName: "กับดัก A1", location: "สวนลำไยซับใหญ่", recordedAt: "2026-07-21T18:00:00+07:00", count: 16, temperature: 29, humidity: 79, battery: 82, severity: "เฝ้าระวัง", source: "demo" },
];

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

export async function listReadings() {
  await ensureStore();
  const raw = await fs.readFile(DB_FILE, "utf8");
  const stored = JSON.parse(raw || "[]") as TrapReading[];
  return stored.length ? stored : demoReadings;
}

export async function addReading(input: CreateTrapReading) {
  await ensureStore();
  const raw = await fs.readFile(DB_FILE, "utf8");
  const readings = JSON.parse(raw || "[]") as TrapReading[];
  const reading: TrapReading = {
    id: `reading-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    trapId: input.trapId,
    trapName: input.trapName || `กับดัก ${input.trapId}`,
    location: input.location || "สวนลำไย อำเภอซับใหญ่ จังหวัดชัยภูมิ",
    recordedAt: input.recordedAt || new Date().toISOString(),
    count: Number(input.count || 0),
    temperature: input.temperature,
    humidity: input.humidity,
    battery: input.battery,
    imagePath: input.imagePath,
    imageUrl: input.imageUrl,
    confidence: input.confidence,
    severity: classifySeverity(Number(input.count || 0)),
    source: input.source || "api",
  };
  readings.push(reading);
  await fs.writeFile(DB_FILE, JSON.stringify(readings.slice(-2000), null, 2), "utf8");
  return reading;
}
