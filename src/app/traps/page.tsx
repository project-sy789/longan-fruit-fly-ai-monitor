"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type TrapEntry = {
  id: string;
  name: string;
  location: string;
  createdAt: string;
};

type TrapStats = {
  trapId: string;
  readings: number;
  images: number;
};

export default function TrapsPage() {
  const [traps, setTraps] = useState<TrapEntry[]>([]);
  const [stats, setStats] = useState<TrapStats[]>([]);
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("สวนลำไย อำเภอซับใหญ่ จังหวัดชัยภูมิ");
  const [status, setStatus] = useState("");

  const loadTraps = useCallback(async () => {
    const res = await fetch("/api/traps", { cache: "no-store" });
    const data = await res.json();
    setTraps(data.traps || []);
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/readings", { cache: "no-store" });
    const data = await res.json();
    const readings: { trapId: string }[] = data.readings || [];
    const byTrap = new Map<string, number>();
    for (const r of readings) byTrap.set(r.trapId, (byTrap.get(r.trapId) || 0) + 1);
    const imgRes = await fetch("/api/dataset/images", { cache: "no-store" });
    const imgData = await imgRes.json();
    const images: { file: string }[] = imgData.images || [];
    const imgsByTrap = new Map<string, number>();
    for (const img of images) {
      const prefix = img.file.split("_")[0] || "";
      imgsByTrap.set(prefix, (imgsByTrap.get(prefix) || 0) + 1);
    }
    const allIds = new Set([...byTrap.keys(), ...imgsByTrap.keys()]);
    setStats(
      Array.from(allIds).map((id) => ({
        trapId: id,
        readings: byTrap.get(id) || 0,
        images: imgsByTrap.get(id) || 0,
      }))
    );
  }, []);

  useEffect(() => {
    loadTraps();
    loadStats();
  }, [loadTraps, loadStats]);

  async function addOrUpdate() {
    const id = formId.trim();
    if (!id) {
      setStatus("❌ กรุณากรอกรหัสกับดัก");
      return;
    }
    setStatus("⏳ กำลังบันทึก...");
    const res = await fetch("/api/traps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: formName || undefined, location: formLocation || undefined }),
    });
    const data = await res.json();
    if (data.ok) {
      setStatus(`✅ บันทึกกับดัก ${id} แล้ว`);
      setFormId("");
      setFormName("");
      loadTraps();
    } else {
      setStatus(`❌ ${data.error}`);
    }
  }

  async function removeTrap(id: string) {
    if (!confirm(`ลบกับดัก ${id}? ข้อมูล reading/รูปจะยังอยู่`)) return;
    setStatus("⏳ กำลังลบ...");
    const res = await fetch(`/api/traps?trapId=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json();
    setStatus(data.ok ? `🗑️ ลบกับดัก ${id} แล้ว` : `❌ ${data.error}`);
    loadTraps();
  }

  function fillForm(trap: TrapEntry) {
    setFormId(trap.id);
    setFormName(trap.name);
    setFormLocation(trap.location);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen bg-[#06130d] px-5 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/80">Trap Management</p>
            <h1 className="mt-1 text-3xl font-black">จัดการกับดักในสวน</h1>
            <p className="mt-2 text-sm text-white/60">เพิ่ม ลบ แก้ไข กับดัก — เมื่อลงทะเบียนแล้วจะปรากฏใน dashboard และหน้า label</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-950">
              Dashboard
            </Link>
            <Link href="/label" className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
              Label รูป
            </Link>
          </div>
        </div>

        {/* Add / Edit form */}
        <div className="mb-6 rounded-3xl border border-emerald-200/20 bg-emerald-300/10 p-6 backdrop-blur-xl">
          <h2 className="text-xl font-black text-emerald-200">
            {formId ? `แก้ไขกับดัก ${formId}` : "เพิ่มกับดักใหม่"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-bold text-white/70">รหัสกับดัก (trapId)*</label>
              <input
                className="mt-2 w-full rounded-2xl bg-black/30 px-4 py-3 text-white outline-none ring-1 ring-white/20 focus:ring-emerald-300"
                placeholder="เช่น ESP32-A1, B2"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                disabled={!!formId}
              />
              {formId && <p className="mt-1 text-xs text-amber-200">ไม่สามารถเปลี่ยนรหัสได้ — ถ้าต้องการเปลี่ยน ให้ลบแล้วเพิ่มใหม่</p>}
            </div>
            <div>
              <label className="text-sm font-bold text-white/70">ชื่อกับดัก</label>
              <input
                className="mt-2 w-full rounded-2xl bg-black/30 px-4 py-3 text-white outline-none ring-1 ring-white/20 focus:ring-emerald-300"
                placeholder="กับดัก A1"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-bold text-white/70">ตำแหน่ง</label>
              <input
                className="mt-2 w-full rounded-2xl bg-black/30 px-4 py-3 text-white outline-none ring-1 ring-white/20 focus:ring-emerald-300"
                placeholder="สวนลำไย อำเภอซับใหญ่"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={addOrUpdate}
              className="rounded-full bg-emerald-300 px-6 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:scale-105"
            >
              {formId ? "💾 บันทึกการแก้ไข" : "➕ เพิ่มกับดัก"}
            </button>
            {formId && (
              <button
                onClick={() => { setFormId(""); setFormName(""); }}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold"
              >
                ยกเลิก
              </button>
            )}
            {status && (
              <span className="rounded-full bg-black/30 px-4 py-2 text-sm font-bold">{status}</span>
            )}
          </div>
        </div>

        {/* Trap list */}
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl">
          <h2 className="text-xl font-black">กับดักที่ลงทะเบียน ({traps.length})</h2>
          {traps.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-black/30 p-8 text-center text-white/55">
              <p className="text-lg font-bold">ยังไม่มีกับดักที่ลงทะเบียน</p>
              <p className="mt-2 text-sm">
                เพิ่มกับดักจากฟอร์มด้านบน หรือส่งข้อมูลจาก ESP32-CAM แล้วกับดักจะปรากฏอัตโนมัติ
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/10 text-white/65">
                  <tr>
                    <th className="px-5 py-4">รหัส</th>
                    <th className="px-5 py-4">ชื่อ</th>
                    <th className="px-5 py-4">ตำแหน่ง</th>
                    <th className="px-5 py-4">จำนวนข้อมูล</th>
                    <th className="px-5 py-4">จำนวนรูป</th>
                    <th className="px-5 py-4">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {traps.map((trap) => {
                    const stat = stats.find((s) => s.trapId === trap.id);
                    return (
                      <tr key={trap.id} className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-5 py-4 font-mono font-black text-emerald-200">{trap.id}</td>
                        <td className="px-5 py-4 font-bold">{trap.name}</td>
                        <td className="px-5 py-4 text-white/70">{trap.location}</td>
                        <td className="px-5 py-4 font-black">{stat?.readings ?? "-"}</td>
                        <td className="px-5 py-4 font-black text-amber-200">{stat?.images ?? "-"}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => fillForm(trap)}
                              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20"
                            >
                              ✏️ แก้ไข
                            </button>
                            <button
                              onClick={() => removeTrap(trap.id)}
                              className="rounded-full bg-rose-300/20 px-3 py-1.5 text-xs font-bold text-rose-100 hover:bg-rose-300/30"
                            >
                              🗑️ ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl text-center">
            <p className="text-4xl font-black text-emerald-200">{traps.length}</p>
            <p className="mt-2 text-sm text-white/55">กับดักที่ลงทะเบียน</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl text-center">
            <p className="text-4xl font-black text-amber-200">
              {stats.reduce((s, t) => s + t.readings, 0)}
            </p>
            <p className="mt-2 text-sm text-white/55">จำนวนข้อมูลทั้งหมด</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl text-center">
            <p className="text-4xl font-black text-rose-200">
              {stats.reduce((s, t) => s + t.images, 0)}
            </p>
            <p className="mt-2 text-sm text-white/55">จำนวนรูปทั้งหมด</p>
          </div>
        </div>
      </div>
    </main>
  );
}
