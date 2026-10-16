import test from "node:test";
import assert from "node:assert/strict";
import {
  DEPARTURE_X,
  createDriveState,
  curvature,
  leadIsBraking,
  matchIncidents,
  stepDrive,
  summarizeDrive,
  type DriveState,
} from "./drive-sim.ts";

const DT = 1 / 60;

function run(s: DriveState, seconds: number, policy: (s: DriveState) => { steer: number; brake: boolean }) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) stepDrive(s, policy(s), DT);
}

/** Tài xế tỉnh táo: lái về giữa làn, giữ phanh khi xe trước sáng đèn phanh hoặc quá gần. */
function alert(s: DriveState) {
  const steer = s.x > 0.15 ? -1 : s.x < -0.15 ? 1 : 0;
  return { steer, brake: leadIsBraking(s) || s.leadGap < 25 };
}

/** Phản ứng chậm 1,5 s như người thật: phanh muộn nhưng vẫn kịp. */
function slow(s: DriveState) {
  const late = s.hazard !== null && s.t - s.hazard.startT >= 1.5 && leadIsBraking(s);
  return { steer: alert(s).steer, brake: late || s.leadGap < 25 };
}

test("độ cong đủ nhỏ để là cao tốc (bán kính >= 350 m)", () => {
  for (let d = 0; d < 20000; d += 7) assert.ok(Math.abs(curvature(d)) <= 1 / 350);
});

test("tài xế tỉnh táo giữ làn và không va chạm", () => {
  const s = createDriveState(42);
  run(s, 180, alert);
  const sum = summarizeDrive(s);
  assert.equal(sum.departures, 0);
  assert.equal(sum.collisions, 0);
  assert.equal(sum.missed, 0);
  assert.ok(sum.hazards >= 3, `hazards=${sum.hazards}`);
  assert.ok(sum.sdlp < DEPARTURE_X, `sdlp=${sum.sdlp}`);
  assert.ok(sum.meanReactionS !== null && sum.meanReactionS < 0.1);
});

test("phản ứng chậm 1,5 s vẫn tránh được va chạm", () => {
  const s = createDriveState(42);
  run(s, 180, slow);
  const sum = summarizeDrive(s);
  assert.equal(sum.collisions, 0);
  assert.ok(sum.meanReactionS !== null && sum.meanReactionS >= 1.5);
});

test("buông lái thì xe trôi khỏi làn trong vòng 60 giây", () => {
  const s = createDriveState(7);
  run(s, 60, () => ({ steer: 0, brake: false }));
  const dep = s.events.find((e) => e.type === "LANE_DEPARTURE");
  assert.ok(dep, "phải có lệch làn");
  assert.ok(summarizeDrive(s).longestNoInputS > 59);
});

test("không phanh khi xe trước phanh gấp thì va chạm", () => {
  const s = createDriveState(3);
  run(s, 60, (st) => ({ steer: alert(st).steer, brake: false }));
  const sum = summarizeDrive(s);
  assert.ok(sum.hazards >= 1);
  assert.ok(sum.collisions >= 1, `collisions=${sum.collisions}`);
});

test("lệch làn ghi thời lượng khi xe quay lại làn", () => {
  const s = createDriveState(1);
  s.x = DEPARTURE_X + 0.1;
  stepDrive(s, { steer: 0, brake: false }, DT);
  run(s, 3, (st) => ({ steer: st.x > 0 ? -1 : 0, brake: false }));
  const dep = s.events.filter((e) => e.type === "LANE_DEPARTURE");
  assert.equal(dep.length, 1);
  assert.ok((dep[0].durationS ?? 0) > 0);
});

test("cùng hạt giống cho cùng kết quả", () => {
  const a = createDriveState(99);
  const b = createDriveState(99);
  run(a, 90, alert);
  run(b, 90, alert);
  assert.deepEqual(a.events, b.events);
});

test("matchIncidents: cảnh báo trong cửa sổ [-5 s, +2 s] mới tính là bắt được", () => {
  const events = [
    { type: "LANE_DEPARTURE" as const, t: 20, detail: "" },
    { type: "HAZARD" as const, t: 30, detail: "" },
    { type: "COLLISION" as const, t: 40, detail: "" },
    { type: "HAZARD_MISSED" as const, t: 60, detail: "" },
  ];
  const alerts = [
    { t: 16, label: "WARNING" },
    { t: 42.5, label: "DANGER" },
    { t: 61.5, label: "DANGER" },
  ];
  const m = matchIncidents(events, alerts);
  assert.equal(m.length, 3); // HAZARD không phải sự cố
  assert.equal(m[0].alert?.t, 16);
  assert.equal(m[1].alert, null); // 42,5 > 40 + 2
  assert.equal(m[2].alert?.t, 61.5);
});
