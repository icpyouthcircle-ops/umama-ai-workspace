# Sheet schemas and data contracts — version 1

## Canonical Google Sheet: ClientEvents

The single append-only tab stores complete client snapshots. There is deliberately no second mutable Clients table: one successful row append is one canonical commit, so client state and history cannot drift because of a failed second write.

| Column | Header | Type | Rule |
| --- | --- | --- | --- |
| A | `request_id` | string | UUID/idempotency key, unique per logical mutation |
| B | `client_id` | string | Server-generated UUID |
| C | `revision` | integer | Starts at 1; increments by 1 for each mutation |
| D | `event_type` | string | create, extract, generate, intake, fact, module or approve |
| E | `created_at` | string | Server UTC ISO timestamp |
| F | `actor_email` | string | Authorized Google identity, never supplied by browser |
| G | `request_hash` | string | SHA-256 digest binding actor and exact request content |
| H | `snapshot_json` | JSON string | Full client snapshot, max 44,000 characters |
| I | `schema_version` | integer | 1 |

Setup verifies header names and order on each storage access. Do not rename columns, sort only part of the sheet, insert blank records or edit JSON by hand. Latest appended snapshot per client is the current projection. The UI reads up to 30 recent history entries; all retained snapshots remain in the sheet.

Limits are intentionally conservative for a small internal MVP: 100 clients, 2,000 total revisions, 12,000-character raw intake, 24 facts, 600-character fact values, 800-character quotations, 500-character evidence notes, 6,000 characters per module and 44,000 characters per full record. Saves fail with an explicit error before exceeding limits. Plan a database migration before this boundary.

## Client snapshot

```json
{
  "id": "server-generated-uuid",
  "schemaVersion": 1,
  "revision": 1,
  "name": "Fictional Client",
  "url": "",
  "service": "Full profile",
  "raw": "Role: Designer\nAudience: Founders\nOffer: Brand design",
  "consent": true,
  "consentAt": "2026-09-28T12:00:00.000Z",
  "createdAt": "2026-09-28T12:00:00.000Z",
  "updatedAt": "2026-09-28T12:00:00.000Z",
  "updatedBy": "authorized-admin-email",
  "workspace": {
    "url": "https://drive.google.com/drive/folders/example",
    "provisionedAt": "2026-09-28T12:00:00.000Z",
    "status": "ready"
  },
  "facts": [],
  "modules": {},
  "extracted": false
}
```

Service labels describe the engagement. Phase 1 uses the same six-module final-report gate for all labels; service-specific report templates are not implemented.

### Fact

```json
{
  "id": "fact-1",
  "key": "role",
  "value": "Brand identity designer",
  "source": "Role: Brand identity designer",
  "status": "verified",
  "evidence": "Client confirmed role in an intake call; reference recorded here.",
  "verifiedBy": "authorized-admin-email",
  "verifiedAt": "2026-09-28T12:00:00.000Z"
}
```

Allowed keys: `role`, `audience`, `offer`, `goal`, `tone`, `cta`, `experience`, `proof`. Status is `unverified`, `verified` or `rejected`. Exact quotations are checked against raw intake at extraction. Human edits may refine a fact's value while retaining the original quotation and recording the confirmation evidence. Multiple conflicting verified values for a category block approval; combine legitimate details into one confirmed summary and reject superseded facts.

AI never marks a fact verified. Missing-information detection counts only verified categories. A source change or re-extraction clears prior verification and invalidates all module approvals. Version history retains the older facts.

### Module

Keys: `audit`, `headline`, `about`, `experience`, `positioning`, `pillars`.

```json
{
  "content": "Reviewed draft text",
  "status": "draft",
  "version": 1,
  "updatedAt": "2026-09-28T12:00:00.000Z",
  "updatedBy": "authorized-admin-email",
  "approvedAt": null,
  "approvedBy": null,
  "stale": false,
  "origin": "manual"
}
```

Generation or manual save increments the module's version and sets `draft`. Approval records the actor/time without changing the content version; the parent client revision still advances. Source/fact changes mark modules stale and revoke approvals. Editing and saving after source changes explicitly establishes a newly reviewed draft, which still requires approval.

## Other storage

| Store | Contents |
| --- | --- |
| Script properties | Server configuration; per-admin UTC AI request counters |
| Drive report folder | Approved PDF named `Umama-<client-id>-revision-<revision>.pdf` |
| Client workspace root | One deterministic client folder with five numbered workflow subfolders |
| Demo localStorage | `umama-demo-v1`: schemaVersion, clients and immutable snapshot events |
| Demo sessionStorage | Non-security UI convenience flag `umama-demo-open` |

Each provisioned client has `01 Intake & Documents`, `02 Profile Drafts`, `03 Content Strategy`, `04 Feedback` and `05 Final Delivery`. Final PDFs for provisioned clients are saved in Final Delivery and reuse the same file for the same client revision. Draft HTML downloads are generated from current state and are not uploaded to Drive. No email is sent, and nothing is published to LinkedIn.

## Backup, retention and deletion

Restrict Sheet and folder access, and make a private backup before operational changes. A restore uses the complete event sheet, not a partial range. Routine access/deletion policies must be agreed with the operating business before real clients are onboarded. There is no end-user delete button in Phase 1. An administrator must remove all snapshots for a client and their report files, including backups according to the agreed retention policy. Do not assume deleting the latest row deletes history.
