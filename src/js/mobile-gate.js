// Shows a "best viewed on desktop" overlay below the site's mobile
// breakpoint, since the layout leans on hover states, a custom cursor,
// and side-by-side scroll columns that don't hold up on small/touch
// screens. There's no dismiss — it's a hard gate that tracks viewport
// width, so it also clears itself if the window is resized back up.

const BREAKPOINT = 1100;

function buildGate() {
  const gate = document.createElement('div');
  gate.className = 'desktop-gate';
  gate.innerHTML = `
    <img src="/walking-updated.gif" alt="" class="desktop-gate__walker" />
    <div class="desktop-gate__label">heads up</div>
    <h1 class="desktop-gate__title">this site's built for a bigger screen</h1>
    <p class="desktop-gate__body">some of the details here — hover states, a custom cursor, side-scrolling panels — need a mouse and a bit more room to breathe.</p>
  `;
  document.body.appendChild(gate);
  return gate;
}

function checkGate() {
  const isSmall = window.innerWidth < BREAKPOINT;
  const existing = document.querySelector('.desktop-gate');

  if (isSmall && !existing) {
    buildGate();
  } else if (!isSmall && existing) {
    existing.remove();
  }
}

checkGate();
window.addEventListener('resize', checkGate);