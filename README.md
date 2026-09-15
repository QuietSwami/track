# Track! - Time Tracker for Google Calendar

Track! adds up the time scheduled in the project calendars you choose: one selected calendar equals one project. It is a planning view—not a stopwatch, automatic activity tracker, or measure of productivity.

*NOTE:* For the time being, each user must install the source into a Google Apps Script project on their own. There's no shared service, external server, or database.

**Start here:** [Install Track! from source](INSTALL.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [MIT License](LICENSE)


## Repository layout

```text
src/
  Addon.gs          Manifest entry point and action callbacks
  Cards.gs          Card Service UI
  CalendarAccess.gs Calendar API reads and caching
  Aggregation.gs    Pure event filtering, clipping, totals, overlaps
  Analytics.gs      Pure current-versus-previous insights
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

## Insights

The lightweight **Insights** card is designed for a quick weekly or monthly review. It compares the currently selected period with the immediately previous period and shows the total change, calendar-block rhythm, active projects, a compact project-allocation bar, and a few useful highlights such as the busiest day and largest project changes.

It deliberately avoids a long historical dashboard and generated chart images. At most two bounded periods are needed, and both use the same three-minute user cache as the main summary.

## Local verification

Node.js 20 or newer is recommended; there are no package dependencies.

```bash
npm test
npm run check
```

`npm run check` audits repository files for common credentials and private deployment identifiers, parses every `.gs` file, validates the important manifest fields and exact OAuth scope set, and runs all calculation tests.

## Installation

Track! is distributed as source code. Every installer creates a personal standalone Apps Script project, uploads `src/` with `clasp`, installs that project's test deployment, and authorizes it for their own Google account.

See [INSTALL.md](INSTALL.md) for instructions, a no-`clasp` alternative, updates, uninstalling, requested permissions, and troubleshooting.

The personal deployment requests exactly:

- `calendar.addons.execute`: run Track! in the Calendar sidebar.
- `calendar.readonly`: list accessible calendars and read the minimum event fields required for the statistics.


## Privacy and data handling

Track! reads the accessible calendar list plus event names, start/end times, status, transparency, the current user's attendee response, and recurrence-instance identifiers for selected calendars. Event names are used only for the longest and shortest calendar-block details. It does not request event descriptions, locations, or other content in its Calendar API partial-response fields.

Preferences and view state are stored per user in Apps Script **User Properties**. Calculated summaries, including the event names displayed for the longest and shortest blocks, are stored for three minutes in Apps Script **User Cache**. Data remains within Google Apps Script/Google Calendar and is not transmitted to external services. Development logging is limited to calendar IDs, queried boundaries, event counts, and errors; it does not log event names, descriptions, or attendees.

Users can delete their Track! preferences, view state, and cached summaries from **Settings → Delete my data**. The action uses a confirmation card and does not modify Calendar data.

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
