"use client";

import { useEffect, useRef } from "react";
import type { DriverEvent } from "@/types/telemetry";
import { eventNames, LevelMark, toLevel } from "./monitor-ui";

export function EventDrawer({ event, onClose }: { event: DriverEvent; onClose: () => void }) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    close.current?.focus();
    const handle = (key: KeyboardEvent) => {
      if (key.key === "Escape") onClose();
      if (key.key !== "Tab" || !dialog.current) return;
      const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')).filter((item) => !item.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (key.shiftKey && document.activeElement === first) { key.preventDefault(); last.focus(); }
      else if (!key.shiftKey && document.activeElement === last) { key.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handle);
    return () => { document.removeEventListener("keydown", handle); previous?.focus(); };
  }, [onClose]);
  const level = toLevel(event.risk_level);
  const fields = [
    ["Thời điểm", new Date(event.started_at).toLocaleString("vi-VN")],
    ["Thời lượng", `${(event.duration_ms / 1000).toFixed(1).replace(".", ",")} giây`],
    ["Điểm rủi ro", event.risk_score.toFixed(0)],
    ["Độ tin cậy", `${(event.confidence * 100).toFixed(0)}%`],
    ["Nguyên nhân", event.reason || "Chưa có mô tả nguyên nhân."],
  ];
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onMouseDown={(mouse) => { if (mouse.target === mouse.currentTarget) onClose(); }}>
    <aside ref={dialog} role="dialog" aria-modal="true" aria-labelledby="event-title" className="h-full w-full max-w-md overflow-y-auto bg-[var(--surface,#fff)] p-6 text-[var(--text,#1a1a18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[14px] text-[var(--text-muted,#5c5c57)]">Chi tiết sự kiện</p>
          <h2 id="event-title" className="mt-1 text-[24px] leading-tight font-semibold">{eventNames[event.event_type] ?? event.event_type}</h2>
        </div>
        <button ref={close} type="button" onClick={onClose} aria-label="Đóng chi tiết sự kiện" className="btn btn-quiet">Đóng</button>
      </div>
      <div className="mt-6"><LevelMark level={level}/></div>
      <dl className="mt-6 grid gap-2">{fields.map(([label, value]) => <div key={label} className="rounded-[var(--radius,6px)] bg-[var(--bg,#f6f6f4)] px-4 py-3"><dt className="text-[14px] text-[var(--text-muted,#5c5c57)]">{label}</dt><dd className="mt-1 text-[16px] font-medium break-words">{value}</dd></div>)}</dl>
    </aside>
  </div>;
}
