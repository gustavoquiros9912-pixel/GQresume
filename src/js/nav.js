// nav.js — marks the nav stop for whichever section is in view.
// The stylesheet handles this on its own with :target; this replaces that
// fallback with real scroll-spy. The .has-js flag tells the CSS to stand down.

const nav = document.querySelector('.nav');

if (nav) {
  document.body.classList.add('has-js');

  // each stop links to a section: read the pairing off the href
  const stops = [...nav.querySelectorAll('.nav__stop')]
    .map((stop) => {
      const link = stop.querySelector('a[href^="#"]');
      const section = link && document.querySelector(link.hash);
      return section ? { stop, link, section } : null;
    })
    .filter(Boolean);

  const setCurrent = (current) => {
    stops.forEach(({ stop, link }) => {
      const isCurrent = stop === current;
      stop.classList.toggle('is-current', isCurrent);
      if (isCurrent) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  // the sticky nav covers the top of the page, so measure from below it
  const navHeight = () => nav.offsetHeight + 1;

  const spy = () => {
    const line = window.scrollY + navHeight();
    let current = stops[0];

    stops.forEach((entry) => {
      if (entry.section.offsetTop <= line) current = entry;
    });

    // the last section wins once the page is scrolled to the bottom, so a
    // short trailing section still gets its turn
    const atEnd = window.innerHeight + window.scrollY >= document.body.offsetHeight - 2;
    if (atEnd) current = stops[stops.length - 1];

    setCurrent(current.stop);
  };

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      spy();
      queued = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  spy();
}