/** Manifest entry point and Card Service action callbacks. */

function buildCalendarHomepage(e) {
  try {
    var preferences = ProjectTimeSettings.getPreferences();
    var calendars = ProjectTimeCalendarAccess.listAccessibleCalendars();
    if (!preferences.initialized) {
      return ProjectTimeCards.buildSettingsCard(preferences, calendars);
    }
    var timeZone = ProjectTimeCalendarAccess.getReportingTimeZone(calendars);
    var view = ProjectTimeSettings.getView(timeZone);
    return ProjectTimeCards.buildMainCard(preferences, view, false, {
      calendars: calendars, timeZone: timeZone
    });
  } catch (error) {
    return ProjectTimeCards.buildErrorCard(error);
  }
}

function onOpenSettings(e) {
  try {
    var card = ProjectTimeCards.buildSettingsCard(
        ProjectTimeSettings.getPreferences(),
        ProjectTimeCalendarAccess.listAccessibleCalendars());
    return navigationResponse(CardService.newNavigation().pushCard(card));
  } catch (error) {
    return navigationResponse(CardService.newNavigation().pushCard(
        ProjectTimeCards.buildErrorCard(error)));
  }
}

function onSaveSettings(e) {
  try {
    var preferences = preferencesFromForm(e);
    ProjectTimeSettings.savePreferences(preferences);
    ProjectTimeCalendarAccess.clearCachedSummaries();
    var calendars = ProjectTimeCalendarAccess.listAccessibleCalendars();
    var timeZone = ProjectTimeCalendarAccess.getReportingTimeZone(calendars);
    var view = ProjectTimeSettings.getView(timeZone);
    var card = ProjectTimeCards.buildMainCard(preferences, view, true, {
      calendars: calendars, timeZone: timeZone
    });
    return navigationResponse(CardService.newNavigation().popToRoot().updateCard(card));
  } catch (error) {
    return navigationResponse(CardService.newNavigation().updateCard(
        ProjectTimeCards.buildErrorCard(error)));
  }
}

function onSelectAllCalendars(e) {
  return rebuildSettingsWithSelection(e, 'all');
}

function onClearAllCalendars(e) {
  return rebuildSettingsWithSelection(e, 'none');
}

function rebuildSettingsWithSelection(e, mode) {
  try {
    var calendars = ProjectTimeCalendarAccess.listAccessibleCalendars();
    var preferences = preferencesFromForm(e);
    preferences.selectedCalendarIds = mode === 'all' ? calendars.map(function(calendar) {
      return calendar.id;
    }) : [];
    return navigationResponse(CardService.newNavigation().updateCard(
        ProjectTimeCards.buildSettingsCard(preferences, calendars)));
  } catch (error) {
    return navigationResponse(CardService.newNavigation().updateCard(
        ProjectTimeCards.buildErrorCard(error)));
  }
}

function onBackToSummary(e) {
  try {
    var preferences = ProjectTimeSettings.getPreferences();
    var calendars = ProjectTimeCalendarAccess.listAccessibleCalendars();
    var timeZone = ProjectTimeCalendarAccess.getReportingTimeZone(calendars);
    var view = ProjectTimeSettings.getView(timeZone);
    return navigationResponse(CardService.newNavigation().popToRoot().updateCard(
        ProjectTimeCards.buildMainCard(preferences, view, false, {
          calendars: calendars, timeZone: timeZone
        })));
  } catch (error) {
    return navigationResponse(CardService.newNavigation().updateCard(
        ProjectTimeCards.buildErrorCard(error)));
  }
}

function onPeriodChanged(e) {
  return updateViewAndRender(function(view) {
    view.periodType = ProjectTimeUtils.firstFormValue(e, 'periodType', 'week') ===
        'month' ? 'month' : 'week';
    return view;
  }, false);
}

function onPreviousPeriod(e) {
  return navigatePeriod(-1);
}

function onNextPeriod(e) {
  return navigatePeriod(1);
}

function navigatePeriod(direction) {
  return updateViewAndRender(function(view) {
    view.anchorDate = ProjectTimeDateRanges.navigate(
        view.periodType, view.anchorDate, direction);
    return view;
  }, false);
}

function onToday(e) {
  return updateViewAndRender(function(view, timeZone) {
    view.anchorDate = ProjectTimeDateRanges.today(timeZone);
    return view;
  }, false);
}

function onRefresh(e) {
  return updateViewAndRender(function(view) { return view; }, true);
}

function updateViewAndRender(mutator, bypassCache) {
  try {
    var preferences = ProjectTimeSettings.getPreferences();
    var calendars = ProjectTimeCalendarAccess.listAccessibleCalendars();
    var timeZone = ProjectTimeCalendarAccess.getReportingTimeZone(calendars);
    var view = ProjectTimeSettings.getView(timeZone);
    view = mutator(view, timeZone);
    ProjectTimeSettings.saveView(view);
    var card = ProjectTimeCards.buildMainCard(preferences, view, bypassCache, {
      calendars: calendars, timeZone: timeZone
    });
    return navigationResponse(CardService.newNavigation().updateCard(card));
  } catch (error) {
    return navigationResponse(CardService.newNavigation().updateCard(
        ProjectTimeCards.buildErrorCard(error)));
  }
}

function preferencesFromForm(e) {
  var rules = ProjectTimeUtils.formValues(e, 'rules');
  return ProjectTimeSettings.normalizePreferences({
    initialized: true,
    selectedCalendarIds: ProjectTimeUtils.formValues(e, 'calendarIds'),
    firstDayOfWeek: ProjectTimeUtils.firstFormValue(e, 'firstDayOfWeek', '1'),
    includeWeekends: rules.indexOf('includeWeekends') !== -1,
    countDeclined: rules.indexOf('countDeclined') !== -1,
    countAllDay: rules.indexOf('countAllDay') !== -1,
    countFree: rules.indexOf('countFree') !== -1
  });
}

function navigationResponse(navigation) {
  return CardService.newActionResponseBuilder().setNavigation(navigation).build();
}
