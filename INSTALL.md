# Install Project Time from source

Project Time is self-hosted in your own Google Apps Script project. There is no central service, shared database, or one-click Marketplace installation. You can inspect the source before granting it access to your Calendar.

## Requirements

- A Google account with Google Calendar
- A desktop browser
- Node.js 20 or newer for the recommended `clasp` installation

## Recommended installation with clasp

### 1. Download and verify the project

Clone or download this repository, open a terminal in its directory, and run:

```bash
npm run check
```

The project has no runtime npm dependencies. The command validates the Apps Script files and manifest, then runs the pure calculation tests.

### 2. Create your personal Apps Script project

1. Sign in to the Google account that will use Project Time.
2. Open [script.new](https://script.new/) and create a standalone Apps Script project.
3. Rename it **Project Time**.
4. Open **Project Settings** and copy the **Script ID**. This is not a deployment ID.
5. Open [Apps Script user settings](https://script.google.com/home/usersettings) and enable the **Google Apps Script API**.

### 3. Connect the local source

Authenticate `clasp`:

```bash
npx @google/clasp login
```

Create the local configuration:

```bash
cp .clasp.json.example .clasp.json
```

Open `.clasp.json` and replace `PASTE_YOUR_APPS_SCRIPT_PROJECT_ID_HERE` with the Script ID copied in the previous step. Never commit this file.

Upload the source:

```bash
npx @google/clasp push --force
```

The force option is needed when uploading the repository into a newly created, otherwise unrelated Apps Script project. Check the Script ID carefully before running it because it replaces that project's remote files.

### 4. Confirm the Calendar service

Open the project:

```bash
npx @google/clasp open-script
```

In the Apps Script editor, confirm **Calendar API** appears under **Services**. The repository manifest declares Calendar API v3. If it does not appear, choose **Services → Add a service → Calendar API → Add**.

### 5. Install the personal test deployment

1. In the Apps Script editor, choose **Deploy → Test deployments**.
2. Select **Install**, then **Done**.
3. Open or reload [Google Calendar](https://calendar.google.com/) on desktop.
4. Expand Calendar's right-hand sidebar and select the Project Time clock icon.
5. Complete Google's authorization flow.
6. On first use, choose the calendars that represent projects and save Settings.

Google may describe the project as unverified because this is your personal source deployment rather than a reviewed Marketplace app. Continue only if you created the Apps Script project yourself, obtained the code from a source you trust, and reviewed the requested scopes.

## Requested permissions

Project Time requests exactly:

- `calendar.addons.execute` so it can run in Google Calendar's sidebar.
- `calendar.readonly` so it can list accessible calendars and read the minimum event data required for scheduled-time statistics.

It has no Calendar write scope and cannot create, edit, or delete events. See [Privacy and data handling](README.md#privacy-and-data-handling) for the fields it reads.

## Updating an installation

After downloading a newer release, run:

```bash
npm run check
npx @google/clasp push --force
```

Reload Google Calendar afterward. Test deployments follow the current Apps Script project source.

## Uninstalling

1. Optionally open **Project Time → Settings → Delete my data**.
2. In Apps Script, choose **Deploy → Test deployments**.
3. Select **Uninstall**, then **Done**.
4. Delete the personal Apps Script project from Google Drive if you no longer need it.

## Installation without clasp

1. Create a standalone project at [script.new](https://script.new/).
2. Create one script file for each `.gs` file in `src/` and copy its contents.
3. In **Project Settings**, enable **Show `appsscript.json` manifest file in editor** and replace it with `src/appsscript.json`.
4. Add Calendar API v3 under **Services**.
5. Follow the personal test-deployment instructions above.

## Troubleshooting

- **Project Time icon is missing:** confirm the test deployment is installed for the same account, reload Calendar, and expand the right sidebar.
- **Authorization fails:** confirm Calendar API is listed under Services. Uninstall and reinstall the test deployment if the consent state is stale.
- **A calendar is missing:** verify the signed-in account can access it, then reopen Project Time Settings.
- **Totals differ:** check the reporting timezone and Project Time's weekend, declined, all-day, and Free-event settings. Overlapping events are intentionally counted independently.
- **Changes are not visible:** run `clasp push --force`, click Refresh in Project Time, and reload Calendar.
