const panelTicket  = document.getElementById('panel-ticket');
const ticketCard   = document.getElementById('ticket-card');
const scanLine     = document.getElementById('scan-line');
const scanGlow     = document.getElementById('scan-glow');
const stampMark    = document.getElementById('stamp-mark');
const splatter     = document.getElementById('splatter');
const cursorEl     = document.getElementById('cursor');
const instruction  = document.getElementById('ticket-instruction');
const capPlatform  = document.getElementById('cap-platform');
const capTrain     = document.getElementById('cap-train');
const dotHome      = document.getElementById('dot-home');

let scanned  = false;
let stamped  = false;
let scanning = false;

// live time
function updateTime() {
  const now = new Date();
  const months = ['JAN','FEB','MAR','APR','MAY','JUN',
                  'JUL','AUG','SEP','OCT','NOV','DEC'];
  
  // date
  const dateEl = document.getElementById('ticket-date');
  if (dateEl) dateEl.textContent =
    String(now.getDate()).padStart(2,'0') + ' ' + months[now.getMonth()];

  // time — 12hr with AM/PM and EST
  const hours24  = now.getHours();
  const minutes  = String(now.getMinutes()).padStart(2,'0');
  const ampm     = hours24 >= 12 ? 'PM' : 'AM';
  const hours12  = hours24 % 12 || 12;
  const seconds = String(now.getSeconds()).padStart(2,'0');
  const tz = now.toLocaleTimeString('en-US', { timeZoneName: 'short' })
    .split(' ')[2];
  const timeStr = `${String(hours12).padStart(2,'0')}:${minutes}:${seconds} ${ampm} ${tz}`;
  const timeEl = document.getElementById('ticket-departs');
  if (timeEl) timeEl.textContent = timeStr;


}
updateTime();
setInterval(updateTime, 1000);

// cursor tracking
document.addEventListener('mousemove', e => {
  cursorEl.style.left = e.clientX + 'px';
  cursorEl.style.top  = e.clientY + 'px';
});

// hover → scan
panelTicket.addEventListener('mouseenter', () => {
  cursorEl.classList.add('show');
  if (stamped) return;
  if (!scanned && !scanning) startScan();
});

panelTicket.addEventListener('mouseleave', () => {
  cursorEl.classList.remove('show');
});

panelTicket.addEventListener('mousemove', () => {
  if (stamped) cursorEl.classList.add('show');
});

// click → stamp (or shake if clicked outside the actual ticket)
panelTicket.addEventListener('click', (e) => {
  if (stamped) return;

  const rect = ticketCard.getBoundingClientRect();
  const withinTicket =
    e.clientX >= rect.left && e.clientX <= rect.right &&
    e.clientY >= rect.top && e.clientY <= rect.bottom;

  if (!withinTicket) {
    cursorEl.classList.add('reject');
    setTimeout(() => cursorEl.classList.remove('reject'), 350);
    return;
  }

  doStamp(e);
});

function startScan() {
  if (scanning || scanned) return;
  scanning = true;
  const h = ticketCard.offsetHeight;
  scanLine.style.setProperty('--scan-h', h + 'px');
  scanGlow.style.setProperty('--scan-h', h + 'px');
  scanLine.classList.add('scanning');
  scanGlow.classList.add('scanning');
  playBeep(880, 0.05, 0.1);
  setTimeout(() => {
    scanLine.classList.remove('scanning');
    scanGlow.classList.remove('scanning');
    scanning = false;
    scanned  = true;
  }, 880);
}

function doStamp(e) {
  if (stamped) return;
  stamped = true;
  document.dispatchEvent(new CustomEvent('ticket:stamped'));

  const STAMP_TO_TRAIN_DELAY = 400;
  const TRAIN_SLIDE_DURATION = 1100;
  const TRAIN_TO_PASSENGER_PAUSE = 1200;
  const TRAIN_STOPPED_PAUSE = 1500;
  const PASSENGER_TO_EXPLORE_PAUSE = 700;

  const trainArrivedAt = STAMP_TO_TRAIN_DELAY + TRAIN_SLIDE_DURATION;
  const passengerRevealAt = trainArrivedAt + TRAIN_TO_PASSENGER_PAUSE;
  const buildingsScrollAt = trainArrivedAt + TRAIN_STOPPED_PAUSE;
  const exploreIndicatorAt = passengerRevealAt + PASSENGER_TO_EXPLORE_PAUSE;

  const trainLayer = document.getElementById('layer-train');
  const buildingsLayer = document.getElementById('layer-buildings');
  const passengerLayer = document.getElementById('layer-passenger');

  if (trainLayer) {
    setTimeout(() => {
      trainLayer.classList.add('arrived');
    }, STAMP_TO_TRAIN_DELAY);
  }

  if (buildingsLayer) {
    setTimeout(() => {
      buildingsLayer.classList.add('scrolling');
    }, buildingsScrollAt);
  }

  if (passengerLayer) {
    setTimeout(() => {
      passengerLayer.classList.add('revealed');
    }, passengerRevealAt);
  }

  const rect = ticketCard.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  stampMark.style.left = x + 'px';
  stampMark.style.top  = y + 'px';

  stampMark.classList.add('stamped');
  for (let i = 0; i < 22; i++) setTimeout(() => spawnSplat(x, y), i * 10);
  playThud();

  setTimeout(() => {
    instruction.classList.add('hide');
  }, 100);

  setTimeout(() => {
    cursorEl.classList.remove('show');
  }, 300);

  //dialogue 1
  setTimeout(() => {
    dotHome.classList.add('is-active');
    dotHome.querySelector('.train-nav__dot')?.setAttribute('aria-current', 'page');
    capPlatform.classList.add('visible');
    typeText(capPlatform,
      'always drawing and building...', 42);
  }, 350);

  //dialogue 2
  setTimeout(() => {
    capTrain.classList.add('visible');
    typeText(capTrain,
      "let's go somewhere good.", 48);
  }, 2400);

  setTimeout(() => {
    const indicator = document.createElement('div');
    indicator.id = 'explore-indicator';
    indicator.innerHTML = `
      <span class="explore-text">explore the portfolio</span>
      <span class="explore-dots">
        <span></span><span></span><span></span>
      </span>
    `;
    indicator.style.cssText = `
      position: absolute;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Space Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(26,82,212,0.45);
      white-space: nowrap;
      z-index: 4;
      opacity: 0;
      transition: opacity 0.6s ease;
      pointer-events: none;
    `;

    const panelBottom = document.getElementById('panel-bottom');
    if (panelBottom) {
      panelBottom.style.position = 'relative';
      panelBottom.appendChild(indicator);
      requestAnimationFrame(() => {
        indicator.style.opacity = '1';
      });
    }
  }, exploreIndicatorAt);

  setTimeout(() => {
    const rightScroll = document.querySelector('.right-scroll');
    const workSection = document.getElementById('work');
    if (rightScroll && workSection) {
      const targetRect = workSection.getBoundingClientRect();
      const scrollRect = rightScroll.getBoundingClientRect();
      const delta = targetRect.top - scrollRect.top;
      rightScroll.scrollTo({ top: rightScroll.scrollTop + delta, behavior: 'smooth' });
    }

    const dotWork = document.getElementById('dot-work');
    const lblWork = document.getElementById('lbl-work');
    if (dotWork) {
      document.querySelectorAll('.train-nav__stop').forEach((s) => {
        s.classList.remove('is-active');
        s.querySelector('.train-nav__dot')?.removeAttribute('aria-current');
      });
      dotWork.classList.add('is-active', 'lit');
      dotWork.querySelector('.train-nav__dot')?.setAttribute('aria-current', 'page');
    }
    if (lblWork) lblWork.classList.add('lit');
  }, 7000);

  setTimeout(() => {
    const resetEl = document.createElement('div');
    resetEl.id = 'ticket-reset';
    resetEl.textContent = '↺ reset';
    resetEl.style.cssText = `
      position: absolute;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 15px;
      letter-spacing: 0.12em;
      color: rgba(26,82,212,0.35);
      font-family: var(--font-mono);
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.4s, color 0.2s;
      z-index: 10;
      white-space: nowrap;
    `;
    panelTicket.appendChild(resetEl);
    requestAnimationFrame(() => resetEl.style.opacity = '1');

    resetEl.addEventListener('mouseenter', () => {
      resetEl.style.color = 'rgba(26,82,212,0.8)';
      panelTicket.style.cursor = 'pointer';
    });
    resetEl.addEventListener('mouseleave', () => {
      resetEl.style.color = 'rgba(26,82,212,0.35)';
    });
    resetEl.addEventListener('click', (e) => {
      e.stopPropagation();
      resetTicket();
    });
  }, 4500);
}

function resetTicket() {
  stamped  = false;
  scanned  = false;
  scanning = false;
  document.dispatchEvent(new CustomEvent('ticket:reset'));

  stampMark.classList.remove('stamped');
  stampMark.style.opacity = '';
  stampMark.style.transform = '';
  void stampMark.offsetWidth;

  capPlatform.textContent = '';
  capPlatform.classList.remove('visible');
  capTrain.textContent = '';
  capTrain.classList.remove('visible');

  const trainLayer = document.getElementById('layer-train');
  if (trainLayer) trainLayer.classList.remove('arrived');

  const buildingsLayer = document.getElementById('layer-buildings');
  if (buildingsLayer) buildingsLayer.classList.remove('scrolling');

  const passengerLayer = document.getElementById('layer-passenger');
  if (passengerLayer) passengerLayer.classList.remove('revealed');

  const exploreIndicator = document.getElementById('explore-indicator');
  if (exploreIndicator) exploreIndicator.remove();

  dotHome.classList.remove('is-active');
  dotHome.querySelector('.train-nav__dot')?.removeAttribute('aria-current');

  instruction.classList.remove('hide');

  const resetEl = document.getElementById('ticket-reset');
  if (resetEl) resetEl.remove();

  panelTicket.style.cursor = 'none';
}

function typeText(el, text, delay) {
  el.textContent = '';
  let i = 0;
  const iv = setInterval(() => {
    el.textContent += text[i++];
    if (i >= text.length) clearInterval(iv);
  }, delay);
}

function spawnSplat(x, y) {
  const s = document.createElement('div');
  s.className = 'splat';
  const size  = 3 + Math.random() * 8;
  const angle = Math.random() * Math.PI * 2;
  const dist  = 35 + Math.random() * 85;
  s.style.cssText = `
    width:${size}px; height:${size}px;
    left:${x}px;
    top:${y}px;
    --tx:${Math.cos(angle)*dist}px;
    --ty:${Math.sin(angle)*dist}px;
  `;
  splatter.appendChild(s);
  requestAnimationFrame(() => s.classList.add('burst'));
  setTimeout(() => s.remove(), 650);
}

let audioCtx;
function getCtx() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  return audioCtx;
}
function playBeep(freq, gain, dur) {
  try {
    const ctx = getCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.01);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    o.start(); o.stop(ctx.currentTime + dur + 0.05);
  } catch(e) {}
}
function playThud() {
  try {
    const ctx = getCtx();
    const buf  = ctx.createBuffer(1, ctx.sampleRate*0.12, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random()*2-1) * Math.pow(1-i/data.length, 3);
    const src = ctx.createBufferSource();
    const flt = ctx.createBiquadFilter();
    const g   = ctx.createGain();
    src.buffer = buf;
    flt.type = 'lowpass'; flt.frequency.value = 160;
    g.gain.value = 0.55;
    src.connect(flt); flt.connect(g); g.connect(ctx.destination);
    src.start();
    playBeep(2400, 0.03, 0.025);
  } catch(e) {}
}
