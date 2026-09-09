'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const failures = [];

function fail(message) { failures.push(message); }
function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }

function pngDimensions(relative) {
  const data = fs.readFileSync(path.join(root, relative));
  const signature = '89504e470d0a1a0a';
  if (data.subarray(0, 8).toString('hex') !== signature) {
    fail(`${relative} is not a PNG file`);
    return null;
  }
  return {width: data.readUInt32BE(16), height: data.readUInt32BE(20)};
}

function expectPng(relative, width, height) {
  if (!fs.existsSync(path.join(root, relative))) {
    fail(`Missing required asset: ${relative}`);
    return;
  }
  const dimensions = pngDimensions(relative);
  if (dimensions && (dimensions.width !== width || dimensions.height !== height)) {
    fail(`${relative} is ${dimensions.width}x${dimensions.height}; expected ${width}x${height}`);
  }
}

for (const relative of [
  'docs/privacy.html',
  'docs/terms.html',
  'docs/support.html',
  'publication/marketplace-listing.md'
]) {
  const content = read(relative);
  const placeholders = [...new Set(content.match(/\{\{[A-Z0-9_]+\}\}/g) || [])];
  if (placeholders.length) fail(`${relative} still contains: ${placeholders.join(', ')}`);
}

expectPng('assets/marketplace/project-time-icon-32.png', 32, 32);
expectPng('assets/marketplace/project-time-icon-128.png', 128, 128);
expectPng('assets/marketplace/project-time-banner-220x140.png', 220, 140);

const screenshotDirectory = path.join(root, 'assets/marketplace/screenshots');
const screenshotSizes = new Set(['1280x800', '640x400', '2560x1600']);
const screenshots = fs.existsSync(screenshotDirectory) ?
  fs.readdirSync(screenshotDirectory).filter(name => /\.png$/i.test(name)) : [];
if (!screenshots.length) {
  fail('Add at least one real Calendar integration PNG to assets/marketplace/screenshots/');
} else {
  for (const name of screenshots) {
    const relative = path.join('assets/marketplace/screenshots', name);
    const dimensions = pngDimensions(relative);
    if (dimensions && !screenshotSizes.has(`${dimensions.width}x${dimensions.height}`)) {
      fail(`${relative} has an unsupported Marketplace screenshot size`);
    }
  }
}

const manifest = JSON.parse(read('src/appsscript.json'));
const expectedScopes = [
  'https://www.googleapis.com/auth/calendar.addons.execute',
  'https://www.googleapis.com/auth/calendar.readonly'
];
if (JSON.stringify([...manifest.oauthScopes].sort()) !== JSON.stringify(expectedScopes.sort())) {
  fail('Manifest OAuth scopes do not match the publication-approved minimum set');
}
if (!/^https:\/\/lh3\.googleusercontent\.com\//.test(manifest.addOns.common.logoUrl || '')) {
  fail('Production manifest logoUrl must begin with https://lh3.googleusercontent.com/');
}

const appsScriptSource = fs.readdirSync(path.join(root, 'src'))
  .filter(name => name.endsWith('.gs'))
  .map(name => read(path.join('src', name)))
  .join('\n');
if (/UrlFetchApp|Jdbc\.|doGet\s*\(|doPost\s*\(/.test(appsScriptSource)) {
  fail('Review detected external-server/network primitives before publication');
}

if (failures.length) {
  console.error('Publication blockers:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log('Publication readiness checks passed.');
}
