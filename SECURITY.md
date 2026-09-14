# Security policy

## Reporting a vulnerability

Please report security or privacy vulnerabilities privately to [franciscoabmendonca@pm.me](mailto:franciscoabmendonca@pm.me). Do not open a public issue for a vulnerability and do not include real Calendar content, OAuth tokens, Script IDs, deployment IDs, or other credentials.

Include a concise description, affected code path, reproduction steps using synthetic data, and the potential impact. You should receive an acknowledgement within seven days.

## Supported version

Security fixes target the latest version on the default branch. Because each user owns their Apps Script deployment, users must pull the corrected source and push it to their own project to receive an update.

## Security model

Track! runs in each user's own Google Apps Script project, requests read-only Calendar access, stores preferences in user-scoped Apps Script properties, and uses a short-lived user cache. It has no external application server, database, advertising, or analytics.
