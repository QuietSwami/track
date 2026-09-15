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
assert.equal(manifest.addOns.common.name, 'Track! - Time Tracker for Google Calendar');
assert.equal(manifest.addOns.calendar.homepageTrigger.runFunction, 'buildCalendarHomepage');
assert.equal(manifest.dependencies.enabledAdvancedServices[0].serviceId, 'calendar');
assert.deepEqual(manifest.oauthScopes.sort(), [
  'https://www.googleapis.com/auth/calendar.addons.execute',
  'https://www.googleapis.com/auth/calendar.readonly'
].sort());
assert.ok(!manifest.oauthScopes.some(scope => /calendar(\.events)?$/.test(scope)));
const cards = fs.readFileSync(path.join(src, 'Cards.gs'), 'utf8');
const calendarAccess = fs.readFileSync(path.join(src, 'CalendarAccess.gs'), 'utf8');
assert.ok(!/#5F6368|primaryColor|secondaryColor/.test(cards),
  'Cards should not hard-code neutral UI colors');
assert.ok(!/setSubtitle\s*\(/.test(cards),
  'Card headers should show only the card name');
assert.match(cards, /setOnClickAction\(action\('onOpenProjectDetails'/,
  'Project summary rows should open the detail card');
assert.match(cards, /buildProjectDetailsCard/,
  'Project detail card should be present');
assert.match(cards, /buildInsightsCard/,
  'A lightweight Insights card should be present');
assert.match(cards, /Project mix/,
  'Insights should provide an immediately scannable project comparison');
assert.doesNotMatch(cards, /Charts\.newLineChart|data:image\/png;base64/,
  'Insights should not depend on a heavy generated chart');
assert.match(cards, /Longest block/);
assert.match(cards, /Shortest block/);
assert.match(cards, /Scheduled time/);
assert.match(cards, /not time automatically tracked/);
assert.doesNotMatch(cards, /Activity extremes|Counted events|Daily breakdown/);
assert.match(cards, /Delete my data/,
  'Settings should provide an in-product user-data deletion flow');
assert.match(calendarAccess, /items\(id,summary,status,start,end/,
  'Event names should be requested for activity statistics');
assert.doesNotMatch(calendarAccess, /items\(id,[^']*(description|location)/,
  'Descriptions and locations should not be requested');
assert.match(calendarAccess, /getAnalytics/,
  'Calendar access should compare only the selected and previous periods');
console.log(`Checked ${scripts.length} Apps Script files and the manifest.`);
