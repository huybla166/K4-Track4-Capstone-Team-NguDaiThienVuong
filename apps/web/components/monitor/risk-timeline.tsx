import type { TimelinePoint } from "@/lib/timeline";
import type { TimelineEvent } from "@/lib/useRiskHistory";
import { levelBand } from "@/lib/timeline";
import { eventNames } from "./monitor-ui";

const WINDOW = 300_000;
// Positions in percent of the plot, so the plot stretches while labels keep their true size.
const x = (time: number, now: number) => (time - (now - WINDOW)) / WINDOW * 100;
const y = (score: number) => 100 - Math.max(0, Math.min(100, score));

export function RiskTimeline({ points, events, now }: { points: TimelinePoint[]; events: TimelineEvent[]; now: number }) {
  const visible = points.filter((point) => point.time >= now - WINDOW && point.time <= now);
  const marks = events.filter((event) => event.time >= now - WINDOW && event.time <= now);
  const path = visible.map((point, index) => `${index ? "L" : "M"}${x(point.time, now).toFixed(2)},${y(point.score).toFixed(2)}`).join(" ");
  return <section className="monitor-panel" aria-labelledby="timeline-title">
    <div className="monitor-panel-head">
      <h2 className="monitor-panel-title" id="timeline-title">Rủi ro trong 5 phút gần nhất</h2>
      {visible.length > 0 && <span className="monitor-muted">{marks.length} sự kiện</span>}
    </div>
    {visible.length === 0 ? <p className="monitor-chart-empty">Đang chờ điểm rủi ro từ camera.</p> : <>
      <div className="monitor-timeline" role="img" aria-label={`Điểm rủi ro trong 5 phút gần nhất, hiện tại ${visible[visible.length - 1].score.toFixed(0)} điểm; ${marks.length} sự kiện`}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <rect className="monitor-band-danger" x="0" y={y(100)} width="100" height={y(70) - y(100)} />
          <rect className="monitor-band-warning" x="0" y={y(70)} width="100" height={y(40) - y(70)} />
          <rect className="monitor-band-normal" x="0" y={y(40)} width="100" height={y(0) - y(40)} />
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {[100, 70, 40, 0].map((score) => <span key={score} className="monitor-tick" style={{ top: `${y(score)}%` }} aria-hidden="true">{score}</span>)}
        {marks.map((event) => {
          const band = levelBand(event.score).toLowerCase();
          const name = eventNames[event.eventType] ?? event.eventType;
          return <span key={event.key} className={`monitor-mark is-${band}`} style={{ left: `${x(event.time, now)}%`, top: `${y(event.score)}%` }} title={`${name}: ${event.score.toFixed(0)} điểm`} />;
        })}
      </div>
      <div className="monitor-xaxis" aria-hidden="true"><span>5 phút trước</span><span>Bây giờ</span></div>
    </>}
  </section>;
}
