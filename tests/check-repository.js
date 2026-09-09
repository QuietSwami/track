'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const root = path.join(__dirname, '..');
const listed = execFileSync(
  'git', ['ls-files', '--cached', '--others', '--exclude-standard'],
  {cwd: root, encoding: 'utf8'}
).trim();
const files = listed ? listed.split('\n') : [];

const forbiddenNames = new Set(['.clasp.json', '.clasprc.json', '.env']);
const forbiddenPatterns = [
  {name: 'Google API key', expression: new RegExp('AI' + 'za[0-9A-Za-z_-]{35}')},
  {name: 'Google OAuth client secret', expression: new RegExp('GOC' + 'SPX-[0-9A-Za-z_-]+')},
  {name: 'Google OAuth access token', expression: new RegExp('ya' + '29\\.[0-9A-Za-z_-]+')},
  {name: 'Google OAuth refresh token', expression: new RegExp('1/' + '/[0-9A-Za-z_-]+')},
  {name: 'Apps Script deployment ID', expression: new RegExp('AK' + 'fycb[0-9A-Za-z_-]{20,}')},
  {name: 'private key', expression: new RegExp('BEGIN ' + '(RSA |EC |OPENSSH )?PRIVATE KEY')}
];

for (const relative of files) {
  const base = path.basename(relative);
  assert.ok(!forbiddenNames.has(base), `${relative} must not be committed`);
  if (/\.(png|jpg|jpeg|gif|webp|ico)$/i.test(relative)) continue;
  const absolute = path.join(root, relative);
  if (!fs.statSync(absolute).isFile() || fs.statSync(absolute).size > 1024 * 1024) continue;
  const content = fs.readFileSync(absolute, 'utf8');
  for (const pattern of forbiddenPatterns) {
    assert.ok(!pattern.expression.test(content), `${pattern.name} detected in ${relative}`);
  }
  if (base !== '.clasp.json.example') {
    assert.ok(!/"scriptId"\s*:\s*"[^"{]+"/.test(content),
      `Possible Apps Script ID detected in ${relative}`);
  }
}

const claspExample = fs.readFileSync(path.join(root, '.clasp.json.example'), 'utf8');
assert.match(claspExample, /PASTE_YOUR_APPS_SCRIPT_PROJECT_ID_HERE/);
console.log(`Checked ${files.length} repository files for common credentials and private deployment identifiers.`);
