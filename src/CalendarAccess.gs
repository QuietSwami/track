/** Calendar API access and short-lived summary caching. */
var TrackCalendarAccess = (function() {
  'use strict';

  var CACHE_SECONDS = 180;
  var CACHE_VERSION = 3;

  function listAccessibleCalendars() {
    ensureAdvancedService();
    var calendars = [];
    var pageToken;
    do {
      var response = Calendar.CalendarList.list({
        maxResults: 250,
        minAccessRole: 'freeBusyReader',
        pageToken: pageToken,
        showDeleted: false,
        showHidden: true,
        fields: 'nextPageToken,items(id,summary,backgroundColor,accessRole,primary,deleted,timeZone)'
      });
      (response.items || []).forEach(function(item) {
        if (!item.deleted && item.accessRole !== 'none') {
          calendars.push({
            id: item.id,
            name: item.summary || item.id,
            color: TrackUtils.safeColor(item.backgroundColor),
            accessRole: item.accessRole,
            primary: item.primary === true,
            timeZone: item.timeZone || null
          });
        }
      });
      pageToken = response.nextPageToken;
    } while (pageToken);
    calendars.sort(function(a, b) { return a.name.localeCompare(b.name); });
    return calendars;
  }

  function getReportingTimeZone(calendars) {
    for (var i = 0; i < calendars.length; i += 1) {
      if (calendars[i].primary && calendars[i].timeZone) return calendars[i].timeZone;
    }
    return Session.getScriptTimeZone();
  }

  function fetchCalendarEvents(calendarId, range, timeZone) {
    var events = [];
    var pageToken;
    do {
      var response = Calendar.Events.list(calendarId, {
        timeMin: new Date(range.startMs).toISOString(),
        timeMax: new Date(range.endMs).toISOString(),
        timeZone: timeZone,
        singleEvents: true,
        showDeleted: false,
        orderBy: 'startTime',
        maxResults: 2500,
        pageToken: pageToken,
        fields: 'nextPageToken,items(id,summary,status,start,end,transparency,attendees(self,responseStatus),recurringEventId,originalStartTime)'
      });
      Array.prototype.push.apply(events, response.items || []);
      pageToken = response.nextPageToken;
    } while (pageToken);
    return events;
  }

  function getSummary(preferences, view, bypassCache, calendarContext) {
    var calendars = calendarContext && calendarContext.calendars ||
        listAccessibleCalendars();
    var timeZone = calendarContext && calendarContext.timeZone ||
        getReportingTimeZone(calendars);
    var range = TrackDateRanges.getRange(
        view.periodType, view.anchorDate, preferences, timeZone);
    var byId = {};
    calendars.forEach(function(calendar) { byId[calendar.id] = calendar; });

    var selected = [];
    var inaccessibleIds = [];
    preferences.selectedCalendarIds.forEach(function(id) {
      if (byId[id]) selected.push(byId[id]);
      else inaccessibleIds.push(id);
    });

    var cacheKey = createCacheKey(preferences, range, selected, timeZone);
    var cache = CacheService.getUserCache();
    if (!bypassCache) {
      var cached = cache.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    var projects = [];
    var failedCalendars = [];
    selected.forEach(function(calendar) {
      try {
        var events = fetchCalendarEvents(calendar.id, range, timeZone);
        console.log('Track! fetched calendar %s for %s..%s: %s events',
            calendar.id, new Date(range.startMs).toISOString(),
            new Date(range.endMs).toISOString(), events.length);
        projects.push({
          id: calendar.id,
          name: calendar.name,
          color: calendar.color,
          events: events
        });
      } catch (error) {
        console.error('Track! could not read calendar %s: %s',
            calendar.id, String(error));
        failedCalendars.push(calendar.name);
      }
    });

    var aggregate = TrackAggregation.aggregateProjects(
        projects, range.includedIntervals, preferences, timeZone);
    var result = {
      range: range,
      timeZone: timeZone,
      projects: aggregate.projects,
      totalMilliseconds: aggregate.totalMilliseconds,
      hasOverlaps: aggregate.hasOverlaps,
      selectedCount: preferences.selectedCalendarIds.length,
      inaccessibleCount: inaccessibleIds.length,
      failedCalendars: failedCalendars
    };
    cache.put(cacheKey, JSON.stringify(result), CACHE_SECONDS);
    TrackSettings.trackCacheKey(cacheKey);
    return result;
  }

  function getAnalytics(preferences, view, bypassCache, calendarContext) {
    var current = getSummary(preferences, view, bypassCache, calendarContext);
    var previousView = {
      periodType: view.periodType,
      anchorDate: TrackDateRanges.navigate(
          view.periodType, view.anchorDate, -1)
    };
    var previous = getSummary(
        preferences, previousView, bypassCache, calendarContext);
    return TrackAnalytics.compare(current, previous);
  }

  function createCacheKey(preferences, range, calendars, timeZone) {
    var material = JSON.stringify({
      version: CACHE_VERSION,
      selected: calendars.map(function(calendar) {
        return [calendar.id, calendar.name, calendar.color];
      }),
      preferences: preferences,
      startMs: range.startMs,
      endMs: range.endMs,
      intervals: range.includedIntervals,
      timeZone: timeZone
    });
    return 'pt.summary.' + TrackUtils.stableHash(material);
  }

  function clearCachedSummaries() {
    var keys = TrackSettings.getTrackedCacheKeys();
    if (keys.length) CacheService.getUserCache().removeAll(keys);
    TrackSettings.clearTrackedCacheKeys();
  }

  function ensureAdvancedService() {
    if (typeof Calendar === 'undefined' || !Calendar.CalendarList || !Calendar.Events) {
      throw new Error(
          'The advanced Calendar service is unavailable. Enable Calendar API v3 in Apps Script and Google Cloud.');
    }
  }

  return {
    clearCachedSummaries: clearCachedSummaries,
    fetchCalendarEvents: fetchCalendarEvents,
    getAnalytics: getAnalytics,
    getReportingTimeZone: getReportingTimeZone,
    getSummary: getSummary,
    listAccessibleCalendars: listAccessibleCalendars
  };
})();
