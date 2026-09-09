# Project Time — Marketplace listing draft

## Listing fields

- Default language: English
- Application name: Project Time
- Category: Productivity
- Pricing: Free of charge (confirm before submission)
- Visibility: Public (do not save this choice until the developer has confirmed it; visibility cannot be changed after publication)
- Installation: Individual and administrator installation
- Works with: Google Calendar
- Developer name: Francisco Mendonça
- Developer email: `franciscoabmendonca@pm.me`
<!--- Terms URL: `{{PUBLIC_SITE_URL}}/terms.html`
- Privacy URL: `{{PUBLIC_SITE_URL}}/privacy.html`
- Support URL: `{{PUBLIC_SITE_URL}}/support.html`-->

## Short description

See how much scheduled Google Calendar time each project receives, with weekly and monthly totals, daily breakdowns, activity statistics, and overlap notices.

## Detailed description

Project Time turns separate project calendars into a clear scheduled-time summary inside Google Calendar.

Choose which accessible calendars represent projects, then review the current week or month directly in the Calendar sidebar. Each selected calendar remains one project, using its existing calendar name and color. Project Time measures scheduled event duration; it is not an automatic time tracker and does not infer projects from event text.

Features:

- Weekly and monthly scheduled-time summaries
- Previous, next, Today, and Refresh controls
- Project totals, percentages, and counted-event counts
- Daily breakdowns, active days, averages, and busiest-day statistics
- Longest and shortest named activities
- Recurring occurrence expansion and period-boundary clipping
- Configurable handling for weekends, declined events, all-day events, and events marked Free
- Clear disclosure when overlapping activities are counted separately
- User-controlled project selection and in-product deletion of saved preferences and cache data

Privacy-focused architecture:

- Read-only Google Calendar access
- No event creation, editing, or deletion
- No external application server or database
- No advertising, tracking analytics, or AI processing
- Preferences stored per user in Google Apps Script User Properties
- Calculated summaries cached for up to three minutes in Google Apps Script User Cache

After installation, open Google Calendar on desktop, select Project Time in the right-hand sidebar, choose the calendars that represent projects, and save the settings.

Project Time is an independent product and is not affiliated with or endorsed by Google.

## OAuth scope justifications

### `https://www.googleapis.com/auth/calendar.addons.execute`

Required for Project Time to run as a Google Calendar sidebar add-on and respond to Card Service interactions.

### `https://www.googleapis.com/auth/calendar.readonly`

Required to list calendars available to the signed-in user; read calendar names, colors, access roles, and time zones; and read the minimum event fields needed to calculate scheduled durations and apply the user's counting rules. Project Time reads event names only to display the longest and shortest activities. It does not create, update, or delete events and does not request event descriptions or locations.

## Graphic assets

- 32×32 icon: `assets/marketplace/project-time-icon-32.png`
- 128×128 icon: `assets/marketplace/project-time-icon-128.png`
- 220×140 banner: `assets/marketplace/project-time-banner-220x140.png`
- Integration screenshot: add at least one real screenshot to `assets/marketplace/screenshots/` at 1280×800, 640×400, or 2560×1600

The icon uploaded to the listing must be identical to the image served by the production manifest's public `https://lh3.googleusercontent.com/...` logo URL.

## Suggested screenshot captions

1. “Review scheduled time across project calendars for the current week.”
2. “Open a project to see detailed activity and daily statistics.”
3. “Choose project calendars and counting rules in Settings.”

## OAuth verification demo video script

1. Show the Project Time home page, privacy policy, and support page using the exact verified domain.
2. Open the OAuth consent screen in English and show the app name, logo, requested scopes, and Cloud project/client identity.
3. Install the Marketplace draft or test deployment with a clean test account.
4. Explain why the Calendar add-on execution and read-only Calendar scopes are requested.
5. Open Project Time from Google Calendar's right sidebar.
6. Select project calendars and save settings.
7. Show weekly and monthly navigation, Refresh, a project detail card, named activity extremes, and overlap disclosure.
8. Show Settings → Delete my data and confirm the result.
9. State that the add-on has no Calendar write operations, external server, advertising, or external data transfer.

Use narration or on-screen annotations. Do not expose real private calendar data; use dedicated demonstration calendars with synthetic events.
