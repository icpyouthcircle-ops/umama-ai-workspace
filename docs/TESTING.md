# Test record — 28 September 2026

## Verified locally

**20 automated core/server tests passed.** Server tests run the actual Apps Script source inside a Node VM with mocked Google services; they do not contact Google.

- Intake validation, consent, length limits and safe LinkedIn URL format.
- Exact extraction quotations, unverified-by-default facts and invalid output rejection.
- Evidence required to verify a fact; rejected claims excluded from generation.
- Mandatory human attestation and content/source quality checks.
- Content edits and source changes revoke approvals; older snapshots are preserved.
- Conflicting verified facts, headline/About limits and malicious module keys.
- Full six-module approval flow and escaped final-report rendering.
- Every API action rejects unauthorized, blank and mismatched identities.
- Idempotent mutation replay and rejection of request-ID reuse with altered content.
- Stale saves and races during AI calls cannot overwrite newer versions.
- Invalid/truncated/provider-error AI responses do not commit or leak keys.
- Daily request budgets, server-side final-report gating and header drift detection.
- PDF generation/reuse per revision with mocked Drive conversion.
- Manual saves cannot impersonate AI provenance.

**Browser regression flow passed in installed Microsoft Edge, driven by Playwright.**

- Demo entry, new client, sample notes, extraction and all eight fact reviews.
- Cancelling a fact review does not save or submit the form.
- All six generators, editor changes, save and explicit approval.
- Final HTML download and content validation.
- Reload persistence, revision history and a real two-tab stale-write conflict.
- Unsaved text retained when a conflicting save is rejected.
- Demo reset, desktop layout at 1440 × 1080 and mobile at 390 × 844.
- No document-level horizontal overflow at the checked mobile views; tables, navigation and module tabs scroll within their own containers.
- No uncaught JavaScript errors in the checked primary flow.

Desktop dashboard, desktop writing workspace and mobile dashboard/workspace screenshots were visually inspected. An oversized-icon issue and a screen-reader-label overflow were found and fixed before the final passing run. The test selector was also corrected where two Settings buttons legitimately existed.

The build succeeds and frontend scripts pass Node syntax checks. The app has no runtime package dependencies. Optional Google Fonts may fall back when unavailable.

## Not yet verified live

- Google OAuth consent, account-specific sign-in and deployment settings.
- Actual Sheets append/flush behavior and real-world service latency/quotas.
- Gemini model availability, billing, quality and exact schema compatibility for the owner's chosen model.
- Actual Google Drive PDF conversion, final pagination and inherited sharing.
- GitHub Actions execution and a public GitHub Pages URL.
- Other browser engines, exhaustive accessibility review, formal security audit or load testing.

Live credentials and owner-owned resources were not supplied. Follow SETUP.md's live smoke-test checklist before using real client data. This test record distinguishes tested local behavior from integrations that still need live validation.

## Reproduce

```sh
node --test tests/core.test.cjs tests/backend.test.cjs
node scripts/build.cjs
node scripts/serve.cjs
```

In a second terminal with Playwright and its browser installed:

```sh
node tests/browser.cjs
```

Use `BROWSER_CHANNEL=msedge` to select an installed Edge browser. Artifacts are saved to `test-results/`. Run the suite against fictional data only; its browser context is isolated from your normal profile.
