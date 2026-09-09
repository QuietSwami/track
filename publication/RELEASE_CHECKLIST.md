# Google Workspace Marketplace release checklist

Project Time is a Google Workspace add-on for Google Calendar. It is not a Chrome Web Store extension.

## 1. Decide ownership and audience

- [ ] Confirm whether the listing will be **public** or private to a Workspace organization. This choice cannot be changed after publication.
- [ ] Confirm the developer legal name, public display name, support/privacy/legal email addresses, and governing jurisdiction.
- [ ] Confirm the product is free of charge or revise the listing's pricing text.
- [ ] Confirm that “Project Time” is not already used by another Marketplace listing and that it matches the OAuth consent-screen and manifest names.

## 2. Finalize and host public pages

- [ ] Replace every `{{PLACEHOLDER}}` in `docs/` and `publication/`.
- [ ] Have the Terms and Privacy Policy reviewed for the developer's jurisdiction and actual practices.
- [ ] Publish `docs/` over HTTPS on a domain controlled by the developer. Static hosting is sufficient; these pages do not process Calendar data.
- [ ] Verify the home, privacy, terms, and support URLs work without signing in.
- [ ] Verify the public domain in Google Search Console when requested during OAuth brand verification.

## 3. Create the dedicated standard Cloud project

- [ ] Create a standard Google Cloud project used only for this published add-on.
- [ ] Associate the Apps Script project with that standard Cloud project's numeric project number in Apps Script **Project Settings**.
- [ ] Enable **Google Calendar API** in the standard Cloud project.
- [ ] Enable **Google Workspace Marketplace SDK**.
- [ ] Configure OAuth Branding with the exact name **Project Time**, developer contact information, home page, privacy policy, and terms URLs.
- [ ] Configure the Audience as External for a public app, then move it to Production when the verification workflow permits.
- [ ] Add only the two scopes present in `src/appsscript.json`.
- [ ] Submit sensitive-scope verification for `calendar.readonly`. Reading Calendar events is classified as sensitive for a public OAuth app; prepare the required scope justification and demo video.

## 4. Finalize the production identity

- [ ] Upload `assets/marketplace/project-time-icon-128.png` to a publicly accessible Google-hosted URL beginning with `https://lh3.googleusercontent.com/`.
- [ ] Replace `addOns.common.logoUrl` in `src/appsscript.json` with that URL.
- [ ] Confirm the manifest, OAuth consent screen, and Marketplace listing use the same product name and icon.
- [ ] Push the final manifest and source with `npx @google/clasp push --force`.

## 5. Create the versioned production deployment

- [ ] Run the complete local checks: `npm run check` and `npm run publication:check`.
- [ ] In Apps Script, choose **Deploy → New deployment → Google Workspace Add-on**.
- [ ] Create a versioned deployment with a release description such as `Project Time 1.0.0 Marketplace candidate`.
- [ ] Copy the deployment ID. Do not use the test/head deployment ID in the Marketplace SDK.
- [ ] Install that exact versioned deployment on a clean test account and repeat the acceptance tests.

## 6. Configure the Marketplace SDK

- [ ] In **App Configuration**, select Google Workspace add-on and supply the versioned deployment ID.
- [ ] Select Google Calendar as the supported host.
- [ ] Add the exact two OAuth scopes from the manifest and OAuth consent screen.
- [ ] Choose individual installation and administrator installation if both audiences should be supported.
- [ ] Enter the developer email addresses used for review communication.
- [ ] Save as a draft. Do not submit yet.

## 7. Complete the store listing

- [ ] Paste the approved copy from `publication/marketplace-listing.md`.
- [ ] Upload both application icons and the 220×140 banner.
- [ ] Upload at least one real, full-bleed Calendar integration screenshot. The recommended size is 1280×800; 640×400 and 2560×1600 are also accepted.
- [ ] Use only synthetic demonstration calendar data in screenshots.
- [ ] Add the public privacy, terms, and support URLs.
- [ ] Verify every claim matches the released version.

## 8. OAuth verification and Marketplace review

- [ ] Record an unlisted demo video using the script in `marketplace-listing.md` and a synthetic test account.
- [ ] Submit OAuth brand verification and sensitive-scope verification. `calendar.readonly` requires verification for a public app.
- [ ] Respond to verification requests and wait for approval before Marketplace submission.
- [ ] Run `npm run publication:check` again with no failures.
- [ ] Submit the public listing for Marketplace review.
- [ ] After approval, install from the live listing on a separate account and verify the production flow.

## Release discipline

- Never put Script IDs, deployment IDs, OAuth client secrets, access tokens, or private calendar data in this repository or listing assets.
- Future scope additions can require OAuth re-verification. Keep the manifest, OAuth configuration, and Marketplace SDK scope lists identical.
- Publish code changes through a new Apps Script version and update the Marketplace deployment intentionally; do not rely on the mutable head deployment for production.
