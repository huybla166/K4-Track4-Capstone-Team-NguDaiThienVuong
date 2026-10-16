// DriverGuard landing page.

// Reveal once when an element enters the viewport. Never replays, never leaves content hidden.
(() => {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px 6% 0px', threshold: 0 });
  targets.forEach((el) => io.observe(el));
  window.addEventListener('load', () => setTimeout(() => {
    targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); });
  }, 2500));
})();

// Hero: the first screen is the driver screen, driven by DriverGuard's own rules
// (ai/config/thresholds.yaml, INSTANT_RISK in ai/runtime/pipeline.py, ai/risk/engine.py).
(() => {
  const hero = document.querySelector('.hero');
  const eyes = document.getElementById('eyes');
  const head = document.getElementById('head');
  const phone = document.getElementById('phone');
  const status = document.getElementById('hero-status');
  if (!hero || !eyes || !head || !phone || !status) return;
  const eyesOut = document.getElementById('eyes-out');
  const headOut = document.getElementById('head-out');
  const phoneOut = document.getElementById('phone-out');

  const EYES_CLOSED_S = 1.8; // eyes_closed_s
  const ACUTE_S = 2.0;       // RiskEngine acute bypass
  const HEAD_S = 2.0;        // head_s
  const seconds = (n) => n.toFixed(1).replace('.', ',') + ' giây';
  const words = { NORMAL: 'Đang theo dõi', WARNING: 'CHÚ Ý', DANGER: 'NGUY HIỂM' };
  let touched = false;

  function assess(eyesS, headS, onPhone) {
    // Closed eyes raise risk toward 70 until the 1.8 s event fires at 90.
    const eyeRisk = eyesS >= EYES_CLOSED_S ? 90 : (eyesS / EYES_CLOSED_S) * 70;
    let score = eyeRisk;
    if (eyesS >= ACUTE_S) score = Math.max(score, 70);
    if (headS >= HEAD_S) score = Math.max(score, 65); // LOOKING_AWAY
    if (onPhone) score = Math.max(score, 80);         // PHONE_USAGE
    const level = score < 40 ? 'NORMAL' : score < 70 ? 'WARNING' : 'DANGER';
    const reasons = [];
    if (eyeRisk >= 40) reasons.push('nhắm mắt kéo dài');
    if (onPhone) reasons.push('đang dùng điện thoại');
    if (headS >= HEAD_S) reasons.push('quay đầu lệch hướng');
    return { score: Math.round(score), level, reasons: reasons.slice(0, 2) };
  }

  function render() {
    const eyesS = Number(eyes.value);
    const headS = Number(head.value);
    const onPhone = phone.getAttribute('aria-checked') === 'true';
    eyesOut.textContent = seconds(eyesS);
    headOut.textContent = seconds(headS);
    phoneOut.textContent = onPhone ? '2 giây' : 'Không';
    const r = assess(eyesS, headS, onPhone);
    hero.dataset.level = r.level;
    if (touched) {
      const why = r.reasons.length ? ', ' + r.reasons.join(' và ') : '';
      status.textContent = `Màn hình tài xế: ${words[r.level]}${why}. Rủi ro ${r.score} trên 100.`;
    }
  }

  const touch = () => { touched = true; render(); };
  eyes.addEventListener('input', touch);
  head.addEventListener('input', touch);
  phone.addEventListener('click', () => {
    phone.setAttribute('aria-checked', String(phone.getAttribute('aria-checked') !== 'true'));
    touch();
  });
  render();
})();

// Distance covered while the eyes are closed for the 1.8 s threshold.
(() => {
  const speed = document.getElementById('speed');
  const out = document.getElementById('speed-out');
  const metres = document.getElementById('speed-m');
  if (!speed || !out || !metres) return;
  const render = () => {
    const kmh = Number(speed.value);
    out.textContent = `${kmh} km/h`;
    metres.textContent = String(Math.round((kmh / 3.6) * 1.8));
  };
  speed.addEventListener('input', render);
  render();
})();

// The 1938 loop plays only while on screen.
(() => {
  const video = document.querySelector('.film video');
  if (!video) return;
  if (!('IntersectionObserver' in window)) return;
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) video.play().catch(() => {});
    else video.pause();
  }).observe(video);
})();
