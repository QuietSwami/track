'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({console, Date, Intl, JSON, Math, isFinite});
for (const file of ['Utils.gs', 'DateRanges.gs', 'Aggregation.gs', 'Analytics.gs']) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
  vm.runInContext(source, context, {filename: file});
}

const Dates = context.TrackDateRanges;
const Aggregate = context.TrackAggregation;
const Analytics = context.TrackAnalytics;

const HOUR = 60 * 60 * 1000;
const TZ = 'Europe/Zurich';
const DEFAULTS = {
  countDeclined: false,
  countAllDay: false,
  countFree: false
};

function timed(id, start, end, extra = {}) {
  return Object.assign({
    id,
    status: 'confirmed',
    start: {dateTime: start},
    end: {dateTime: end}
  }, extra);
}

function allDay(id, start, end, extra = {}) {
  return Object.assign({
    id,
    status: 'confirmed',
    start: {date: start},
    end: {date: end}
  }, extra);
}

function aggregate(projects, start, end, options = {}) {
  return Aggregate.aggregateProjects(
    projects,
    [{startMs: Date.parse(start), endMs: Date.parse(end)}],
    Object.assign({}, DEFAULTS, options),
    TZ
  );
}

const tests = [];
function test(name, fn) { tests.push({name, fn}); }

test('normal event fully within the period', () => {
  const result = aggregate([{id: 'a', name: 'A', events: [
    timed('1', '2026-09-07T09:00:00+02:00', '2026-09-07T10:30:00+02:00')
  ]}], '2026-09-07T00:00:00+02:00', '2026-09-08T00:00:00+02:00');
  assert.equal(result.totalMilliseconds, 1.5 * HOUR);
  assert.equal(result.projects[0].eventCount, 1);
});

test('event crossing the beginning is clipped', () => {
  const result = aggregate([{id: 'a', name: 'A', events: [
    timed('1', '2026-09-06T23:00:00+02:00', '2026-09-07T01:30:00+02:00')
  ]}], '2026-09-07T00:00:00+02:00', '2026-09-08T00:00:00+02:00');
  assert.equal(result.totalMilliseconds, 1.5 * HOUR);
});

test('event crossing the end is clipped', () => {
  const result = aggregate([{id: 'a', name: 'A', events: [
    timed('1', '2026-09-07T22:00:00+02:00', '2026-09-08T02:00:00+02:00')
  ]}], '2026-09-07T00:00:00+02:00', '2026-09-08T00:00:00+02:00');
  assert.equal(result.totalMilliseconds, 2 * HOUR);
});

test('event spanning midnight keeps its elapsed duration', () => {
  const result = aggregate([{id: 'a', name: 'A', events: [
    timed('1', '2026-09-07T23:00:00+02:00', '2026-09-08T02:00:00+02:00')
  ]}], '2026-09-07T00:00:00+02:00', '2026-09-09T00:00:00+02:00');
  assert.equal(result.totalMilliseconds, 3 * HOUR);
  assert.deepEqual(Array.from(result.projects[0].days, day => [
    day.date, day.milliseconds, day.eventCount
  ]), [
    ['2026-09-07', HOUR, 1],
    ['2026-09-08', 2 * HOUR, 1]
  ]);
});

test('multiple events on one project calendar are summed', () => {
  const result = aggregate([{id: 'a', name: 'A', events: [
    timed('1', '2026-09-07T09:00:00Z', '2026-09-07T10:00:00Z'),
    timed('2', '2026-09-07T11:00:00Z', '2026-09-07T13:00:00Z')
  ]}], '2026-09-07T00:00:00Z', '2026-09-08T00:00:00Z');
  assert.equal(result.totalMilliseconds, 3 * HOUR);
  assert.equal(result.projects[0].eventCount, 2);
});

test('multiple project calendars are summed and sorted', () => {
  const result = aggregate([
    {id: 'a', name: 'A', events: [timed('1', '2026-09-07T09:00:00Z', '2026-09-07T10:00:00Z')]},
    {id: 'b', name: 'B', events: [timed('2', '2026-09-07T09:00:00Z', '2026-09-07T11:00:00Z')]}
  ], '2026-09-07T00:00:00Z', '2026-09-08T00:00:00Z');
  assert.equal(result.totalMilliseconds, 3 * HOUR);
  assert.equal(result.projects[0].id, 'b');
  assert.equal(result.projects[0].percentage, 67);
});

test('expanded recurring-event occurrences are counted individually', () => {
  const recurrence = {recurringEventId: 'series'};
  const result = aggregate([{id: 'a', name: 'A', events: [
    timed('series_1', '2026-09-07T09:00:00Z', '2026-09-07T10:00:00Z', recurrence),
    timed('series_2', '2026-09-08T09:00:00Z', '2026-09-08T10:00:00Z', recurrence)
  ]}], '2026-09-07T00:00:00Z', '2026-09-09T00:00:00Z');
  assert.equal(result.totalMilliseconds, 2 * HOUR);
  assert.equal(result.projects[0].eventCount, 2);
});

test('cancelled event is excluded', () => {
  const result = aggregate([{id: 'a', name: 'A', events: [
    timed('1', '2026-09-07T09:00:00Z', '2026-09-07T10:00:00Z', {status: 'cancelled'})
  ]}], '2026-09-07T00:00:00Z', '2026-09-08T00:00:00Z');
  assert.equal(result.totalMilliseconds, 0);
});

test('declined event is excluded by default and optional when enabled', () => {
  const event = timed('1', '2026-09-07T09:00:00Z', '2026-09-07T10:00:00Z', {
    attendees: [{self: true, responseStatus: 'declined'}]
  });
  const projects = [{id: 'a', name: 'A', events: [event]}];
  assert.equal(aggregate(projects, '2026-09-07T00:00:00Z', '2026-09-08T00:00:00Z').totalMilliseconds, 0);
  assert.equal(aggregate(projects, '2026-09-07T00:00:00Z', '2026-09-08T00:00:00Z', {countDeclined: true}).totalMilliseconds, HOUR);
});

test('all-day event is excluded by default and optional when enabled', () => {
  const projects = [{id: 'a', name: 'A', events: [allDay('1', '2026-09-07', '2026-09-08')]}];
  assert.equal(aggregate(projects, '2026-09-07T00:00:00+02:00', '2026-09-08T00:00:00+02:00').totalMilliseconds, 0);
  assert.equal(aggregate(projects, '2026-09-07T00:00:00+02:00', '2026-09-08T00:00:00+02:00', {countAllDay: true}).totalMilliseconds, 24 * HOUR);
});

test('Free event is excluded by default and optional when enabled', () => {
  const event = timed('1', '2026-09-07T09:00:00Z', '2026-09-07T10:00:00Z', {transparency: 'transparent'});
  const projects = [{id: 'a', name: 'A', events: [event]}];
  assert.equal(aggregate(projects, '2026-09-07T00:00:00Z', '2026-09-08T00:00:00Z').totalMilliseconds, 0);
  assert.equal(aggregate(projects, '2026-09-07T00:00:00Z', '2026-09-08T00:00:00Z', {countFree: true}).totalMilliseconds, HOUR);
});

test('overlap in the same project is disclosed and counted separately', () => {
  const result = aggregate([{id: 'a', name: 'A', events: [
    timed('1', '2026-09-07T09:00:00Z', '2026-09-07T11:00:00Z'),
    timed('2', '2026-09-07T10:00:00Z', '2026-09-07T12:00:00Z')
  ]}], '2026-09-07T00:00:00Z', '2026-09-08T00:00:00Z');
  assert.equal(result.totalMilliseconds, 4 * HOUR);
  assert.equal(result.hasOverlaps, true);
  assert.equal(result.projects[0].hasOverlaps, true);
  assert.equal(result.projects[0].days[0].milliseconds, 4 * HOUR);
  assert.equal(result.projects[0].days[0].eventCount, 2);
});

test('overlap across projects is disclosed and counted separately', () => {
  const result = aggregate([
    {id: 'a', name: 'A', events: [timed('1', '2026-09-07T09:00:00Z', '2026-09-07T11:00:00Z')]},
    {id: 'b', name: 'B', events: [timed('2', '2026-09-07T10:00:00Z', '2026-09-07T12:00:00Z')]}
  ], '2026-09-07T00:00:00Z', '2026-09-08T00:00:00Z');
  assert.equal(result.totalMilliseconds, 4 * HOUR);
  assert.equal(result.hasOverlaps, true);
  assert.equal(result.projects[0].hasOverlaps, false);
  assert.equal(result.projects[1].hasOverlaps, false);
});

test('daily breakdown percentages use the project total', () => {
  const result = aggregate([{id: 'a', name: 'A', events: [
    timed('1', '2026-09-07T09:00:00+02:00', '2026-09-07T10:00:00+02:00'),
    timed('2', '2026-09-08T09:00:00+02:00', '2026-09-08T12:00:00+02:00')
  ]}], '2026-09-07T00:00:00+02:00', '2026-09-09T00:00:00+02:00');
  assert.deepEqual(Array.from(result.projects[0].days, day => day.percentage), [25, 75]);
});

test('longest and shortest activities include names and use counted duration', () => {
  const result = aggregate([{id: 'a', name: 'A', events: [
    timed('1', '2026-09-06T20:00:00Z', '2026-09-07T00:30:00Z', {
      summary: 'Boundary work'
    }),
    timed('2', '2026-09-07T09:00:00Z', '2026-09-07T10:00:00Z', {
      summary: 'Planning session'
    }),
    timed('3', '2026-09-07T11:00:00Z', '2026-09-07T14:00:00Z', {
      summary: 'Deep work'
    })
  ]}], '2026-09-07T00:00:00Z', '2026-09-08T00:00:00Z');
  assert.deepEqual({...result.projects[0].longestActivity}, {
    name: 'Deep work', milliseconds: 3 * HOUR
  });
  assert.deepEqual({...result.projects[0].shortestActivity}, {
    name: 'Boundary work', milliseconds: 0.5 * HOUR
  });
});

test('an activity without a visible event name gets a helpful fallback', () => {
  const result = aggregate([{id: 'a', name: 'A', events: [
    timed('1', '2026-09-07T09:00:00Z', '2026-09-07T10:00:00Z')
  ]}], '2026-09-07T00:00:00Z', '2026-09-08T00:00:00Z');
  assert.equal(result.projects[0].longestActivity.name, 'Untitled activity');
  assert.equal(result.projects[0].shortestActivity.name, 'Untitled activity');
});

test('empty period returns zero without overlap', () => {
  const result = aggregate([{id: 'a', name: 'A', events: []}],
    '2026-09-07T00:00:00Z', '2026-09-08T00:00:00Z');
  assert.equal(result.totalMilliseconds, 0);
  assert.equal(result.hasOverlaps, false);
});

test('events with missing, invalid, or reversed times are ignored', () => {
  const result = aggregate([{id: 'a', name: 'A', events: [
    {id: 'missing', status: 'confirmed', start: {}, end: {}},
    timed('invalid', 'not-a-date', 'also-not-a-date'),
    timed('reversed', '2026-09-07T11:00:00Z', '2026-09-07T10:00:00Z')
  ]}], '2026-09-07T00:00:00Z', '2026-09-08T00:00:00Z');
  assert.equal(result.totalMilliseconds, 0);
  assert.equal(result.projects[0].eventCount, 0);
});

test('DST spring-forward day is 23 elapsed hours', () => {
  const intervals = Dates.buildIncludedIntervals(
    {year: 2026, month: 3, day: 29},
    {year: 2026, month: 3, day: 30}, true, TZ);
  assert.equal(intervals[0].endMs - intervals[0].startMs, 23 * HOUR);
  const result = Aggregate.aggregateProjects([{id: 'a', name: 'A', events: [
    timed('1', '2026-03-29T00:00:00+01:00', '2026-03-29T04:00:00+02:00')
  ]}], intervals, DEFAULTS, TZ);
  assert.equal(result.totalMilliseconds, 3 * HOUR);
  assert.equal(result.projects[0].days[0].date, '2026-03-29');
  assert.equal(result.projects[0].days[0].milliseconds, 3 * HOUR);
});

test('week navigation and Monday week boundaries', () => {
  assert.equal(Dates.navigate('week', '2026-09-07', -1), '2026-08-31');
  assert.equal(Dates.navigate('week', '2026-09-07', 1), '2026-09-14');
  const range = Dates.getRange('week', '2026-09-09', {
    firstDayOfWeek: 1, includeWeekends: true
  }, TZ);
  assert.equal(Dates.formatLocalDate(range.startLocal), '2026-09-07');
  assert.equal(Dates.formatLocalDate(range.endExclusiveLocal), '2026-09-14');
});

test('month navigation clamps days and crosses year boundaries', () => {
  assert.equal(Dates.navigate('month', '2026-01-31', -1), '2025-12-31');
  assert.equal(Dates.navigate('month', '2026-01-31', 1), '2026-02-28');
  assert.equal(Dates.navigate('month', '2026-12-15', 1), '2027-01-15');
});

test('month range uses calendar-month boundaries', () => {
  const range = Dates.getRange('month', '2026-02-18', {
    firstDayOfWeek: 1, includeWeekends: true
  }, TZ);
  assert.equal(Dates.formatLocalDate(range.startLocal), '2026-02-01');
  assert.equal(Dates.formatLocalDate(range.endExclusiveLocal), '2026-03-01');
});

test('weekends can be excluded from aggregation intervals', () => {
  const range = Dates.getRange('week', '2026-09-09', {
    firstDayOfWeek: 1, includeWeekends: false
  }, TZ);
  assert.equal(range.includedIntervals.length, 1);
  assert.equal(range.includedIntervals[0].endMs - range.includedIntervals[0].startMs, 5 * 24 * HOUR);
});

test('an event spanning a weekend counts only weekday portions', () => {
  const range = Dates.getRange('week', '2026-09-09', {
    firstDayOfWeek: 1, includeWeekends: false
  }, TZ);
  const result = Aggregate.aggregateProjects([{id: 'a', name: 'A', events: [
    timed('1', '2026-09-11T22:00:00+02:00', '2026-09-13T22:00:00+02:00')
  ]}], range.includedIntervals, DEFAULTS, TZ);
  assert.equal(result.totalMilliseconds, 2 * HOUR);
  assert.equal(result.projects[0].eventCount, 1);
});

function analyticsSummary(label, totalMilliseconds, projects) {
  return {
    range: {periodType: 'week', displayLabel: label},
    projects,
    totalMilliseconds,
    selectedCount: projects.length,
    hasOverlaps: false,
    inaccessibleCount: 0,
    failedCalendars: []
  };
}

test('insights compare projects and surface the useful changes', () => {
  const current = analyticsSummary('7–13 September', 8 * HOUR, [
    {id: 'a', name: 'Alpha', color: '#111111', milliseconds: 6 * HOUR,
      percentage: 75, eventCount: 3,
      days: [{date: '2026-09-08', milliseconds: 5 * HOUR, eventCount: 2}]},
    {id: 'b', name: 'Beta', color: '#222222', milliseconds: 2 * HOUR,
      percentage: 25, eventCount: 1,
      days: [{date: '2026-09-09', milliseconds: 2 * HOUR, eventCount: 1}]}
  ]);
  const previous = analyticsSummary('31 August–6 September', 8 * HOUR, [
    {id: 'a', name: 'Alpha', color: '#111111', milliseconds: 4 * HOUR,
      percentage: 50, eventCount: 2, days: []},
    {id: 'b', name: 'Beta', color: '#222222', milliseconds: 4 * HOUR,
      percentage: 50, eventCount: 2, days: []}
  ]);
  const result = Analytics.compare(current, previous);
  assert.equal(result.totalChange.kind, 'same');
  assert.equal(result.projects[0].name, 'Alpha');
  assert.equal(result.projects[0].change.percent, 50);
  assert.equal(result.biggestIncrease.name, 'Alpha');
  assert.equal(result.biggestDecrease.name, 'Beta');
  assert.equal(result.busiestDay.date, '2026-09-08');
  assert.equal(result.eventCount, 4);
  assert.equal(result.averageEventMilliseconds, 2 * HOUR);
});

test('insights identify new activity without dividing by zero', () => {
  const current = analyticsSummary('Current', 2 * HOUR, [
    {id: 'a', name: 'Alpha', color: '#111111', milliseconds: 2 * HOUR,
      percentage: 100, eventCount: 1, days: []}
  ]);
  const previous = analyticsSummary('Previous', 0, [
    {id: 'a', name: 'Alpha', color: '#111111', milliseconds: 0,
      percentage: 0, eventCount: 0, days: []}
  ]);
  const result = Analytics.compare(current, previous);
  assert.equal(result.totalChange.kind, 'new');
  assert.equal(result.totalChange.percent, null);
  assert.equal(result.projects[0].change.kind, 'new');
});

test('insights keep an empty comparison compact', () => {
  const current = analyticsSummary('Current', 0, [
    {id: 'a', name: 'Alpha', color: '#111111', milliseconds: 0,
      percentage: 0, eventCount: 0, days: []}
  ]);
  const previous = analyticsSummary('Previous', 0, [
    {id: 'a', name: 'Alpha', color: '#111111', milliseconds: 0,
      percentage: 0, eventCount: 0, days: []}
  ]);
  const result = Analytics.compare(current, previous);
  assert.equal(result.projects.length, 0);
  assert.equal(result.busiestDay, null);
  assert.equal(result.averageEventMilliseconds, 0);
});

let failures = 0;
for (const {name, fn} of tests) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${name}`);
    console.error(error.stack || error);
  }
}
console.log(`\n${tests.length - failures}/${tests.length} tests passed`);
if (failures) process.exitCode = 1;
