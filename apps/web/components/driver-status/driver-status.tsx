import type { Telemetry } from "@/types/telemetry";
import { decimal } from "@/components/monitor/monitor-ui";

type Flag = "face_detected" | "calibrated" | "eyes_closed" | "yawning" | "looking_away" | "looking_down" | "phone_usage" | "phone_detected";

// good: the signal should be on; mild: on is worth noticing but not an alert
const SIGNALS: { key: Flag; label: string; good?: boolean; mild?: boolean }[] = [
  { key: "face_detected", label: "Thấy mặt", good: true },
  { key: "calibrated", label: "Đã hiệu chuẩn", good: true },
  { key: "eyes_closed", label: "Nhắm mắt" },
  { key: "yawning", label: "Ngáp" },
  { key: "looking_away", label: "Quay đầu" },
  { key: "looking_down", label: "Cúi đầu" },
  { key: "phone_usage", label: "Dùng điện thoại" },
  { key: "phone_detected", label: "Thấy điện thoại", mild: true },
];

export function DriverStatus({ t }: { t: Telemetry }) {
  return (
    <section className="monitor-panel" aria-labelledby="signals-title">
      <h2 className="monitor-panel-title" id="signals-title">Tín hiệu tài xế</h2>
      <dl className="monitor-signals">
        {SIGNALS.map(({ key, label, good, mild }) => {
          const on = Boolean(t[key]);
          const alert = good ? !on : on && !mild;
          const square = good ? (on ? "is-ok" : "") : on ? (mild ? "is-warn" : "") : "is-off";
          return (
            <div key={key} className={`monitor-signal ${alert ? "is-alert" : ""}`}>
              <dt>{label}</dt>
              <dd><span className={`status-square ${square}`} aria-hidden="true" />{on ? "Có" : "Không"}</dd>
            </div>
          );
        })}
      </dl>
      <dl className="monitor-readouts">
        <div><dt>EAR</dt><dd>{decimal(t.ear, 2)}</dd></div>
        <div><dt>MAR</dt><dd>{decimal(t.mar, 2)}</dd></div>
        <div><dt>Yaw</dt><dd>{t.relative_yaw.toFixed(0)}°</dd></div>
        <div><dt>Pitch</dt><dd>{t.relative_pitch.toFixed(0)}°</dd></div>
        {t.perclos !== undefined && <div><dt>PERCLOS 60 giây</dt><dd>{Math.round(t.perclos * 100)}%</dd></div>}
      </dl>
      {t.error && (
        <p className="monitor-error" role="alert">
          Lỗi: {t.error === "camera_unavailable" ? "không mở được camera" : t.error}
        </p>
      )}
    </section>
  );
}
