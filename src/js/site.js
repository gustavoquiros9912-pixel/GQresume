/*
  site.js: the one script shared by every page.
  1. footer year, nav highlighting, equal-height image rows (always on)
  2. scroll reveals and number count-ups (only when the <head> snippet set "motion")
  No scroll listeners: nav highlighting and reveals both use IntersectionObserver.
*/
(() => {
  const root = document.documentElement;
  document.body.classList.add('has-js');

  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ── The salmon full stop: every big title ends on the film's dot, cut from paper ── */
  document.querySelectorAll('.section__title, .study__title, .work__title, .footer__lead').forEach((h) => {
    if (h.querySelector('.pdot')) return;
    const last = h.lastChild;
    if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\.\s*$/, '');   // the dot replaces a final period
    const dot = document.createElement('span');
    dot.className = 'pdot';
    dot.setAttribute('aria-hidden', 'true');
    dot.innerHTML = '<i></i>';
    h.append(dot);
  });


  /* ── Liquid glass: an SVG refraction filter for backdrop-filter (Chromium). Elsewhere: plain frosted blur. ── */
  try {
    const ua = navigator.userAgentData && navigator.userAgentData.brands ? navigator.userAgentData.brands.map((b) => b.brand).join(' ') : navigator.userAgent;
    if (/Chrom(e|ium)/.test(ua)) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true'); svg.style.position = 'absolute';
      svg.innerHTML = '<filter id="lg" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.011" numOctaves="2" seed="7" result="n"/><feGaussianBlur in="n" stdDeviation="3" result="nb"/><feDisplacementMap in="SourceGraphic" in2="nb" scale="46" xChannelSelector="R" yChannelSelector="G"/></filter>';
      document.body.prepend(svg);
      root.classList.add('has-lg');
    }
  } catch (e) {}

  /* ── Nav: mark the section in view ─────────────────────── */
  const nav = document.querySelector('.nav');
  if (nav && 'IntersectionObserver' in window) {
    const stops = [...nav.querySelectorAll('.nav__stop')]
      .map((stop) => {
        const link = stop.querySelector('a[href^="#"]');
        const section = link && link.hash.length > 1 && document.querySelector(link.hash);
        return section ? { stop, link, section } : null;
      })
      .filter(Boolean);

    if (stops.length) {
      const live = new Set();
      const mark = () => {
        // later sections win when two share the reading band
        const current = [...stops].reverse().find((s) => live.has(s.section)) || null;
        stops.forEach(({ stop, link }) => {
          const on = current && stop === current.stop;
          stop.classList.toggle('is-current', Boolean(on));
          if (on) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      };
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => (e.isIntersecting ? live.add(e.target) : live.delete(e.target)));
          mark();
        },
        { rootMargin: `-${nav.offsetHeight + 1}px 0px -55% 0px` }
      );
      stops.forEach((s) => spy.observe(s.section));
    }
  }

  /* ── Image rows: images side by side share one height ──── */
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
      media.addEventListener(media.tagName === 'VIDEO' ? 'loadedmetadata' : 'load', setRatio);
      setRatio();
    });
  });

  /* ── Reading progress (the CSS draws it where supported) ── */
  if (!document.querySelector('.progress')) {
    const bar = document.createElement('div');
    bar.className = 'progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.prepend(bar);
  }

  window.__motionReady = true; // tells the <head> failsafe this file loaded
  if (!root.classList.contains('motion')) return;

  /* ── Motion: reveals and count-ups ─────────────────────── */
  const REVEAL = [
    '.section__title', '.section__lede', '.index__list > li', '.stance__item',
    '.capability', '.systems__stage', '.ledgers > div', '.skills', '.gate__stage',
    '.work__intro', '.cases > li', '.work__close', '.clients',
    '.study__title', '.study__kicker', '.study__lede', '.study__intro .shot', '.facts',
    '.block__label', '.block__title', '.block > p', '.points > li', '.takeaway',
    '.trio .item', '.visual', '.stats > div', '.confidential',
  ].join(', ');

  const revealAll = () => {
    document.querySelectorAll('[data-reveal], .pdot').forEach((el) => el.classList.add('is-in'));
    document.querySelectorAll('.hero__title').forEach((el) => el.classList.add('is-in'));
  };

  try {
    /* headline: lines rise in on load */
    document.querySelectorAll('.hero__title').forEach((title) => {
      title.querySelectorAll('.line').forEach((line, i) => line.firstElementChild.style.setProperty('--l', i));
      requestAnimationFrame(() => requestAnimationFrame(() => title.classList.add('is-in')));
    });

    /* skip anything nested in another target so delays don't stack */
    const candidates = [...document.querySelectorAll(REVEAL)];
    const set = new Set(candidates);
    const targets = candidates.filter((el) => {
      for (let p = el.parentElement; p; p = p.parentElement) if (set.has(p)) return false;
      return true;
    });
    targets.forEach((el) => el.setAttribute('data-reveal', ''));

    /* numbers count up once, so a figure like 2,000+ lands with weight */
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
    document.querySelectorAll('.stats__value').forEach((el) => {
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

    /* once an element has played its reveal, hand it back to layout.css */
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
      const done = (e) => {
        if (e.target !== el || e.propertyName !== 'opacity') return;
        el.removeEventListener('transitionend', done);
        settle(el);
      };
      el.addEventListener('transitionend', done);
      setTimeout(() => el.hasAttribute('data-reveal') && settle(el), 2000 + i * 70);
    };

    const io = new IntersectionObserver(
      (entries) => {
        let i = 0;
        entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
          .forEach((e) => show(e.target, Math.min(i++, 5)));
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
    );
    targets.forEach((el) => io.observe(el));

    /* each title's full stop lands just after the title has risen in */
    const dotIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const dot = e.target.querySelector('.pdot');
        if (dot) setTimeout(() => dot.classList.add('is-in'), 520);
        dotIO.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -18% 0px' });
    document.querySelectorAll('.pdot').forEach((dot) => dotIO.observe(dot.parentElement));

    /* counters outside any reveal target still run when seen */
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

    /* keyboard users never land on something invisible */
    document.addEventListener('focusin', (e) => {
      const el = e.target.closest && e.target.closest('[data-reveal]');
      if (el) show(el, 0);
    });

    /* anything on screen that still hasn't revealed after 3s */
    setTimeout(() => {
      document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) show(el, 0);
      });
    }, 3000);

    /* "reduce motion" switched on mid-visit: stop animating */
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (rm.addEventListener) {
      rm.addEventListener('change', () => {
        if (!rm.matches) return;
        revealAll();
        document.querySelectorAll('[data-counter]').forEach((el) => {
          if (el._count) el._count.vis.textContent = el._count.finalText;
        });
        root.classList.remove('motion');
      });
    }
  } catch (err) {
    revealAll();
    root.classList.remove('motion');
  }
})();
