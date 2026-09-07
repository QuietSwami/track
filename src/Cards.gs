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
        projectsSection.addWidget(CardService.newTextParagraph().setText(
            '<font color="' + ProjectTimeUtils.safeColor(project.color) + '">●</font> ' +
            '<b>' + ProjectTimeUtils.escapeHtml(project.name) + '</b><br>' +
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
    return builder.build();
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

  function baseBuilder(subtitle) {
    return CardService.newCardBuilder().setHeader(
        CardService.newCardHeader().setTitle('Project Time').setSubtitle(subtitle));
  }

  function action(functionName) {
    return CardService.newAction().setFunctionName(functionName);
  }

  function textButton(label, functionName) {
    return CardService.newTextButton().setText(label).setOnClickAction(action(functionName));
  }

  function filledButton(label, functionName) {
    return textButton(label, functionName)
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED);
  }

  return {
    buildErrorCard: buildErrorCard,
    buildMainCard: buildMainCard,
    buildSettingsCard: buildSettingsCard
  };
})();
