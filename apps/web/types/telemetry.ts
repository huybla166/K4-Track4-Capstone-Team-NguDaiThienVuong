export type RiskLevel = "NORMAL" | "WARNING" | "DANGER";

export interface DriverEvent {
  id?: number;
  event_type: string;
  started_at: string;
  duration_ms: number;
  risk_score: number;
  risk_level: string;
  confidence: number;
  reason: string;
}

export interface Telemetry {
  timestamp: string;
  face_detected: boolean;
  calibrated: boolean;
  muted: boolean;
  ear: number;
  mar: number;
  yaw: number;
  pitch: number;
  roll: number;
  relative_yaw: number;
  relative_pitch: number;
  eyes_closed: boolean;
  yawning: boolean;
  looking_away: boolean;
  looking_down: boolean;
  phone_detected: boolean;
  phone_usage: boolean;
  /** Tỉ lệ thời gian nhắm mắt trong 60 giây gần nhất (0–1) */
  perclos?: number;
  /** Điểm rủi ro mãn tính: PERCLOS × 200 + số lần ngáp × 10, tối đa 70 */
  chronic_risk?: number;
  risk_score: number;
  risk_level: RiskLevel;
  fps: { camera: number; face: number; phone: number };
  latency_ms: { face: number; phone: number };
  events: DriverEvent[];
  error?: string;
}
