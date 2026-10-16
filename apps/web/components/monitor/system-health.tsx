"use client";

import { useEffect, useState } from "react";
import type { Telemetry } from "@/types/telemetry";
import { getHealth, type Health } from "@/lib/health";

type Tone = "ok" | "warn" | "bad" | "off";

function Status({ label, tone, text }: { label: string; tone: Tone; text: string }) {
  const square = { ok: "is-ok", warn: "is-warn", bad: "", off: "is-off" }[tone];
  return <div><dt>{label}</dt><dd><span className={`status-square ${square}`} aria-hidden="true" />{text}</dd></div>;
}

function Metric({ label, value, unit }: { label: string; value?: number; unit: string }) {
  return <div className="monitor-metric"><dt>{label}</dt><dd>{value === undefined ? "–" : <>{Math.round(value)} <small>{unit}</small></>}</dd></div>;
}

export function SystemHealth({ telemetry, connected }: { telemetry: Telemetry | null; connected: boolean }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try { const result = await getHealth(); if (alive) { setHealth(result); setError(false); } }
      catch { if (alive) setError(true); }
    };
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  const checking = { tone: "off" as Tone, text: "Đang kiểm tra…" };
  const api = error ? { tone: "bad" as Tone, text: "Không tải được" } : health ? (health.status === "ok" ? { tone: "ok" as Tone, text: "Hoạt động" } : { tone: "warn" as Tone, text: "Giảm chức năng" }) : checking;
  const worker = health ? (health.ai_worker_alive ? { tone: "ok" as Tone, text: "Đang chạy" } : { tone: "warn" as Tone, text: "Không chạy" }) : checking;
  const camera = health ? (health.camera_connected ? { tone: "ok" as Tone, text: "Có hình" } : { tone: "warn" as Tone, text: "Không có hình" }) : checking;
  return <section className="monitor-panel" aria-labelledby="health-title">
    <h2 className="monitor-panel-title" id="health-title">Sức khỏe hệ thống</h2>
    <dl className="monitor-health">
      <Status label="WebSocket" tone={connected ? "ok" : "bad"} text={connected ? "Đã kết nối" : "Đang kết nối lại"}/>
      <Status label="API" {...api}/>
      <Status label="AI worker" {...worker}/>
      <Status label="Camera" {...camera}/>
    </dl>
    <dl className="monitor-metrics"><Metric label="FPS camera" value={telemetry?.fps.camera} unit="fps"/><Metric label="FPS khuôn mặt" value={telemetry?.fps.face} unit="fps"/><Metric label="FPS điện thoại" value={telemetry?.fps.phone} unit="fps"/><Metric label="Độ trễ khuôn mặt" value={telemetry?.latency_ms.face} unit="ms"/><Metric label="Độ trễ điện thoại" value={telemetry?.latency_ms.phone} unit="ms"/></dl>
  </section>;
}
