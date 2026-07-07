"use client";

import Link from "next/link";
import { MouseEvent, useEffect, useMemo, useRef, useState } from "react";

type ImageItem = { file: string; url: string; labeled: boolean };
type Box = { x: number; y: number; w: number; h: number };

function normalizeBox(startX: number, startY: number, endX: number, endY: number): Box {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const w = Math.abs(endX - startX);
  const h = Math.abs(endY - startY);
  return { x, y, w, h };
}

export default function LabelPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selected, setSelected] = useState<ImageItem | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [draft, setDraft] = useState<Box | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [status, setStatus] = useState("พร้อม label");
  const imageWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/dataset/images", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        const items = payload.images || [];
        setImages(items);
        if (items.length) setSelected(items[0]);
      });
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/dataset/labels?file=${encodeURIComponent(selected.file)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => setBoxes(payload.boxes || []));
  }, [selected]);

  const selectedIndex = useMemo(() => images.findIndex((item) => item.file === selected?.file), [images, selected]);

  function pointFromEvent(event: MouseEvent<HTMLDivElement>) {
    const rect = imageWrapRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }

  function onMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (!selected) return;
    const point = pointFromEvent(event);
    setDragStart(point);
    setDraft({ x: point.x, y: point.y, w: 0, h: 0 });
  }

  function onMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!dragStart) return;
    const point = pointFromEvent(event);
    setDraft(normalizeBox(dragStart.x, dragStart.y, point.x, point.y));
  }

  function onMouseUp(event: MouseEvent<HTMLDivElement>) {
    if (!dragStart) return;
    const point = pointFromEvent(event);
    const box = normalizeBox(dragStart.x, dragStart.y, point.x, point.y);
    if (box.w > 0.01 && box.h > 0.01) setBoxes((prev) => [...prev, box]);
    setDragStart(null);
    setDraft(null);
  }

  async function saveLabel() {
    if (!selected) return;
    setStatus("กำลังบันทึก...");
    const res = await fetch("/api/dataset/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: selected.file, boxes }),
    });
    const payload = await res.json();
    setStatus(payload.ok ? `บันทึกแล้ว ${boxes.length} กล่อง` : `บันทึกไม่สำเร็จ: ${payload.error}`);
    setImages((prev) => prev.map((item) => item.file === selected.file ? { ...item, labeled: true } : item));
  }

  function nextImage() {
    if (!images.length) return;
    setSelected(images[Math.min(images.length - 1, selectedIndex + 1)]);
  }

  function prevImage() {
    if (!images.length) return;
    setSelected(images[Math.max(0, selectedIndex - 1)]);
  }

  function clearBoxes() {
    setBoxes([]);
    setStatus("ล้างกล่องแล้ว กดบันทึกเพื่อยืนยัน");
  }

  function undo() {
    setBoxes((prev) => prev.slice(0, -1));
  }

  return (
    <main className="min-h-screen bg-[#06130d] px-5 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/80">Dataset Labeler</p>
            <h1 className="mt-1 text-3xl font-black">Label แมลงวันทองผ่านเว็บ</h1>
            <p className="mt-2 text-sm text-white/60">ลากเมาส์วาดกรอบรอบแมลงวันทอง แล้วกดบันทึกเป็น YOLO label</p>
          </div>
          <Link href="/" className="rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-950">กลับ Dashboard</Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr_260px]">
          <aside className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
            <h2 className="font-black">รูปทั้งหมด</h2>
            <div className="mt-4 max-h-[72vh] space-y-2 overflow-auto pr-1">
              {images.map((item) => (
                <button
                  key={item.file}
                  onClick={() => setSelected(item)}
                  className={`w-full rounded-2xl p-3 text-left text-xs transition ${selected?.file === item.file ? "bg-emerald-300 text-emerald-950" : "bg-black/25 text-white/75 hover:bg-white/15"}`}
                >
                  <span className="block truncate font-bold">{item.file}</span>
                  <span className="mt-1 block">{item.labeled ? "✅ labeled" : "ยังไม่ label"}</span>
                </button>
              ))}
              {!images.length && <p className="text-sm text-white/55">ยังไม่มีรูปใน public/uploads</p>}
            </div>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{selected?.file || "ยังไม่ได้เลือกรูป"}</h2>
                <p className="text-sm text-white/55">Class: fruit_fly (0)</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={prevImage} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">ก่อนหน้า</button>
                <button onClick={nextImage} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">ถัดไป</button>
                <button onClick={undo} className="rounded-full bg-amber-300/20 px-4 py-2 text-sm font-bold text-amber-100">Undo</button>
                <button onClick={clearBoxes} className="rounded-full bg-rose-300/20 px-4 py-2 text-sm font-bold text-rose-100">Clear</button>
                <button onClick={saveLabel} className="rounded-full bg-emerald-300 px-5 py-2 text-sm font-black text-emerald-950">Save YOLO</button>
              </div>
            </div>

            <div
              ref={imageWrapRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={() => { setDragStart(null); setDraft(null); }}
              className="relative min-h-[520px] cursor-crosshair overflow-hidden rounded-3xl bg-black/40"
            >
              {selected ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.url} alt={selected.file} className="h-full max-h-[75vh] w-full select-none object-contain" draggable={false} />
              ) : (
                <div className="flex h-[520px] items-center justify-center text-white/45">ยังไม่มีรูปให้ label</div>
              )}
              {[...boxes, ...(draft ? [draft] : [])].map((box, index) => (
                <div
                  key={`${box.x}-${box.y}-${index}`}
                  className="absolute border-2 border-emerald-300 bg-emerald-300/10"
                  style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
                >
                  <span className="absolute -top-6 left-0 rounded bg-emerald-300 px-2 py-0.5 text-xs font-black text-emerald-950">fruit_fly</span>
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
            <h2 className="font-black">สถานะ</h2>
            <p className="mt-3 rounded-2xl bg-black/25 p-3 text-sm text-emerald-100">{status}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-black/25 p-4">
                <p className="text-3xl font-black text-emerald-200">{boxes.length}</p>
                <p className="text-xs text-white/55">กล่องในรูปนี้</p>
              </div>
              <div className="rounded-2xl bg-black/25 p-4">
                <p className="text-3xl font-black text-amber-200">{images.filter((item) => item.labeled).length}</p>
                <p className="text-xs text-white/55">รูปที่ label แล้ว</p>
              </div>
            </div>
            <ol className="mt-5 space-y-2 text-sm leading-6 text-white/70">
              <li>1. เลือกรูปซ้ายมือ</li>
              <li>2. ลากเมาส์ครอบแมลงวันทอง</li>
              <li>3. กด Save YOLO</li>
              <li>4. รูปจะถูกคัดลอกไป `dataset_raw/images`</li>
              <li>5. label จะอยู่ใน `dataset_raw/labels`</li>
            </ol>
          </aside>
        </div>
      </div>
    </main>
  );
}
