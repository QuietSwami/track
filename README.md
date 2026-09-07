# Project Time

Project Time is a private, single-user Google Workspace add-on for Google Calendar. It appears in Calendar's right-hand sidebar and totals scheduled event duration by calendar: one selected calendar equals one project.

It uses Google Apps Script, Card Service, the advanced Calendar service, User Properties, and a short-lived User Cache. There is no external server or database, and event content is not sent to any external service.

## What is included

- Calendar-only sidebar with a Calendar-specific homepage trigger
- Weekly and monthly periods, Previous/Next navigation, Today, and Refresh
- Project totals sorted by scheduled time, using each calendar's name and color
- Duration, percentage, and counted-event count per project
- User settings for project calendars, first weekday, weekends, declined events, all-day events, and Free events
- Recurring occurrence expansion, boundary clipping, midnight and DST-safe arithmetic
- Independent overlap detection and disclosure
- Three-minute per-user summary cache; Refresh bypasses it
- Automatic day/night appearance that follows the active Google Calendar theme
- Graceful handling of no selection, empty periods, inaccessible calendars, and errors
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
```

## Local verification

Node.js 18 or newer is sufficient; there are no package dependencies.

```bash
npm test
npm run check
```

`npm run check` parses every `.gs` file, validates the important manifest fields and exact OAuth scope set, and runs all calculation tests.

## Create the Google projects

### 1. Create the Apps Script project

1. Sign in with the Google account that will use the add-on.
2. Open [script.new](https://script.new/) to create a standalone Apps Script project.
3. Rename it **Project Time**.
4. Open **Project Settings** and copy the **Script ID**. Do not use the deployment ID.

Apps Script automatically associates a default Google Cloud project. That is enough for an unpublished personal test deployment. If you want an explicitly managed standard Cloud project, complete the optional next section before deploying.

### 2. Optional: associate a standard Google Cloud project

This is useful for explicit API and OAuth management, and is required later for a versioned/public add-on deployment. It is not required for the private head/test deployment in this README.

1. In the [Google Cloud console](https://console.cloud.google.com/projectcreate), create or select a project named **Project Time**.
2. In **APIs & Services > Library**, enable **Google Calendar API**.
3. In **Google Auth platform > Branding**, configure the app name and support/contact email.
4. In **Audience**, choose **Internal** when your Workspace organization permits it. For a personal Gmail account or cross-domain use, choose **External**, leave the app in Testing, and add your own Google account as a test user.
5. In **Data Access**, add these two scopes:
   - `https://www.googleapis.com/auth/calendar.addons.execute`
   - `https://www.googleapis.com/auth/calendar.readonly`
6. Copy the Cloud project's numeric **Project number**.
7. In Apps Script, open **Project Settings > Google Cloud Platform (GCP) Project > Change project**, enter that project number, and confirm.

For a one-user test, do not create a Marketplace listing and do not submit for public OAuth verification.

## Upload with clasp

1. In [Apps Script user settings](https://script.google.com/home/usersettings), enable **Google Apps Script API**. This setting permits `clasp` to manage your scripts.
2. From this repository, authenticate:

   ```bash
   npx @google/clasp login
   ```

3. Copy the provided configuration and replace its placeholder with the Script ID from the Apps Script project:

   ```bash
   cp .clasp.json.example .clasp.json
   ```

4. Upload the source:

   ```bash
   npx @google/clasp push
   ```

5. Open the remote project and confirm that **Calendar API** appears under Services:

   ```bash
   npx @google/clasp open-script
   ```

The manifest already enables the advanced Calendar service as `Calendar` v3. With a default Apps Script Cloud project, adding the advanced service enables its API automatically. With a standard Cloud project, the Google Calendar API must also be enabled in Cloud Console as described above.

If `clasp` is unavailable, create the seven `.gs` files in the Apps Script editor, copy their matching contents from `src/`, show the manifest from **Project Settings**, and replace `appsscript.json` with the repository version.

## OAuth configuration

The manifest requests exactly:

- `calendar.addons.execute`: required to run a Calendar add-on
- `calendar.readonly`: read calendar-list metadata and events, including calendar colors and recurring occurrences

There are no Calendar write scopes. The code does not create, update, or delete events. After upload, verify the Apps Script **Overview > Project OAuth Scopes** list matches `src/appsscript.json`. If you use a standard Cloud project, ensure the same scopes are present in Google Auth platform **Data Access**.

## Install the private test deployment

1. Open the Apps Script project.
2. Choose **Deploy > Test deployments**.
3. Click **Install**, then **Done**.
4. Open or reload [Google Calendar](https://calendar.google.com/) on desktop.
5. In the right-hand icon column, click the Project Time clock icon. If the side panel is collapsed, first click the small arrow at the lower-right edge.
6. Complete Google's authorization flow, granting the two requested Calendar permissions.
7. On first open, Project Time shows Settings because it never auto-selects calendars. Select the calendars that represent projects, choose the rules, and click **Save settings**.

This installs the Apps Script head deployment only for development/personal use. It tracks the latest pushed code. The project has not been published to the Google Workspace Marketplace.

## Calculation behavior

- The reporting timezone is the primary calendar's timezone. The manifest timezone (`Europe/Zurich`) is only a fallback when the primary calendar does not expose one.
- Calendar API `events.list` is called only for selected calendars and only for the period envelope. `singleEvents: true` expands recurring series into occurrences; `showDeleted: false` omits cancelled events.
- Events are clipped to the included range before duration is added. Arithmetic remains in milliseconds; only display formatting rounds the final total to whole minutes.
- Declined means an attendee entry marked `self: true` has `responseStatus: declined`.
- Free means Calendar API `transparency: transparent`.
- All-day event end dates are exclusive, matching Calendar API semantics. If enabled, their elapsed midnight-to-midnight duration can be 23 or 25 hours across a DST change.
- Excluding weekends removes Saturday and Sunday portions from totals. Week navigation still advances by seven-day calendar weeks, and the displayed label says `weekends excluded`.
- Every event contributes independently. Overlapping events therefore remain double-counted, and the sidebar discloses that overlap.
- Percentages use exact millisecond totals and are independently rounded to whole percentages, so displayed percentages can occasionally add to 99% or 101%.

## Day and night themes

Project Time follows Google Calendar's active theme automatically. Card Service renders the sidebar background, ordinary text, section dividers, controls, and buttons using the host application's theme. The manifest intentionally leaves `layoutProperties.primaryColor` and `secondaryColor` unset, and the cards do not hard-code neutral text colors. This lets Calendar switch the add-on between day and night appearances without a separate Project Time setting.

The small dot beside each project intentionally retains that project's Calendar color in both themes. Calendar-only dark-mode logo variants are not supported by the common Apps Script add-on manifest, so the toolbar uses the standard public Material clock icon.

## Privacy

Project Time reads the accessible calendar list plus start/end times, event status, transparency, the current user's attendee response, and recurrence-instance identifiers for selected calendars. It deliberately does not request event titles, descriptions, locations, or other content in its Calendar API partial-response fields.

Preferences and view state are stored per user in Apps Script **User Properties**. Calculated summaries are stored for three minutes in Apps Script **User Cache**. Data remains within Google Apps Script/Google Calendar and is not transmitted to external services. Development logging is limited to calendar IDs, queried boundaries, event counts, and errors; it does not log event titles, descriptions, or attendees.

## What must be tested in Apps Script

The local harness validates calculation inputs and expected expanded occurrences, but it cannot emulate Google's runtime. Verify these after installation:

1. Card rendering and navigation in the Calendar sidebar.
2. Switch Google Calendar between Light and Dark themes and verify the open sidebar updates with it.
3. Calendar authorization and User Properties isolation.
4. Calendar API expansion of a real recurring series, including an edited or cancelled occurrence.
5. Calendar colors and renamed calendars.
6. Free/busy-only shared calendars and calendars that are removed after selection.
7. The account's actual primary-calendar timezone and a real DST-crossing event.

For a manual accuracy test, create dedicated project calendars with known timed events, include one recurring event, one overlap, and one boundary-crossing event, then compare week/month totals with a hand calculation. Refresh after edits to bypass the three-minute cache.

## Troubleshooting

### Project Time icon is missing

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
- If a selected calendar was removed or access was revoked, Project Time skips it, keeps the other totals, and shows an attention note. Open Settings and save to remove stale selections.
- Birthdays, holidays, contacts, and other system calendars are never selected automatically. They appear only if Calendar exposes them and the user explicitly selects them.

### Totals or timezone look wrong

- In Google Calendar, open **Settings > General > Time zone** and confirm the primary calendar timezone. Project Time uses that timezone for week/month boundaries.
- Confirm the first-day-of-week and weekend settings in Project Time.
- Check whether an event is declined, all-day, or marked Free; these are excluded by default.
- Check for the overlap disclosure. Project Time intentionally sums overlapping events separately.
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
