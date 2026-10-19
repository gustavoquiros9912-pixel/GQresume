#!/usr/bin/env node
/*
  verify-pages.cjs: check that every encrypted page in the site opens with the password and matches its source.
  usage: PW='the password' node tools/verify-pages.cjs <site dir> <sources dir> [page.html ...]
  Prints one line per page; the password is never printed.
*/
const fs = require('fs');
const path = require('path');
const LIB = path.join(__dirname, 'staticrypt-lib');
const cryptoEngine = require(path.join(LIB, 'cryptoEngine.js'));
const codec = require(path.join(LIB, 'codec.js'));

(async () => {
  const [site, src, ...pages] = process.argv.slice(2);
  const password = process.env.PW;
  if (!site || !src || !password) { console.error('usage: PW=... node verify-pages.cjs <site dir> <sources dir> [pages...]'); process.exit(1); }
  const list = pages.length ? pages : ['work.html', 'industrial-safety.html', 'insurance.html', 'healthcare-finance.html', 'healthcare-platform.html', 'marketing-agency.html'];
  const { salt } = JSON.parse(fs.readFileSync(path.join(src, '.staticrypt.json'), 'utf8'));
  const { decode } = codec.init(cryptoEngine);
  const hashed = await cryptoEngine.hashPassword(password, salt);
  let bad = 0;
  for (const page of list) {
    const html = fs.readFileSync(path.join(site, page), 'utf8');
    const m = html.match(/"staticryptEncryptedMsgUniqueVariableName"\s*:\s*"([0-9a-f]+)"/);
    const saltIn = (html.match(/staticryptSaltUniqueVariableName\s*=\s*"([0-9a-f]+)"/) || html.match(/"staticryptSaltUniqueVariableName"\s*:\s*"([0-9a-f]+)"/) || [])[1];
    if (!m) { console.log(`?? ${page}: no encrypted payload found`); bad++; continue; }
    const r = await decode(m[1], hashed, salt);
    if (!r.success) { console.log(`BAD ${page}: does not open with the password`); bad++; continue; }
    const source = fs.readFileSync(path.join(src, page), 'utf8');
    const same = r.decoded === source;
    console.log(`${same ? 'OK ' : 'OLD'} ${page}: opens${saltIn ? (saltIn === salt ? ', salt matches' : ', SALT DIFFERS') : ''}${same ? ', matches its source' : ', but differs from the current source'}`);
    if (!same || (saltIn && saltIn !== salt)) bad++;
  }
  process.exit(bad ? 1 : 0);
})();
