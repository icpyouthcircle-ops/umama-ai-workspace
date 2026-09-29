# Setup and deployment

## 1. Run the demo today

1. Install Node.js 20+ if it is not already available.
2. Open a terminal in the project folder.
3. Run `node scripts/serve.cjs`.
4. Open http://127.0.0.1:4173 in Chrome or Edge.
5. Choose **Open presentation demo**. Use **Settings → Reset fictional demo** before rehearsal.

No API key, login or internet generation service is required. Fonts may fall back to Arial when offline; all functional assets are local. Demo content persists only on this browser and is not protected by the login screen. Use fictional data.

## 2. Publish the demo on GitHub Pages

1. Create a repository named `umama-ai-workspace` in your GitHub account.
2. Place this project's contents at the repository root, including `.github/workflows/pages.yml`. Do not upload a ZIP as the repository's only file.
3. Push to the `main` branch.
4. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
5. Run **Test and deploy presentation demo** from Actions if it did not start automatically.
6. Wait for both build and deploy jobs to pass. Open the URL shown by the deployment.
7. Test New client, sample extraction, generation, save, approve and report download there.

The workflow deploys **only `dist/`**, not Apps Script server files, documentation, snapshots or reports. Relative asset URLs support a project path such as `/umama-ai-workspace/`. Do not put any real client fixtures in `frontend/sample.js` or any secrets anywhere in the repository.

## 3. Create private Google storage

Use the Google account that will own and operate the workspace (ideally Umama's). A single authorized owner is the recommended MVP configuration.

1. Create a Google spreadsheet named **Umama Workspace — Private Data**.
2. Copy the spreadsheet ID from its URL (between `/d/` and `/edit`).
3. Create a Drive folder named **Umama Workspace — Private Reports**.
4. Copy its folder ID from the URL.
5. Keep both resources restricted to the owner. Check that the folder has no public link or inherited broad sharing.

The app does not change sharing permissions. Report files inherit their folder's access. If adding another trusted admin later, they need explicit access to both resources because the app runs as the accessing user. This is a shared internal workspace, not multi-tenant client isolation.

## 4. Create the Apps Script project

1. Run `node scripts/build.cjs` locally.
2. Create a standalone project at [Google Apps Script](https://script.google.com/).
3. Name it **Umama AI Workspace — Private**.
4. Add/copy these files from the local `apps-script/` folder:

   | Local file | Apps Script editor file |
   | --- | --- |
   | `Code.gs` | Script file `Code` |
   | `Core.gs` | Script file `Core` |
   | `Index.html` | HTML file `Index` |
   | `appsscript.json` | Manifest, enabled through Project Settings |

5. In **Project Settings → Script properties**, set the following. These values are private server configuration; do not put them in frontend files.

   | Property | Value |
   | --- | --- |
   | `ADMIN_EMAILS` | Exact authorized Google email; comma-separated for additional trusted admins |
   | `SPREADSHEET_ID` | ID of the private spreadsheet |
   | `REPORT_FOLDER_ID` | ID of the private report folder |
   | `CLIENT_FOLDER_ROOT_ID` | Optional dedicated client-workspace root; falls back to `REPORT_FOLDER_ID` |
   | `GEMINI_API_KEY` | Key created in Google AI Studio for your account/project |
   | `GEMINI_MODEL` | An available Gemini model supporting `generateContent` and JSON-schema structured output; verify access in your own project |
   | `AI_DAILY_LIMIT` | Optional daily per-admin request cap; default `50`, maximum `500`, UTC reset |

No fixed model is hardcoded: availability and compatibility can change. The adapter uses REST `generateContent` with `generationConfig.responseFormat.text` (`mimeType` and `schema`), matching the linked REST structured-output example reviewed for this build. Test the selected model's structured output support before presentation. An unavailable/incompatible model returns an actionable error and does not overwrite saved work.

6. Select and run **setupWorkspace** in the editor using an allowlisted account.
7. Review Google's authorization request and grant the scopes needed for your own Sheet, Drive, account email and external Gemini requests.
8. Confirm that the spreadsheet contains a `ClientEvents` tab with nine headers. Running setup again preserves data.

The manifest includes broad Sheets and Drive scopes because this MVP uses `SpreadsheetApp` and `DriveApp`. Use a dedicated operating account with appropriately limited access and only trusted script editors. External OAuth distribution can require additional Google configuration or verification; this MVP is intended for the owner, not general public sign-up.

## 5. Deploy securely

1. Choose **Deploy → New deployment → Web app**.
2. Set **Execute as: User accessing the web app**.
3. For the single-owner MVP, choose **Only myself** for access. If you later need multiple internal admins, choose the most restrictive authenticated Google-account/domain option your account offers and keep the server allowlist enabled.
4. Never choose anonymous/public unauthenticated access. Do not switch to **Execute as me** as a shortcut for login problems.
5. Deploy and copy the `/exec` URL. Use the deployed version, not the editor's `/dev` test URL, for the presentation.
6. Sign in as the allowlisted operating user and verify access. If Google does not provide the active email, the application deliberately denies access.
7. Confirm an unauthorized account cannot view the interface or call API actions.

Google performs sign-in and authorization before serving the private workspace. The server checks active/effective identity and the allowlist on every entry point. **Lock workspace** clears the visible UI only; it does not sign out of Google. Close the tab and sign out of Google separately on shared devices.

## 6. Connect the public demo's login button

In `frontend/config.js`, set only the public URL:

```js
window.WORKSPACE_CONFIG = Object.freeze({
  liveWorkspaceUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
});
```

Build again and redeploy GitHub Pages. A deployment URL is not a secret and grants no access by itself. The button opens the Google-hosted private app; the static demo never stores a bearer token or invokes a cross-origin write endpoint.

## 7. Live smoke test before using real data

Use fictional data until every check passes:

- Owner Google sign-in succeeds; a non-allowlisted identity fails.
- New client persists in the private Sheet and survives reload.
- Live Gemini extraction produces traceable quotations and unverified facts.
- Missing or invalid API configuration leaves saved work unchanged.
- Fact verification records evidence, actor and time.
- All six modules generate sensible output, using the verified facts.
- Save and approval create new revisions; editing revokes approval.
- Two tabs editing the same revision produce a conflict, not lost data.
- Final export is blocked until all six modules pass approval.
- The approved PDF opens, has correct layout/content, and is private in Drive.
- The published GitHub demo contains no real client data or secrets.

## Updating the live version

Edit source files, run tests and build, then copy updated `Code.gs`, `Core.gs`, `Index.html` and any manifest changes into Apps Script. Under **Deploy → Manage deployments**, edit the deployment and select a new version. Existing deployed URLs keep their configuration. Test the `/exec` URL again. Back up the private Sheet and report folder before schema changes.

## Troubleshooting

| Message | Action |
| --- | --- |
| Access denied/unavailable | Check signed-in account, admin email, execute-as-user deployment and resource permissions. Blank identity fails closed. |
| Workspace storage not configured | Set script properties and run `setupWorkspace`. |
| Gemini could not complete request | Check model access, structured-output compatibility, billing/quota and key restrictions. |
| Extracted quotation not found | AI output did not match source text; retry or clarify intake. It was not saved. |
| Newer version exists | Copy unsaved text, reload, then intentionally reapply edits to the latest version. |
| Record/revision capacity reached | Back up and migrate before continuing; do not delete arbitrary event rows. |
| Demo storage unavailable | Use a regular browser window; reset the fictional demo if its schema/storage is corrupt. |
| PDF generation fails | Check folder access and conversion quotas. Draft HTML export remains available. |

## Official references checked for the design

- [Apps Script web apps and execution identity](https://developers.google.com/apps-script/guides/web)
- [Session identity and email limitations](https://developers.google.com/apps-script/reference/base/session)
- [Client-to-server communication](https://developers.google.com/apps-script/guides/html/communication)
- [Script properties](https://developers.google.com/apps-script/guides/properties)
- [Apps Script service quotas](https://developers.google.com/apps-script/guides/services/quotas)
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini generateContent structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)
- [GitHub Pages custom deployment workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

Documentation was reviewed on 28 September 2026. Confirm account-specific deployment options, quotas, model access and OAuth requirements at setup time.
