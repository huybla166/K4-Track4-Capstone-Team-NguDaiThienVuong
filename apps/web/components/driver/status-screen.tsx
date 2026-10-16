"use client";

import { useState } from "react";
import Link from "next/link";
import { postCalibrate, postMute } from "@/lib/api";
import { activeReasons } from "@/lib/reasons";
import { useAlertStage } from "@/lib/useAlertStage";
import { useAlertSound } from "@/lib/useAlertSound";
import { CalibrationRing } from "./calibration-ring";
import type { Telemetry, RiskLevel } from "@/types/telemetry";

interface StatusScreenProps {
  telemetry: Telemetry | null;
  connected: boolean;
}

export function StatusScreen({ telemetry, connected }: StatusScreenProps) {
  const [muting, setMuting] = useState(false);
  const [calibrating, setCalibrating] = useState(false);

  const currentLevel: RiskLevel = telemetry?.risk_level ?? "NORMAL";
  const isMuted = telemetry?.muted ?? false;
  const isCalibrated = telemetry?.calibrated ?? false;
  const hasCameraError = telemetry?.error === "camera_unavailable";

  const stage = useAlertStage(currentLevel, isMuted, connected, isCalibrated);

  // Play synthesized Web Audio alerts
  useAlertSound(stage, true);

  const handleMute = async () => {
    if (muting) return;
    setMuting(true);
    try {
      await postMute(15);
    } catch {
      // Ignore network errors
    } finally {
      setMuting(false);
    }
  };

  const handleCalibrate = async () => {
    if (calibrating) return;
    setCalibrating(true);
    try {
      await postCalibrate();
    } catch {
      // Ignore network errors
    } finally {
      setCalibrating(false);
    }
  };

  // Up to 2 active reasons
  const reasons = telemetry ? activeReasons(telemetry).slice(0, 2) : [];

  // Calibration overlay is mounted only when connected, not calibrated, and face is detected
  const showCalibration = connected && !isCalibrated && (telemetry?.face_detected ?? false);

  // Background and color classes based on level and connection
  const isDisconnected = !connected;
  const isDanger = connected && currentLevel === "DANGER";
  const isWarning = connected && currentLevel === "WARNING";
  const isEscalated = isDanger && stage === "danger_escalated";

  let containerBg = "bg-[var(--bg)] text-[var(--text)]";
  if (isDisconnected) {
    containerBg = "bg-[var(--bg)] text-[var(--text)] border-t-[4px] border-[var(--danger)]";
  } else if (isDanger) {
    containerBg = `bg-[var(--danger-solid)] text-white ${isEscalated ? "danger-escalated-bg" : ""}`;
  } else if (isWarning) {
    containerBg = "bg-[var(--warn-solid)] text-[#202124]";
  }

  // Controls are solid fields that step with the screen colour, so they read at a glance in every state
  let muteButtonClass = "bg-[var(--accent-soft)] text-[var(--accent-strong)] hover:bg-[#d2e3fc]";
  let recalibrateButtonClass = "bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)]";
  let linkClass = "text-[var(--text-muted)] hover:text-[var(--text)]";
  let topInfoClass = "text-[var(--text-muted)]";

  if (isDanger) {
    muteButtonClass = "bg-white text-[var(--danger-solid)] hover:bg-[#fce8e6]";
    recalibrateButtonClass = "bg-[var(--danger-solid-2)] text-white hover:bg-[#8c0b0b]";
    linkClass = "text-white hover:text-white";
    topInfoClass = "text-white";
  } else if (isWarning) {
    muteButtonClass = "bg-[#202124] text-[var(--warn-solid)] hover:bg-black";
    recalibrateButtonClass = "bg-[var(--warn-solid-2)] text-[#202124] hover:bg-[#e37400]";
    linkClass = "text-[#202124] hover:text-black";
    topInfoClass = "text-[#202124]";
  }

  const alertWord = "leading-[0.95] font-semibold tracking-[-0.02em]";
  const reasonText = "text-[clamp(24px,3.2vw,44px)] font-medium leading-tight";

  return (
    <main
      className={`min-h-dvh flex flex-col justify-between app-stagger px-[clamp(16px,3vw,32px)] pt-5 pb-4 select-none relative transition-colors duration-150 ${containerBg}`}
    >
      {/* Calibration Overlay */}
      {showCalibration && (
        <CalibrationRing faceDetected={telemetry?.face_detected ?? false} />
      )}

      {/* Top Header: Mute status & small risk score in corner */}
      <header className="flex items-center justify-between gap-4 w-full">
        <div className={`text-[16px] font-medium ${topInfoClass}`}>
          {isDisconnected ? "" : isMuted ? "Đã tắt tiếng" : ""}
        </div>
        <div className={`text-[16px] font-medium tabular-nums ${topInfoClass}`}>
          Rủi ro {telemetry ? Math.round(telemetry.risk_score) : "--"}
        </div>
      </header>

      {/* Main Status Display */}
      <section
        role={isDanger ? "alert" : "status"}
        aria-live={isDanger ? "assertive" : "polite"}
        className="flex flex-col items-center justify-center text-center my-auto py-8 w-full"
      >
        {isDisconnected ? (
          <div className="flex flex-col items-center">
            <h2 className="text-[clamp(28px,4vw,40px)] font-semibold tracking-tight">
              Mất kết nối. Đang thử lại…
            </h2>
            <p className="text-[16px] text-[var(--text-muted)] mt-3 max-w-[40ch]">
              Kiểm tra backend DriverGuard và camera trên máy này.
            </p>
          </div>
        ) : hasCameraError ? (
          <div className="flex flex-col items-center">
            <h2 className="text-[clamp(28px,4vw,40px)] font-semibold text-[var(--warn)] tracking-tight">
              Không mở được camera
            </h2>
            <p className="text-[16px] text-[var(--text-muted)] mt-3 max-w-[44ch]">
              Kiểm tra cáp camera, hoặc tắt ứng dụng khác đang dùng camera.
            </p>
          </div>
        ) : !telemetry ? (
          <h2 className="text-[24px] font-medium text-[var(--text-muted)] tracking-tight">
            Đang chờ dữ liệu từ AI worker…
          </h2>
        ) : isDanger ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-[clamp(16px,2vw,32px)] flex-wrap sm:flex-nowrap">
              <svg
                className="w-[clamp(56px,8vw,120px)] h-[clamp(56px,8vw,120px)] shrink-0 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h2 className={`app-pop text-[clamp(56px,11vw,176px)] text-white whitespace-nowrap ${alertWord}`}>
                NGUY HIỂM
              </h2>
            </div>
            {reasons.length > 0 && (
              <div className="mt-[clamp(20px,3vh,40px)] flex flex-col items-center gap-2">
                {reasons.map((reason, idx) => (
                  <span key={idx} className={`${reasonText} text-white`}>
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : isWarning ? (
          <div className="flex flex-col items-center">
            <h2 className={`app-pop text-[clamp(72px,14vw,220px)] text-[#202124] ${alertWord}`}>
              CHÚ Ý
            </h2>
            {reasons.length > 0 && (
              <div className="mt-[clamp(20px,3vh,40px)] flex flex-col items-center gap-2">
                {reasons.map((reason, idx) => (
                  <span key={idx} className={`${reasonText} text-[#202124]`}>
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center app-fade">
            <div className="flex items-center justify-center gap-3">
              <span
                className="w-[14px] h-[14px] bg-[var(--ok)] shrink-0 rounded-[2px]"
                aria-hidden="true"
              />
              <span className="text-[24px] font-medium text-[var(--text-muted)]">
                Đang theo dõi
              </span>
            </div>
            {reasons.length > 0 && (
              <div className="mt-4 flex flex-col items-center gap-1.5">
                {reasons.map((reason, idx) => (
                  <span
                    key={idx}
                    className="text-[18px] font-medium text-[var(--text-muted)]"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Bottom Controls */}
      <footer className="flex flex-col items-center gap-3 w-full max-w-[560px] mx-auto">
        {/* Large mute button: the one control a driver may need, ≥ 64px */}
        <button
          type="button"
          onClick={handleMute}
          disabled={!connected || muting}
          aria-label={
            isMuted
              ? "Cảnh báo âm thanh đang được tắt tiếng trong 15 giây"
              : "Tắt tiếng cảnh báo trong 15 giây"
          }
          className={`w-full h-[72px] min-h-[64px] text-[20px] font-semibold rounded-full transition-colors flex items-center justify-center cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${muteButtonClass}`}
        >
          {muting ? "Đang gửi…" : isMuted ? "Đã tắt tiếng" : "Tắt tiếng 15 giây"}
        </button>

        <button
          type="button"
          onClick={handleCalibrate}
          disabled={!connected || calibrating}
          aria-label="Hiệu chuẩn lại tư thế tài xế"
          className={`h-12 min-h-[48px] px-6 rounded-full transition-colors text-[16px] font-medium flex items-center justify-center cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${recalibrateButtonClass}`}
        >
          {calibrating ? "Đang gửi…" : "Hiệu chuẩn lại"}
        </button>

        {/* Link to /monitor and /camera */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/monitor"
            className={`min-h-[48px] inline-flex items-center text-[16px] underline underline-offset-4 px-3 transition-colors ${linkClass}`}
          >
            Giám sát
          </Link>
          <Link
            href="/camera"
            className={`min-h-[48px] inline-flex items-center text-[16px] underline underline-offset-4 px-3 transition-colors ${linkClass}`}
          >
            Camera
          </Link>
        </div>
      </footer>
    </main>
  );
}
