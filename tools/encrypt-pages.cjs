#!/usr/bin/env node
/*
  encrypt-pages.cjs: encrypt the case studies exactly like `npx staticrypt@3` (see private-sources/encrypt.sh),
  with no npm install: it uses StatiCrypt's own library files, kept in tools/staticrypt-lib (MIT).

  usage:
    PW='the password' node tools/encrypt-pages.cjs <sources dir> <out dir> [page.html ...]
  - <sources dir> holds the unprotected pages, template.html and .staticrypt.json (the salt). Keep the salt:
    it is what makes "Remember me" and the home page's password box work with every page.
  - default pages: work.html and the five case studies.
  The password is read from the PW environment variable and is never printed.
*/
const fs = require('fs');
const path = require('path');
const LIB = path.join(__dirname, 'staticrypt-lib');
const cryptoEngine = require(path.join(LIB, 'cryptoEngine.js'));
const codec = require(path.join(LIB, 'codec.js'));
const { renderTemplate } = require(path.join(LIB, 'formater.js'));

// StatiCrypt's own "CommonJS to browser" step (cli/helpers.js), so the page carries the same decryption code
function toBrowser(file) {
  const text = fs.readFileSync(path.join(LIB, file), 'utf8').replace(/^.*\brequire\(.*$\n/gm, '');
  return `((function(){\n  const exports = {};\n  ${text}\n  return exports;\n})())`;
}
function buildStaticryptJS() {
  return renderTemplate(toBrowser('staticryptJs.js'), { js_codec: toBrowser('codec.js'), js_crypto_engine: toBrowser('cryptoEngine.js') });
}

async function main() {
  const [src, out, ...pages] = process.argv.slice(2);
  if (!src || !out) { console.error('usage: PW=... node encrypt-pages.cjs <sources dir> <out dir> [pages...]'); process.exit(1); }
  const password = process.env.PW;
  if (!password) { console.error('Set the password in the PW environment variable.'); process.exit(1); }
  const list = pages.length ? pages : ['work.html', 'industrial-safety.html', 'insurance.html', 'healthcare-finance.html', 'healthcare-platform.html', 'marketing-agency.html'];
  const { salt } = JSON.parse(fs.readFileSync(path.join(src, '.staticrypt.json'), 'utf8'));
  const template = path.join(src, 'template.html');
  const { encodeWithHashedPassword } = codec.init(cryptoEngine);
  const hashed = await cryptoEngine.hashPassword(password, salt);
  const base = {
    is_remember_enabled: JSON.stringify(true),
    js_staticrypt: buildStaticryptJS(),
    template_button: 'Unlock',
    template_color_primary: '#ea4e65',
    template_color_secondary: '#1a1a1a',
    template_error: 'That password didn’t work. Try again or request access.',
    template_instructions: 'Some of this work is under client confidentiality. Enter the password from my resume or application email, or request access below.',
    template_placeholder: 'Password',
    template_remember: 'Remember me for 30 days',
    template_title: 'These case studies are password protected',
    template_toggle_show: 'Show password',
    template_toggle_hide: 'Hide password',
  };
  fs.mkdirSync(out, { recursive: true });
  const tpl = fs.readFileSync(template, 'utf8');
  for (const page of list) {
    const contents = fs.readFileSync(path.join(src, page), 'utf8');
    const encrypted = await encodeWithHashedPassword(contents, hashed);
    const data = { ...base, staticrypt_config: { staticryptEncryptedMsgUniqueVariableName: encrypted, isRememberEnabled: true, rememberDurationInDays: 30, staticryptSaltUniqueVariableName: salt } };
    fs.writeFileSync(path.join(out, page), renderTemplate(tpl, data));
    console.log('encrypted', page);
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
