/** Pure date-range calculations with IANA timezone support. */
var TrackDateRanges = (function() {
  'use strict';

  var MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function partsAt(utcMilliseconds, timeZone) {
    if (typeof Utilities !== 'undefined' && Utilities.formatDate) {
      var value = Utilities.formatDate(
          new Date(utcMilliseconds), timeZone, 'yyyy-MM-dd-HH-mm-ss');
      var pieces = value.split('-').map(Number);
      return {
        year: pieces[0], month: pieces[1], day: pieces[2],
        hour: pieces[3], minute: pieces[4], second: pieces[5]
      };
    }

    var formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23'
    });
    var result = {};
    formatter.formatToParts(new Date(utcMilliseconds)).forEach(function(part) {
      if (part.type !== 'literal') result[part.type] = Number(part.value);
    });
    return result;
  }

  // Solve local wall time -> UTC by refining the timezone offset. Period
  // boundaries are midnight, so they are not in the DST spring-forward gap.
  function localToUtcMilliseconds(local, timeZone) {
    var wallAsUtc = Date.UTC(
        local.year, local.month - 1, local.day,
        local.hour || 0, local.minute || 0, local.second || 0);
    var candidate = wallAsUtc;
    for (var i = 0; i < 4; i += 1) {
      var represented = partsAt(candidate, timeZone);
      var representedAsUtc = Date.UTC(
          represented.year, represented.month - 1, represented.day,
          represented.hour, represented.minute, represented.second);
      var adjustment = wallAsUtc - representedAsUtc;
      if (adjustment === 0) break;
      candidate += adjustment;
    }
    return candidate;
  }

  function parseLocalDate(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) throw new Error('Invalid local date: ' + value);
    return {year: Number(match[1]), month: Number(match[2]), day: Number(match[3])};
  }

  function formatLocalDate(local) {
    return local.year + '-' + pad2(local.month) + '-' + pad2(local.day);
  }

  function pad2(number) {
    return number < 10 ? '0' + number : String(number);
  }

  function addDays(local, days) {
    var date = new Date(Date.UTC(local.year, local.month - 1, local.day + days));
    return {year: date.getUTCFullYear(), month: date.getUTCMonth() + 1,
      day: date.getUTCDate()};
  }

  function addMonths(local, months) {
    var first = new Date(Date.UTC(local.year, local.month - 1 + months, 1));
    var targetYear = first.getUTCFullYear();
    var targetMonth = first.getUTCMonth() + 1;
    var lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    return {year: targetYear, month: targetMonth, day: Math.min(local.day, lastDay)};
  }

  function dayOfWeek(local) {
    return new Date(Date.UTC(local.year, local.month - 1, local.day)).getUTCDay();
  }

  function compareDates(a, b) {
    return Date.UTC(a.year, a.month - 1, a.day) -
        Date.UTC(b.year, b.month - 1, b.day);
  }

  function startOfWeek(local, firstDayOfWeek) {
    var delta = (dayOfWeek(local) - firstDayOfWeek + 7) % 7;
    return addDays(local, -delta);
  }

  function monthStart(local) {
    return {year: local.year, month: local.month, day: 1};
  }

  function buildIncludedIntervals(startLocal, endExclusiveLocal, includeWeekends, timeZone) {
    var intervals = [];
    var cursor = startLocal;
    while (compareDates(cursor, endExclusiveLocal) < 0) {
      var next = addDays(cursor, 1);
      var weekday = dayOfWeek(cursor);
      if (includeWeekends || (weekday !== 0 && weekday !== 6)) {
        var startMs = localToUtcMilliseconds(cursor, timeZone);
        var endMs = localToUtcMilliseconds(next, timeZone);
        var previous = intervals[intervals.length - 1];
        if (previous && previous.endMs === startMs) previous.endMs = endMs;
        else intervals.push({startMs: startMs, endMs: endMs});
      }
      cursor = next;
    }
    return intervals;
  }

  function getRange(periodType, anchorDate, preferences, timeZone) {
    var anchor = typeof anchorDate === 'string' ? parseLocalDate(anchorDate) : anchorDate;
    var startLocal;
    var endExclusiveLocal;
    if (periodType === 'month') {
      startLocal = monthStart(anchor);
      endExclusiveLocal = addMonths(startLocal, 1);
    } else {
      startLocal = startOfWeek(anchor, preferences.firstDayOfWeek);
      endExclusiveLocal = addDays(startLocal, 7);
    }
    var intervals = buildIncludedIntervals(
        startLocal, endExclusiveLocal, preferences.includeWeekends, timeZone);
    var displayStart = startLocal;
    var displayEnd = addDays(endExclusiveLocal, -1);
    if (!preferences.includeWeekends && intervals.length) {
      displayStart = localDateAt(intervals[0].startMs, timeZone);
      displayEnd = localDateAt(intervals[intervals.length - 1].endMs - 1, timeZone);
    }
    return {
      periodType: periodType === 'month' ? 'month' : 'week',
      anchorDate: formatLocalDate(anchor),
      startLocal: startLocal,
      endExclusiveLocal: endExclusiveLocal,
      startMs: localToUtcMilliseconds(startLocal, timeZone),
      endMs: localToUtcMilliseconds(endExclusiveLocal, timeZone),
      includedIntervals: intervals,
      displayStart: displayStart,
      displayEnd: displayEnd,
      displayLabel: formatDateSpan(displayStart, displayEnd) +
          (preferences.includeWeekends ? '' : ' · weekends excluded')
    };
  }

  function localDateAt(milliseconds, timeZone) {
    var parts = partsAt(milliseconds, timeZone);
    return {year: parts.year, month: parts.month, day: parts.day};
  }

  function today(timeZone, nowMilliseconds) {
    return formatLocalDate(localDateAt(
        nowMilliseconds == null ? Date.now() : nowMilliseconds, timeZone));
  }

  function navigate(periodType, anchorDate, direction) {
    var local = parseLocalDate(anchorDate);
    var moved = periodType === 'month' ? addMonths(local, direction) :
      addDays(local, 7 * direction);
    return formatLocalDate(moved);
  }

  function formatDateSpan(start, end) {
    if (start.year === end.year && start.month === end.month) {
      return start.day + '–' + end.day + ' ' + MONTHS[start.month - 1] +
          ' ' + start.year;
    }
    if (start.year === end.year) {
      return start.day + ' ' + MONTHS[start.month - 1] + ' – ' +
          end.day + ' ' + MONTHS[end.month - 1] + ' ' + end.year;
    }
    return start.day + ' ' + MONTHS[start.month - 1] + ' ' + start.year +
        ' – ' + end.day + ' ' + MONTHS[end.month - 1] + ' ' + end.year;
  }

  function formatDayLabel(value) {
    var local = typeof value === 'string' ? parseLocalDate(value) : value;
    var dayNames = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday'
    ];
    return dayNames[dayOfWeek(local)] + ', ' + local.day + ' ' +
        MONTHS[local.month - 1];
  }

  return {
    addDays: addDays,
    addMonths: addMonths,
    buildIncludedIntervals: buildIncludedIntervals,
    formatDayLabel: formatDayLabel,
    formatLocalDate: formatLocalDate,
    getRange: getRange,
    localDateAt: localDateAt,
    localToUtcMilliseconds: localToUtcMilliseconds,
    navigate: navigate,
    parseLocalDate: parseLocalDate,
    partsAt: partsAt,
    startOfWeek: startOfWeek,
    today: today
  };
})();
