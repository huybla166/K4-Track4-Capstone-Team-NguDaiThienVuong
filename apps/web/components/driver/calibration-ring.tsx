"use client";

import { useEffect, useState } from "react";

interface CalibrationRingProps {
  faceDetected?: boolean;
}

export function CalibrationRing({ faceDetected = true }: CalibrationRingProps) {
  const [progress, setProgress] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(4);

  useEffect(() => {
    if (!faceDetected) {
      return;
    }

    const TOTAL_MS = 4000;
    const startTime = Date.now();

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentPct = Math.min(100, (elapsed / TOTAL_MS) * 100);
      const remainingSec = Math.max(1, Math.ceil((TOTAL_MS - elapsed) / 1000));

      setProgress(currentPct);
      setSecondsRemaining(remainingSec);

      if (elapsed >= TOTAL_MS) {
        clearInterval(intervalId);
      }
    }, 50);

    return () => {
      clearInterval(intervalId);
    };
  }, [faceDetected]);

  const size = 168;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const isCompleted = progress >= 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hiệu chuẩn tư thế"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)] p-6 text-center select-none"
    >
      <div className="flex flex-col items-center max-w-md w-full app-pop">
        {faceDetected ? (
          <>
            <div
              className="relative flex items-center justify-center"
              style={{ width: size, height: size }}
            >
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="-rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="var(--surface-2)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="var(--accent)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {!isCompleted && (
                  <>
                    <span className="text-[48px] leading-none font-semibold tabular-nums">{secondsRemaining}</span>
                    <span className="text-[14px] text-[var(--text-muted)] mt-1">giây</span>
                  </>
                )}
              </div>
            </div>

            <h2 className="text-[clamp(28px,4vw,40px)] font-semibold mt-8 tracking-tight">
              {isCompleted ? "Đang hoàn tất…" : "Nhìn thẳng phía trước"}
            </h2>
            <p className="text-[16px] text-[var(--text-muted)] mt-3">
              Giữ yên đầu để DriverGuard lấy tư thế chuẩn của bạn.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-[clamp(28px,4vw,40px)] font-semibold tracking-tight">
              Không thấy khuôn mặt
            </h2>
            <p className="text-[16px] text-[var(--text-muted)] mt-3">
              Ngồi vào giữa khung hình camera.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
