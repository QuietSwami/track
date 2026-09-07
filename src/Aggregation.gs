/** Pure filtering, clipping, aggregation, and overlap detection. */
var ProjectTimeAggregation = (function() {
  'use strict';

  function aggregateProjects(projects, includedIntervals, options, timeZone) {
    var totals = [];
    var countedSegments = [];
    var totalMilliseconds = 0;

    (projects || []).forEach(function(project) {
      var projectMilliseconds = 0;
      var eventCount = 0;
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
          countedSegments.push({
            startMs: clipped.startMs,
            endMs: clipped.endMs,
            eventKey: eventKey
          });
        });
        if (eventMilliseconds > 0) {
          projectMilliseconds += eventMilliseconds;
          eventCount += 1;
        }
      });
      totalMilliseconds += projectMilliseconds;
      totals.push({
        id: project.id,
        name: project.name,
        color: project.color,
        milliseconds: projectMilliseconds,
        eventCount: eventCount
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
    return ProjectTimeDateRanges.localToUtcMilliseconds(
        ProjectTimeDateRanges.parseLocalDate(value), timeZone);
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
    aggregateProjects: aggregateProjects,
    clipInterval: clipInterval,
    detectOverlaps: detectOverlaps,
    isDeclined: isDeclined,
    normalizeEvent: normalizeEvent
  };
})();
