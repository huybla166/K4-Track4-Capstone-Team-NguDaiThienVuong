import { DEPARTURE_X, LANE_WIDTH, curvature, leadIsBraking, type DriveState } from "@/lib/drive-sim";

/** Vẽ đường cao tốc giả 3D (chiếu từng hàng quét) từ góc nhìn ghế lái. w, h tính bằng px CSS. */

const CAM_H = 1.25; // độ cao mắt tài xế (m)
const MAX_Z = 320;
const ROW = 2; // px mỗi hàng quét
const POST_SPACING = 40;
const TREE_SPACING = 23;

const SKY_TOP = "#8fb8de";
const SKY_LOW = "#dbe7f1";

interface Sprite {
  z: number;
  draw: () => void;
}

export function drawRoad(ctx: CanvasRenderingContext2D, w: number, h: number, s: DriveState): void {
  const horizon = Math.round(h * 0.46);
  const focal = h * 0.95;
  const camLat = LANE_WIDTH / 2 + s.x; // làn phải; tâm đường nằm giữa 2 làn

  // Tâm đường lệch theo độ cong tích lũy; cua trái (κ > 0) kéo tâm sang trái màn hình
  const bend = (z: number) => -0.5 * curvature(s.distance + z / 2) * z * z;
  const sx = (lat: number, z: number) => w / 2 + (lat + bend(z) - camLat) * (focal / z);
  const sy = (z: number) => horizon + (CAM_H * focal) / z;

  ctx.save();
  // Rung nhẹ khi bánh xe đè vạch/lề; làm tròn pixel để các hàng quét không hở mép
  if (Math.abs(s.x) > DEPARTURE_X) ctx.translate(Math.round(Math.sin(s.t * 90) * 2), Math.round(Math.cos(s.t * 70) * 1.5));

  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_LOW);
  ctx.fillStyle = sky;
  ctx.fillRect(-4, -4, w + 8, horizon + 4);
  drawHills(ctx, w, horizon, s);

  for (let y = h + ROW; y > horizon; y -= ROW) {
    const z = (CAM_H * focal) / (y - horizon);
    if (z > MAX_Z) continue;
    const scale = focal / z;
    const band = Math.floor((s.distance + z) / 5) % 2 === 0;
    const top = y - ROW;

    ctx.fillStyle = band ? "#6f9c4c" : "#668f45";
    ctx.fillRect(-4, top, w + 8, ROW);

    const cx = sx(0, z);
    const half = LANE_WIDTH * scale;
    const rumble = 0.45 * scale;
    ctx.fillStyle = band ? "#d9d9d9" : "#b3402f";
    ctx.fillRect(cx - half - rumble, top, (half + rumble) * 2, ROW);
    ctx.fillStyle = band ? "#5d6066" : "#595c62";
    ctx.fillRect(cx - half, top, half * 2, ROW);

    const line = Math.max(1, 0.14 * scale);
    ctx.fillStyle = "#f1f1ee";
    ctx.fillRect(cx - half + 0.15 * scale, top, line, ROW);
    ctx.fillRect(cx + half - 0.15 * scale - line, top, line, ROW);
    if ((s.distance + z) % 12 < 4) ctx.fillRect(cx - line / 2, top, line, ROW);
  }

  // Sương xa: hòa đường vào trời gần chân trời
  const haze = ctx.createLinearGradient(0, horizon, 0, horizon + h * 0.12);
  haze.addColorStop(0, "rgba(219,231,241,0.9)");
  haze.addColorStop(1, "rgba(219,231,241,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(-4, horizon, w + 8, h * 0.12);

  const sprites: Sprite[] = [];
  for (let z = POST_SPACING - (s.distance % POST_SPACING); z < MAX_Z; z += POST_SPACING) {
    for (const side of [-1, 1]) {
      const zz = z;
      sprites.push({ z: zz, draw: () => drawPost(ctx, sx(side * (LANE_WIDTH + 1.3), zz), sy(zz), focal / zz) });
    }
  }
  for (let z = TREE_SPACING - (s.distance % TREE_SPACING); z < MAX_Z; z += TREE_SPACING) {
    const k = Math.floor((s.distance + z) / TREE_SPACING);
    const zz = z;
    const lat = (k % 2 === 0 ? -1 : 1) * (LANE_WIDTH + 6 + (k % 3) * 3);
    sprites.push({ z: zz, draw: () => drawTree(ctx, sx(lat, zz), sy(zz), focal / zz) });
  }
  if (s.leadGap > 1.5 && s.leadGap < MAX_Z) {
    const z = s.leadGap;
    sprites.push({
      z,
      draw: () => drawLeadCar(ctx, sx(LANE_WIDTH / 2, z), sy(z), focal / z, leadIsBraking(s)),
    });
  }
  sprites.sort((a, b) => b.z - a.z).forEach((sp) => sp.draw());

  drawDashboard(ctx, w, h, s.steer);
  ctx.restore();
}

function drawHills(ctx: CanvasRenderingContext2D, w: number, horizon: number, s: DriveState): void {
  // Đồi xa trôi ngang theo độ cong để cảm nhận được khúc cua
  const shift = (s.distance * 0.02 + curvature(s.distance) * 4000) % w;
  ctx.fillStyle = "#9db7a6";
  ctx.beginPath();
  ctx.moveTo(-4, horizon);
  for (let x = -4; x <= w + 8; x += 8) {
    const u = (x + shift) / w;
    const y = horizon - (14 + 10 * Math.sin(u * 9) + 7 * Math.sin(u * 23 + 1)) * (w / 1000);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w + 8, horizon);
  ctx.closePath();
  ctx.fill();
}

function drawPost(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const pw = Math.max(1, 0.12 * scale);
  const ph = 1.0 * scale;
  ctx.fillStyle = "#f4f4f2";
  ctx.fillRect(x - pw / 2, y - ph, pw, ph);
  ctx.fillStyle = "#e8a020";
  ctx.fillRect(x - pw / 2, y - ph * 0.9, pw, ph * 0.12);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const th = 4.5 * scale;
  const tw = 2.4 * scale;
  ctx.fillStyle = "#5a4632";
  ctx.fillRect(x - 0.12 * scale, y - th * 0.3, 0.24 * scale, th * 0.3);
  ctx.fillStyle = "#3f6b3a";
  ctx.beginPath();
  ctx.moveTo(x, y - th);
  ctx.lineTo(x - tw / 2, y - th * 0.25);
  ctx.lineTo(x + tw / 2, y - th * 0.25);
  ctx.closePath();
  ctx.fill();
}

function drawLeadCar(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, braking: boolean): void {
  const cw = 1.8 * scale;
  const ch = 1.45 * scale;
  const left = x - cw / 2;

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(left - cw * 0.03, y - ch * 0.06, cw * 1.06, ch * 0.08);
  ctx.fillStyle = "#2c4a72";
  ctx.fillRect(left, y - ch * 0.62, cw, ch * 0.56);
  ctx.fillRect(left + cw * 0.12, y - ch, cw * 0.76, ch * 0.4);
  ctx.fillStyle = "#9fb4c8";
  ctx.fillRect(left + cw * 0.18, y - ch * 0.94, cw * 0.64, ch * 0.28);
  ctx.fillStyle = "#e9e9e4";
  ctx.fillRect(x - cw * 0.14, y - ch * 0.3, cw * 0.28, ch * 0.1);

  ctx.fillStyle = braking ? "#ff2b1c" : "#7a2220";
  const lw = cw * 0.2;
  const lh = ch * 0.1;
  ctx.fillRect(left + cw * 0.04, y - ch * 0.5, lw, lh);
  ctx.fillRect(left + cw * 0.96 - lw, y - ch * 0.5, lw, lh);
  if (braking) {
    ctx.fillRect(x - cw * 0.15, y - ch * 0.98, cw * 0.3, ch * 0.04);
    ctx.fillStyle = "rgba(255,60,40,0.28)";
    ctx.fillRect(left - lw * 0.5, y - ch * 0.62, cw + lw, ch * 0.34);
  }
  ctx.fillStyle = "#1b1b1d";
  ctx.fillRect(left + cw * 0.05, y - ch * 0.08, cw * 0.18, ch * 0.08);
  ctx.fillRect(left + cw * 0.77, y - ch * 0.08, cw * 0.18, ch * 0.08);
}

function drawDashboard(ctx: CanvasRenderingContext2D, w: number, h: number, steer: number): void {
  const top = h * 0.86;
  ctx.fillStyle = "#1f2023";
  ctx.beginPath();
  ctx.moveTo(-4, top + h * 0.03);
  ctx.quadraticCurveTo(w / 2, top - h * 0.03, w + 8, top + h * 0.03);
  ctx.lineTo(w + 8, h + 4);
  ctx.lineTo(-4, h + 4);
  ctx.closePath();
  ctx.fill();

  // Vô lăng bên trái (xe tay lái thuận), xoay theo tay lái
  const cx = w * 0.3;
  const cy = h * 1.06;
  const r = h * 0.24;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(steer * 0.7);
  ctx.strokeStyle = "#2d2e32";
  ctx.lineWidth = h * 0.035;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = h * 0.025;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, r);
  ctx.stroke();
  ctx.fillStyle = "#3a3b40";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
