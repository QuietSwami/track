# Track! - Time Tracker for Google Calendar

Track! - Time Tracker for Google Calendar is an open-source, self-hosted Google Workspace add-on. It appears in Calendar's right-hand sidebar and totals scheduled event duration by calendar: one selected calendar equals one project.

Each user installs the source into a Google Apps Script project they own. Track! uses Card Service, the advanced Calendar service, User Properties, and a short-lived User Cache. There is no shared service, external server, or database, and event content is not sent to any external service.

**Start here:** [Install Track! from source](INSTALL.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [MIT License](LICENSE)

## What is included

- Calendar-only sidebar with a Calendar-specific homepage trigger
- Weekly and monthly periods, Previous/Next navigation, Today, and Refresh
- Project totals sorted by scheduled time, using each calendar's name and color
- Duration, percentage, and counted-event count per project
- Clickable project rows with period metrics, activity extremes, and a chronological daily breakdown
- User settings for project calendars, first weekday, weekends, declined events, all-day events, and Free events
- Recurring occurrence expansion, boundary clipping, midnight and DST-safe arithmetic
- Independent overlap detection and disclosure
- Three-minute per-user summary cache; Refresh bypasses it
- Native Card Service appearance without hard-coded neutral text colors
- Graceful handling of no selection, empty periods, inaccessible calendars, and errors
- Confirmed in-product deletion of the current user's preferences and tracked cache data
- Dependency-free local tests for the pure calculation logic

## Repository layout

```text
src/
  Addon.gs          Manifest entry point and action callbacks
  Cards.gs          Card Service UI
  CalendarAccess.gs Calendar API reads and caching
  Aggregation.gs    Pure event filtering, clipping, totals, overlaps
  DateRanges.gs     Pure week/month and timezone calculations
  Settings.gs       User Properties persistence
  Utils.gs          Formatting and form helpers
  appsscript.json   Apps Script manifest
tests/
  run-tests.js      Calculation/date test harness
  check-source.js   Syntax and manifest checks
INSTALL.md          Complete self-installation and update guide
CONTRIBUTING.md     Development and privacy constraints
SECURITY.md         Private vulnerability-reporting process
CHANGELOG.md        Release history
```

## Local verification

Node.js 20 or newer is recommended; there are no package dependencies.

```bash
npm test
npm run check
```

`npm run check` audits repository files for common credentials and private deployment identifiers, parses every `.gs` file, validates the important manifest fields and exact OAuth scope set, and runs all calculation tests.

## Installation

Track! is distributed as source code. Every installer creates a personal standalone Apps Script project, uploads `src/` with `clasp`, installs that project's test deployment, and authorizes it for their own Google account.

See [INSTALL.md](INSTALL.md) for beginner-friendly instructions, a no-`clasp` alternative, updates, uninstalling, requested permissions, and troubleshooting.

The personal deployment requests exactly:

- `calendar.addons.execute`: run Track! in the Calendar sidebar.
- `calendar.readonly`: list accessible calendars and read the minimum event fields required for the statistics.

There are no Calendar write scopes. The code cannot create, update, or delete events.

## Calculation behavior

- The reporting timezone is the primary calendar's timezone. The manifest timezone (`Europe/Zurich`) is only a fallback when the primary calendar does not expose one.
- Calendar API `events.list` is called only for selected calendars and only for the period envelope. `singleEvents: true` expands recurring series into occurrences; `showDeleted: false` omits cancelled events.
- Events are clipped to the included range before duration is added. Arithmetic remains in milliseconds; only display formatting rounds the final total to whole minutes.
- Declined means an attendee entry marked `self: true` has `responseStatus: declined`.
- Free means Calendar API `transparency: transparent`.
- All-day event end dates are exclusive, matching Calendar API semantics. If enabled, their elapsed midnight-to-midnight duration can be 23 or 25 hours across a DST change.
- Excluding weekends removes Saturday and Sunday portions from totals. Week navigation still advances by seven-day calendar weeks, and the displayed label says `weekends excluded`.
- Every event contributes independently. Overlapping events therefore remain double-counted, and the sidebar discloses that overlap.
- The project detail card shows its share of the overall project total, event count, active-day count, average duration per event, busiest day, longest and shortest named activities, and each active day's duration, percentage, and contributing-event count.
- Longest and shortest activities use the duration actually counted inside the selected period after boundary clipping and exclusion rules. Recurring occurrences are compared individually. If durations tie, the earliest activity is used, then its name. Events whose names are unavailable appear as `Untitled activity`.
- Percentages use exact millisecond totals and are independently rounded to whole percentages, so displayed percentages can occasionally add to 99% or 101%.

## Theme limitation

Google Calendar's Apps Script Card Service currently exposes neither the active Calendar theme nor a card background/theme API. The add-on event object provides host, platform, locale, timezone, form inputs, and parameters, but no light/dark appearance field. Consequently, a Calendar Card Service add-on cannot detect or programmatically mirror Calendar's day/night setting.

Track! uses native Card Service controls and avoids hard-coded neutral text colors, which is the safest available presentation. Google still controls the rendered card background. The small dot beside each project retains that project's Calendar color. A true independently styled dark sidebar would require an HTML/iframe interface, which Google Calendar Workspace add-ons do not permit under this project's required Card Service architecture.

## Privacy and data handling

Track! reads the accessible calendar list plus event names, start/end times, status, transparency, the current user's attendee response, and recurrence-instance identifiers for selected calendars. Event names are used only for the longest and shortest activity statistics. It does not request event descriptions, locations, or other content in its Calendar API partial-response fields.

Preferences and view state are stored per user in Apps Script **User Properties**. Calculated summaries, including the two displayed activity names per project, are stored for three minutes in Apps Script **User Cache**. Data remains within Google Apps Script/Google Calendar and is not transmitted to external services. Development logging is limited to calendar IDs, queried boundaries, event counts, and errors; it does not log event names, descriptions, or attendees.

Users can delete their Track! preferences, view state, and tracked cached summaries from **Settings → Delete my data**. The action uses a confirmation card and does not modify Calendar data.

## What must be tested in Apps Script

The local harness validates calculation inputs and expected expanded occurrences, but it cannot emulate Google's runtime. Verify these after installation:

1. Card rendering and navigation in the Calendar sidebar, including opening a project row, refreshing its detail card, and returning to the summary.
2. Calendar authorization and User Properties isolation.
3. Calendar API expansion of a real recurring series, including an edited or cancelled occurrence.
4. Calendar colors and renamed calendars.
5. Free/busy-only shared calendars and calendars that are removed after selection.
6. The account's actual primary-calendar timezone and a real DST-crossing event.

For a manual accuracy test, create dedicated project calendars with known timed events, include one recurring event, one overlap, and one boundary-crossing event, then compare week/month totals with a hand calculation. Refresh after edits to bypass the three-minute cache.

## Troubleshooting

### Track! icon is missing

- Confirm `src/appsscript.json` contains `addOns.calendar.homepageTrigger` and was pushed.
- In Apps Script, use **Deploy > Test deployments** and verify it says installed.
- Reload Calendar, confirm the right side panel is expanded, and ensure Calendar is open with the same Google account that owns/edits the script.
- Uninstall and reinstall the test deployment if the manifest host configuration changed.

### Authorization or scope errors

- Confirm the two manifest scopes exactly match the OAuth section above.
- With a standard Cloud project, enable Google Calendar API and add your account as an OAuth test user when the audience is External.
- Confirm the advanced **Calendar API v3** service appears in Apps Script. The manifest dependency should add it after `clasp push`.
- If consent state is stale, uninstall and reinstall the test deployment, then authorize again. Workspace administrators can block unverified/internal apps or Calendar scopes; an administrator must permit the app in that case.

### A calendar is absent or inaccessible

- The settings list includes calendars available at `freeBusyReader` access or higher. Check that the same account can see the calendar in Google Calendar.
- If a selected calendar was removed or access was revoked, Track! skips it, keeps the other totals, and shows an attention note. Open Settings and save to remove stale selections.
- Birthdays, holidays, contacts, and other system calendars are never selected automatically. They appear only if Calendar exposes them and the user explicitly selects them.

### Totals or timezone look wrong

- In Google Calendar, open **Settings > General > Time zone** and confirm the primary calendar timezone. Track! uses that timezone for week/month boundaries.
- Confirm the first-day-of-week and weekend settings in Track!.
- Check whether an event is declined, all-day, or marked Free; these are excluded by default.
- Check for the overlap disclosure. Track! intentionally sums overlapping events separately.
- Click **Refresh** after changing events or calendars.
- If the primary calendar exposes no timezone, change the manifest `timeZone` fallback to the desired IANA timezone and push again.

## Documentation basis

Manifest and deployment instructions were checked on 7 September 2026 against Google's current documentation:

- [Build Google Calendar interfaces](https://developers.google.com/workspace/add-ons/calendar/building-calendar-interfaces)
- [Calendar add-on manifest reference](https://developers.google.com/apps-script/manifest/calendar-addons)
- [Google Workspace add-on manifest reference](https://developers.google.com/apps-script/manifest/addons)
- [Calendar API events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)
- [Advanced Google services](https://developers.google.com/apps-script/guides/services/advanced)
- [Advanced Calendar service](https://developers.google.com/apps-script/advanced/calendar)
- [Test and debug Apps Script Google Workspace add-ons](https://developers.google.com/workspace/add-ons/how-tos/testing-workspace-addons)
- [Use the command-line interface with clasp](https://developers.google.com/apps-script/guides/clasp)
