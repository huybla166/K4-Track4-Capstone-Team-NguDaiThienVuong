import type { Telemetry } from "../types/telemetry";

export function activeReasons(t: Telemetry): string[] {
  const reasons: string[] = [];

  if (t.eyes_closed) {
    reasons.push("Nhắm mắt kéo dài");
  }
  if (t.phone_usage) {
    reasons.push("Đang dùng điện thoại");
  }
  if (t.looking_away) {
    reasons.push("Quay đầu lệch hướng");
  }
  if (t.looking_down) {
    reasons.push("Cúi đầu");
  }
  if (t.yawning) {
    reasons.push("Ngáp");
  }
  if (!t.face_detected) {
    reasons.push("Không thấy khuôn mặt");
  }
  // Mệt mỏi tích lũy tự đẩy màn hình lên CHÚ Ý (từ 40 điểm) dù không có hành vi tức thời nào
  if ((t.chronic_risk ?? 0) >= 40) {
    reasons.push("Mệt mỏi tích lũy");
  }

  return reasons;
}
