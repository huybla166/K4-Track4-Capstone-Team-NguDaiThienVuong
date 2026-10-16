"use client";

import { useCallback, useEffect, useState } from "react";
import { getEvents } from "@/lib/api";
import type { DriverEvent } from "@/types/telemetry";
import { EventDrawer } from "./event-drawer";
import { eventNames, LevelMark, toLevel } from "./monitor-ui";

export function EventTable() {
  const [events, setEvents] = useState<DriverEvent[]>([]);
  const [selected, setSelected] = useState<DriverEvent | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const close = useCallback(() => setSelected(null), []);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try { const next = await getEvents(); if (alive) { setEvents(next); setError(false); } }
      catch { if (alive) setError(true); }
      finally { if (alive) setLoading(false); }
    };
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  return <section className="monitor-panel" aria-labelledby="events-title">
    <div className="monitor-panel-head">
      <h2 className="monitor-panel-title" id="events-title">Sự kiện gần đây</h2>
      {!loading && events.length > 0 && <span className="monitor-muted">Chọn một dòng để xem chi tiết</span>}
    </div>
    {error && <p role="alert" className="monitor-alert">Không tải được sự kiện. Kiểm tra kết nối API; hệ thống sẽ thử lại.</p>}
    {loading ? <p className="monitor-empty">Đang tải sự kiện…</p> : events.length === 0 ? <p className="monitor-empty">Chưa có sự kiện. Tiếp tục theo dõi tài xế.</p> :
      <div className="monitor-table-wrap"><table className="monitor-table"><thead><tr><th>Thời điểm</th><th>Loại</th><th>Mức</th><th className="monitor-number monitor-col-optional">Điểm</th><th className="monitor-number monitor-col-optional">Thời lượng</th><th className="monitor-col-optional"><span className="sr-only">Chi tiết</span></th></tr></thead><tbody>{events.map((event, index) => {
        const level = toLevel(event.risk_level);
        const started = new Date(event.started_at);
        const name = eventNames[event.event_type] ?? event.event_type;
        return <tr key={event.id ?? `${event.started_at}-${index}`} onClick={() => setSelected(event)} onKeyDown={(key) => { if (key.key === "Enter" || key.key === " ") { key.preventDefault(); setSelected(event); } }} tabIndex={0} role="button" aria-label={`Xem chi tiết ${name} lúc ${started.toLocaleString("vi-VN")}`} className="monitor-event-row">
          <td className="tabular-nums"><span className="monitor-time">{started.toLocaleTimeString("vi-VN")}</span><span className="monitor-date">{started.toLocaleDateString("vi-VN")}</span></td>
          <td>{name}</td>
          <td><LevelMark level={level}/></td>
          <td className="monitor-number monitor-col-optional">{event.risk_score.toFixed(0)}</td>
          <td className="monitor-number monitor-col-optional">{(event.duration_ms / 1000).toFixed(1).replace(".", ",")} giây</td>
          <td className="monitor-col-optional"><span className="monitor-link">Xem</span></td>
        </tr>;
      })}</tbody></table></div>}
    {selected && <EventDrawer event={selected} onClose={close}/>}
  </section>;
}
