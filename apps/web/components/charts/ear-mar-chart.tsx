import type { HistoryPoint } from "@/lib/useTelemetry";

const MAX = 1;
const THRESHOLD = 0.2; // trần của ngưỡng nhắm mắt cá nhân: min(0,20, 0,55 × EAR mở mắt)

function toPath(values: number[]): string {
  if (values.length < 2) return "";
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - (Math.min(Math.max(v, 0), MAX) / MAX) * 100;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function EarMarChart({ history }: { history: HistoryPoint[] }) {
  const thresholdY = 100 - (THRESHOLD / MAX) * 100;
  return (
    <section className="monitor-panel" aria-labelledby="earmar-title">
      <div className="monitor-panel-head">
        <h2 className="monitor-panel-title" id="earmar-title">EAR và MAR, 60 mẫu gần nhất</h2>
        <span className="monitor-legend">
          <span className="monitor-chart-ear"><span className="monitor-swatch" aria-hidden="true" />EAR</span>
          <span className="monitor-chart-mar"><span className="monitor-swatch" aria-hidden="true" />MAR</span>
        </span>
      </div>
      {history.length < 2 ? (
        <p className="monitor-chart-empty" style={{ height: 140 }}>Đang chờ dữ liệu.</p>
      ) : (
        <div className="monitor-plot">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Đồ thị EAR và MAR">
            <line x1="0" x2="100" y1={thresholdY} y2={thresholdY} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            <path d={toPath(history.map((h) => h.mar))} fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={toPath(history.map((h) => h.ear))} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      )}
      <p className="monitor-axis-note">Đường đứt: EAR 0,20, mức cao nhất của ngưỡng nhắm mắt. Ngưỡng thật được đo riêng cho từng tài xế lúc hiệu chuẩn.</p>
    </section>
  );
}
