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

function onOpenProjectDetails(e) {
  return renderProjectDetails(e, false, true);
}

function onRefreshProjectDetails(e) {
  return renderProjectDetails(e, true, false);
}

function renderProjectDetails(e, bypassCache, pushCard) {
  try {
    var calendarId = ProjectTimeUtils.actionParameter(e, 'calendarId', '');
    var preferences = ProjectTimeSettings.getPreferences();
    if (preferences.selectedCalendarIds.indexOf(calendarId) === -1) {
      throw new Error('That calendar is not selected as a project.');
    }
    var calendars = ProjectTimeCalendarAccess.listAccessibleCalendars();
    var timeZone = ProjectTimeCalendarAccess.getReportingTimeZone(calendars);
    var view = ProjectTimeSettings.getView(timeZone);
    var summary = ProjectTimeCalendarAccess.getSummary(
        preferences, view, bypassCache, {calendars: calendars, timeZone: timeZone});
    var project = findProject(summary.projects, calendarId);
    if (!project) {
      throw new Error('This project calendar is no longer accessible.');
    }
    var card = ProjectTimeCards.buildProjectDetailsCard(summary, project);
    var navigation = CardService.newNavigation();
    if (pushCard) navigation.pushCard(card);
    else navigation.updateCard(card);
    return navigationResponse(navigation);
  } catch (error) {
    var errorCard = ProjectTimeCards.buildErrorCard(error);
    var errorNavigation = CardService.newNavigation();
    if (pushCard) errorNavigation.pushCard(errorCard);
    else errorNavigation.updateCard(errorCard);
    return navigationResponse(errorNavigation);
  }
}

function onBackFromProjectDetails(e) {
  return navigationResponse(CardService.newNavigation().popCard());
}

function findProject(projects, calendarId) {
  for (var i = 0; i < projects.length; i += 1) {
    if (projects[i].id === calendarId) return projects[i];
  }
  return null;
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

function onOpenDeleteData(e) {
  return navigationResponse(CardService.newNavigation().pushCard(
      ProjectTimeCards.buildDeleteDataCard()));
}

function onCancelDeleteData(e) {
  return navigationResponse(CardService.newNavigation().popCard());
}

function onDeleteUserData(e) {
  try {
    ProjectTimeCalendarAccess.clearCachedSummaries();
    ProjectTimeSettings.deleteUserData();
    var card = ProjectTimeCards.buildSettingsCard(
        ProjectTimeSettings.getPreferences(),
        ProjectTimeCalendarAccess.listAccessibleCalendars());
    return navigationResponse(CardService.newNavigation().popToRoot().updateCard(card));
  } catch (error) {
    return navigationResponse(CardService.newNavigation().updateCard(
        ProjectTimeCards.buildErrorCard(error)));
  }
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
