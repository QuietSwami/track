/** User-scoped preferences and lightweight sidebar navigation state. */
var TrackSettings = (function() {
  'use strict';

  // Preserve the original keys so existing installations keep their settings after the rename.
  var SETTINGS_KEY = 'projectTime.settings.v1';
  var VIEW_KEY = 'projectTime.view.v1';
  var CACHE_KEYS_KEY = 'projectTime.cacheKeys.v1';

  var DEFAULTS = {
    initialized: false,
    selectedCalendarIds: [],
    firstDayOfWeek: 1,
    includeWeekends: true,
    countDeclined: false,
    countAllDay: false,
    countFree: false
  };

  function userProperties() {
    return PropertiesService.getUserProperties();
  }

  function getPreferences() {
    var stored = parseJson(userProperties().getProperty(SETTINGS_KEY), {});
    return normalizePreferences(stored);
  }

  function savePreferences(preferences) {
    var normalized = normalizePreferences(preferences);
    normalized.initialized = true;
    userProperties().setProperty(SETTINGS_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function normalizePreferences(value) {
    value = value || {};
    var ids = Array.isArray(value.selectedCalendarIds) ?
      value.selectedCalendarIds.map(String) : DEFAULTS.selectedCalendarIds.slice();
    ids = ids.filter(function(id, index) { return id && ids.indexOf(id) === index; });
    return {
      initialized: value.initialized === true,
      selectedCalendarIds: ids,
      firstDayOfWeek: TrackUtils.clampInteger(
          value.firstDayOfWeek, 0, 6, DEFAULTS.firstDayOfWeek),
      includeWeekends: value.includeWeekends == null ?
        DEFAULTS.includeWeekends : value.includeWeekends === true,
      countDeclined: value.countDeclined === true,
      countAllDay: value.countAllDay === true,
      countFree: value.countFree === true
    };
  }

  function getView(timeZone) {
    var stored = parseJson(userProperties().getProperty(VIEW_KEY), {});
    var periodType = stored.periodType === 'month' ? 'month' : 'week';
    var anchorDate = stored.anchorDate;
    try {
      TrackDateRanges.parseLocalDate(anchorDate);
    } catch (error) {
      anchorDate = TrackDateRanges.today(timeZone);
    }
    return {periodType: periodType, anchorDate: anchorDate};
  }

  function saveView(view) {
    var normalized = {
      periodType: view.periodType === 'month' ? 'month' : 'week',
      anchorDate: view.anchorDate
    };
    TrackDateRanges.parseLocalDate(normalized.anchorDate);
    userProperties().setProperty(VIEW_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function getTrackedCacheKeys() {
    return parseJson(userProperties().getProperty(CACHE_KEYS_KEY), []);
  }

  function trackCacheKey(key) {
    var keys = getTrackedCacheKeys().filter(function(existing) { return existing !== key; });
    keys.unshift(key);
    userProperties().setProperty(CACHE_KEYS_KEY, JSON.stringify(keys.slice(0, 20)));
  }

  function clearTrackedCacheKeys() {
    userProperties().deleteProperty(CACHE_KEYS_KEY);
  }

  function deleteUserData() {
    userProperties().deleteAllProperties();
  }

  function parseJson(text, fallback) {
    if (!text) return fallback;
    try { return JSON.parse(text); } catch (error) { return fallback; }
  }

  return {
    clearTrackedCacheKeys: clearTrackedCacheKeys,
    deleteUserData: deleteUserData,
    getPreferences: getPreferences,
    getTrackedCacheKeys: getTrackedCacheKeys,
    getView: getView,
    normalizePreferences: normalizePreferences,
    savePreferences: savePreferences,
    saveView: saveView,
    trackCacheKey: trackCacheKey
  };
})();
