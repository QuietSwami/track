/** Card Service construction for the summary, settings, and errors. */
var ProjectTimeCards = (function() {
  'use strict';

  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function buildMainCard(preferences, view, bypassCache, calendarContext) {
    var summary = ProjectTimeCalendarAccess.getSummary(
        preferences, view, bypassCache, calendarContext);
    var builder = baseBuilder('Scheduled project time');

    var period = CardService.newSelectionInput()
        .setFieldName('periodType')
        .setTitle('Period')
        .setType(CardService.SelectionInputType.DROPDOWN)
        .addItem('This week', 'week', view.periodType === 'week')
        .addItem('This month', 'month', view.periodType === 'month')
        .setOnChangeAction(action('onPeriodChanged'));

    var navigationButtons = CardService.newButtonSet()
        .addButton(textButton('Previous', 'onPreviousPeriod'))
        .addButton(textButton('Today', 'onToday'))
        .addButton(textButton('Next', 'onNextPeriod'));

    builder.addSection(CardService.newCardSection()
        .addWidget(period)
        .addWidget(navigationButtons)
        .addWidget(CardService.newTextParagraph().setText(
            '<b>' + (view.periodType === 'month' ? 'Month' : 'Week') +
            '</b> · ' + ProjectTimeUtils.escapeHtml(summary.range.displayLabel))));

    var totalSection = CardService.newCardSection()
        .setHeader('Total')
        .addWidget(CardService.newTextParagraph().setText(
            '<b>' +
            ProjectTimeUtils.escapeHtml(ProjectTimeUtils.formatDuration(
                summary.totalMilliseconds)) + '</b>'));

    if (!preferences.selectedCalendarIds.length) {
      totalSection.addWidget(CardService.newTextParagraph().setText(
          'No project calendars are selected. Open Settings to choose them.'));
    } else if (summary.totalMilliseconds === 0) {
      totalSection.addWidget(CardService.newTextParagraph().setText(
          'No qualifying events were found in this period.'));
    }
    if (summary.hasOverlaps) {
      totalSection.addWidget(CardService.newTextParagraph().setText(
          'Overlapping events are counted separately.'));
    }
    builder.addSection(totalSection);

    if (summary.projects.length) {
      var projectsSection = CardService.newCardSection().setHeader('Projects');
      summary.projects.forEach(function(project) {
        var metrics = ProjectTimeUtils.formatDuration(project.milliseconds) +
            ' · ' + project.percentage + '% · ' + project.eventCount + ' ' +
            (project.eventCount === 1 ? 'event' : 'events');
        projectsSection.addWidget(CardService.newDecoratedText()
            .setWrapText(true)
            .setOnClickAction(action('onOpenProjectDetails', {
              calendarId: project.id
            }))
            .setText(
                '<font color="' + ProjectTimeUtils.safeColor(project.color) + '">●</font> ' +
                '<b>' + ProjectTimeUtils.escapeHtml(project.name) + '</b>  ›<br>' +
                metrics));
      });
      builder.addSection(projectsSection);
    }

    if (summary.inaccessibleCount || summary.failedCalendars.length) {
      var messages = [];
      if (summary.inaccessibleCount) {
        messages.push(summary.inaccessibleCount + ' selected calendar(s) are no longer accessible.');
      }
      if (summary.failedCalendars.length) {
        messages.push('Could not read: ' + summary.failedCalendars.map(
            ProjectTimeUtils.escapeHtml).join(', ') + '.');
      }
      builder.addSection(CardService.newCardSection().setHeader('Attention')
          .addWidget(CardService.newTextParagraph().setText(messages.join('<br>'))));
    }

    builder.addSection(CardService.newCardSection().addWidget(
        CardService.newButtonSet()
            .addButton(textButton('Refresh', 'onRefresh'))
            .addButton(textButton('Settings', 'onOpenSettings'))));
    return builder.build();
  }

  function buildProjectDetailsCard(summary, project) {
    var builder = baseBuilder('Project details');
    var average = project.eventCount ?
      project.milliseconds / project.eventCount : 0;
    var busiest = findBusiestDay(project.days);

    builder.addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(
            '<font color="' + ProjectTimeUtils.safeColor(project.color) + '">●</font> ' +
            '<b>' + ProjectTimeUtils.escapeHtml(project.name) + '</b><br>' +
            ProjectTimeUtils.escapeHtml(summary.range.displayLabel))));

    var overview = CardService.newCardSection().setHeader('Overview')
        .addWidget(metric('Scheduled',
            ProjectTimeUtils.formatDuration(project.milliseconds)))
        .addWidget(metric('Share of all project time', project.percentage + '%'))
        .addWidget(metric('Counted events', String(project.eventCount)))
        .addWidget(metric('Active days', String(project.days.length)));
    if (project.eventCount) {
      overview.addWidget(metric('Average per event',
          ProjectTimeUtils.formatDuration(average)));
    }
    if (busiest) {
      overview.addWidget(metric('Busiest day',
          ProjectTimeDateRanges.formatDayLabel(busiest.date) + ' · ' +
          ProjectTimeUtils.formatDuration(busiest.milliseconds)));
    }
    if (project.hasOverlaps) {
      overview.addWidget(CardService.newTextParagraph().setText(
          'This project contains overlapping events. They are counted separately.'));
    }
    builder.addSection(overview);

    if (project.longestActivity && project.shortestActivity) {
      builder.addSection(CardService.newCardSection().setHeader('Activity extremes')
          .addWidget(activityMetric('Longest activity', project.longestActivity))
          .addWidget(activityMetric('Shortest activity', project.shortestActivity)));
    }

    var days = CardService.newCardSection().setHeader('Daily breakdown');
    if (!project.days.length) {
      days.addWidget(CardService.newTextParagraph().setText(
          'No qualifying events were found for this project in this period.'));
    } else {
      project.days.forEach(function(day) {
        var count = day.eventCount + ' ' +
            (day.eventCount === 1 ? 'event' : 'events');
        days.addWidget(CardService.newDecoratedText()
            .setTopLabel(ProjectTimeDateRanges.formatDayLabel(day.date))
            .setText('<b>' + ProjectTimeUtils.escapeHtml(
                ProjectTimeUtils.formatDuration(day.milliseconds)) + '</b> · ' +
                day.percentage + '% · ' + count));
      });
    }
    builder.addSection(days);

    builder.addSection(CardService.newCardSection().addWidget(
        CardService.newButtonSet()
            .addButton(textButton('Back', 'onBackFromProjectDetails'))
            .addButton(textButton('Refresh', 'onRefreshProjectDetails', {
              calendarId: project.id
            }))));
    return builder.build();
  }

  function metric(label, value) {
    return CardService.newDecoratedText()
        .setTopLabel(label)
        .setText('<b>' + ProjectTimeUtils.escapeHtml(value) + '</b>')
        .setWrapText(true);
  }

  function activityMetric(label, activity) {
    return CardService.newDecoratedText()
        .setTopLabel(label)
        .setText('<b>' + ProjectTimeUtils.escapeHtml(activity.name) + '</b>')
        .setBottomLabel(ProjectTimeUtils.formatDuration(activity.milliseconds))
        .setWrapText(true);
  }

  function findBusiestDay(days) {
    var busiest = null;
    (days || []).forEach(function(day) {
      if (!busiest || day.milliseconds > busiest.milliseconds) busiest = day;
    });
    return busiest;
  }

  function buildSettingsCard(preferences, calendars) {
    var builder = baseBuilder('Settings');
    var calendarInput = CardService.newSelectionInput()
        .setFieldName('calendarIds')
        .setTitle('Project calendars')
        .setType(CardService.SelectionInputType.CHECK_BOX);
    calendars.forEach(function(calendar) {
      calendarInput.addItem(
          calendar.name, calendar.id,
          preferences.selectedCalendarIds.indexOf(calendar.id) !== -1);
    });

    var calendarSection = CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(
            'Each selected calendar is treated as one project. Nothing is selected automatically.'));
    if (calendars.length) calendarSection.addWidget(calendarInput);
    else calendarSection.addWidget(CardService.newTextParagraph().setText(
        'No readable calendars are currently available.'));
    calendarSection.addWidget(CardService.newButtonSet()
        .addButton(textButton('Select all', 'onSelectAllCalendars'))
        .addButton(textButton('Clear all', 'onClearAllCalendars')));
    builder.addSection(calendarSection);

    var firstDay = CardService.newSelectionInput()
        .setFieldName('firstDayOfWeek')
        .setTitle('First day of week')
        .setType(CardService.SelectionInputType.DROPDOWN);
    DAY_NAMES.forEach(function(name, index) {
      firstDay.addItem(name, String(index), preferences.firstDayOfWeek === index);
    });

    var rules = CardService.newSelectionInput()
        .setFieldName('rules')
        .setTitle('Counting rules')
        .setType(CardService.SelectionInputType.CHECK_BOX)
        .addItem('Include weekends', 'includeWeekends', preferences.includeWeekends)
        .addItem('Count declined events', 'countDeclined', preferences.countDeclined)
        .addItem('Count all-day events', 'countAllDay', preferences.countAllDay)
        .addItem('Count events marked Free', 'countFree', preferences.countFree);
    builder.addSection(CardService.newCardSection()
        .addWidget(firstDay)
        .addWidget(rules));

    builder.addSection(CardService.newCardSection().addWidget(
        CardService.newButtonSet()
            .addButton(filledButton('Save settings', 'onSaveSettings'))
            .addButton(textButton('Back', 'onBackToSummary'))));
    builder.addSection(CardService.newCardSection().setHeader('Privacy & data')
        .addWidget(CardService.newTextParagraph().setText(
            'Remove your saved calendar selections, preferences, view state, and cached summaries. Calendar events are never changed.'))
        .addWidget(textButton('Delete my data', 'onOpenDeleteData')));
    return builder.build();
  }

  function buildDeleteDataCard() {
    return baseBuilder('Delete my data')
        .addSection(CardService.newCardSection()
            .addWidget(CardService.newTextParagraph().setText(
                '<b>Delete all Project Time data saved for your account?</b>'))
            .addWidget(CardService.newTextParagraph().setText(
                'This removes calendar selections, counting preferences, view state, and tracked cached summaries. It does not modify or delete any Calendar events.'))
            .addWidget(CardService.newButtonSet()
                .addButton(filledButton('Delete my data', 'onDeleteUserData'))
                .addButton(textButton('Cancel', 'onCancelDeleteData'))))
        .build();
  }

  function buildErrorCard(error) {
    console.error('Project Time error: %s', error && error.stack ? error.stack : String(error));
    var message = String(error && error.message ? error.message : error);
    var authorization = /authoriz|permission|scope|access denied|login/i.test(message);
    var help = authorization ?
      'Calendar access is not authorized. Reopen the add-on and grant its read-only Calendar permission. If the problem continues, reinstall the test deployment.' :
      'Project Time could not load Calendar data. Verify the Calendar API is enabled, then try again.';
    return baseBuilder('Something went wrong')
        .addSection(CardService.newCardSection()
            .addWidget(CardService.newTextParagraph().setText(
                ProjectTimeUtils.escapeHtml(help)))
            .addWidget(CardService.newTextParagraph().setText(
                ProjectTimeUtils.escapeHtml(message)))
            .addWidget(CardService.newButtonSet()
                .addButton(textButton('Try again', 'onRefresh'))
                .addButton(textButton('Settings', 'onOpenSettings'))))
        .build();
  }

  function baseBuilder(title) {
    return CardService.newCardBuilder().setHeader(
        CardService.newCardHeader().setTitle(title));
  }

  function action(functionName, parameters) {
    var result = CardService.newAction().setFunctionName(functionName);
    return parameters ? result.setParameters(parameters) : result;
  }

  function textButton(label, functionName, parameters) {
    return CardService.newTextButton().setText(label)
        .setOnClickAction(action(functionName, parameters));
  }

  function filledButton(label, functionName) {
    return textButton(label, functionName)
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED);
  }

  return {
    buildDeleteDataCard: buildDeleteDataCard,
    buildErrorCard: buildErrorCard,
    buildMainCard: buildMainCard,
    buildProjectDetailsCard: buildProjectDetailsCard,
    buildSettingsCard: buildSettingsCard
  };
})();
