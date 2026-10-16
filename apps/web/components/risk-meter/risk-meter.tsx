import type { RiskLevel } from "@/types/telemetry";
import { LevelIcon, levelLabels } from "@/components/monitor/monitor-ui";

export function RiskMeter({ score, level, muted, reasons = [] }: { score: number; level: RiskLevel; muted: boolean; reasons?: string[] }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <section className={`monitor-panel monitor-risk is-${level.toLowerCase()}`} aria-labelledby="risk-title">
      <div className="monitor-risk-top">
        <h2 className="sr-only" id="risk-title">Bây giờ</h2>
        {muted && <span className="monitor-risk-muted">Đã tắt tiếng</span>}
      </div>
      {level === "DANGER" && !muted && (
        <p role="alert" className="sr-only">Tài xế đang ở mức nguy hiểm.</p>
      )}
      <div>
        <div className="monitor-risk-main">
          <span className="monitor-risk-score" title="Điểm rủi ro, 0 đến 100" aria-label={`Điểm rủi ro ${pct.toFixed(0)} trên 100`}>{pct.toFixed(0)}</span>
          <span className="monitor-risk-word inline-flex items-center gap-2"><LevelIcon level={level} size={24}/>{levelLabels[level]}</span>
        </div>
        {reasons.length > 0 && (
          <ul className="monitor-risk-reasons mt-2">
            {reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        )}
      </div>
      <div>
        <div className="monitor-risk-track" aria-hidden="true">
          <div className="monitor-risk-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="monitor-risk-scale" aria-hidden="true"><span>0</span><span>40</span><span>70</span><span>100</span></div>
      </div>
    </section>
  );
}
