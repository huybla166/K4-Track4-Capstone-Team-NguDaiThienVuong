"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { CameraPip } from "@/components/drive/camera-pip";
import { drawRoad } from "@/components/drive/road-canvas";
import { API_URL, postCalibrate } from "@/lib/api";
import {
  DEPARTURE_X,
  createDriveState,
  leadIsBraking,
  matchIncidents,
  stepDrive,
  summarizeDrive,
  type DmsAlert,
  type DriveEvent,
  type DriveState,
  type DriveSummary,
  type IncidentMatch,
} from "@/lib/drive-sim";
import { activeReasons } from "@/lib/reasons";
import { playTestBeep, useAlertSound } from "@/lib/useAlertSound";
import { useAlertStage } from "@/lib/useAlertStage";
import { useTelemetry } from "@/lib/useTelemetry";
import type { DriverEvent, RiskLevel } from "@/types/telemetry";
import "./drive.css";

type Phase = "idle" | "calibrating" | "driving" | "paused" | "finished";

const CALIBRATE_S = 4; // khớp calibration_s trong ai/config/thresholds.yaml
const HUD_INTERVAL_MS = 100;
const SAMPLE_INTERVAL_S = 0.5;

const LEFT_KEYS = new Set(["ArrowLeft", "KeyA"]);
const RIGHT_KEYS = new Set(["ArrowRight", "KeyD"]);
const BRAKE_KEYS = new Set(["ArrowDown", "KeyS", "Space"]);
const GAME_KEYS = new Set([...LEFT_KEYS, ...RIGHT_KEYS, ...BRAKE_KEYS, "ArrowUp"]);

const LEVEL_TEXT: Record<RiskLevel, string> = { NORMAL: "Bình thường", WARNING: "Chú ý", DANGER: "Nguy hiểm" };
const INCIDENT_TEXT: Record<string, string> = {
  LANE_DEPARTURE: "Lệch làn",
  HAZARD_MISSED: "Không phanh",
  COLLISION: "Va chạm",
};
const ALERT_TEXT: Record<string, string> = {
  WARNING: "Chú ý",
  DANGER: "Nguy hiểm",
  DROWSINESS_ACUTE: "Nhắm mắt",
  CHRONIC_FATIGUE: "Mệt mỏi tích lũy",
  LOOKING_AWAY: "Quay đầu",
  LOOKING_DOWN: "Cúi đầu",
  PHONE_USAGE: "Điện thoại",
  DRIVER_ABSENCE: "Mất khuôn mặt",
};

interface Hud {
  t: number;
  speedKmh: number;
  gap: number;
  departing: boolean;
  leadBraking: boolean;
}

interface DmsSample {
  t: number;
  risk_level: RiskLevel;
  risk_score: number;
  face_detected: boolean;
  reasons: string[];
}

interface DriveLog {
  alerts: DmsAlert[];
  samples: DmsSample[];
  events: { t: number; event: DriverEvent }[];
  lastLevel: RiskLevel;
  lastAlertT: number;
}

interface DriveResult {
  startedAt: string;
  summary: DriveSummary;
  matches: IncidentMatch[];
  driveEvents: DriveEvent[];
  log: DriveLog;
}

const EMPTY_HUD: Hud = { t: 0, speedKmh: 80, gap: 35, departing: false, leadBraking: false };

function newLog(): DriveLog {
  return { alerts: [], samples: [], events: [], lastLevel: "NORMAL", lastAlertT: -Infinity };
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function DrivePage() {
  const { telemetry, connected } = useTelemetry();
  const [phase, setPhase] = useState<Phase>("idle");
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [countdown, setCountdown] = useState(CALIBRATE_S);
  const [flash, setFlash] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [showCamera, setShowCamera] = useState(true);
  const [result, setResult] = useState<DriveResult | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const simRef = useRef<DriveState>(createDriveState(1));
  const keysRef = useRef(new Set<string>());
  const phaseRef = useRef<Phase>("idle");
  const logRef = useRef<DriveLog>(newLog());
  const startedAtRef = useRef("");

  const level: RiskLevel = telemetry?.risk_level ?? "NORMAL";
  const calibrated = telemetry?.calibrated ?? false;
  const stage = useAlertStage(level, telemetry?.muted ?? false, connected, calibrated);
  useAlertSound(stage, soundOn && phase === "driving");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const { w, h } = sizeRef.current;
    if (ctx && w > 0) drawRoad(ctx, w, h, simRef.current);
  }, []);

  // Canvas theo kích thước khung, nét theo devicePixelRatio
  useEffect(() => {
    const stageEl = stageRef.current;
    const canvas = canvasRef.current;
    if (!stageEl || !canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = stageEl.clientWidth;
      const h = stageEl.clientHeight;
      sizeRef.current = { w, h };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stageEl);
    resize();
    return () => ro.disconnect();
  }, [draw]);

  // Bàn phím: chỉ chặn cuộn trang khi đang lái
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (phaseRef.current === "driving" && GAME_KEYS.has(e.code)) e.preventDefault();
      if (e.code === "Escape" || e.code === "KeyP") {
        if (phaseRef.current === "driving") setPhase("paused");
        else if (phaseRef.current === "paused") setPhase("driving");
        return;
      }
      keysRef.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const blur = () => keysRef.current.clear();
    const hidden = () => {
      if (document.hidden && phaseRef.current === "driving") setPhase("paused");
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  // Vòng lặp mô phỏng
  useEffect(() => {
    if (phase !== "driving") {
      draw();
      return;
    }
    let raf = 0;
    let last = performance.now();
    let lastHud = 0;
    let seen = simRef.current.events.length;
    let flashTimer: ReturnType<typeof setTimeout> | null = null;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const keys = keysRef.current;
      const has = (set: Set<string>) => [...set].some((k) => keys.has(k));
      const s = simRef.current;
      stepDrive(s, { steer: (has(RIGHT_KEYS) ? 1 : 0) - (has(LEFT_KEYS) ? 1 : 0), brake: has(BRAKE_KEYS) }, dt);
      draw();

      for (; seen < s.events.length; seen++) {
        if (s.events[seen].type === "COLLISION") {
          setFlash(true);
          if (flashTimer) clearTimeout(flashTimer);
          flashTimer = setTimeout(() => setFlash(false), 700);
        }
      }
      if (now - lastHud >= HUD_INTERVAL_MS) {
        lastHud = now;
        setHud({
          t: s.t,
          speedKmh: s.speed * 3.6,
          gap: s.leadGap,
          departing: Math.abs(s.x) > DEPARTURE_X,
          leadBraking: leadIsBraking(s),
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      if (flashTimer) clearTimeout(flashTimer);
    };
  }, [phase, draw]);

  // Ghi cảnh báo DriverGuard theo giờ mô phỏng để đối chiếu với sự cố xe
  useEffect(() => {
    if (!telemetry || phaseRef.current !== "driving") return;
    const log = logRef.current;
    const t = simRef.current.t;
    const lastSample = log.samples[log.samples.length - 1];
    if (!lastSample || t - lastSample.t >= SAMPLE_INTERVAL_S) {
      log.samples.push({
        t,
        risk_level: telemetry.risk_level,
        risk_score: telemetry.risk_score,
        face_detected: telemetry.face_detected,
        reasons: activeReasons(telemetry),
      });
    }
    if (telemetry.risk_level !== "NORMAL" && (telemetry.risk_level !== log.lastLevel || t - log.lastAlertT >= 0.5)) {
      log.alerts.push({ t, label: telemetry.risk_level });
      log.lastAlertT = t;
    }
    log.lastLevel = telemetry.risk_level;
    for (const event of telemetry.events ?? []) {
      log.events.push({ t, event });
      log.alerts.push({ t, label: event.event_type });
    }
  }, [telemetry]);

  // Đếm ngược hiệu chuẩn: tài xế nhìn thẳng vào đường
  useEffect(() => {
    if (phase !== "calibrating") return;
    const startedAt = performance.now();
    const timer = setInterval(() => {
      const left = CALIBRATE_S - (performance.now() - startedAt) / 1000;
      if (left <= 0) {
        clearInterval(timer);
        startedAtRef.current = new Date().toISOString();
        setPhase("driving");
      } else {
        setCountdown(Math.ceil(left));
      }
    }, 100);
    return () => clearInterval(timer);
  }, [phase]);

  const start = () => {
    if (soundOn) playTestBeep();
    simRef.current = createDriveState(Date.now());
    logRef.current = newLog();
    keysRef.current.clear();
    setResult(null);
    setHud(EMPTY_HUD);
    setCountdown(CALIBRATE_S);
    if (connected) void postCalibrate().catch(() => undefined);
    setPhase("calibrating");
  };

  const finish = () => {
    const s = simRef.current;
    const log = logRef.current;
    setResult({
      startedAt: startedAtRef.current,
      summary: summarizeDrive(s),
      matches: matchIncidents(s.events, log.alerts),
      driveEvents: [...s.events],
      log,
    });
    setPhase("finished");
  };

  const download = () => {
    if (!result) return;
    const data = {
      kind: "driverguard_drive_session",
      version: 1,
      started_at: result.startedAt,
      time_base: "Giây kể từ lúc bắt đầu lái, không tính lúc tạm dừng",
      summary: result.summary,
      incidents: result.matches.map((m) => ({ ...m.incident, dms_alert: m.alert })),
      drive_events: result.driveEvents,
      dms_samples: result.log.samples,
      dms_events: result.log.events,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drive_session_${result.startedAt.replace(/[:.]/g, "-") || "unknown"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const reasons = telemetry ? activeReasons(telemetry) : [];
  const alerting = connected && phase === "driving" && level !== "NORMAL";

  return (
    <main className="drive-page">
      <div className="drive-content">
        <AppHeader
          page="Lái thử"
          connected={connected}
          links={[
            { href: "/", label: "Màn hình tài xế" },
            { href: "/monitor", label: "Giám sát" },
            { href: "/camera", label: "Camera" },
          ]}
        />

        <div ref={stageRef} className={`drive-stage ${flash ? "is-crash" : ""}`}>
          <canvas ref={canvasRef} className="drive-canvas" aria-label="Mô phỏng đường cao tốc" />

          {(phase === "driving" || phase === "paused") && (
            <>
              <div className="drive-hud drive-hud-left">
                <span className="drive-speed">{Math.round(hud.speedKmh)}</span>
                <span className="drive-unit">km/h</span>
                <span className="drive-meta">{clock(hud.t)}</span>
                <span className="drive-meta">Xe trước {Math.max(0, Math.round(hud.gap))} m</span>
                {hud.departing && <span className="drive-tag drive-tag-warn">Lệch làn</span>}
                {hud.leadBraking && <span className="drive-tag drive-tag-danger">Xe trước phanh</span>}
              </div>
              <div className="drive-hud drive-hud-right">
                <span className="drive-meta">DriverGuard</span>
                {connected && telemetry ? (
                  <span className={`drive-level drive-level-${level.toLowerCase()}`}>
                    {LEVEL_TEXT[level]} · {Math.round(telemetry.risk_score)}
                  </span>
                ) : (
                  <span className="drive-level drive-level-off">Chưa kết nối</span>
                )}
                {connected && !calibrated && <span className="drive-meta">Chưa hiệu chuẩn</span>}
              </div>
            </>
          )}

          {alerting && (
            <div className={`drive-alert drive-alert-${level.toLowerCase()}`} role="alert">
              <strong>{level === "DANGER" ? "Nguy hiểm" : "Chú ý"}</strong>
              {reasons.length > 0 && <span>{reasons.join(" · ")}</span>}
            </div>
          )}

          {phase === "idle" && (
            <div className="drive-overlay">
              <div className="drive-card">
                <h2>Lái thử trên cao tốc</h2>
                <p>
                  Ngồi trước webcam và lái như thật. DriverGuard theo dõi bạn, trang này ghi lại lệch làn và thời gian
                  phản ứng để đối chiếu với cảnh báo.
                </p>
                <ul className="drive-keys">
                  <li><kbd>←</kbd> <kbd>→</kbd> hoặc <kbd>A</kbd> <kbd>D</kbd>: lái</li>
                  <li><kbd>↓</kbd>, <kbd>S</kbd> hoặc <kbd>Space</kbd>: phanh (khi xe trước sáng đèn phanh)</li>
                  <li><kbd>Esc</kbd> hoặc <kbd>P</kbd>: tạm dừng</li>
                </ul>
                <p className="drive-note">
                  Thử &quot;giấc ngủ trắng&quot;: mắt vẫn mở nhìn đường nhưng buông phím vài giây. Xe sẽ trôi khỏi làn;
                  xem DriverGuard có cảnh báo trước hay không.
                </p>
                {!connected && (
                  <p className="drive-warn">
                    Chưa kết nối backend ({API_URL}). Vẫn lái được nhưng không có cảnh báo để đối chiếu.
                  </p>
                )}
                {showCamera && connected && (
                  <CameraPip connected={connected} level={level} reasons={reasons} variant="inline" />
                )}
                <div className="drive-actions">
                  <button type="button" className="btn btn-primary" onClick={start}>
                    Bắt đầu lái
                  </button>
                  <label className="drive-check">
                    <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} />
                    Âm thanh cảnh báo
                  </label>
                  <label className="drive-check">
                    <input type="checkbox" checked={showCamera} onChange={(e) => setShowCamera(e.target.checked)} />
                    Hiện camera
                  </label>
                </div>
              </div>
            </div>
          )}

          {phase === "calibrating" && (
            <div className="drive-overlay drive-overlay-soft">
              <div className="drive-count">
                <span className="drive-count-num">{countdown}</span>
                <span>Nhìn thẳng vào đường để hiệu chuẩn</span>
              </div>
            </div>
          )}

          {showCamera && (phase === "calibrating" || phase === "driving" || phase === "paused") && (
            <CameraPip connected={connected} level={level} reasons={reasons} variant="pip" />
          )}

          {phase === "paused" && (
            <div className="drive-overlay drive-overlay-soft">
              <div className="drive-card drive-card-small">
                <h2>Tạm dừng</h2>
                <div className="drive-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setPhase("driving")}>
                    Lái tiếp
                  </button>
                  <button type="button" className="btn btn-quiet" onClick={finish}>
                    Kết thúc và xem kết quả
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === "finished" && result && <ResultPanel result={result} onDownload={download} onRestart={start} />}
        </div>

        <div className="drive-toolbar">
          {phase === "driving" && (
            <>
              <button type="button" className="btn btn-quiet" onClick={() => setPhase("paused")}>
                Tạm dừng
              </button>
              <button type="button" className="btn btn-quiet" onClick={finish}>
                Kết thúc
              </button>
            </>
          )}
          {phase !== "idle" && phase !== "finished" && (
            <button type="button" className="btn btn-quiet" onClick={() => setShowCamera((v) => !v)}>
              {showCamera ? "Ẩn camera" : "Hiện camera"}
            </button>
          )}
          <button type="button" className="btn btn-quiet" onClick={toggleFullscreen}>
            Toàn màn hình
          </button>
          <p className="drive-caption">
            Mô phỏng đơn giản để thử nghiệm, không phải động lực học xe thật. Số liệu chỉ lưu trên trình duyệt cho tới
            khi bạn tải về.
          </p>
        </div>
      </div>
    </main>
  );
}

function ResultPanel({
  result,
  onDownload,
  onRestart,
}: {
  result: DriveResult;
  onDownload: () => void;
  onRestart: () => void;
}) {
  const { summary: s, matches } = result;
  const caught = matches.filter((m) => m.alert).length;
  const fmt = (v: number | null, digits = 2) => (v === null ? "—" : v.toFixed(digits));
  const rows: [string, string][] = [
    ["Thời gian lái", clock(s.durationS)],
    ["Quãng đường", `${s.distanceKm.toFixed(2)} km`],
    ["Độ lệch làn (SDLP)", `${s.sdlp.toFixed(2)} m`],
    ["Số lần lệch làn", `${s.departures} (${s.departureTimeS.toFixed(1)} s)`],
    ["Xe trước phanh gấp", `${s.hazards} lần`],
    ["Phản ứng trung bình / chậm nhất", `${fmt(s.meanReactionS)} s / ${fmt(s.maxReactionS)} s`],
    ["Không phanh / va chạm", `${s.missed} / ${s.collisions}`],
    ["Lâu nhất không thao tác", `${s.longestNoInputS.toFixed(1)} s`],
  ];

  return (
    <div className="drive-overlay">
      <div className="drive-card drive-result">
        <h2>Kết quả chuyến lái</h2>
        <dl className="drive-stats">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <h3>
          Sự cố xe và cảnh báo DriverGuard: {caught}/{matches.length} có cảnh báo
        </h3>
        {matches.length === 0 ? (
          <p className="drive-note">Không có sự cố nào.</p>
        ) : (
          <table className="drive-table">
            <thead>
              <tr>
                <th scope="col">Lúc</th>
                <th scope="col">Sự cố</th>
                <th scope="col">DriverGuard (5 s trước tới 2 s sau)</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m, i) => (
                <tr key={i}>
                  <td>{clock(m.incident.t)}</td>
                  <td>
                    {INCIDENT_TEXT[m.incident.type] ?? m.incident.type}
                    {m.incident.durationS ? ` ${m.incident.durationS.toFixed(1)} s` : ""}
                  </td>
                  <td>
                    {m.alert ? (
                      <span className="drive-ok">
                        Có: {ALERT_TEXT[m.alert.label] ?? m.alert.label} lúc {clock(m.alert.t)}
                      </span>
                    ) : (
                      <span className="drive-miss">Không cảnh báo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="drive-note">
          Sự cố không có cảnh báo là ca DriverGuard bỏ sót. Nếu lúc đó bạn đang cố ý &quot;ngủ trắng&quot; (mắt mở, không
          điều khiển) thì đây đúng là lỗ hổng cần xử lý.
        </p>
        <div className="drive-actions">
          <button type="button" className="btn btn-primary" onClick={onDownload}>
            Tải số liệu (JSON)
          </button>
          <button type="button" className="btn btn-quiet" onClick={onRestart}>
            Lái lại
          </button>
        </div>
      </div>
    </div>
  );
}
