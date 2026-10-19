/*
  hero-film.js: the 23.5 s film in the home hero.
  Plays muted once it is on screen (never for prefers-reduced-motion), pauses off screen,
  ends on its last frame (the name) and offers play, pause, replay and sound.
  Phones (up to 860 px wide) get the 720p encodes through the <source media> attributes.
*/
(() => {
  const fig = document.querySelector('[data-film]');
  if (!fig) return;
  const v = fig.querySelector('[data-film-video]');
  const playBtn = fig.querySelector('[data-film-play]');
  const soundBtn = fig.querySelector('[data-film-sound]');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let userPaused = false;

  const sync = () => {
    const state = v.ended ? 'replay' : v.paused ? 'play' : 'pause';
    playBtn.dataset.state = state;
    playBtn.setAttribute('aria-label', state === 'pause' ? 'Pause film' : state === 'replay' ? 'Replay film' : 'Play film');
    fig.classList.toggle('is-playing', state === 'pause');
  };
  const play = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };

  playBtn.addEventListener('click', () => {
    if (v.ended) { v.currentTime = 0; userPaused = false; play(); }
    else if (v.paused) { userPaused = false; play(); }
    else { userPaused = true; v.pause(); }
  });
  soundBtn.addEventListener('click', () => {
    v.muted = !v.muted;
    soundBtn.setAttribute('aria-pressed', String(!v.muted));
    soundBtn.setAttribute('aria-label', v.muted ? 'Turn sound on' : 'Turn sound off');
    if (!v.muted && (v.paused || v.ended)) { if (v.ended) v.currentTime = 0; userPaused = false; play(); }
  });
  ['play', 'pause', 'ended', 'loadeddata'].forEach((e) => v.addEventListener(e, sync));

  if (still) {
    v.poster = 'work/hero/film-end.webp';   // the still version: the end card
    v.preload = 'none';
  } else if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { if (!userPaused && !v.ended) play(); }
      else if (!v.paused) v.pause();
    }, { threshold: 0.35 }).observe(fig);
  } else {
    play();
  }
  sync();
})();
