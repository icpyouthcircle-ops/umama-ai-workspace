# Apps Script endpoints

This app uses Apps Script HTML Service RPC, not public REST. There is no `doPost`, API-key-bearing browser fetch, CORS bypass, JSONP or `no-cors` write path.

## Entry points

| Function | Caller | Access |
| --- | --- | --- |
| `doGet()` | Google-hosted `/exec` page | Identity + allowlist before HTML is served |
| `api(request)` | `google.script.run` from hosted UI | Identity + allowlist on every action |
| `setupWorkspace()` | Owner in script editor | Identity + allowlist; idempotent schema setup |

All helper functions end in `_`, making them private to Apps Script RPC. `WorkspaceCore` is a shared object containing validation and state transitions; it exposes no callable top-level storage helpers.

## Envelope

```js
google.script.run
  .withSuccessHandler(result => {
    if (result.ok) { /* use result.data */ }
    else { /* display result.error.message */ }
  })
  .withFailureHandler(() => { /* transport failure: reload before retry */ })
  .api({ action: 'bootstrap' });
```

Response: `{ok:true,data:...}` or `{ok:false,error:{code,message}}`. Authentication failures reveal no client data. Provider bodies, API keys, storage IDs and stack traces are not returned. RPC is asynchronous; the UI disables actions while work is in progress.

## Actions

| Action | Required payload | Result |
| --- | --- | --- |
| `bootstrap` | None | clients, actor, aiConfigured |
| `create` | requestId, data: name/raw/url/service/consent | New snapshot at revision 1 |
| `provision` | requestId, id, expectedRevision | New snapshot with a private client-folder link |
| `change` | requestId, id, expectedRevision, command | New snapshot |
| `extract` | requestId, id, expectedRevision | Gemini facts, validated source quotes, all unverified |
| `generate` | requestId, id, expectedRevision, module | Saved AI draft of selected module |
| `history` | id | Up to 30 latest event summaries, newest first |
| `report` | id, expectedRevision, final boolean | `{html}` for draft; `{url,revision}` for approved PDF |

Requests are limited to 25,000 serialized characters. Use the exact request ID and payload if retrying an uncertain mutation. A successful prior mutation with the same ID returns its original snapshot. Reusing that ID with a different payload or actor is rejected. The provided UI does not automatically retry uncertain transport failures; reload reconciles the saved state first. Model calls can still incur duplicate cost if two identical requests race before either commits; only the saved mutation is deduplicated.

### Change commands

```json
{"type":"intake","payload":{"name":"Test Client","raw":"Role: Designer","url":"","service":"Full profile","consent":true}}
```

```json
{"type":"fact","payload":{"id":"fact-1","value":"Designer","status":"verified","evidence":"Confirmed against intake document"}}
```

```json
{"type":"module","payload":{"module":"headline","content":"Brand designer | Identity systems for founders"}}
```

```json
{"type":"approve","payload":{"module":"headline","attested":true}}
```

The browser cannot submit a raw extraction command through `change`. Only the extraction endpoint can create AI-extracted facts, and it validates source quotations before commit. Actor, time, client ID, revision progression and approval metadata are assigned on the server.

## Consistency

1. Acquire a script lock for a write or revision check.
2. Look for a committed idempotency key.
3. Compare `expectedRevision` with the newest snapshot.
4. Validate the operation and derive the next state.
5. Append one canonical row and flush.
6. Release the lock.

Model calls and Drive-folder setup occur outside the commit lock. Each commit repeats the revision check afterward, so a slow external operation cannot overwrite newer work. Client folders use a deterministic name containing the server client ID, making retries safe. Report generation holds the lock to keep the approved snapshot and file generation consistent. A PDF filename is deterministic per revision, permitting reuse after a lost response.

## Error codes

`UNAUTHORIZED`, `VALIDATION`, `NOT_FOUND`, `CONFLICT`, `CONSENT`, `QUALITY`, `CAPACITY`, `CONFIG`, `BUSY`, `RATE_LIMIT`, `AI_FORMAT`, `AI_SOURCE`, `AI_UNAVAILABLE`, `INTERNAL`.

The user can continue editing when Gemini is unavailable. AI errors do not partially save drafts. Transport errors require a reload to determine whether a commit succeeded. Conflict errors keep the unsaved editor text visible for copying.
