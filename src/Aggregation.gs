/** Pure filtering, clipping, aggregation, and overlap detection. */
var TrackAggregation = (function() {
  'use strict';

  function aggregateProjects(projects, includedIntervals, options, timeZone) {
    var totals = [];
    var countedSegments = [];
    var totalMilliseconds = 0;

    (projects || []).forEach(function(project) {
      var projectMilliseconds = 0;
      var eventCount = 0;
      var projectSegments = [];
      var daily = {};
      var longestActivity = null;
      var shortestActivity = null;
      (project.events || []).forEach(function(event, index) {
        var normalized = normalizeEvent(event, options, timeZone);
        if (!normalized) return;
        var eventMilliseconds = 0;
        var eventKey = project.id + ':' + (event.id || index) + ':' +
            normalized.startMs + ':' + normalized.endMs;
        includedIntervals.forEach(function(interval) {
          var clipped = clipInterval(normalized, interval);
          if (!clipped) return;
          eventMilliseconds += clipped.endMs - clipped.startMs;
          var counted = {
            startMs: clipped.startMs,
            endMs: clipped.endMs,
            eventKey: eventKey
          };
          countedSegments.push(counted);
          projectSegments.push(counted);
          addSegmentToDays(daily, counted, timeZone);
        });
        if (eventMilliseconds > 0) {
          projectMilliseconds += eventMilliseconds;
          eventCount += 1;
          var activity = {
            name: activityName(event),
            milliseconds: eventMilliseconds,
            startMs: normalized.startMs
          };
          if (isBetterExtreme(activity, longestActivity, true)) {
            longestActivity = activity;
          }
          if (isBetterExtreme(activity, shortestActivity, false)) {
            shortestActivity = activity;
          }
        }
      });
      totalMilliseconds += projectMilliseconds;
      totals.push({
        id: project.id,
        name: project.name,
        color: project.color,
        milliseconds: projectMilliseconds,
        eventCount: eventCount,
        hasOverlaps: detectOverlaps(projectSegments),
        days: finalizeDays(daily, projectMilliseconds),
        longestActivity: publicActivity(longestActivity),
        shortestActivity: publicActivity(shortestActivity)
      });
    });

    totals.sort(function(a, b) {
      return b.milliseconds - a.milliseconds ||
          String(a.name).localeCompare(String(b.name));
    });
    totals.forEach(function(project) {
      project.percentage = totalMilliseconds > 0 ?
        Math.round(project.milliseconds * 100 / totalMilliseconds) : 0;
    });

    return {
      projects: totals,
      totalMilliseconds: totalMilliseconds,
      hasOverlaps: detectOverlaps(countedSegments)
    };
  }

  function activityName(event) {
    var name = String(event && event.summary || '').trim();
    return name || 'Untitled event';
  }

  function isBetterExtreme(candidate, current, longest) {
    if (!current) return true;
    if (candidate.milliseconds !== current.milliseconds) {
      return longest ? candidate.milliseconds > current.milliseconds :
        candidate.milliseconds < current.milliseconds;
    }
    if (candidate.startMs !== current.startMs) return candidate.startMs < current.startMs;
    return candidate.name.localeCompare(current.name) < 0;
  }

  function publicActivity(activity) {
    return activity ? {
      name: activity.name,
      milliseconds: activity.milliseconds
    } : null;
  }

  function addSegmentToDays(daily, segment, timeZone) {
    var cursor = segment.startMs;
    while (cursor < segment.endMs) {
      var local = TrackDateRanges.localDateAt(cursor, timeZone);
      var date = TrackDateRanges.formatLocalDate(local);
      var nextMidnight = TrackDateRanges.localToUtcMilliseconds(
          TrackDateRanges.addDays(local, 1), timeZone);
      var endMs = Math.min(segment.endMs, nextMidnight);
      var item = daily[date];
      if (!item) {
        item = daily[date] = {
          date: date,
          milliseconds: 0,
          eventKeys: {}
        };
      }
      item.milliseconds += endMs - cursor;
      item.eventKeys[segment.eventKey] = true;
      cursor = endMs;
    }
  }

  function finalizeDays(daily, projectMilliseconds) {
    return Object.keys(daily).sort().map(function(date) {
      var item = daily[date];
      return {
        date: date,
        milliseconds: item.milliseconds,
        eventCount: Object.keys(item.eventKeys).length,
        percentage: projectMilliseconds > 0 ?
          Math.round(item.milliseconds * 100 / projectMilliseconds) : 0
      };
    });
  }

  function normalizeEvent(event, options, timeZone) {
    if (!event || event.status === 'cancelled') return null;
    if (!options.countDeclined && isDeclined(event)) return null;
    var allDay = Boolean(event.start && event.start.date);
    if (allDay && !options.countAllDay) return null;
    if (!options.countFree && event.transparency === 'transparent') return null;

    var startMs;
    var endMs;
    if (allDay) {
      startMs = parseAllDayDate(event.start.date, timeZone);
      endMs = parseAllDayDate(event.end && event.end.date, timeZone);
    } else {
      startMs = Date.parse(event.start && event.start.dateTime);
      endMs = Date.parse(event.end && event.end.dateTime);
    }
    if (!isFinite(startMs) || !isFinite(endMs) || endMs <= startMs) return null;
    return {startMs: startMs, endMs: endMs};
  }

  function parseAllDayDate(value, timeZone) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN;
    return TrackDateRanges.localToUtcMilliseconds(
        TrackDateRanges.parseLocalDate(value), timeZone);
  }

  function isDeclined(event) {
    return (event.attendees || []).some(function(attendee) {
      return attendee.self === true && attendee.responseStatus === 'declined';
    });
  }

  function clipInterval(eventInterval, allowedInterval) {
    var startMs = Math.max(eventInterval.startMs, allowedInterval.startMs);
    var endMs = Math.min(eventInterval.endMs, allowedInterval.endMs);
    return endMs > startMs ? {startMs: startMs, endMs: endMs} : null;
  }

  // Deliberately separate from summation: totals count each event independently.
  function detectOverlaps(segments) {
    var sorted = (segments || []).slice().sort(function(a, b) {
      return a.startMs - b.startMs || a.endMs - b.endMs;
    });
    var active = [];
    for (var i = 0; i < sorted.length; i += 1) {
      var current = sorted[i];
      active = active.filter(function(candidate) {
        return candidate.endMs > current.startMs;
      });
      for (var j = 0; j < active.length; j += 1) {
        if (active[j].eventKey !== current.eventKey) return true;
      }
      active.push(current);
    }
    return false;
  }

  return {
    addSegmentToDays: addSegmentToDays,
    aggregateProjects: aggregateProjects,
    activityName: activityName,
    clipInterval: clipInterval,
    detectOverlaps: detectOverlaps,
    isDeclined: isDeclined,
    normalizeEvent: normalizeEvent
  };
})();
