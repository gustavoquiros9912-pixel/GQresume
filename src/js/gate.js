/*
  gate.js: the password box on the home page.

  The case studies are encrypted with StatiCrypt v3. This checks a password right here, the way StatiCrypt does:
  PBKDF2 with the salt from .staticrypt.json (1,000 rounds of SHA-1, then 14,000 and 585,000 rounds of SHA-256),
  then the HMAC-SHA256 signature of the encrypted case studies list (work.html). A wrong password fails on the
  signature, so nothing is decrypted here. The right one opens work.html with the hashed password in the address,
  which StatiCrypt reads to decrypt on arrival (and, with "Remember me", keeps for 30 days, so every case study
  opens without asking again). The password itself is never stored or sent anywhere.

  Without JavaScript the form still works: it submits to work.html, which shows StatiCrypt's own password page.
  Events for the padlock (craft.js): gate:state with idle, checking, error, success or open.
*/
(() => {
  const gate = document.querySelector('.gate');
  if (!gate) return;
  const form = gate.querySelector('[data-gate-form]');
  const input = gate.querySelector('#gate-password');
  const remember = gate.querySelector('#gate-remember');
  const error = gate.querySelector('#gate-error');
  const button = form ? form.querySelector('button[type="submit"]') : null;
  const root = document.documentElement;
  const SALT = 'd1f262da1b9c7b5e397532d4ae2f11a5';     // keep in step with private-sources/.staticrypt.json
  const TARGET = 'work.html';
  const KEY_PASS = 'staticrypt_passphrase', KEY_EXP = 'staticrypt_expiration', DAYS = 30;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const say = (state) => gate.dispatchEvent(new CustomEvent('gate:state', { detail: state }));

  const enc = new TextEncoder();
  const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  const unhex = (h) => new Uint8Array((h.match(/.{2}/g) || []).map((b) => parseInt(b, 16)));
  const subtle = window.crypto && window.crypto.subtle;

  async function pbkdf2(pass, iterations, hash) {
    const key = await subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
    return hex(await subtle.deriveBits({ name: 'PBKDF2', hash, iterations, salt: enc.encode(SALT) }, key, 256));
  }
  const hashPassword = async (pw) => pbkdf2(await pbkdf2(await pbkdf2(pw, 1000, 'SHA-1'), 14000, 'SHA-256'), 585000, 'SHA-256');

  async function signatureMatches(hashed) {
    const html = await (await fetch(TARGET, { cache: 'no-store', credentials: 'same-origin' })).text();
    const m = html.match(/"staticryptEncryptedMsgUniqueVariableName":\s*"([^"]+)"/);
    if (!m) throw new Error('no encrypted payload in ' + TARGET);
    const signed = m[1], mac = signed.slice(0, 64), body = signed.slice(64);
    const key = await subtle.importKey('raw', unhex(hashed), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return hex(await subtle.sign('HMAC', key, enc.encode(body))) === mac;
  }

  const stored = () => {
    try {
      const pass = localStorage.getItem(KEY_PASS), exp = parseInt(localStorage.getItem(KEY_EXP) || '0', 10);
      return pass && exp > Date.now() ? pass : null;
    } catch (e) { return null; }
  };

  // a remembered visit: the gate is open, the cards go straight to their case studies, the covers come into focus
  function checkRemembered() {
    const open = Boolean(stored());
    gate.classList.toggle('is-unlocked', open);
    root.classList.toggle('is-open', open);
    document.querySelectorAll('[data-case]').forEach((a) => {
      if (!a.dataset.href) a.dataset.href = a.getAttribute('href');
      a.setAttribute('href', open ? a.dataset.case : '#access');
    });
    return open;
  }

  // a locked card or proof link takes you to the password box rather than to a second password page
  document.querySelectorAll('[data-case]').forEach((a) => a.addEventListener('click', (e) => {
    if (gate.classList.contains('is-unlocked')) return;
    e.preventDefault();
    gate.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => input && input.focus({ preventScroll: true }), reduced ? 0 : 450);
  }));

  const showError = (msg) => {
    if (error) error.textContent = msg;
    if (input) { input.setAttribute('aria-invalid', 'true'); input.select(); }
  };

  if (form && subtle) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pw = input.value;
      if (!pw) { say('error'); showError('Enter the password from my resume or application email.'); return; }
      say('checking');
      form.setAttribute('aria-busy', 'true'); if (button) button.disabled = true;
      if (error) error.textContent = '';
      input.removeAttribute('aria-invalid');
      try {
        const hashed = await hashPassword(pw);
        if (!(await signatureMatches(hashed))) { say('error'); showError('That password didn’t work. Try again or request access.'); return; }
        say('success');
        if (remember && remember.checked) {
          try { localStorage.setItem(KEY_PASS, hashed); localStorage.setItem(KEY_EXP, String(Date.now() + DAYS * 864e5)); } catch (err) {}
        }
        const go = () => { location.href = `${TARGET}#staticrypt_pwd=${hashed}${remember && remember.checked ? '&remember_me' : ''}`; };
        if (reduced) go(); else setTimeout(go, 420);   // long enough to see the padlock open
      } catch (err) {
        say('error');
        showError('Something went wrong. Try again or open the case studies page directly.');
      } finally {
        form.removeAttribute('aria-busy'); if (button) button.disabled = false;
      }
    });
  }

  checkRemembered();
  say(gate.classList.contains('is-unlocked') ? 'open' : 'idle');   // the padlock starts open on a remembered visit
})();
