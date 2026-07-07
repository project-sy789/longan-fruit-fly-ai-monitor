import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const uploadsDir = path.join(process.cwd(), "public", "uploads");
const datasetImagesDir = path.join(process.cwd(), "dataset_raw", "images");
const datasetLabelsDir = path.join(process.cwd(), "dataset_raw", "labels");

async function safeList(dir: string) {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

export async function GET() {
  const uploadFiles = await safeList(uploadsDir);
  const datasetFiles = await safeList(datasetImagesDir);
  const labelFiles = new Set(await safeList(datasetLabelsDir));
  const allFiles = Array.from(new Set([...uploadFiles, ...datasetFiles]))
    .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file))
    .sort()
    .reverse();

  const images = allFiles.map((file) => ({
    file,
    url: uploadFiles.includes(file) ? `/uploads/${file}` : `/api/dataset/raw-image?file=${encodeURIComponent(file)}`,
    labeled: labelFiles.has(`${path.parse(file).name}.txt`),
  }));

  return NextResponse.json({ ok: true, images });
}
