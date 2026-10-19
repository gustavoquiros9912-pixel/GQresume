/*
  systems.js: the template on the home page.
  Six languages, three writing systems, two reading directions, one component. Choosing a language swaps the
  text in the flexible zones (Arabic reads right to left, Simplified Chinese uses its own typeface); the locked
  brand zone and the component's size never change, and the readout says what changed and what did not.
  These are the same six languages, in the same order, as the language beat in the hero film.
*/
(() => {
  const root = document.querySelector('[data-template]');
  if (!root) return;

  const LANG = {
    'zh-Hans': { code: 'ZH', name: 'Simplified Chinese', native: '简体中文', script: 'Han', dir: 'ltr', text: '使用前请阅读说明书。' },
    ar: { code: 'AR', name: 'Arabic', native: 'العربية', script: 'Arabic', dir: 'rtl', text: 'اقرأ التعليمات قبل الاستخدام.' },
    tr: { code: 'TR', name: 'Turkish', native: 'Türkçe', script: 'Latin', dir: 'ltr', text: 'Kullanmadan önce talimatları okuyun.' },
    en: { code: 'EN', name: 'English', native: 'English', script: 'Latin', dir: 'ltr', text: 'Read the instructions before use.' },
    pl: { code: 'PL', name: 'Polish', native: 'Polski', script: 'Latin', dir: 'ltr', text: 'Przed użyciem przeczytaj instrukcję.' },
    es: { code: 'ES', name: 'Spanish', native: 'Español', script: 'Latin', dir: 'ltr', text: 'Lea las instrucciones antes de usar.' },
  };

  const field = root.querySelector('[data-field]');
  const flex = root.querySelector('[data-flex]');
  const meta = root.querySelector('[data-meta]');
  const code = root.querySelector('[data-code]');
  const status = root.querySelector('[data-status]');
  const spec = (k) => root.querySelector(`[data-spec="${k}"]`);
  const buttons = [...root.querySelectorAll('[data-lang]')];
  const still = () => !document.documentElement.classList.contains('motion');

  // text length against English, measured as the field actually sets it (same size, each script in its own face)
  const ruler = document.createElement('span');
  ruler.className = 'tpl__field tpl__ruler';
  ruler.setAttribute('aria-hidden', 'true');
  field.parentNode.appendChild(ruler);
  const width = (lang) => { const L = LANG[lang]; ruler.lang = lang; ruler.dir = L.dir; ruler.textContent = L.text; return ruler.getBoundingClientRect().width || 1; };
  let enWidth = 0;
  const sizeOf = () => Math.round(flex.getBoundingClientRect().height);
  let baseSize = 0;

  const apply = (lang) => {
    const L = LANG[lang];
    field.textContent = L.text;
    field.lang = lang;
    field.dir = L.dir;
    flex.dataset.dir = L.dir;
    code.textContent = L.code;
    meta.textContent = `${L.name} · ${L.dir === 'rtl' ? 'right to left' : 'left to right'}`;
    if (!enWidth) enWidth = width('en');
    const pct = Math.round((width(lang) / enWidth) * 100);
    spec('script').textContent = L.script;
    spec('dir').textContent = L.dir === 'rtl' ? 'Right to left' : 'Left to right';
    spec('len').textContent = `${pct}% of English`;
    const size = sizeOf();
    if (!baseSize) baseSize = size;
    spec('size').textContent = Math.abs(size - baseSize) <= 1 ? 'Unchanged' : `${size - baseSize > 0 ? '+' : ''}${size - baseSize} px`;
    status.textContent = `Instruction text switched to ${L.name}${L.dir === 'rtl' ? ', right to left' : ''}. The brand zone and the component size did not change.`;
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-pressed') === 'true') return;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const lang = btn.dataset.lang;
      if (still()) return apply(lang);
      root.dataset.from = field.dir === 'rtl' ? 'rtl' : 'ltr';
      field.classList.add('is-swapping');
      setTimeout(() => {
        apply(lang);
        field.classList.remove('is-swapping');
        field.classList.add('is-arriving');
        requestAnimationFrame(() => requestAnimationFrame(() => field.classList.remove('is-arriving')));
      }, 170);
    });
  });

  // arrow keys move between the six languages, like a toolbar
  root.querySelector('.tpl__controls').addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[j].focus();
  });

  const start = () => apply((buttons.find((b) => b.getAttribute('aria-pressed') === 'true') || buttons[0]).dataset.lang);
  // the Chinese and Arabic faces are tiny subsets; load them first so every measurement uses the real glyphs
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('400 24px "GQ Han"', LANG['zh-Hans'].text), document.fonts.load('400 24px "GQ Arabic"', LANG.ar.text), document.fonts.ready])
      .then(start, start);
  } else start();
})();
