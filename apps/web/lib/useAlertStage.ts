"use client";

import { useEffect, useRef, useState } from "react";
import { alertStage, type AlertStage } from "./alert-level";
import type { RiskLevel } from "../types/telemetry";

/** Mức âm thanh cảnh báo theo telemetry; tính lại mỗi 500 ms để leo thang sau 5 giây nguy hiểm. */
export function useAlertStage(level: RiskLevel, muted: boolean, connected: boolean, calibrated: boolean): AlertStage {
  const [stage, setStage] = useState<AlertStage>("off");
  const dangerSinceMsRef = useRef<number | null>(null);
  const stateRef = useRef({ level, muted, connected, calibrated });

  // Track the latest telemetry attributes and timestamp when DANGER state begins
  useEffect(() => {
    stateRef.current = { level, muted, connected, calibrated };
    if (level === "DANGER") {
      if (dangerSinceMsRef.current === null) {
        dangerSinceMsRef.current = Date.now();
      }
    } else {
      dangerSinceMsRef.current = null;
    }
  }, [level, muted, connected, calibrated]);

  // Tick every 500ms to calculate alert stage without reading refs during render
  useEffect(() => {
    const timer = setInterval(() => {
      const s = stateRef.current;
      setStage(alertStage({ ...s, dangerSinceMs: dangerSinceMsRef.current, nowMs: Date.now() }));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return stage;
}
