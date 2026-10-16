import type { RiskLevel } from "@/types/telemetry";

export const eventNames: Record<string, string> = {
  DROWSINESS_ACUTE: "Buồn ngủ (nhắm mắt)", CHRONIC_FATIGUE: "Mệt mỏi tích lũy",
  LOOKING_AWAY: "Quay đầu lệch hướng", LOOKING_DOWN: "Cúi đầu",
  PHONE_USAGE: "Dùng điện thoại", DRIVER_ABSENCE: "Không thấy tài xế",
};

export const levelLabels: Record<RiskLevel, string> = { NORMAL: "Bình thường", WARNING: "Chú ý", DANGER: "Nguy hiểm" };

export function toLevel(value: string): RiskLevel {
  return value === "DANGER" ? "DANGER" : value === "WARNING" ? "WARNING" : "NORMAL";
}

/** Số thập phân kiểu Việt Nam: 0,19 */
export function decimal(value: number, digits = 1): string {
  return value.toFixed(digits).replace(".", ",");
}

export function LevelIcon({ level, size = 16 }: { level: RiskLevel; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {level === "NORMAL" && <path d="M3.5 8.5 6.5 11.5 12.5 5" />}
      {level === "WARNING" && <><circle cx="8" cy="8" r="6" /><path d="M8 4.8v3.8M8 11.2v.01" /></>}
      {level === "DANGER" && <><path d="M7.1 2.6 1.6 12.2a1 1 0 0 0 .9 1.5h11a1 1 0 0 0 .9-1.5L8.9 2.6a1 1 0 0 0-1.8 0z" /><path d="M8 6.2v3.2M8 11.6v.01" /></>}
    </svg>
  );
}

export function LevelMark({ level }: { level: RiskLevel }) {
  return <span className={`level-mark level-mark-${level.toLowerCase()}`}>
    <LevelIcon level={level} />
    {levelLabels[level]}
  </span>;
}
