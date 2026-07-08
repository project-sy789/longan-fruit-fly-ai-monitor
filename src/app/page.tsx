"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type Severity = "ต่ำ" | "เฝ้าระวัง" | "ระบาด";

type TrapRecord = {
  id: string;
  trap: string;
  date: string;
  count: number;
  temperature: number;
  humidity: number;
  severity: Severity;
};

type DetectionBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
};

const demoRecords: TrapRecord[] = [
  { id: "1", trap: "กับดัก A1", date: "15 ก.ค.", count: 7, temperature: 29, humidity: 74, severity: "ต่ำ" },
  { id: "2", trap: "กับดัก A1", date: "16 ก.ค.", count: 13, temperature: 30, humidity: 78, severity: "เฝ้าระวัง" },
  { id: "3", trap: "กับดัก A1", date: "17 ก.ค.", count: 18, temperature: 31, humidity: 80, severity: "เฝ้าระวัง" },
  { id: "4", trap: "กับดัก B2", date: "18 ก.ค.", count: 31, temperature: 32, humidity: 81, severity: "ระบาด" },
  { id: "5", trap: "กับดัก B2", date: "19 ก.ค.", count: 24, temperature: 31, humidity: 76, severity: "เฝ้าระวัง" },
  { id: "6", trap: "กับดัก C3", date: "20 ก.ค.", count: 38, temperature: 33, humidity: 72, severity: "ระบาด" },
  { id: "7", trap: "กับดัก C3", date: "21 ก.ค.", count: 16, temperature: 29, humidity: 79, severity: "เฝ้าระวัง" },
];

function classifySeverity(count: number): Severity {
  if (count >= 25) return "ระบาด";
  if (count >= 10) return "เฝ้าระวัง";
  return "ต่ำ";
}

function severityStyle(severity: Severity) {
  if (severity === "ระบาด") return "bg-rose-500/15 text-rose-200 ring-1 ring-rose-300/30";
  if (severity === "เฝ้าระวัง") return "bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/30";
  return "bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-300/30";
}

function detectFruitFlyLikeObjects(imageData: ImageData): DetectionBox[] {
  const { data, width, height } = imageData;
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    const idx = i / 4;

    const goldenBody = r > 95 && g > 55 && g < 170 && b < 95 && chroma > 35;
    const darkBody = r < 90 && g < 85 && b < 75 && chroma < 55;
    const wingBrown = r > 80 && r < 170 && g > 55 && g < 135 && b > 35 && b < 115 && chroma > 20;

    if (goldenBody || darkBody || wingBrown) mask[idx] = 1;
  }

  const visited = new Uint8Array(width * height);
  const boxes: DetectionBox[] = [];
  const queue: number[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (!mask[start] || visited[start]) continue;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let pixels = 0;
      queue.length = 0;
      queue.push(start);
      visited[start] = 1;

      while (queue.length) {
        const p = queue.pop()!;
        const px = p % width;
        const py = Math.floor(p / width);
        pixels += 1;
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);

        const neighbors = [p - 1, p + 1, p - width, p + width];
        for (const n of neighbors) {
          if (n < 0 || n >= width * height || visited[n] || !mask[n]) continue;
          const nx = n % width;
          if (Math.abs(nx - px) > 1) continue;
          visited[n] = 1;
          queue.push(n);
        }
      }

      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      const area = w * h;
      const fill = pixels / Math.max(area, 1);
      const plausibleSize = pixels > 12 && pixels < width * height * 0.05;
      const plausibleShape = w >= 4 && h >= 4 && w / h < 4.5 && h / w < 4.5;

      if (plausibleSize && plausibleShape && fill > 0.12) {
        boxes.push({
          x: minX,
          y: minY,
          w,
          h,
          confidence: Math.min(0.97, 0.52 + fill * 0.38 + Math.min(pixels / 900, 0.22)),
        });
      }
    }
  }

  return boxes
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 80);
}

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [detections, setDetections] = useState<DetectionBox[]>([]);
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [records, setRecords] = useState<TrapRecord[]>(demoRecords);
  const [dataSource, setDataSource] = useState<"demo" | "api">("demo");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let alive = true;
    async function loadReadings() {
      try {
        const response = await fetch("/api/readings", { cache: "no-store" });
        const payload = await response.json();
        const apiRecords: TrapRecord[] = (payload.readings || []).map((item: {
          id: string;
          trapName: string;
          recordedAt: string;
          count: number;
          temperature?: number;
          humidity?: number;
          severity: Severity;
          source?: string;
        }) => ({
          id: item.id,
          trap: item.trapName,
          date: new Date(item.recordedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
          count: item.count,
          temperature: item.temperature ?? 0,
          humidity: item.humidity ?? 0,
          severity: item.severity,
        }));
        if (alive && apiRecords.length) {
          setRecords(apiRecords);
          setDataSource(apiRecords.some((item) => !item.id.startsWith("demo-")) ? "api" : "demo");
        }
      } catch {
        if (alive) setDataSource("demo");
      }
    }
    loadReadings();
    const timer = window.setInterval(loadReadings, 30000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const latest = records[records.length - 1] || demoRecords[demoRecords.length - 1];
  const total = records.reduce((sum, item) => sum + item.count, 0);
  const average = Math.round(total / Math.max(records.length, 1));
  const maxCount = Math.max(...records.map((item) => item.count), 1);
  const currentSeverity = classifySeverity(detections.length || latest.count);

  const chartBars = useMemo(
    () => records.map((item) => ({ ...item, width: `${Math.max(12, (item.count / maxCount) * 100)}%` })),
    [maxCount, records]
  );

  const linePoints = useMemo(() => {
    const width = 560;
    const height = 210;
    const pad = 24;
    const denom = Math.max(records.length - 1, 1);
    return records.map((item, index) => {
      const x = pad + (index / denom) * (width - pad * 2);
      const y = height - pad - (item.count / maxCount) * (height - pad * 2);
      return { ...item, x, y };
    });
  }, [maxCount, records]);

  const trapSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of records) map.set(item.trap, (map.get(item.trap) || 0) + item.count);
    return Array.from(map.entries()).map(([trap, count]) => ({ trap, count }));
  }, [records]);

  const severitySummary = useMemo(() => {
    const levels: Severity[] = ["ต่ำ", "เฝ้าระวัง", "ระบาด"];
    return levels.map((level) => ({ level, count: records.filter((item) => item.severity === level).length }));
  }, [records]);

  async function analyzeFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maxSide = 900;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const boxes = detectFruitFlyLikeObjects(imageData);
      setImageSize({ width, height });
      setDetections(boxes);
      setIsAnalyzing(false);
    };
    image.src = url;
  }

  function loadDemoImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 540;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 900, 540);
    gradient.addColorStop(0, "#fef3c7");
    gradient.addColorStop(1, "#052e16");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 900, 540);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(70, 60, 760, 420);
    ctx.fillStyle = "rgba(15,23,42,0.08)";
    ctx.fillRect(95, 85, 710, 370);

    for (let i = 0; i < 26; i += 1) {
      const x = 120 + Math.random() * 640;
      const y = 110 + Math.random() * 310;
      const size = 7 + Math.random() * 8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillStyle = "rgba(80,45,18,0.92)";
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 1.25, size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(211,145,42,0.88)";
      ctx.beginPath();
      ctx.ellipse(size * 0.4, 0, size * 0.6, size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(245,245,220,0.50)";
      ctx.beginPath();
      ctx.ellipse(-size * 0.65, -size * 0.35, size * 0.8, size * 0.33, -0.3, 0, Math.PI * 2);
      ctx.ellipse(-size * 0.65, size * 0.35, size * 0.8, size * 0.33, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    setImageUrl(canvas.toDataURL("image/png"));
    setIsAnalyzing(true);
    setTimeout(() => {
      const ctx2 = canvas.getContext("2d", { willReadFrequently: true })!;
      const imageData = ctx2.getImageData(0, 0, canvas.width, canvas.height);
      setImageSize({ width: canvas.width, height: canvas.height });
      setDetections(detectFruitFlyLikeObjects(imageData));
      setIsAnalyzing(false);
    }, 250);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#05130d] text-white">
      <canvas ref={canvasRef} className="hidden" />
      <section className="relative isolate px-5 py-8 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,#20c99733,transparent_34%),radial-gradient(circle_at_70%_10%,#fbbf2430,transparent_28%),linear-gradient(135deg,#071a12,#071016_55%,#120b05)]" />
        <div className="mx-auto max-w-7xl">
          <nav className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/8 px-5 py-4 backdrop-blur-xl">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/80">Longan Fruit Fly AI Monitor</p>
              <h1 className="mt-1 text-xl font-black sm:text-2xl">เครื่องดักจับและประเมินการระบาดของแมลงวันทองด้วย AI</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href="/traps" className="rounded-full bg-amber-300/20 px-4 py-2 text-sm font-black text-amber-100">
                จัดการกับดัก
              </a>
              <a href="/label" className="rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-950 shadow-lg shadow-white/10">
                Label รูป
              </a>
              <div className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25">
                {dataSource === "api" ? "เชื่อมต่ออุปกรณ์แล้ว" : "Prototype สำหรับโครงงาน ม.ปลาย"}
              </div>
            </div>
          </nav>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-amber-200">สวนลำไย อำเภอซับใหญ่ จังหวัดชัยภูมิ</p>
                  <h2 className="mt-2 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
                    ดัก ล่อ นับ และแจ้งเตือนแมลงวันทองแบบอัตโนมัติ
                  </h2>
                </div>
              </div>
              <p className="max-w-3xl text-lg leading-8 text-white/75">
                ต้นแบบเว็บนี้จำลองระบบกับดักสารล่อ + กล้อง + AI ตรวจจับวัตถุ เพื่อช่วยเกษตรกรประเมินระดับการระบาดจากจำนวนแมลงที่ติดกับดักต่อวัน
                พร้อม dashboard และแนวทางแจ้งเตือนผ่านมือถือ
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ["จำนวนล่าสุด", `${detections.length || latest.count} ตัว`, currentSeverity],
                  ["ค่าเฉลี่ย 7 วัน", `${average} ตัว/วัน`, "เฝ้าระวัง"],
                  ["ความชื้นล่าสุด", `${latest.humidity}%`, "เหมาะต่อการระบาด"],
                ].map(([label, value, note]) => (
                  <div key={label} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <p className="text-sm text-white/55">{label}</p>
                    <p className="mt-2 text-3xl font-black">{value}</p>
                    <p className="mt-1 text-sm text-emerald-200">{note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-amber-200/20 bg-amber-300/10 p-6 backdrop-blur-2xl">
              <p className="text-sm font-black text-amber-200">สถานะการแจ้งเตือน</p>
              <div className={`mt-4 inline-flex rounded-full px-4 py-2 text-sm font-black ${severityStyle(currentSeverity)}`}>
                ระดับ: {currentSeverity}
              </div>
              <p className="mt-5 leading-7 text-white/75">
                เกณฑ์ตัวอย่าง: 0–9 = ต่ำ, 10–24 = เฝ้าระวัง, 25+ = ระบาด ควรเข้าตรวจสวน/เปลี่ยนสารล่อ/วางกับดักเพิ่ม
              </p>
              <div className="mt-6 rounded-3xl bg-black/25 p-5 font-mono text-sm text-emerald-100">
                IF count &gt;= 25 THEN<br />
                SEND Telegram/LINE alert<br />
                “พบแมลงวันทองสูงในกับดัก B2”
              </div>
            </div>
          </div>

          <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 backdrop-blur-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-black">AI วิเคราะห์ภาพจากกับดัก</h3>
                  <p className="mt-1 text-sm text-white/60">อัปโหลดภาพถาดกาว/ขวดดัก หรือใช้ภาพจำลอง</p>
                </div>
                <button onClick={loadDemoImage} className="rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-950 transition hover:scale-105">
                  ใช้ภาพจำลอง
                </button>
              </div>

              <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-emerald-200/40 bg-emerald-300/10 p-6 text-center transition hover:bg-emerald-300/15">
                <span className="text-lg font-bold">เลือกภาพจากกล้อง</span>
                <span className="mt-1 text-sm text-white/55">รองรับ JPG/PNG — วิเคราะห์ด้วย heuristic computer vision ใน browser</span>
                <input className="hidden" type="file" accept="image/*" onChange={analyzeFile} />
              </label>

              <div className="relative mt-5 overflow-hidden rounded-3xl bg-black/35">
                {imageUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="ภาพจากกับดักแมลงวันทอง" className="h-auto w-full" />
                    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${imageSize.width} ${imageSize.height}`} preserveAspectRatio="none">
                      {detections.map((box, index) => (
                        <g key={`${box.x}-${box.y}-${index}`}>
                          <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke="#22c55e" strokeWidth="3" rx="6" />
                          <text x={box.x} y={Math.max(14, box.y - 5)} fill="#dcfce7" fontSize="18" fontWeight="800">
                            #{index + 1} {(box.confidence * 100).toFixed(0)}%
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                ) : (
                  <div className="flex h-72 items-center justify-center text-white/45">ยังไม่มีภาพ</div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-black/20 p-4">
                  <p className="text-sm text-white/55">ตรวจพบ</p>
                  <p className="text-3xl font-black text-emerald-200">{isAnalyzing ? "..." : detections.length}</p>
                </div>
                <div className="rounded-2xl bg-black/20 p-4">
                  <p className="text-sm text-white/55">AI confidence</p>
                  <p className="text-3xl font-black text-amber-200">
                    {detections.length ? `${Math.round((detections.reduce((s, d) => s + d.confidence, 0) / detections.length) * 100)}%` : "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/20 p-4">
                  <p className="text-sm text-white/55">สถานะ</p>
                  <p className="text-xl font-black text-rose-200">{currentSeverity}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 backdrop-blur-2xl">
              <h3 className="text-2xl font-black">แนวโน้มจำนวนแมลง</h3>
              <div className="mt-6 space-y-4">
                {chartBars.map((item) => (
                  <div key={item.id}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-bold text-white/80">{item.date} · {item.trap}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${severityStyle(item.severity)}`}>{item.count} ตัว</span>
                    </div>
                    <div className="h-4 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-rose-400" style={{ width: item.width }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/10 text-white/65">
                    <tr>
                      <th className="px-4 py-3">วัน</th>
                      <th className="px-4 py-3">กับดัก</th>
                      <th className="px-4 py-3">จำนวน</th>
                      <th className="px-4 py-3">ระดับ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice().reverse().map((item) => (
                      <tr key={item.id} className="border-t border-white/10">
                        <td className="px-4 py-3">{item.date}</td>
                        <td className="px-4 py-3">{item.trap}</td>
                        <td className="px-4 py-3 font-black">{item.count}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${severityStyle(item.severity)}`}>{item.severity}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-black">กราฟแนวโน้มการระบาด</h3>
                  <p className="mt-1 text-sm text-white/55">Line chart จำนวนแมลงต่อรอบตรวจ — ใช้ดูจุดพุ่งผิดปกติ</p>
                </div>
                <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-black text-emerald-100">Trend</span>
              </div>
              <svg viewBox="0 0 560 210" className="mt-6 h-72 w-full overflow-visible rounded-3xl bg-black/20 p-2">
                {[0.25, 0.5, 0.75].map((line) => (
                  <line key={line} x1="24" x2="536" y1={210 * line} y2={210 * line} stroke="rgba(255,255,255,0.10)" strokeDasharray="5 7" />
                ))}
                <polyline
                  fill="none"
                  stroke="url(#trendGradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={linePoints.map((point) => `${point.x},${point.y}`).join(" ")}
                />
                <defs>
                  <linearGradient id="trendGradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="55%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#fb7185" />
                  </linearGradient>
                </defs>
                {linePoints.map((point) => (
                  <g key={point.id}>
                    <circle cx={point.x} cy={point.y} r="7" fill="#052e16" stroke="#a7f3d0" strokeWidth="3" />
                    <text x={point.x} y={point.y - 13} textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="900">{point.count}</text>
                    <text x={point.x} y="202" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="11">{point.date}</text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="grid gap-6">
              <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 backdrop-blur-2xl">
                <h3 className="text-2xl font-black">รวมตามตำแหน่งกับดัก</h3>
                <div className="mt-5 space-y-4">
                  {trapSummary.map((item) => (
                    <div key={item.trap}>
                      <div className="mb-2 flex justify-between text-sm font-bold text-white/75">
                        <span>{item.trap}</span>
                        <span>{item.count} ตัว</span>
                      </div>
                      <div className="h-5 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                          style={{ width: `${Math.max(10, (item.count / Math.max(...trapSummary.map((trap) => trap.count), 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 backdrop-blur-2xl">
                <h3 className="text-2xl font-black">สัดส่วนระดับการระบาด</h3>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {severitySummary.map((item) => (
                    <div key={item.level} className={`rounded-3xl p-4 text-center ${severityStyle(item.level)}`}>
                      <p className="text-3xl font-black">{item.count}</p>
                      <p className="mt-1 text-xs font-bold">{item.level}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
