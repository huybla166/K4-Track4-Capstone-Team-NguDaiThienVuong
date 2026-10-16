"use client";

import Link from "next/link";
import { playTestBeep } from "@/lib/useAlertSound";

interface StartGateProps {
  connected: boolean;
  onStart: () => void;
}

export function StartGate({ connected, onStart }: StartGateProps) {
  const handleStart = () => {
    playTestBeep();
    onStart();
  };

  return (
    <main className="app-stagger min-h-dvh flex flex-col select-none bg-[var(--bg)] text-[var(--text)]">
      <header className="flex items-center justify-between gap-4 px-[clamp(16px,3vw,32px)] pt-5">
        <h1 className="text-[20px] font-semibold">DriverGuard</h1>
        <span role="status" className="inline-flex items-center gap-2 text-[16px] font-medium">
          <span className={`status-square ${connected ? "is-ok" : ""}`} aria-hidden="true" />
          {connected ? "Đã kết nối" : "Mất kết nối"}
        </span>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 w-full">
        <button
          type="button"
          onClick={handleStart}
          className="w-full max-w-[480px] h-20 min-h-[80px] text-[24px] font-semibold rounded-full bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-strong)] active:scale-[0.98] transition flex items-center justify-center cursor-pointer border-0"
        >
          Bắt đầu
        </button>
        <p className="text-[16px] text-[var(--text-muted)] mt-4 text-center">
          Âm thanh cảnh báo sẽ được bật. Bạn sẽ nghe một tiếng bíp khi bấm.
        </p>
        {!connected && (
          <p className="text-[16px] text-[var(--text)] mt-2 text-center max-w-[40ch]">
            Chưa thấy hệ thống DriverGuard. Màn hình sẽ tự kết nối khi backend chạy.
          </p>
        )}
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-2 pb-4">
        <Link
          href="/monitor"
          className="min-h-[48px] inline-flex items-center text-[16px] text-[var(--accent)] hover:text-[var(--accent-strong)] underline underline-offset-4 px-3 transition-colors"
        >
          Giám sát
        </Link>
        <Link
          href="/camera"
          className="min-h-[48px] inline-flex items-center text-[16px] text-[var(--accent)] hover:text-[var(--accent-strong)] underline underline-offset-4 px-3 transition-colors"
        >
          Camera
        </Link>
      </footer>
    </main>
  );
}
