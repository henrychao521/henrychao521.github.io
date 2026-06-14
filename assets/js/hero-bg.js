// hero-bg.js — 首頁 hero 透視網格動畫背景
(function () {
  const cv = document.getElementById('hero-bg');
  if (!cv) return;
  const x = cv.getContext('2d');
  const hero = cv.parentElement;
  let W, H, t = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function size() {
    const r = hero.getBoundingClientRect();
    W = cv.width = Math.max(320, r.width);
    H = cv.height = Math.max(420, r.height);
  }
  size();
  addEventListener('resize', size);

  function frame() {
    x.fillStyle = '#0b1020';
    x.fillRect(0, 0, W, H);
    const vpx = W * 0.5, vpy = H * 0.30, horizon = vpy;
    x.strokeStyle = 'rgba(120,150,255,0.20)';
    x.lineWidth = 1;
    for (let i = -24; i <= 24; i++) {
      const gx = vpx + i * 56;
      x.beginPath(); x.moveTo(gx, horizon); x.lineTo(vpx + i * 1000, H); x.stroke();
    }
    const speed = (t * 0.5) % 1;
    for (let k = 0; k < 24; k++) {
      const p = (k + speed) / 24;
      const yy = horizon + (H - horizon) * p * p;
      x.strokeStyle = `rgba(150,120,255,${0.04 + 0.26 * p})`;
      x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke();
    }
    const g = x.createRadialGradient(vpx, vpy, 0, vpx, vpy, 320);
    g.addColorStop(0, 'rgba(99,102,241,.5)');
    g.addColorStop(1, 'rgba(99,102,241,0)');
    x.fillStyle = g;
    x.fillRect(vpx - 360, vpy - 360, 720, 720);
    if (!reduce) { t += 0.016; requestAnimationFrame(frame); }
  }
  frame();
})();
