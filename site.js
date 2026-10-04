/* Sheeraz Athar — site behaviour. No dependencies. */
(() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── theme toggle ── */
  const root = document.documentElement;
  const effective = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  $$('.theme-btn').forEach(b => b.addEventListener('click', () => {
    const next = effective() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    document.dispatchEvent(new Event('themechange'));
  }));
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => document.dispatchEvent(new Event('themechange')));

  /* ── nav border on scroll ── */
  const nav = $('.nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ── click-to-play YouTube ── */
  $$('[data-yt]').forEach(el => {
    el.setAttribute('role', 'button'); el.tabIndex = 0;
    const play = () => {
      if (el.classList.contains('playing')) return;
      const s = el.dataset.start || 0;
      el.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${el.dataset.yt}?autoplay=1&start=${s}&rel=0&modestbranding=1" title="Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
      el.classList.add('playing');
    };
    el.addEventListener('click', play);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
  });

  /* ── news expand ── */
  const nb = $('.news-more');
  if (nb) nb.addEventListener('click', () => {
    const l = $('.news'); l.classList.toggle('open');
    nb.textContent = l.classList.contains('open') ? 'Show less' : 'Show all news';
  });

  /* ── publication filter ── */
  const chips = $$('.chip[data-f]');
  const count = $('.count');
  const applyFilter = f => {
    $$('.pub').forEach(p => p.hidden = !(f === 'all' || (p.dataset.tags || '').split(' ').includes(f)));
    $$('.year').forEach(y => y.hidden = !$$('.pub', y).some(p => !p.hidden));
    const n = $$('.pub').filter(p => !p.hidden).length;
    if (count) count.textContent = `${n} ${n === 1 ? 'paper' : 'papers'}`;
  };
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.classList.toggle('on', x === c));
    applyFilter(c.dataset.f);
  }));
  if (chips.length) applyFilter('all');

  /* ── reveal on scroll ── */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: .08 }) : null;
  $$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));
  $$('.eval .bar i').forEach(b => {
    const go = () => b.style.width = b.dataset.w;
    if (!io) return go();
    new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { go(); o.disconnect(); } }), { threshold: .4 }).observe(b);
  });

  /* ── lightbox ── */
  const photos = $$('.photos img');
  if (photos.length) {
    const lb = document.createElement('div');
    lb.className = 'lightbox'; lb.innerHTML = '<img alt="">';
    document.body.appendChild(lb);
    const close = () => lb.classList.remove('on');
    photos.forEach(p => p.addEventListener('click', () => { lb.firstChild.src = p.src; lb.firstChild.alt = p.alt; lb.classList.add('on'); }));
    lb.addEventListener('click', close);
    addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  /* ════════════════════════════════════════════════════════════
     Tactile marker field
     A grid of dots that behaves like the marker array inside a
     vision-based tactile sensor: a contact pushes markers outward
     (shear) and lights up the contact patch (pressure).
     ════════════════════════════════════════════════════════════ */
  const cv = $('#field');
  if (!cv) return;
  const host = cv.parentElement, ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, pts = [], dotRGB = '23,22,15', accRGB = '194,65,12';
  const S = 26;                                   // marker spacing (px)

  const readColors = () => {
    const cs = getComputedStyle(root);
    dotRGB = cs.getPropertyValue('--dot-rgb').trim() || dotRGB;
    accRGB = cs.getPropertyValue('--accent-rgb').trim() || accRGB;
  };
  const resize = () => {
    const r = host.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pts = [];
    const ox = (W % S) / 2 + S / 2, oy = (H % S) / 2 + S / 2;
    for (let y = oy; y < H; y += S) for (let x = ox; x < W; x += S) pts.push(x, y);
    if (reduce) draw(performance.now());
  };

  let tx = 0, ty = 0, cx = 0, cy = 0, press = 0, target = 0, pointer = false, pressed = false;
  const t0 = performance.now();

  host.addEventListener('pointermove', e => {
    const r = host.getBoundingClientRect();
    tx = e.clientX - r.left; ty = e.clientY - r.top; pointer = true;
  });
  host.addEventListener('pointerleave', () => { pointer = false; pressed = false; });
  host.addEventListener('pointerdown', e => {
    const r = host.getBoundingClientRect();
    tx = e.clientX - r.left; ty = e.clientY - r.top; pointer = true; pressed = true;
  });
  addEventListener('pointerup', () => { pressed = false; });

  function draw(now) {
    const t = (now - t0) / 1000;
    const small = W < 700;
    if (!pointer) {                                // idle: a slow wandering contact
      tx = small ? W * (0.55 + 0.3 * Math.sin(t * 0.21)) : W * (0.68 + 0.18 * Math.sin(t * 0.21));
      ty = small ? H * (0.13 + 0.06 * Math.sin(t * 0.29 + 1.2)) : H * (0.52 + 0.26 * Math.sin(t * 0.29 + 1.2));
      target = 0.6 + 0.15 * Math.sin(t * 0.9);
    } else {
      target = pressed ? 1.9 : 1;
    }
    if (!cx && !cy) { cx = tx; cy = ty; }
    cx += (tx - cx) * 0.11; cy += (ty - cy) * 0.11; press += (target - press) * 0.07;

    ctx.clearRect(0, 0, W, H);
    const sig = 95 + 25 * press, sig2 = 2 * sig * sig, amp = 13 * press;
    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i], y = pts[i + 1];
      const dx = x - cx, dy = y - cy, r2 = dx * dx + dy * dy;
      const g = Math.exp(-r2 / sig2);
      let px = x, py = y;
      if (g > 0.002) {
        const r = Math.sqrt(r2) || 1, d = amp * g * (r / sig);
        px += dx / r * d; py += dy / r * d;
      }
      const k = g * press;
      const a = (small ? 0.1 : 0.16) + Math.min(small ? 0.4 : 0.6, 0.55 * k);
      const rad = 1.15 + 1.5 * Math.min(1.4, k);
      ctx.fillStyle = k > 0.07 ? `rgba(${accRGB},${a})` : `rgba(${dotRGB},${a})`;
      ctx.beginPath(); ctx.arc(px, py, rad, 0, 6.2832); ctx.fill();
    }
  }

  let running = false, raf = 0;
  const loop = now => { draw(now); raf = requestAnimationFrame(loop); };
  const start = () => { if (!running && !reduce) { running = true; raf = requestAnimationFrame(loop); } };
  const stop  = () => { running = false; cancelAnimationFrame(raf); };

  readColors(); resize();
  addEventListener('resize', resize);
  document.addEventListener('themechange', () => { readColors(); if (reduce) draw(performance.now()); });
  if (reduce) { draw(performance.now()); return; }
  new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop())).observe(host);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
})();
