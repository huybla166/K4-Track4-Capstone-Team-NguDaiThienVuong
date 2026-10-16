"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import type { RiskLevel } from "@/types/telemetry";

interface CameraPipProps {
  connected: boolean;
  level: RiskLevel;
  reasons: string[];
  /** "pip": khung nhỏ góc màn hình lái; "inline": trong hộp hướng dẫn trước khi lái */
  variant: "pip" | "inline";
}

/** Hình camera DriverGuard (MJPEG có chú thích) kèm lý do cảnh báo hiện tại. */
export function CameraPip({ connected, level, reasons, variant }: CameraPipProps) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  // Luồng MJPEG đứt (backend khởi động lại...): thử nối lại sau 2 giây
  useEffect(() => {
    if (!failed) return;
    const timer = setTimeout(() => {
      setFailed(false);
      setAttempt((a) => a + 1);
    }, 2000);
    return () => clearTimeout(timer);
  }, [failed]);

  const status = !connected
    ? "Chưa kết nối DriverGuard"
    : reasons.length > 0
      ? reasons.join(" · ")
      : "Không có dấu hiệu bất thường";

  return (
    <figure className={`drive-cam drive-cam-${variant} drive-cam-${connected ? level.toLowerCase() : "off"}`}>
      <div className="drive-cam-frame">
        {connected && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={attempt}
            src={`${API_URL}/api/v1/video/stream?overlay=true&r=${attempt}`}
            alt="Camera DriverGuard có chú thích nhận diện"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="drive-cam-empty">{connected ? "Đang nối lại camera…" : "Không có hình"}</span>
        )}
      </div>
      <figcaption>{status}</figcaption>
    </figure>
  );
}
