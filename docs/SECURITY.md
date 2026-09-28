# Architecture and operating boundaries

## Data flow

```text
Public portfolio (separate future repository)
  └─ optional link to the private workspace

GitHub Pages
  ├─ fictional local demo: browser storage + deterministic templates
  └─ Google login link → Apps Script /exec

Apps Script /exec
  ├─ Google OAuth identity + admin allowlist
  ├─ HTML Service frontend → google.script.run → api()
  ├─ validated state transitions → ClientEvents in private Sheets
  ├─ server-only key → Gemini → schema/source validation → draft
  └─ approved snapshot → HTML/PDF → private Drive folder
```

## Implemented protections

- Google handles authentication; no custom password or browser-held admin secret.
- Allowlist check before serving the live UI and before every server action, including setup.
- Missing email or differing active/effective identities are rejected.
- The manifest defaults to owner-only access, executed as the accessing user.
- Gemini key in Script Properties and request header only, never frontend output.
- No anonymous HTTP write endpoint or cross-origin shortcut.
- Strict action/module/status allowlists and input-length limits.
- Source-quotation validation, human fact verification and restricted generation context.
- Raw intake is treated as untrusted data; only extraction/audit receive it. Writing modules receive verified facts.
- Model output is rendered as text, not executable HTML; reports escape every dynamic field.
- Spreadsheet payload begins with JSON `{`; other cells contain controlled IDs, timestamps and authenticated identities. Raw client text cannot become a sheet formula.
- Script-lock-protected compare-and-swap writes, immutable snapshot history and idempotency checks.
- Per-admin daily AI request budget; provider failures do not commit partial changes.
- Human attestation, automated quality checks, invalidation of stale approvals and server-enforced final-report gate.
- No client data in URLs, logs, analytics, GitHub fixtures or public portfolio integration.

## Practical limits

This is a small internal business MVP, not a multi-tenant SaaS product or a compliance certification. Trusted admins can access all clients and can also access their permitted underlying Google files. Script editors can read Script Properties. Limit editor access accordingly.

Sheets history is append-only **by application convention**, not cryptographically tamper-proof or immutable against spreadsheet owners. Sheet snapshots contain historical personal data; a retention policy must cover history and backups. No automated backup, restore UI, key rotation service, tenant partitioning, background task queue or alerting is implemented.

Prompt instructions and JSON schemas reduce errors but cannot guarantee factual accuracy or prevent every prompt-injection effect. User-supplied evidence notes are human attestations, not independent verification. Automated checks catch specific conditions; they do not establish truth, check every numeric claim, validate external links or browse LinkedIn. No score is invented for a profile that has not been assessed against a defined rubric.

Reports include only module deliverables, not raw intake, evidence notes or internal admin identities. Final report text still needs human review before sending externally. No report is emailed or made public automatically.

Demo login is a presentation entry point, not authentication. Demo persistence uses localStorage and Web Locks and must contain fictional information only. Live client data is held in memory in the browser and not cached into demo storage. Exiting/locking the app does not end Google's session.

All six modules are required for final delivery in this release. There are no per-service optional sections, client self-service logins, 30-day calendars, payment features, CRM integrations or automatic LinkedIn posting. These are outside the requested Phase 1.

## Before real client use

Complete the setup guide's live smoke test. Review the Google account's OAuth and resource access, Gemini data-handling terms for the selected service tier, consent wording, operating budget, report permissions, backup/retention policy and handling of client deletion requests. Use only the information needed for the work; avoid credentials, identity documents and unnecessary sensitive personal details in intake.

Capacity and quota limits are operational constraints. The app caps 100 clients and 2,000 saved revisions to avoid an unbounded full-sheet scan. Model calls are synchronous and Apps Script has runtime/service quotas. Move to a database and job queue when actual volume exceeds the intended small-workspace use case.
