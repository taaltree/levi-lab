/* ============================================================
   MCMC animation for the FW 536 course card (courses.html).

   Random-walk Metropolis on a bivariate normal target (unit variances,
   correlation rho) — the same sampler and target as the course's
   "MCMC samplers in 2D" explorer. Draws pile up in the joint panel while
   the x and y marginal histograms fill in against the true N(0,1) curves.
   ============================================================ */
(function () {
  const canvas = document.getElementById('mcmcCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // ---- target + sampler (matches explore_mcmc.html defaults) ----
  const RHO = 0.8, STEP = 0.6, START = [-2.5, 2.5];
  const N_DRAWS = 2600;            // draws per loop before restarting
  const LIM = 3.6;                 // plotted range [-LIM, LIM] on both axes
  const NBINS = 36;
  const TRAIL = 28;                // recent moves drawn as a fading path

  let spare = null;
  function randn() {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u, v, s;
    do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const m = Math.sqrt(-2 * Math.log(s) / s); spare = v * m; return u * m;
  }
  const D = 1 - RHO * RHO;
  const logp = (x, y) => -(x * x - 2 * RHO * x * y + y * y) / (2 * D);

  // ---- palette (site tokens, with fallbacks) ----
  const css = getComputedStyle(document.documentElement);
  const tok = (name, fb) => (css.getPropertyValue(name).trim() || fb);
  const C = {
    bg: tok('--primary-dark', '#0F1E17'),
    gold: tok('--accent-light', '#E8C47A'),
    goldDeep: tok('--accent', '#C8963C'),
    sage: '#8DB39A',
    ink: 'rgba(247,243,236,0.55)',
    grid: 'rgba(247,243,236,0.08)',
  };

  // ---- state ----
  let cur, chain, hx, hy, done, holdUntil, fade;
  function reset() {
    cur = START.slice(); chain = [cur.slice()];
    hx = new Array(NBINS).fill(0); hy = new Array(NBINS).fill(0);
    done = 0; holdUntil = 0; fade = 1;
    addToHist(cur);
  }
  function binOf(v) {
    const b = Math.floor((v + LIM) / (2 * LIM) * NBINS);
    return b >= 0 && b < NBINS ? b : -1;
  }
  function addToHist(p) {
    const bx = binOf(p[0]), by = binOf(p[1]);
    if (bx >= 0) hx[bx]++;
    if (by >= 0) hy[by]++;
  }
  function iterate() {
    const cand = [cur[0] + STEP * randn(), cur[1] + STEP * randn()];
    if (Math.log(Math.random()) < logp(cand[0], cand[1]) - logp(cur[0], cur[1])) cur = cand;
    chain.push(cur.slice());
    addToHist(cur);
    done++;
  }

  // ---- layout ----
  let W = 0, H = 0, L = {};
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = Math.max(14, Math.min(W, H) * 0.06);
    const margTop = Math.min(H * 0.2, 90), margRight = Math.min(W * 0.2, 90), gap = 6;
    const availW = W - 2 * pad - margRight - gap;
    const availH = H - 2 * pad - margTop - gap - 14;     // 14px for the counter
    const side = Math.max(40, Math.min(availW, availH));
    const jx = pad + (availW - side) / 2;
    const jy = pad + margTop + gap + (availH - side) / 2;
    L = {
      jx, jy, side,
      tx: jx, ty: jy - gap - margTop, tw: side, th: margTop,            // top marginal (x)
      rx: jx + side + gap, ry: jy, rw: margRight, rh: side,             // right marginal (y)
      cx: jx, cy: jy + side + 14,                                       // counter baseline
    };
  }
  const sx = v => L.jx + (v + LIM) / (2 * LIM) * L.side;
  const sy = v => L.jy + L.side - (v + LIM) / (2 * LIM) * L.side;

  // ---- drawing ----
  const PHI_PEAK = 1 / Math.sqrt(2 * Math.PI);
  const phi = z => PHI_PEAK * Math.exp(-0.5 * z * z);

  function drawContours() {
    // Ellipses of constant density: x'Σ⁻¹x = c², principal axes along ±45°.
    const a = Math.sqrt(1 + RHO), b = Math.sqrt(1 - RHO);
    const k = L.side / (2 * LIM);
    [1, 2, 3].forEach((c, i) => {
      ctx.beginPath();
      ctx.ellipse(sx(0), sy(0), c * a * k, c * b * k, -Math.PI / 4, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(232,196,122,${0.32 - i * 0.08})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
  }

  function drawFrame() {
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = fade;

    // joint panel frame + light grid
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let g = -3; g <= 3; g += 1) {
      ctx.beginPath(); ctx.moveTo(sx(g), L.jy); ctx.lineTo(sx(g), L.jy + L.side); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(L.jx, sy(g)); ctx.lineTo(L.jx + L.side, sy(g)); ctx.stroke();
    }
    drawContours();

    // accumulated draws
    const r = Math.max(1.1, L.side / 260);
    ctx.fillStyle = 'rgba(232,196,122,0.30)';
    for (let i = 0; i < chain.length; i++) {
      const p = chain[i];
      ctx.beginPath(); ctx.arc(sx(p[0]), sy(p[1]), r, 0, 2 * Math.PI); ctx.fill();
    }

    // recent path, fading out
    const n = chain.length, s0 = Math.max(0, n - TRAIL);
    for (let i = s0 + 1; i < n; i++) {
      const t = (i - s0) / (n - s0);
      ctx.strokeStyle = `rgba(247,243,236,${0.08 + 0.6 * t})`;
      ctx.lineWidth = 1 + 0.8 * t;
      ctx.beginPath();
      ctx.moveTo(sx(chain[i - 1][0]), sy(chain[i - 1][1]));
      ctx.lineTo(sx(chain[i][0]), sy(chain[i][1]));
      ctx.stroke();
    }
    // current state
    const p = chain[n - 1];
    ctx.fillStyle = 'rgba(232,196,122,0.25)';
    ctx.beginPath(); ctx.arc(sx(p[0]), sy(p[1]), r * 5, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#FDFAF6';
    ctx.beginPath(); ctx.arc(sx(p[0]), sy(p[1]), r * 2.2, 0, 2 * Math.PI); ctx.fill();

    // marginals: histogram density vs true N(0,1)
    const total = chain.length, bw = 2 * LIM / NBINS;
    const dens = c => c / (total * bw);
    const scaleTop = L.th * 0.92 / (PHI_PEAK * 1.25);
    const scaleRight = L.rw * 0.92 / (PHI_PEAK * 1.25);
    const binPx = L.side / NBINS;

    ctx.fillStyle = 'rgba(141,179,154,0.55)';
    for (let b = 0; b < NBINS; b++) {
      const hTop = Math.min(L.th, dens(hx[b]) * scaleTop);
      ctx.fillRect(L.tx + b * binPx + 0.5, L.ty + L.th - hTop, binPx - 1, hTop);
      const wR = Math.min(L.rw, dens(hy[b]) * scaleRight);
      ctx.fillRect(L.rx, L.ry + L.side - (b + 1) * binPx + 0.5, wR, binPx - 1);
    }
    // baselines
    ctx.strokeStyle = 'rgba(247,243,236,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L.tx, L.ty + L.th); ctx.lineTo(L.tx + L.tw, L.ty + L.th); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(L.rx, L.ry); ctx.lineTo(L.rx, L.ry + L.rh); ctx.stroke();
    // true marginal densities
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const v = -LIM + 2 * LIM * i / 120, X = sx(v), Y = L.ty + L.th - phi(v) * scaleTop;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const v = -LIM + 2 * LIM * i / 120, Y = sy(v), X = L.rx + phi(v) * scaleRight;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.stroke();

    // labels + counter
    const fs = Math.max(10, Math.min(13, L.side / 30));
    ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'left';
    ctx.fillText('θ₁', L.jx + L.side - fs * 1.6, L.jy + L.side - fs * 0.6);
    ctx.fillText('θ₂', L.jx + fs * 0.5, L.jy + fs * 1.3);
    ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(247,243,236,0.5)';
    ctx.fillText(`Metropolis sampler · ${total.toLocaleString()} draws`, L.cx, L.cy);
    ctx.globalAlpha = 1;
  }

  // ---- loop ----
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = false, raf = 0, acc = 0, last = 0;

  function frame(now) {
    if (!running) return;
    const dt = Math.min(64, now - (last || now)); last = now;
    if (done < N_DRAWS) {
      // slow at first so the walk out of the tail is visible, then speed up
      const rate = done < 60 ? 14 : done < 300 ? 60 : 420;   // draws per second
      acc += rate * dt / 1000;
      while (acc >= 1 && done < N_DRAWS) { iterate(); acc -= 1; }
      if (done >= N_DRAWS) holdUntil = now + 2600;
    } else if (now > holdUntil) {
      fade -= dt / 700;
      if (fade <= 0) { reset(); }
    }
    drawFrame();
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  reset(); resize();
  if (reduceMotion) {
    while (done < N_DRAWS) iterate();
    drawFrame();
    window.addEventListener('resize', () => { resize(); drawFrame(); });
    return;
  }
  drawFrame();
  window.addEventListener('resize', () => { resize(); drawFrame(); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { resize(); drawFrame(); }).observe(canvas);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? start() : stop())), { threshold: 0.1 })
      .observe(canvas);
  } else {
    start();
  }
})();
