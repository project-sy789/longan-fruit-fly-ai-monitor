import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

type Box = { x: number; y: number; w: number; h: number };

const uploadsDir = path.join(process.cwd(), "public", "uploads");
const datasetImagesDir = path.join(process.cwd(), "dataset_raw", "images");
const datasetLabelsDir = path.join(process.cwd(), "dataset_raw", "labels");

function validImageName(file: string) {
  return /^[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(file);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get("file") || "";
  if (!validImageName(file)) return NextResponse.json({ ok: false, error: "invalid file" }, { status: 400 });
  const labelPath = path.join(datasetLabelsDir, `${path.parse(file).name}.txt`);
  try {
    const text = await fs.readFile(labelPath, "utf8");
    const boxes = text.trim().split(/\n+/).filter(Boolean).map((line) => {
      const [, xc, yc, w, h] = line.split(/\s+/).map(Number);
      return { x: xc - w / 2, y: yc - h / 2, w, h };
    });
    return NextResponse.json({ ok: true, boxes });
  } catch {
    return NextResponse.json({ ok: true, boxes: [] });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const file = String(body.file || "");
  const boxes = (body.boxes || []) as Box[];
  if (!validImageName(file)) return NextResponse.json({ ok: false, error: "invalid file" }, { status: 400 });

  await fs.mkdir(datasetImagesDir, { recursive: true });
  await fs.mkdir(datasetLabelsDir, { recursive: true });

  const srcUpload = path.join(uploadsDir, file);
  const dstImage = path.join(datasetImagesDir, file);
  try {
    await fs.access(dstImage);
  } catch {
    await fs.copyFile(srcUpload, dstImage);
  }

  const lines = boxes.map((box) => {
    const x = clamp01(Number(box.x));
    const y = clamp01(Number(box.y));
    const w = clamp01(Number(box.w));
    const h = clamp01(Number(box.h));
    const xc = clamp01(x + w / 2);
    const yc = clamp01(y + h / 2);
    return `0 ${xc.toFixed(6)} ${yc.toFixed(6)} ${w.toFixed(6)} ${h.toFixed(6)}`;
  });
  const labelPath = path.join(datasetLabelsDir, `${path.parse(file).name}.txt`);
  await fs.writeFile(labelPath, lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
  return NextResponse.json({ ok: true, file, boxes: boxes.length });
}
