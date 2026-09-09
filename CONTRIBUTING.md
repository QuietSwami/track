# Contributing

Thanks for improving Project Time.

## Development workflow

1. Fork the repository and create a focused branch.
2. Make the smallest coherent change that solves the problem.
3. Add or update tests for pure date and aggregation behavior.
4. Run `npm run check`.
5. Open a pull request describing the behavior change and how it was verified.

Node.js 20 or newer is recommended. There are no npm package dependencies.

## Design constraints

- Keep the add-on specific to Google Calendar and Apps Script Card Service.
- Preserve the exact read-only OAuth scope set unless a proposal clearly justifies a change.
- Never create, modify, or delete Calendar events.
- Do not add external analytics, advertising, servers, databases, or AI processing.
- Treat one selected calendar as one project; do not classify events from their content.
- Keep aggregation and date-range behavior pure and locally testable.
- Do not log event names, descriptions, locations, attendees, or authorization data.

## Privacy in issues and tests

Use synthetic calendar IDs, event names, dates, and screenshots. Do not include real Calendar content, OAuth tokens, Script IDs, deployment IDs, `.clasp.json`, or `.clasprc.json` in issues, pull requests, fixtures, or logs.

## Apps Script verification

Local tests cannot emulate authorization, Calendar API recurrence expansion, Card Service rendering, User Properties, or User Cache. For UI or integration changes, describe the manual test performed in a personal Apps Script test deployment.
