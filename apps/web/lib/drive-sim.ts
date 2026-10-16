/**
 * Mô phỏng lái xe đơn giản cho trang /drive: giữ làn trên cao tốc và phanh khi xe trước phanh gấp.
 * Không phụ thuộc React để test được bằng `node --test`. Đơn vị: mét, giây, m/s.
 *
 * Mô hình ngang bậc một (đủ để đo lệch làn, không phải động lực học xe thật):
 *   x' = lái × STEER_SPEED + κ(d)·v²·DRIFT_GAIN + gió
 * Không lái thì xe trôi khỏi làn sau vài giây ở khúc cua => lộ ra lúc tài xế "ngủ trắng" dù mắt mở.
 */

export const LANE_WIDTH = 3.5;
export const CAR_HALF_WIDTH = 0.9;
/** Bánh xe chạm vạch khi |x| vượt mức này */
export const DEPARTURE_X = LANE_WIDTH / 2 - CAR_HALF_WIDTH;
export const CRUISE_MS = 80 / 3.6;
export const SAFE_GAP = 35;
export const CRASH_GAP = 5;

const STEER_SPEED = 1.4; // m/s ngang khi giữ phím lái; vẫn thắng trôi lớn nhất (~0,53 m/s)
const STEER_RATE = 4.0; // tốc độ tay lái theo phím (1/s)
const DRIFT_GAIN = 0.25;
const MAX_X = 3.2; // mép lề
const BRAKE_DECEL = 6.0;
const CRUISE_ACCEL = 1.5;
const LEAD_HAZARD_SPEED = 8.0;
const HAZARD_BRAKE_S = 3.0; // xe trước sáng đèn phanh và giảm tốc trong khoảng này
const HAZARD_END_S = 6.0;

export type DriveEventType =
  | "LANE_DEPARTURE"
  | "HAZARD"
  | "HAZARD_REACTION"
  | "HAZARD_MISSED"
  | "COLLISION";

export interface DriveEvent {
  type: DriveEventType;
  /** Giây kể từ lúc bắt đầu lái (không tính lúc tạm dừng) */
  t: number;
  durationS?: number;
  value?: number;
  detail: string;
}

export interface DriveInput {
  /** -1 = trái, 0 = thẳng, 1 = phải */
  steer: number;
  brake: boolean;
}

export interface DriveState {
  t: number;
  distance: number;
  speed: number;
  x: number;
  steer: number;
  wind: number;
  windTarget: number;
  nextWindT: number;
  leadGap: number;
  leadSpeed: number;
  hazard: { startT: number; reacted: boolean } | null;
  nextHazardT: number;
  departureIndex: number | null;
  lastInputT: number;
  longestNoInputS: number;
  lateral: { sum: number; sumSq: number; time: number };
  events: DriveEvent[];
  rngState: number;
}

/** mulberry32: ngẫu nhiên có hạt giống để test lặp lại được */
function nextRandom(s: DriveState): number {
  s.rngState = (s.rngState + 0x6d2b79f5) | 0;
  let r = s.rngState;
  r = Math.imul(r ^ (r >>> 15), r | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
}

/** Độ cong đường (1/m) theo quãng đường; dương = cua trái. Bán kính nhỏ nhất ~ 360 m. */
export function curvature(d: number): number {
  return 0.0028 * Math.sin(d / 260) * Math.sin(d / 1100 + 1);
}

export function createDriveState(seed = Date.now()): DriveState {
  const s: DriveState = {
    t: 0,
    distance: 0,
    speed: CRUISE_MS,
    x: 0,
    steer: 0,
    wind: 0,
    windTarget: 0,
    nextWindT: 0,
    leadGap: SAFE_GAP,
    leadSpeed: CRUISE_MS,
    hazard: null,
    nextHazardT: 0,
    departureIndex: null,
    lastInputT: 0,
    longestNoInputS: 0,
    lateral: { sum: 0, sumSq: 0, time: 0 },
    events: [],
    rngState: seed | 0,
  };
  s.nextHazardT = 30 + nextRandom(s) * 15;
  return s;
}

function approach(value: number, target: number, rate: number, dt: number): number {
  const step = rate * dt;
  return Math.abs(target - value) <= step ? target : value + Math.sign(target - value) * step;
}

export function stepDrive(s: DriveState, input: DriveInput, dt: number): void {
  s.t += dt;
  const t = s.t;
  const steerInput = Math.max(-1, Math.min(1, input.steer));

  if (steerInput !== 0 || input.brake) s.lastInputT = t;
  s.longestNoInputS = Math.max(s.longestNoInputS, t - s.lastInputT);

  // Gió ngang đổi hướng ngẫu nhiên mỗi 3-7 s để đường thẳng cũng phải giữ lái
  if (t >= s.nextWindT) {
    s.windTarget = (nextRandom(s) * 2 - 1) * 0.18;
    s.nextWindT = t + 3 + nextRandom(s) * 4;
  }
  s.wind = approach(s.wind, s.windTarget, 0.1, dt);

  s.steer = approach(s.steer, steerInput, STEER_RATE, dt);
  const drift = curvature(s.distance) * s.speed * s.speed * DRIFT_GAIN + s.wind;
  s.x = Math.max(-MAX_X, Math.min(MAX_X, s.x + (s.steer * STEER_SPEED + drift) * dt));

  s.speed = input.brake
    ? Math.max(0, s.speed - BRAKE_DECEL * dt)
    : approach(s.speed, CRUISE_MS, CRUISE_ACCEL, dt);
  s.distance += s.speed * dt;

  s.lateral.sum += s.x * dt;
  s.lateral.sumSq += s.x * s.x * dt;
  s.lateral.time += dt;

  updateDeparture(s);
  updateHazard(s, input.brake, dt);
}

function updateDeparture(s: DriveState): void {
  const out = Math.abs(s.x) > DEPARTURE_X;
  if (out && s.departureIndex === null) {
    s.departureIndex = s.events.length;
    s.events.push({
      type: "LANE_DEPARTURE",
      t: s.t,
      durationS: 0,
      detail: s.x > 0 ? "Lệch sang phải" : "Lệch sang trái",
    });
  } else if (s.departureIndex !== null) {
    const ev = s.events[s.departureIndex];
    ev.durationS = s.t - ev.t;
    if (!out) s.departureIndex = null;
  }
}

function updateHazard(s: DriveState, brake: boolean, dt: number): void {
  const t = s.t;
  if (!s.hazard && t >= s.nextHazardT) {
    s.hazard = { startT: t, reacted: false };
    s.events.push({ type: "HAZARD", t, detail: "Xe phía trước phanh gấp" });
  }

  const hz = s.hazard;
  if (hz && !hz.reacted && brake) {
    hz.reacted = true;
    const rt = t - hz.startT;
    s.events.push({ type: "HAZARD_REACTION", t, value: rt, detail: `Phanh sau ${rt.toFixed(2)} s` });
  }

  const leadBraking = hz !== null && t - hz.startT < HAZARD_BRAKE_S;
  let leadTarget = CRUISE_MS;
  if (leadBraking) leadTarget = LEAD_HAZARD_SPEED;
  else if (s.leadGap < SAFE_GAP) leadTarget = CRUISE_MS + 3;
  else if (s.leadGap > SAFE_GAP + 25) leadTarget = CRUISE_MS - 3;
  s.leadSpeed = approach(s.leadSpeed, leadTarget, leadBraking ? 5 : 2, dt);
  s.leadGap += (s.leadSpeed - s.speed) * dt;

  if (s.leadGap < CRASH_GAP) {
    s.events.push({ type: "COLLISION", t, detail: "Va chạm xe phía trước" });
    s.leadGap = SAFE_GAP;
    s.leadSpeed = s.speed;
    endHazard(s, true);
  } else if (hz && t - hz.startT > HAZARD_END_S) {
    endHazard(s, false);
  }
}

function endHazard(s: DriveState, collided: boolean): void {
  const hz = s.hazard;
  if (!hz) return;
  if (!hz.reacted && !collided) {
    s.events.push({ type: "HAZARD_MISSED", t: s.t, detail: "Không phanh khi xe trước phanh" });
  }
  s.hazard = null;
  s.nextHazardT = s.t + 25 + nextRandom(s) * 20;
}

export function leadIsBraking(s: DriveState): boolean {
  return s.hazard !== null && s.t - s.hazard.startT < HAZARD_BRAKE_S;
}

export interface DriveSummary {
  durationS: number;
  distanceKm: number;
  /** Độ lệch chuẩn vị trí ngang (SDLP, m): chỉ số buồn ngủ phổ biến trong nghiên cứu lái xe */
  sdlp: number;
  departures: number;
  departureTimeS: number;
  hazards: number;
  meanReactionS: number | null;
  maxReactionS: number | null;
  missed: number;
  collisions: number;
  longestNoInputS: number;
}

export function summarizeDrive(s: DriveState): DriveSummary {
  const { sum, sumSq, time } = s.lateral;
  const mean = time > 0 ? sum / time : 0;
  const sdlp = time > 0 ? Math.sqrt(Math.max(0, sumSq / time - mean * mean)) : 0;
  const of = (type: DriveEventType) => s.events.filter((e) => e.type === type);
  const reactions = of("HAZARD_REACTION").map((e) => e.value ?? 0);
  return {
    durationS: s.t,
    distanceKm: s.distance / 1000,
    sdlp,
    departures: of("LANE_DEPARTURE").length,
    departureTimeS: of("LANE_DEPARTURE").reduce((acc, e) => acc + (e.durationS ?? 0), 0),
    hazards: of("HAZARD").length,
    meanReactionS: reactions.length ? reactions.reduce((a, b) => a + b, 0) / reactions.length : null,
    maxReactionS: reactions.length ? Math.max(...reactions) : null,
    missed: of("HAZARD_MISSED").length,
    collisions: of("COLLISION").length,
    longestNoInputS: s.longestNoInputS,
  };
}

/** Một lần DriverGuard cảnh báo (mức WARNING/DANGER hoặc sự kiện), đã quy về giờ mô phỏng. */
export interface DmsAlert {
  t: number;
  label: string;
}

export interface IncidentMatch {
  incident: DriveEvent;
  alert: DmsAlert | null;
}

/** Sự cố xe (lệch làn, va chạm, không phanh) mà tài xế không kiểm soát */
export const INCIDENT_TYPES: DriveEventType[] = ["LANE_DEPARTURE", "HAZARD_MISSED", "COLLISION"];

/**
 * Đối chiếu sự cố xe với cảnh báo DriverGuard: có cảnh báo trong [t - before, t + after] thì tính là DMS đã bắt được.
 * Sự cố không có cảnh báo là ca DMS bỏ sót (nghi ngủ trắng nếu người thử không cố ý lơ là).
 */
export function matchIncidents(events: DriveEvent[], alerts: DmsAlert[], before = 5, after = 2): IncidentMatch[] {
  return events
    .filter((e) => INCIDENT_TYPES.includes(e.type))
    .map((incident) => ({
      incident,
      alert: alerts.find((a) => a.t >= incident.t - before && a.t <= incident.t + after) ?? null,
    }));
}
