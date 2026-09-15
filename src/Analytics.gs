/** Pure current-versus-previous-period analytics for a quick sidebar scan. */
var TrackAnalytics = (function() {
  'use strict';

  function compare(current, previous) {
    var previousById = {};
    (previous.projects || []).forEach(function(project) {
      previousById['id:' + project.id] = project;
    });

    var projects = (current.projects || []).map(function(project) {
      var prior = previousById['id:' + project.id] || emptyProject(project);
      return {
        id: project.id,
        name: project.name,
        color: project.color,
        currentMilliseconds: project.milliseconds,
        previousMilliseconds: prior.milliseconds,
        deltaMilliseconds: project.milliseconds - prior.milliseconds,
        change: compareValues(project.milliseconds, prior.milliseconds),
        percentage: project.percentage,
        eventCount: project.eventCount,
        previousEventCount: prior.eventCount
      };
    }).filter(function(project) {
      return project.currentMilliseconds > 0 || project.previousMilliseconds > 0;
    });

    projects.sort(function(a, b) {
      return b.currentMilliseconds - a.currentMilliseconds ||
          b.previousMilliseconds - a.previousMilliseconds ||
          String(a.name).localeCompare(String(b.name));
    });

    var eventCount = sum(projects.map(function(project) {
      return project.eventCount;
    }));
    var previousEventCount = sum(projects.map(function(project) {
      return project.previousEventCount;
    }));

    return {
      periodType: current.range.periodType,
      unitLabel: current.range.periodType === 'month' ? 'month' : 'week',
      currentRange: current.range,
      previousRange: previous.range,
      currentTotalMilliseconds: current.totalMilliseconds,
      previousTotalMilliseconds: previous.totalMilliseconds,
      totalChange: compareValues(
          current.totalMilliseconds, previous.totalMilliseconds),
      projects: projects,
      topProject: projects.length && projects[0].currentMilliseconds > 0 ?
        projects[0] : null,
      biggestIncrease: findExtreme(projects, true),
      biggestDecrease: findExtreme(projects, false),
      busiestDay: findBusiestDay(current.projects || []),
      eventCount: eventCount,
      previousEventCount: previousEventCount,
      averageEventMilliseconds: eventCount ?
        current.totalMilliseconds / eventCount : 0,
      activeProjectCount: projects.filter(function(project) {
        return project.currentMilliseconds > 0;
      }).length,
      selectedCount: current.selectedCount,
      hasOverlaps: current.hasOverlaps,
      inaccessibleCount: current.inaccessibleCount,
      failedCalendars: unique((current.failedCalendars || []).concat(
          previous.failedCalendars || [])),
      comparisonIncomplete: Boolean(
          current.inaccessibleCount || previous.inaccessibleCount ||
          (current.failedCalendars || []).length ||
          (previous.failedCalendars || []).length)
    };
  }

  function compareValues(current, previous) {
    var delta = current - previous;
    if (delta === 0) return {kind: 'same', deltaMilliseconds: 0, percent: 0};
    if (previous === 0) {
      return {kind: current > 0 ? 'new' : 'decrease',
        deltaMilliseconds: delta, percent: null};
    }
    return {
      kind: delta > 0 ? 'increase' : 'decrease',
      deltaMilliseconds: delta,
      percent: Math.round(delta * 100 / previous)
    };
  }

  function findExtreme(projects, increase) {
    var candidates = projects.filter(function(project) {
      return increase ? project.deltaMilliseconds > 0 : project.deltaMilliseconds < 0;
    });
    candidates.sort(function(a, b) {
      var difference = increase ?
        b.deltaMilliseconds - a.deltaMilliseconds :
        a.deltaMilliseconds - b.deltaMilliseconds;
      return difference || String(a.name).localeCompare(String(b.name));
    });
    return candidates[0] || null;
  }

  function findBusiestDay(projects) {
    var byDate = {};
    projects.forEach(function(project) {
      (project.days || []).forEach(function(day) {
        if (!byDate[day.date]) {
          byDate[day.date] = {date: day.date, milliseconds: 0, eventCount: 0};
        }
        byDate[day.date].milliseconds += day.milliseconds;
        byDate[day.date].eventCount += day.eventCount;
      });
    });
    var days = Object.keys(byDate).map(function(date) { return byDate[date]; });
    days.sort(function(a, b) {
      return b.milliseconds - a.milliseconds || a.date.localeCompare(b.date);
    });
    return days[0] || null;
  }

  function emptyProject(project) {
    return {id: project.id, milliseconds: 0, eventCount: 0};
  }

  function sum(values) {
    return values.reduce(function(total, value) { return total + value; }, 0);
  }

  function unique(values) {
    var seen = {};
    return values.filter(function(value) {
      var key = 'value:' + value;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  return {
    compare: compare,
    compareValues: compareValues,
    findBusiestDay: findBusiestDay
  };
})();
