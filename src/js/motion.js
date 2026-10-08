/*
  motion.js — shared animation layer for every page (homepage and case studies).

  Pair it with src/css/motion.css and this snippet in each page's <head>:
    <script>(function(){var d=document.documentElement,ok=window.matchMedia&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window;if(!ok)return;d.classList.add('motion');setTimeout(function(){if(!window.__motionReady)d.classList.remove('motion');},3000);})();</script>

  It only targets selectors that exist on a page, so the same file works
  everywhere. Section nav highlighting stays in each page's own script.
*/
(() => {
  const root = document.documentElement;

  /* ── Equal-height image rows (always on; layout, not decoration) ── */
  document.querySelectorAll('.study .screens').forEach((row) => {
    row.classList.add('is-justified');
    row.querySelectorAll(':scope > figure').forEach((fig) => {
      const media = fig.querySelector('img, video');
      if (!media) return;
      const setRatio = () => {
        const w = media.naturalWidth || media.videoWidth;
        const h = media.naturalHeight || media.videoHeight;
        if (w && h) fig.style.setProperty('--ar', (w / h).toFixed(4));
      };
      if (media.tagName === 'VIDEO') media.addEventListener('loadedmetadata', setRatio);
      else media.addEventListener('load', setRatio);
      setRatio();
    });
  });

  /* ── Reading progress line (always on; it's information, not decoration) ── */
  let bar = document.querySelector('.progress');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.prepend(bar);
  }
  const progress = () => {
    const max = root.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.transform = `scaleX(${p})`;
  };
  let queued = false;
  const update = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      progress();
    });
  };
  document.addEventListener('scroll', update, { passive: true, capture: true });
  addEventListener('resize', update, { passive: true });
  addEventListener('load', update);
  addEventListener('pageshow', update);
  update();

  /* ── Everything below is decoration, and only runs with motion on ── */
  window.__motionReady = true; // tells the <head> failsafe this file loaded
  if (!root.classList.contains('motion')) return;

  const TITLE = '.intro__name, .study__title';

  const REVEAL = [
    // homepage
    '.intro__links li', '.intro__bio', '.ledger__title', '.ledger__row',
    '.work__head', '.work__grid .case',
    // case studies
    '.study__back', '.study__kicker', '.study__lede', '.study__intro .shot',
    '.facts > div', '.block__label', '.block__title', '.block > p',
    '.points > li', '.takeaway', '.trio .item', '.visual',
    '.stats > div', '.confidential', '.confidentialb',
  ].join(', ');

  const SPOT = '.work__grid .case, .trio .item, .copy__card, .track, .surfaces > li, .journey > li';

  const GLOW = '.intro, .gate, main.work, .study #overview';       // drifting pink/purple glows
  const FRAME = '.visual > .shot';                         // full-width screens: framed, grow on scroll
  const TILT = '.gallery';                                 // image grids: tilted collage that flattens

  const COUNT_AUTO = '.stats__value'; // numbers on case pages, e.g. 2,000+  100%  ~15/wk

  const revealAll = () => {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
    document.querySelectorAll('.split-title').forEach((el) => el.classList.add('is-in'));
  };

  try {
    /* Split big titles into letters. Screen readers get the plain text. */
    document.querySelectorAll(TITLE).forEach((title) => {
      if (title.querySelector('.char')) return;
      const text = title.textContent.trim();
      if (!text) return;
      title.classList.add('split-title');
      title.textContent = '';
      const label = document.createElement('span');
      label.className = 'sr-only';
      label.textContent = text;
      title.appendChild(label);
      const visual = document.createElement('span');
      visual.setAttribute('aria-hidden', 'true');
      let c = 0;
      text.split(/\s+/).forEach((word, w) => {
        if (w > 0) visual.appendChild(document.createTextNode(' '));
        const wordEl = document.createElement('span');
        wordEl.className = 'word';
        [...word].forEach((ch) => {
          const span = document.createElement('span');
          span.className = 'char';
          span.style.setProperty('--c', c++);
          span.textContent = ch;
          wordEl.appendChild(span);
        });
        visual.appendChild(wordEl);
      });
      title.appendChild(visual);
      requestAnimationFrame(() => requestAnimationFrame(() => title.classList.add('is-in')));
    });

    /* Mark reveal targets. Skip anything inside another target so delays don't stack. */
    const candidates = [...document.querySelectorAll(REVEAL)];
    const set = new Set(candidates);
    const targets = candidates.filter((el) => {
      for (let p = el.parentElement; p; p = p.parentElement) if (set.has(p)) return false;
      return true;
    });
    targets.forEach((el) => el.setAttribute('data-reveal', ''));

    /* Homepage: accent hairline under each ledger row. */
    document.querySelectorAll('.ledger__row').forEach((row) => {
      if (getComputedStyle(row).position === 'static') row.style.position = 'relative';
      const line = document.createElement('span');
      line.className = 'fx-line';
      line.setAttribute('aria-hidden', 'true');
      row.appendChild(line);
    });

    /* Count-ups. Screen readers get the final value; the animated copy is hidden from them. */
    const prepCount = (el, target, prefix, suffix, commas) => {
      const finalText = el.textContent.trim();
      el.textContent = '';
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = finalText;
      const vis = document.createElement('span');
      vis.setAttribute('aria-hidden', 'true');
      vis.textContent = finalText;
      el.append(sr, vis);
      el._count = { vis, target, prefix, suffix, commas, finalText };
      el.setAttribute('data-counter', '');
    };
    document.querySelectorAll('[data-count]').forEach((el) => {
      const target = parseInt(el.dataset.count, 10);
      if (target) prepCount(el, target, '', '', false);
    });
    document.querySelectorAll(COUNT_AUTO).forEach((el) => {
      const m = el.textContent.trim().match(/^([~≈]?)(\d[\d,]*)(\+|%|\/\w+)?$/);
      if (!m) return;
      const target = parseInt(m[2].replace(/,/g, ''), 10);
      if (target > 1) prepCount(el, target, m[1], m[3] || '', m[2].includes(','));
    });
    const runCount = (el) => {
      const d = el._count;
      if (!d || d.ran) return;
      d.ran = true;
      const start = performance.now();
      const fmt = (n) => (d.commas ? n.toLocaleString('en-US') : String(n));
      const tick = (now) => {
        const t = Math.min(1, (now - start) / 1000);
        const n = Math.round((1 - Math.pow(1 - t, 3)) * d.target);
        d.vis.textContent = t < 1 ? `${d.prefix}${fmt(n)}${d.suffix}` : d.finalText;
        if (t < 1) requestAnimationFrame(tick);
      };
      d.vis.textContent = `${d.prefix}0${d.suffix}`;
      requestAnimationFrame(tick);
    };

    /* After an element has played its reveal, hand it back to layout.css. */
    const settle = (el) => {
      el.removeAttribute('data-reveal');
      el.classList.remove('is-in');
      el.style.removeProperty('--i');
    };

    const show = (el, i) => {
      if (!el.hasAttribute('data-reveal') || el.classList.contains('is-in')) return;
      io.unobserve(el);
      el.style.setProperty('--i', i);
      el.classList.add('is-in');
      if (el.hasAttribute('data-counter')) runCount(el);
      el.querySelectorAll('[data-counter]').forEach(runCount);
      const bar = el.querySelector(':scope > .fx-bar');
      if (bar) {
        bar.style.setProperty('--d', `${150 + i * 70}ms`);
        bar.classList.add('is-drawn');
      }
      const line = el.querySelector(':scope > .fx-line');
      if (line) {
        line.style.setProperty('--d', `${200 + i * 70}ms`);
        line.classList.add('is-drawing');
      }
      const done = (e) => {
        if (e.target !== el || e.propertyName !== 'opacity') return;
        el.removeEventListener('transitionend', done);
        settle(el);
      };
      el.addEventListener('transitionend', done);
      setTimeout(() => el.hasAttribute('data-reveal') && settle(el), 2000 + i * 70);
    };

    /* Stagger within each batch that enters the viewport together. */
    const io = new IntersectionObserver(
      (entries) => {
        let i = 0;
        entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
          .forEach((e) => show(e.target, Math.min(i++, 6)));
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    targets.forEach((el) => io.observe(el));

    /* Counters that aren't inside a reveal target still animate when seen. */
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        runCount(e.target);
        cio.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-counter]').forEach((el) => {
      if (!el.closest('[data-reveal]')) cio.observe(el);
    });

    /* Keyboard users never land on something invisible. */
    document.addEventListener('focusin', (e) => {
      const el = e.target.closest && e.target.closest('[data-reveal]');
      if (el) show(el, 0);
    });

    /* Safety net: anything on screen that still hasn't revealed after 3s. */
    setTimeout(() => {
      document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) show(el, 0);
      });
    }, 3000);

    /* If "reduce motion" is switched on mid-visit, stop animating. */
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (rm.addEventListener) {
      rm.addEventListener('change', () => {
        if (!rm.matches) return;
        revealAll();
        document.querySelectorAll('[data-counter]').forEach((el) => {
          if (el._count) el._count.vis.textContent = el._count.finalText;
        });
        root.classList.remove('motion');
        document.querySelectorAll('.fx-frame, .fx-tilt').forEach((el) => el.style.setProperty('--p', '1'));
      });
    }

    /* ── Drifting gradient glows behind key sections ─────────────────── */
    const glowHosts = [];
    document.querySelectorAll(GLOW).forEach((host) => {
      if (host.querySelector(':scope > .fx-glow')) return;
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      host.style.isolation = 'isolate';
      const glow = document.createElement('div');
      glow.className = 'fx-glow';
      glow.setAttribute('aria-hidden', 'true');
      glow.innerHTML = '<span class="fx-glow__a"></span><span class="fx-glow__b"></span>';
      host.appendChild(glow);
      glowHosts.push(glow);
    });
    if (glowHosts.length) {
      // pause the drifting glows while they're off screen
      const gio = new IntersectionObserver((entries) => {
        entries.forEach((e) => e.target.classList.toggle('is-paused', !e.isIntersecting));
      });
      glowHosts.forEach((g) => gio.observe(g));
    }

    /* ── Short accent bar under section labels ("01 — the challenge") ── */
    document.querySelectorAll('.block__label').forEach((label) => {
      if (label.querySelector(':scope > .fx-bar')) return;
      const bar = document.createElement('span');
      bar.className = 'fx-bar';
      bar.setAttribute('aria-hidden', 'true');
      label.appendChild(bar);
    });

    /* ── Scroll-linked effects: framed screens grow, collages flatten ── */
    const frames = [...document.querySelectorAll(FRAME)];
    frames.forEach((shot) => shot.classList.add('fx-frame'));
    const tilts = [...document.querySelectorAll(TILT)];
    tilts.forEach((g) => {
      g.classList.add('fx-tilt');
      if (g.parentElement) g.parentElement.classList.add('fx-tilt-stage');
    });

    const linked = [...frames, ...tilts];
    if (linked.length) {
      // 0 when the element's top enters the bottom of the screen, 1 when it reaches 35% from the top
      // (or when the page can't scroll any further).
      const measure = (el) => (el.classList.contains('fx-tilt') && el.parentElement ? el.parentElement : el);
      let ticking = false;
      const updateLinked = () => {
        ticking = false;
        const vh = window.innerHeight || 1;
        const atBottom = window.scrollY >= root.scrollHeight - vh - 2;
        const tops = linked.map((el) => measure(el).getBoundingClientRect().top); // all reads first
        linked.forEach((el, i) => {                                                // then all writes
          const p = atBottom ? 1 : Math.min(1, Math.max(0, (vh - tops[i]) / (vh * 0.65)));
          el.style.setProperty('--p', p.toFixed(3));
        });
      };
      const onLinked = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(updateLinked);
      };
      document.addEventListener('scroll', onLinked, { passive: true, capture: true });
      addEventListener('resize', onLinked, { passive: true });
      addEventListener('load', onLinked);
      updateLinked();
    }

    /* Card spotlight follows the cursor (fine pointers only, one update per frame). */
    const rectResets = [];
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.querySelectorAll(SPOT).forEach((card) => {
        if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
        card.style.isolation = 'isolate';
        card.classList.add('fx-host');
        const spot = document.createElement('span');
        spot.className = 'fx-spot';
        spot.setAttribute('aria-hidden', 'true');
        card.prepend(spot);

        let rect = null;
        let frame = 0;
        let x = 0;
        let y = 0;
        card.addEventListener('pointerenter', () => { rect = card.getBoundingClientRect(); });
        card.addEventListener('pointerleave', () => { rect = null; });
        card.addEventListener('pointermove', (e) => {
          if (!rect) rect = card.getBoundingClientRect();
          x = e.clientX - rect.left;
          y = e.clientY - rect.top;
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            spot.style.setProperty('--mx', `${x}px`);
            spot.style.setProperty('--my', `${y}px`);
          });
        });
        rectResets.push(() => { rect = null; });
      });
      addEventListener('scroll', () => rectResets.forEach((f) => f()), { passive: true });
    }
  } catch (err) {
    // If anything above fails, show everything and turn motion off.
    revealAll();
    root.classList.remove('motion');
  }
})();
