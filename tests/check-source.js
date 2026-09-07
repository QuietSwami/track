'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const scripts = fs.readdirSync(src).filter(name => name.endsWith('.gs'));
for (const name of scripts) {
  new vm.Script(fs.readFileSync(path.join(src, name), 'utf8'), {filename: name});
}

const manifest = JSON.parse(fs.readFileSync(path.join(src, 'appsscript.json'), 'utf8'));
assert.equal(manifest.runtimeVersion, 'V8');
assert.equal(manifest.addOns.calendar.homepageTrigger.runFunction, 'buildCalendarHomepage');
assert.equal(manifest.dependencies.enabledAdvancedServices[0].serviceId, 'calendar');
assert.equal(manifest.addOns.common.layoutProperties, undefined,
  'Host-managed colors are required so cards follow Calendar light/dark theme');
assert.deepEqual(manifest.oauthScopes.sort(), [
  'https://www.googleapis.com/auth/calendar.addons.execute',
  'https://www.googleapis.com/auth/calendar.readonly'
].sort());
assert.ok(!manifest.oauthScopes.some(scope => /calendar(\.events)?$/.test(scope)));
const cards = fs.readFileSync(path.join(src, 'Cards.gs'), 'utf8');
assert.ok(!/#5F6368|primaryColor|secondaryColor/.test(cards),
  'Cards must not hard-code neutral UI colors; Calendar supplies theme colors');
console.log(`Checked ${scripts.length} Apps Script files and the manifest.`);
