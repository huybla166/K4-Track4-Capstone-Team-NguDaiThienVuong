"use client";

import { useState } from "react";
import { postCalibrate, postMute } from "@/lib/api";
import { playTestBeep } from "@/lib/useAlertSound";

export function Controls({ disabled, soundOn, onSoundChange }: { disabled: boolean; soundOn: boolean; onSoundChange: (on: boolean) => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function run(name: string, fn: () => Promise<void>) {
    setBusy(name);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="monitor-controls">
      <button type="button" className="btn btn-primary" disabled={disabled || busy !== null} onClick={() => run("cal", postCalibrate)}>
        {busy === "cal" ? "Đang gửi…" : "Hiệu chuẩn tư thế"}
      </button>
      <button type="button" className="btn btn-quiet" disabled={disabled || busy !== null} onClick={() => run("mute", () => postMute(15))}>
        {busy === "mute" ? "Đang gửi…" : "Tắt tiếng 15 giây"}
      </button>
      <button
        type="button"
        className="btn btn-quiet"
        aria-pressed={soundOn}
        onClick={() => { if (!soundOn) playTestBeep(); onSoundChange(!soundOn); }}
      >
        {soundOn ? "Tắt âm thanh trang này" : "Bật âm thanh cảnh báo"}
      </button>
    </div>
  );
}
