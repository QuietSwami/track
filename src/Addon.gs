/** Manifest entry point and Card Service action callbacks. */

function buildCalendarHomepage(e) {
  try {
    var preferences = TrackSettings.getPreferences();
    var calendars = TrackCalendarAccess.listAccessibleCalendars();
    if (!preferences.initialized) {
      return TrackCards.buildSettingsCard(preferences, calendars);
    }
    var timeZone = TrackCalendarAccess.getReportingTimeZone(calendars);
    var view = TrackSettings.getView(timeZone);
    return TrackCards.buildMainCard(preferences, view, false, {
      calendars: calendars, timeZone: timeZone
    });
  } catch (error) {
    return TrackCards.buildErrorCard(error);
  }
}

function onOpenSettings(e) {
  try {
    var card = TrackCards.buildSettingsCard(
        TrackSettings.getPreferences(),
        TrackCalendarAccess.listAccessibleCalendars());
    return navigationResponse(CardService.newNavigation().pushCard(card));
  } catch (error) {
    return navigationResponse(CardService.newNavigation().pushCard(
        TrackCards.buildErrorCard(error)));
  }
}

function onOpenInsights(e) {
  return renderInsights(e, false, true);
}

function onRefreshInsights(e) {
  return renderInsights(e, true, false);
}

function onBackFromInsights(e) {
  return navigationResponse(CardService.newNavigation().popCard());
}

function renderInsights(e, bypassCache, pushCard) {
  try {
    var preferences = TrackSettings.getPreferences();
    var calendars = TrackCalendarAccess.listAccessibleCalendars();
    var timeZone = TrackCalendarAccess.getReportingTimeZone(calendars);
    var view = TrackSettings.getView(timeZone);
    var insights = TrackCalendarAccess.getAnalytics(
        preferences, view, bypassCache, {
          calendars: calendars,
          timeZone: timeZone
        });
    var card = TrackCards.buildInsightsCard(insights);
    var navigation = CardService.newNavigation();
    if (pushCard) navigation.pushCard(card);
    else navigation.updateCard(card);
    return navigationResponse(navigation);
  } catch (error) {
    var errorCard = TrackCards.buildErrorCard(error);
    var errorNavigation = CardService.newNavigation();
    if (pushCard) errorNavigation.pushCard(errorCard);
    else errorNavigation.updateCard(errorCard);
    return navigationResponse(errorNavigation);
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
    var calendarId = TrackUtils.actionParameter(e, 'calendarId', '');
    var preferences = TrackSettings.getPreferences();
    if (preferences.selectedCalendarIds.indexOf(calendarId) === -1) {
      throw new Error('That calendar is not selected as a project.');
    }
    var calendars = TrackCalendarAccess.listAccessibleCalendars();
    var timeZone = TrackCalendarAccess.getReportingTimeZone(calendars);
    var view = TrackSettings.getView(timeZone);
    var summary = TrackCalendarAccess.getSummary(
        preferences, view, bypassCache, {calendars: calendars, timeZone: timeZone});
    var project = findProject(summary.projects, calendarId);
    if (!project) {
      throw new Error('This project calendar is no longer accessible.');
    }
    var card = TrackCards.buildProjectDetailsCard(summary, project);
    var navigation = CardService.newNavigation();
    if (pushCard) navigation.pushCard(card);
    else navigation.updateCard(card);
    return navigationResponse(navigation);
  } catch (error) {
    var errorCard = TrackCards.buildErrorCard(error);
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
    TrackSettings.savePreferences(preferences);
    TrackCalendarAccess.clearCachedSummaries();
    var calendars = TrackCalendarAccess.listAccessibleCalendars();
    var timeZone = TrackCalendarAccess.getReportingTimeZone(calendars);
    var view = TrackSettings.getView(timeZone);
    var card = TrackCards.buildMainCard(preferences, view, true, {
      calendars: calendars, timeZone: timeZone
    });
    return navigationResponse(CardService.newNavigation().popToRoot().updateCard(card));
  } catch (error) {
    return navigationResponse(CardService.newNavigation().updateCard(
        TrackCards.buildErrorCard(error)));
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
      TrackCards.buildDeleteDataCard()));
}

function onCancelDeleteData(e) {
  return navigationResponse(CardService.newNavigation().popCard());
}

function onDeleteUserData(e) {
  try {
    TrackCalendarAccess.clearCachedSummaries();
    TrackSettings.deleteUserData();
    var card = TrackCards.buildSettingsCard(
        TrackSettings.getPreferences(),
        TrackCalendarAccess.listAccessibleCalendars());
    return navigationResponse(CardService.newNavigation().popToRoot().updateCard(card));
  } catch (error) {
    return navigationResponse(CardService.newNavigation().updateCard(
        TrackCards.buildErrorCard(error)));
  }
}

function rebuildSettingsWithSelection(e, mode) {
  try {
    var calendars = TrackCalendarAccess.listAccessibleCalendars();
    var preferences = preferencesFromForm(e);
    preferences.selectedCalendarIds = mode === 'all' ? calendars.map(function(calendar) {
      return calendar.id;
    }) : [];
    return navigationResponse(CardService.newNavigation().updateCard(
        TrackCards.buildSettingsCard(preferences, calendars)));
  } catch (error) {
    return navigationResponse(CardService.newNavigation().updateCard(
        TrackCards.buildErrorCard(error)));
  }
}

function onBackToSummary(e) {
  try {
    var preferences = TrackSettings.getPreferences();
    var calendars = TrackCalendarAccess.listAccessibleCalendars();
    var timeZone = TrackCalendarAccess.getReportingTimeZone(calendars);
    var view = TrackSettings.getView(timeZone);
    return navigationResponse(CardService.newNavigation().popToRoot().updateCard(
        TrackCards.buildMainCard(preferences, view, false, {
          calendars: calendars, timeZone: timeZone
        })));
  } catch (error) {
    return navigationResponse(CardService.newNavigation().updateCard(
        TrackCards.buildErrorCard(error)));
  }
}

function onPeriodChanged(e) {
  return updateViewAndRender(function(view) {
    view.periodType = TrackUtils.firstFormValue(e, 'periodType', 'week') ===
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
    view.anchorDate = TrackDateRanges.navigate(
        view.periodType, view.anchorDate, direction);
    return view;
  }, false);
}

function onToday(e) {
  return updateViewAndRender(function(view, timeZone) {
    view.anchorDate = TrackDateRanges.today(timeZone);
    return view;
  }, false);
}

function onRefresh(e) {
  return updateViewAndRender(function(view) { return view; }, true);
}

function updateViewAndRender(mutator, bypassCache) {
  try {
    var preferences = TrackSettings.getPreferences();
    var calendars = TrackCalendarAccess.listAccessibleCalendars();
    var timeZone = TrackCalendarAccess.getReportingTimeZone(calendars);
    var view = TrackSettings.getView(timeZone);
    view = mutator(view, timeZone);
    TrackSettings.saveView(view);
    var card = TrackCards.buildMainCard(preferences, view, bypassCache, {
      calendars: calendars, timeZone: timeZone
    });
    return navigationResponse(CardService.newNavigation().updateCard(card));
  } catch (error) {
    return navigationResponse(CardService.newNavigation().updateCard(
        TrackCards.buildErrorCard(error)));
  }
}

function preferencesFromForm(e) {
  var rules = TrackUtils.formValues(e, 'rules');
  return TrackSettings.normalizePreferences({
    initialized: true,
    selectedCalendarIds: TrackUtils.formValues(e, 'calendarIds'),
    firstDayOfWeek: TrackUtils.firstFormValue(e, 'firstDayOfWeek', '1'),
    includeWeekends: rules.indexOf('includeWeekends') !== -1,
    countDeclined: rules.indexOf('countDeclined') !== -1,
    countAllDay: rules.indexOf('countAllDay') !== -1,
    countFree: rules.indexOf('countFree') !== -1
  });
}

function navigationResponse(navigation) {
  return CardService.newActionResponseBuilder().setNavigation(navigation).build();
}
