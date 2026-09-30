# Umama AI Workspace

**LinkedIn Client Operations System — Phase 1 presentation MVP**

A private workflow for turning client notes into reviewed LinkedIn strategy and deliverables. A calm, responsive interface connects intake, verified facts, six production modules, approvals and reports.

## Start the presentation

Requires Node.js 20 or later. No package installation is needed for the app or core tests.

```sh
node scripts/serve.cjs
```

Open **http://127.0.0.1:4173**, then choose **Open presentation demo**. Keep the terminal running. Use Chrome or Edge with browser storage enabled. Do not open `index.html` directly: safe cross-tab saves require a secure browser context such as localhost or HTTPS.

The demo includes three fictional clients. It saves edits in this browser, recognizes explicitly labelled intake fields, and generates deterministic templates using reviewed facts. It makes **no AI calls**. It is a working presentation workflow, not evidence that Gemini or the live Google deployment has been tested.

## Included

- Dashboard, client list, name search and workflow filters.
- New-client intake, consent confirmation, raw profile notes and LinkedIn reference URL validation.
- Guided intake fields for role, audience, offer, goal, tone, CTA, experience and proof.
- Automatic private Drive workspace with Intake, Profile Drafts, Content Strategy, Feedback and Final Delivery folders.
- Structured extraction, missing-information detection, source quotations, fact verification/rejection and evidence notes.
- Profile audit, headline options, About, Experience, positioning and content pillars.
- Generate/regenerate, edit, copy, save and approve per module.
- Immutable saved client revisions, history, stale-edit protection and approval invalidation.
- Quality gates, conflicting verified-fact checks and mandatory human attestation.
- Marked draft HTML reports; approved final HTML in demo and private Drive PDF in live mode.
- GitHub-hosted private portal with Firebase Google sign-in, Apps Script token verification, admin allowlist, server-side Gemini integration, rate budget, input validation and private Sheets/Drive persistence.
- GitHub Pages workflow, generated Apps Script frontend and server files, setup, schema, endpoint and presentation documentation.

## Deployment boundaries

| Surface | Purpose | Data and access |
| --- | --- | --- |
| GitHub Pages `/` | Public presentation demo | Fictional browser-local records; no Gemini key or real client data |
| GitHub Pages `/portal.html` | Private live workspace | Firebase Google sign-in + server allowlist; private Sheet and Drive folder |
| Apps Script web app | Private backend API | Token verification, Sheets/Drive operations and server-only Gemini calls |
| Public portfolio | Separate future project | Separate repository/deployment; no client records or shared demo storage |

The GitHub portal sends a short-lived Firebase ID token with every request. Apps Script verifies the token with Google, checks the server-side email allowlist, and then performs the request as the deployment owner. There is no custom password database, public writable Sheet, shared admin password or frontend Gemini key. Client folders use `CLIENT_FOLDER_ROOT_ID` when configured and otherwise use the private `REPORT_FOLDER_ID` folder.

## Project layout

```text
frontend/           Demo, authenticated portal, shared domain rules and fixtures
apps-script/        Code.gs, manifest; generated Core.gs and Index.html
scripts/            Dependency-free preview and build
tests/              Core, mocked-server and optional browser regression suite
docs/               Setup, schemas, API, security, presentation and test record
.github/workflows/  Test, build and GitHub Pages deployment
dist/               Generated public demo, only this folder is deployed
```

## Build and test

```sh
node --test tests/core.test.cjs tests/backend.test.cjs
node scripts/build.cjs
```

Equivalent npm commands are `npm test`, `npm run build` and `npm start`. There are no runtime dependencies or package lock requirements. The build generates `dist/`, `apps-script/Index.html` and `apps-script/Core.gs`; do not edit generated files directly.

Optional real-browser test (requires a separate Playwright install and installed browser):

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
```

Run the preview server first. To use installed Edge instead, set `BROWSER_CHANNEL=msedge` in your shell. Screenshots and the test report land in ignored `test-results/`.

## Read next

1. [Setup and deployment](docs/SETUP.md)
2. [Two-day presentation plan](docs/PRESENTATION.md)
3. [Sheet schemas and data contracts](docs/SCHEMA.md)
4. [Apps Script endpoints](docs/API.md)
5. [Architecture, security and operational limits](docs/SECURITY.md)
6. [Testing and release status](docs/TESTING.md)

## Release status

The presentation demo, authenticated GitHub portal, mocked backend and private Google authentication are tested. The Apps Script endpoint is deployed as an owner-run API and rejects unauthenticated requests. **Gemini calls and Drive PDF generation still require the server-side Gemini key and live smoke tests.** No real client data was uploaded during development.
