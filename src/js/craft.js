/*
  craft.js: the paper and pixel pieces that need a clock.

  - [data-craft-in]: gets .is-in once, the first time it scrolls into view (craft.css plays its entrance).
  - The "Paper and pixels" diorama: the film's desk, in cut paper (SVG) and in pixel art (canvas), on one
    11.5 s script (the slogan is typed, then the button is pressed), compared with a divider.
  - The gate's padlock: listens for gate:state from gate.js (idle, checking, error, success, open).
  - The footer: a paper night whose stars, windows and cloud move. The pixel walker lives there.

  One requestAnimationFrame clock drives everything. Each piece draws only while it is on screen and nothing
  runs in a hidden tab. With reduced motion every piece draws its finished frame once; if the setting is
  switched on mid-visit, everything settles there.
*/
(() => {
  const root = document.documentElement;
  const rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const still = () => rmq.matches || !root.classList.contains('motion');
  const hasIO = 'IntersectionObserver' in window;

  /* ── the sprite atlas (src/art/sprites.png) ── */
  const A = {
    char: { x: 0, y: 0, w: 16, h: 34 },      // 0 idle, 1 breathe, 2 blink, 3-10 walk, 11-12 wave, 13 hold, 14 post, 15 posted, 16 crouch, 17 jump, 18 land
    person: { x: 0, y: 35, w: 30, h: 42 },   // the designer at the desk, from behind: 0 rest, 1 and 2 typing
    steam: { x: 0, y: 78, w: 9, h: 12 },
    star: { x: 0, y: 91, w: 3, h: 3 },
    cloud: { x: 0, y: 95, w: 28, h: 7 },
    mail: { x: 0, y: 105, w: 24, h: 33 },    // flag down, half way, up
    heart: { x: 0, y: 138, w: 7, h: 6 },
    lock: { x: 0, y: 145, w: 22, h: 26 },    // closed, glint, lifting, open, swung open
  };
  // the 3 x 5 pixel type, taken from the three lines of type at the bottom of the atlas
  const GL = { C: [0, 185], L: [4, 185], A: [8, 185], R: [12, 185], I: [16, 185], T: [20, 185], Y: [24, 185], S: [36, 185],
    D: [0, 191], E: [4, 191], G: [16, 191], N: [20, 191], O: [24, 197], '.': [32, 197] };
  const sheet = new Image();
  const sheetReady = new Promise((ok) => { sheet.onload = () => ok(true); sheet.onerror = () => ok(false); });
  sheet.src = 'src/art/sprites.png';
  const spr = (ctx, name, f, x, y, flip = false, s = 1) => {
    const a = A[name];
    if (!flip) { ctx.drawImage(sheet, a.x + f * a.w, a.y, a.w, a.h, x, y, a.w * s, a.h * s); return; }
    ctx.save(); ctx.translate(x + a.w * s, y); ctx.scale(-1, 1);
    ctx.drawImage(sheet, a.x + f * a.w, a.y, a.w, a.h, 0, 0, a.w * s, a.h * s); ctx.restore();
  };
  const hash = (n) => { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; };

  /* ── one clock for everything, only for what is on screen ── */
  const live = new Set();
  let raf = 0, t0 = performance.now();
  const loop = (now) => {
    raf = 0;
    const t = (now - t0) / 1000;
    live.forEach((p) => p.on && p.draw(t));
    if (!document.hidden && !still() && [...live].some((p) => p.on)) raf = requestAnimationFrame(loop);
  };
  const wake = () => { if (!raf && !document.hidden && !still()) raf = requestAnimationFrame(loop); };
  document.addEventListener('visibilitychange', wake);
  const watch = hasIO ? new IntersectionObserver((es) => es.forEach((e) => {
    const p = e.target.__piece; if (!p) return;
    p.on = e.isIntersecting;
    if (p.on && p.enter) p.enter();
    if (p.on) { if (still()) p.draw((performance.now() - t0) / 1000); else wake(); }
  }), { rootMargin: '120px 0px' }) : null;
  const register = (el, piece) => {
    el.__piece = piece; live.add(piece);
    if (watch) watch.observe(el); else { piece.on = true; }
    sheetReady.then(() => piece.draw((performance.now() - t0) / 1000));
  };

  /* ── entrances: [data-craft-in] plays once, when first seen ── */
  const once = hasIO ? new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in'); once.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }) : null;
  document.querySelectorAll('[data-craft-in]').forEach((el) => { if (once && !still()) once.observe(el); else el.classList.add('is-in'); });

  /* ═════════ the diorama: one desk, paper and pixel ═════════ */
  const dio = document.querySelector('[data-diorama]');
  if (dio) {
    const range = dio.querySelector('.diorama__range');
    const pixCv = dio.querySelector('[data-desk]'), px = pixCv.getContext('2d');
    const paperBox = dio.querySelector('.diorama__paper');
    const desk = new Image(); desk.src = 'src/art/desk-pixel.png';
    const deskReady = new Promise((ok) => { desk.onload = ok; desk.onerror = ok; });
    let P = null;   // the paper SVG's live parts, once it is inlined

    // the script, shared by both versions (seconds into an 11.5 s loop)
    const LOOP = 11.5, TYPE = [0.5, 3.4], LINE = 'Clarity is a design decision.', HL = 3.4, BTN = 4.6, PRESS = 6.2, DONE = 6.5, CLEAR = 9.0;
    const typed = (t) => (t < TYPE[0] ? 0 : t >= TYPE[1] ? LINE.length : Math.floor(((t - TYPE[0]) / (TYPE[1] - TYPE[0])) * LINE.length));
    const typing = (t) => (t > TYPE[0] && t < TYPE[1]) || (t > PRESS - 0.12 && t < PRESS + 0.12);

    // the cut-paper room: inline the SVG so its parts can move; until then (or without JS) the <img> shows it
    fetch('src/art/desk-paper.svg').then((r) => (r.ok ? r.text() : Promise.reject())).then((svg) => {
      paperBox.innerHTML = svg.replace(/href="grain\.webp"/g, 'href="src/art/grain.webp"');
      const S = paperBox.firstElementChild;
      const q = (s) => S.querySelector(s), qa = (s) => [...S.querySelectorAll(s)];
      P = { S, screen: q('.pp-screen'), t1: q('.pp-t1'), t2: q('.pp-t2'), t3: q('.pp-t3'), caret: q('.pp-caret'), btn: q('.pp-btn'), face: q('.pp-btn-face'), go: q('.pp-btn-go'), done: q('.pp-btn-done'),
        armL: q('.pp-arm-l'), armR: q('.pp-arm-r'), cloud: q('.pp-cloud'), stars: qa('.pp-star'), wins: qa('.pp-win'), refl: qa('.pp-refl'), steam: qa('.pp-steam'), pz: qa('.pz') };
      const pivot = (el) => { const m = el && /transform-origin:\s*([\d.]+)px\s+([\d.]+)px/.exec(el.getAttribute('style') || ''); if (el) el.removeAttribute('style'); return m ? [+m[1], +m[2]] : [0, 0]; };
      P.pL = pivot(P.armL); P.pR = pivot(P.armR);
      P.stars.forEach((el) => { const b = el.getBBox(); el.__c = [b.x + b.width / 2, b.y + b.height / 2]; });
      P.pz.forEach((el) => { const b = el.getBBox(); el.__b = { base: el.getAttribute('transform') || '', cx: b.x + b.width / 2, by: b.y + b.height }; });
      piece.draw(clock());
    }).catch(() => {});

    // the room assembles once, a drawing at a time, the first time it is seen (the film's stop-motion entrance)
    const ASM = [['keys', 0, 0, 90, 0], ['desk', 1, 0, 170, 0], ['chair', 2, 0, 260, 0], ['chairback', 2, 0, 270, -4], ['doll', 3, 0, 320, -5],
      ['lamp', 3, 300, -70, 22], ['mug', 4, 0, -190, -16], ['note1', 4, -50, -230, -22], ['window', 5, -460, -30, -5], ['plant', 5, 240, 40, 12],
      ['note2', 6, 40, -250, 18], ['print', 6, 0, -280, 9], ['note3', 7, -30, -240, -14], ['basket', 7, -170, 90, -12], ['ball', 9, 160, -230, 70], ['monitor', 0, 0, 120, 0]];
    const SM_OFF = [1, 0.6, 0.27, 0.07, -0.05, 0], SM_ROT = [1, 0.5, 0.2, 0.04, -0.12, 0];
    let born = null, swept = false, sweepAt = null, userMoved = false;

    const setSplit = (v, announce) => {
      v = Math.max(0, Math.min(100, v));
      dio.style.setProperty('--split', v.toFixed(2));
      if (announce !== false) { range.value = String(Math.round(v)); range.setAttribute('aria-valuetext', `${Math.round(v)}% paper, ${Math.round(100 - v)}% pixel`); }   /* the divider's position is how much paper shows */
    };
    range.addEventListener('input', () => { userMoved = true; sweepAt = null; setSplit(+range.value); });
    range.addEventListener('pointerdown', () => dio.classList.add('is-drag'));
    window.addEventListener('pointerup', () => dio.classList.remove('is-drag'));
    setSplit(+range.value || 50);

    let tStart = null;
    const clock = () => (performance.now() - t0) / 1000;

    function drawPaper(t, T) {
      if (!P) return;
      // assembly on first sight
      const g = Math.floor((T - (born || 0)) * 12);
      P.pz.forEach((el) => {
        const name = el.getAttribute('data-n'), a = ASM.find((r) => r[0] === name), b = el.__b;
        if (!a || born == null || still()) { el.setAttribute('visibility', 'visible'); el.setAttribute('transform', b.base); return; }
        const n = g - a[1];
        if (n < 0) { el.setAttribute('visibility', 'hidden'); return; }
        el.setAttribute('visibility', 'visible');
        if (n >= SM_OFF.length) { el.setAttribute('transform', b.base); return; }
        const j = hash(a[1] * 31 + n + name.length) - 0.5;
        el.setAttribute('transform', `translate(${(a[2] * SM_OFF[n] + j * 3).toFixed(1)} ${(a[3] * SM_OFF[n] + j * 2).toFixed(1)}) rotate(${(a[4] * SM_ROT[n] + j * 0.8).toFixed(2)} ${b.cx.toFixed(0)} ${b.by.toFixed(0)}) ${b.base}`);
      });
      // the screen (it switches on once the monitor has landed)
      if (P.screen) P.screen.setAttribute('visibility', born != null && !still() && g < 6 ? 'hidden' : 'visible');
      const n = t < CLEAR ? typed(t) : 0, l1 = 'Clarity is a', show = t < BTN;
      const s = LINE.slice(0, n), a1 = s.slice(0, l1.length), rest = s.slice(l1.length + 1);
      const hl = t >= HL, dIdx = rest.indexOf('decision');
      P.t1.textContent = show ? a1 : '';
      P.t2.textContent = show ? (hl && dIdx >= 0 ? rest.slice(0, dIdx) : rest) : '';
      P.t3.textContent = show && hl && dIdx >= 0 ? rest.slice(dIdx) : '';
      const caretOn = (t < BTN && (t < TYPE[1] ? true : Math.floor(t * 2) % 2 === 0) && t > 0.1) || (t >= CLEAR && Math.floor(t * 2) % 2 === 0);
      P.caret.setAttribute('opacity', caretOn ? '1' : '0');
      if (caretOn) {
        const line2 = t < CLEAR && s.length > l1.length;
        const el = line2 ? P.t2.parentNode : P.t1.parentNode;
        let w = 0; try { w = el.getComputedTextLength(); } catch (e) {}
        P.caret.setAttribute('x', (38 + w + 4).toFixed(1)); P.caret.setAttribute('y', line2 ? '102' : '48');
      }
      const btnOn = t >= BTN && t < CLEAR, k = Math.min(1, Math.floor((t - BTN) * 12) / 4);
      P.btn.setAttribute('opacity', btnOn ? String(Math.max(0, k)) : '0');
      const pressed = t >= PRESS && t < PRESS + 0.25;
      P.face.setAttribute('transform', pressed ? 'translate(2 4)' : 'translate(0 0)');
      P.go.setAttribute('opacity', t < DONE ? '1' : '0'); P.done.setAttribute('opacity', t >= DONE ? '1' : '0');
      // the designer types on twos; the room's life
      const tap = Math.floor(T * 12) % 4, ty = typing(t);
      if (P.armL) P.armL.setAttribute('transform', `rotate(${ty && tap === 1 ? -4 : 0} ${P.pL[0]} ${P.pL[1]})`);
      if (P.armR) P.armR.setAttribute('transform', `rotate(${ty && tap === 3 ? 4 : 0} ${P.pR[0]} ${P.pR[1]})`);
      if (P.cloud) P.cloud.setAttribute('transform', `translate(${((Math.floor(T * 6) * 4) % 1100) - 560} 0)`);
      P.stars.forEach((el, i) => { const q = Math.floor((T + i * 0.7) * 1.6); el.setAttribute('transform', `rotate(${Math.round((hash(q * 7 + i) - 0.5) * 24)} ${el.__c[0].toFixed(1)} ${el.__c[1].toFixed(1)})`); });
      P.wins.forEach((el, i) => el.setAttribute('opacity', ((T + i * 1.3) / (4 + (i % 3))) % 1 < 0.7 ? '1' : '0'));
      const two = Math.floor(T * 6);
      P.refl.forEach((el, i) => el.setAttribute('transform', `translate(${Math.round((hash(i * 19 + two) - 0.5) * 16)} 0)`));
      P.steam.forEach((el, i) => { const q = (Math.floor(T * 4) + i) % 4; el.setAttribute('transform', `translate(${[0, 3, 1, -2][q]} ${[0, -4, -8, -3][q]})`); el.setAttribute('opacity', String([0.55, 0.45, 0.3, 0.5][q])); });
    }

    // the pixel room: 192 x 108 art pixels, drawn at a whole-number scale
    const PSTARS = [[19, 16, 0.0], [44, 21, 1.7], [54, 13, 3.1], [77, 30, 0.9], [59, 33, 2.4]];
    const PWIN = [[20, 46, 5.0, 0.1], [35, 45, 7.0, 0.5], [58, 47, 9.0, 0.3], [72, 47, 6.0, 0.8]];
    const PBRIDGE = [[27, 47, 1.3], [52, 45, 1.9], [72, 52, 1.6]];
    const PANES = [[15, 11, 32, 26], [49, 11, 33, 26]];
    const SCR = { x: 107, y: 30, w: 48, h: 27 };
    let tint = null;   // the type, recoloured salmon, for "DECISION."
    const pf = (x, y, w, h, c) => { px.fillStyle = c; px.fillRect(x, y, w, h); };
    const glyphs = (str, x, y, salmon) => {
      for (const ch of str) {
        const g = GL[ch];
        if (g) {
          if (salmon && tint) px.drawImage(tint, g[0], g[1] - 185, 3, 5, x, y, 3, 5);
          else px.drawImage(sheet, g[0], g[1], 3, 5, x, y, 3, 5);
        }
        x += ch === '.' ? 2 : 4;
      }
    };
    function drawPixel(t, T) {
      const cw = pixCv.clientWidth || 960, dpr = Math.min(window.devicePixelRatio || 1, 2);
      const s = Math.max(1, Math.floor((cw * dpr) / 192));
      if (pixCv.width !== 192 * s) { pixCv.width = 192 * s; pixCv.height = 108 * s; }
      px.setTransform(s, 0, 0, s, 0, 0); px.imageSmoothingEnabled = false;
      px.clearRect(0, 0, 192, 108);
      px.drawImage(desk, 0, 0);
      const tt = T - 1 / 120;
      PSTARS.forEach(([x, y, ph]) => { const u = (tt + ph) % 4.2; const f = u < 0.25 ? 1 : u < 0.4 ? 2 : u > 2.1 && u < 2.3 ? 3 : 0; spr(px, 'star', f, x - 1, y - 1); });
      const cx = 15 - 28 + ((Math.floor(tt * 8) / 8 * 2.2) % (82 - 15 + 28));
      px.save(); px.beginPath(); PANES.forEach(([x, y, w, h]) => px.rect(x, y, w, h)); px.clip(); spr(px, 'cloud', 0, Math.floor(cx), 15); px.restore();
      const step = Math.floor(tt * 5);
      for (let r = 0; r < 13; r++) {
        const y = 52 + r, len = Math.max(1, 5 - Math.floor(r / 3) + Math.floor(hash(r * 31 + step) * 2));
        const x = 66 - Math.floor(len / 2) + Math.floor(hash(r * 17 + step * 7) * 3) - 1;
        if (hash(r * 13 + step * 3) < 0.78) pf(x, y, len, 1, r < 4 ? '#efe5d6' : '#b9a89c');
      }
      PBRIDGE.forEach(([x, y, p]) => { if ((tt / p) % 1 < 0.55) pf(x, y, 1, 1, '#d9a24e'); });
      PWIN.forEach(([x, y, p, ph]) => { if (((tt + ph * p) / p) % 1 < 0.7) pf(x, y, 1, 1, '#d9a24e'); });
      // the screen, on the same script as the paper one
      pf(SCR.x, SCR.y, SCR.w, SCR.h, '#141414');
      const n = t < CLEAR ? typed(t) : 0;
      if (t < BTN) {
        const s0 = LINE.toUpperCase().slice(0, n), L = ['CLARITY IS', 'A DESIGN', 'DECISION.'];
        let k = 0;
        L.forEach((line, i) => {
          const part = s0.slice(k, k + line.length); k += line.length + 1;
          glyphs(part, SCR.x + 5, SCR.y + 5 + i * 6, i === 2 && t >= HL);
        });
        // caret
        if (t > 0.1 && (t < TYPE[1] || Math.floor(t * 2) % 2 === 0)) {
          let line = 0, kk = 0; for (let i = 0; i < L.length; i++) { if (n <= kk + L[i].length) { line = i; break; } kk += L[i].length + 1; line = Math.min(i + 1, 2); }
          const col = Math.max(0, n - kk);
          pf(SCR.x + 5 + col * 4, SCR.y + 5 + line * 6, 1, 5, '#ea4e65');
        }
      } else if (t >= CLEAR) {
        if (Math.floor(t * 2) % 2 === 0) pf(SCR.x + 5, SCR.y + 5, 1, 5, '#ea4e65');   // waiting for the next line
      } else {
        const on = Math.floor((t - BTN) * 12) >= 1, pressed = t >= PRESS && t < PRESS + 0.25, by = SCR.y + 9 + (pressed ? 1 : 0);
        if (on) {
          pf(SCR.x + 9, by, 30, 8, pressed ? '#b13850' : '#ea4e65');
          if (!pressed) pf(SCR.x + 9, by + 8, 30, 1, '#6e2034');
          pf(SCR.x + 10, by, 28, 1, pressed ? '#ea4e65' : '#f7a1aa');
          if (t < DONE) { [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [3, 1], [2, 0], [3, 3], [2, 4]].forEach(([x, y]) => pf(SCR.x + 22 + x, by + 2 + y, 1, 1, '#fff7ea')); }
          else { [[0, 2], [1, 3], [2, 4], [3, 3], [4, 2], [5, 1], [6, 0]].forEach(([x, y]) => pf(SCR.x + 21 + x, by + 1 + y, 1, 1, '#fff7ea')); }
        }
      }
      // the designer (typing when the script types) and the steam
      const ty = typing(t);
      spr(px, 'person', ty ? [0, 1, 0, 2][Math.floor(tt * 10) % 4] : 0, 121, 52);
      spr(px, 'steam', Math.floor(tt * 6) % 4, 85, 57);
    }

    const piece = {
      on: !hasIO,
      enter() {
        if (born == null && !still()) born = clock();
        if (!swept && !userMoved && !still()) { swept = true; sweepAt = clock() + 1.15; }
      },
      draw(T) {
        if (tStart == null) tStart = T;
        const t = still() ? 3.8 : (T - tStart) % LOOP;   // reduced motion: the finished line, "decision." in salmon
        drawPaper(t, still() ? 99 : T);
        if (desk.complete && sheet.complete) drawPixel(t, still() ? 0 : T);
        // the divider sweeps once: all paper, all pixels, then back to the middle
        if (sweepAt != null && !userMoved && !still()) {
          const u = (T - sweepAt) / 2.4;
          if (u >= 0) {
            const e = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
            const v = u < 0.3 ? 50 + 50 * e(u / 0.3) : u < 0.7 ? 100 - 100 * e((u - 0.3) / 0.4) : u < 1 ? 50 * e((u - 0.7) / 0.3) : 50;
            setSplit(v, u >= 1);
            if (u >= 1) sweepAt = null;
          }
        }
      },
    };
    Promise.all([sheetReady, deskReady]).then(() => {
      tint = document.createElement('canvas'); tint.width = 48; tint.height = 18;
      const c = tint.getContext('2d'); c.drawImage(sheet, 0, 185, 48, 18, 0, 0, 48, 18);
      c.globalCompositeOperation = 'source-in'; c.fillStyle = '#ea4e65'; c.fillRect(0, 0, 48, 18);
      piece.draw(clock());
    });
    register(dio, piece);
  }

  /* ═════════ the gate's padlock ═════════ */
  const lockCv = document.querySelector('[data-lock]');
  if (lockCv) {
    const ctx = lockCv.getContext('2d'); lockCv.width = 24; lockCv.height = 26;
    const gate = lockCv.closest('.gate');
    let state = gate && gate.classList.contains('is-unlocked') ? 'open' : 'idle', since = 0;
    const SHAKE = [-1, 1, -1, 1, 0];
    const piece = {
      on: !hasIO,
      draw(T) {
        const u = T - since;
        let f = 0, dx = 0;
        if (state === 'open') f = 4;
        else if (state === 'success') f = still() ? 4 : [2, 3, 4][Math.min(2, Math.floor(u / 0.09))];
        else if (state === 'error') { const i = Math.floor(u / 0.06); dx = still() ? 0 : SHAKE[Math.min(i, 4)]; if (i > 8) state = 'idle'; }
        else if (state === 'checking') { dx = still() ? 0 : [0, 1, 0, -1][Math.floor(u * 10) % 4]; }
        else f = !still() && (T % 4.2) > 3.9 ? 1 : 0;   // a glint now and then
        ctx.clearRect(0, 0, 24, 26); ctx.imageSmoothingEnabled = false;
        spr(ctx, 'lock', f, 1 + dx, 0);
      },
    };
    if (gate) gate.addEventListener('gate:state', (e) => { state = e.detail; since = (performance.now() - t0) / 1000; piece.draw(since); wake(); });
    register(lockCv, piece);
  }

  /* ═════════ the footer: paper night, pixel walker ═════════ */
  const night = document.querySelector('[data-night]');
  if (night) {
    // the skyline is an <img> until it comes near; then it is inlined so its stars, windows and cloud can move
    let stars = [], wins = [], cloud = null, inlined = false;
    const inline = () => {
      if (inlined) return; inlined = true;
      const img = night.querySelector('img.night__paper');
      fetch('src/art/night.svg').then((r) => (r.ok ? r.text() : Promise.reject())).then((txt) => {
        const box = document.createElement('div');
        box.innerHTML = txt.replace(/href="grain\.webp"/g, 'href="src/art/grain.webp"');
        const svg = box.querySelector('svg'); if (!svg || !img) return;
        img.replaceWith(svg);
        stars = [...svg.querySelectorAll('.pp-star')]; wins = [...svg.querySelectorAll('.pp-win')]; cloud = svg.querySelector('.pp-cloud');
        stars.forEach((el) => { const b = el.getBBox(); el.__c = [b.x + b.width / 2, b.y + b.height / 2]; });
      }).catch(() => {});
    };
    const cv = night.querySelector('[data-walker]'), ctx = cv.getContext('2d');
    const mailLink = document.querySelector('.footer__mail');
    const hover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    // the walker's world: x in CSS px along the ground; the mailbox stands near the right
    const W = { x: null, dir: 1, mode: 'idle', target: null, since: 0, frame: 0, flag: 0, heart: null, pointer: null, nextWander: 3, letter: false, jumpAt: null, waveUntil: 0 };
    const S = () => (window.innerWidth < 700 ? 2 : 3);   // art pixel size in CSS px: whole numbers only
    const mailX = () => cv.clientWidth * (window.innerWidth < 700 ? 0.8 : 0.84);
    let last = null;

    const setMode = (m, T) => { W.mode = m; W.since = T; };
    const walkTo = (x, T, then) => { W.target = x; W.then = then || null; setMode('walk', T); };

    function update(T) {
      const dt = last == null ? 0 : Math.min(0.05, T - last); last = T;
      const w = cv.clientWidth, s = S();
      if (W.x == null) W.x = w * 0.62;
      if (still()) { W.mode = 'idle'; return; }
      if (W.mode === 'idle') {
        if (W.pointer != null && Math.abs(W.pointer - W.x) > 40) walkTo(W.pointer - Math.sign(W.pointer - W.x) * 24, T);
        else if (T > W.nextWander && W.pointer == null) { walkTo(w * (0.42 + 0.36 * hash(Math.floor(T))), T); W.nextWander = T + 6 + 5 * hash(Math.floor(T) + 7); }
      }
      if (W.mode === 'walk') {
        const tx = W.pointer != null && !W.then ? W.pointer - Math.sign(W.pointer - W.x) * 24 : W.target;
        const d = tx - W.x, v = (W.letter ? 230 : 70) * (s / 3);   // he hurries when he has a letter to post
        if (Math.abs(d) < 3) { W.x = tx; const then = W.then; W.then = null; setMode('idle', T); if (then) then(T); }
        else { W.dir = Math.sign(d); W.x += Math.sign(d) * Math.min(Math.abs(d), v * dt); }
      }
      if (W.mode === 'post') {
        const u = T - W.since;
        if (u > 0.25 && W.flag === 0) { W.flag = 1; }
        if (u > 0.4 && W.letter) { W.letter = false; W.flag = 2; W.heart = T; }
        if (u > 0.9) { setMode('idle', T); W.waveUntil = T + 1.1; }
      }
      if (W.mode === 'jump' && T - W.since > 0.62) setMode('idle', T);
      if (W.flag === 2 && W.heart != null && T - W.heart > 6) W.flag = 0;
    }

    function frameAt(T) {
      if (W.mode === 'walk') return 3 + (Math.floor(T * (W.letter ? 18 : 10)) % 8);
      if (W.mode === 'post') { const u = T - W.since; return u < 0.2 ? 13 : u < 0.4 ? 14 : 15; }
      if (W.mode === 'jump') { const u = T - W.since; return u < 0.1 ? 16 : u < 0.5 ? 17 : 16; }
      if (T < W.waveUntil) return 11 + (Math.floor(T * 6) % 2);
      const u = T % 3.4; return u > 3.2 ? 2 : Math.floor(T * 2) % 2 ? 1 : 0;
    }

    const piece = {
      on: !hasIO,
      enter: inline,
      draw(T) {
        if (!hasIO) inline();
        // paper life: stars turn now and then, windows go on and off, the cloud drifts on twos
        if (!still()) {
          stars.forEach((el, i) => { const k = Math.floor((T + i * 0.7) * 1.4); el.setAttribute('transform', `rotate(${Math.round((hash(k * 7 + i) - 0.5) * 30)} ${el.__c[0].toFixed(1)} ${el.__c[1].toFixed(1)})`); });
          wins.forEach((el, i) => el.setAttribute('opacity', ((T + i * 1.7) / (5 + (i % 4))) % 1 < 0.72 ? '1' : '0.25'));
          if (cloud) cloud.setAttribute('transform', `translate(${-((Math.floor(T * 6) * 3) % 1700) + 380} 0)`);
        }
        update(T);
        const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = cv.clientWidth, ch = cv.clientHeight;
        if (cv.width !== Math.round(cw * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
        const s = S(), k = Math.round(s * dpr);          // device pixels per art pixel: whole
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = false;
        const ground = cv.height;                         // feet on the canvas bottom
        // mailbox
        const mx = Math.round(mailX() * dpr), my = ground - A.mail.h * k;
        spr(ctx, 'mail', W.flag, mx, my, false, k);
        // a heart rising out of it after a letter
        if (W.heart != null && !still()) {
          const u = T - W.heart;
          if (u < 1.2) { const hy = my - Math.round((4 + Math.floor(u * 8) * 2) * k); if (Math.floor(u * 8) % 3 !== 2 || u < 0.6) spr(ctx, 'heart', 0, mx + 8 * k, hy, false, k); }
        }
        // the walker
        const f = frameAt(T);
        let lift = 0;
        if (W.mode === 'jump') { const u = (T - W.since - 0.1) / 0.4; if (u > 0 && u < 1) lift = Math.round(Math.sin(Math.PI * u) * 10) * k; }
        const x = Math.round((W.x * dpr) - (A.char.w * k) / 2), y = ground - A.char.h * k - lift;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 3 * k, ground - k, (A.char.w - 6) * k, k);
        spr(ctx, 'char', f, x, y, W.dir < 0, k);
      },
    };
    // he follows the pointer across the footer (desktop), jumps when tapped and posts a letter when you go to email
    if (hover) {
      night.closest('.footer').addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); W.pointer = Math.max(16, Math.min(r.width - 16, e.clientX - r.left)); wake(); });
      night.closest('.footer').addEventListener('pointerleave', () => { W.pointer = null; });
    }
    cv.addEventListener('click', () => { if (still() || W.mode === 'post') return; setMode('jump', (performance.now() - t0) / 1000); wake(); });
    const post = () => {
      if (still() || W.mode === 'post' || W.letter) return;
      const T = (performance.now() - t0) / 1000;
      W.letter = true; W.pointer = null;
      walkTo(mailX() - 12, T, (T2) => { W.dir = 1; setMode('post', T2); });
      wake();
    };
    if (mailLink) { mailLink.addEventListener('pointerenter', post); mailLink.addEventListener('focus', post); }
    window.addEventListener('resize', () => { if (W.x != null) W.x = Math.min(W.x, cv.clientWidth - 20); });
    register(night, piece);
  }

  /* reduced motion switched on mid-visit: draw every piece's finished frame and stop */
  const settle = () => { document.querySelectorAll('[data-craft-in]').forEach((el) => el.classList.add('is-in')); live.forEach((p) => p.draw((performance.now() - t0) / 1000)); };
  if (rmq.addEventListener) rmq.addEventListener('change', () => { if (rmq.matches) settle(); else wake(); });
})();
