## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-21T09:58:17Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | bulletin-board-frontend/src/App.tsx > `canWrite = user !== null or sessionEnded`; bulletin-board-frontend/src/auth/CurrentUserContext.tsx > `clearSessionEnded` | `sessionEnded` is only reset by a successful log-in or log-out. `clearSessionEnded` is exported but nothing calls it. A visitor who sees the "session ended" notice and presses Cancel keeps the "New ad" form (and any open edit form) on screen indefinitely, although logged out. This is a deliberate trade-off to keep typed input (AC3.4), but it contradicts AC4.1 for that visitor. | Either clear the flag when the log-in panel is cancelled and no ad form holds typed input, or document the behaviour in the code summary and remove the unused `clearSessionEnded`. | New |
| R-02 | Minor | bulletin-board-frontend/src/AdForm.tsx > error rendering | A 400 `validation_failed` on create or edit shows only the generic `detail` ("One or more fields are invalid"). The per-field `errors[]` already parsed into `ApiError.fieldErrors` are dropped, and nothing links the error to a field. After a session-ended error the stale alert also stays visible after the user logs in again, until the next submit. | Show `fieldErrors` next to the title and description fields with `aria-describedby`, and clear the form error when the session is re-established. | New |
| R-03 | Minor | bulletin-board-frontend/src/AdForm.tsx > `handleSubmit`; bulletin-board-frontend/src/AdForm.test.tsx | Double-submit protection in AdForm relies on a state-driven disabled button, with no ref guard (AuthPanels has one) and no test. Duplicate ads are unlikely in practice but the NFR4.4 behaviour is only evidenced for the auth panels. | Add a ref guard, or a test showing two rapid submits send one request. | New |
| R-04 | Minor | bulletin-board-frontend/src/auth/AuthPanels.test.tsx; bulletin-board-frontend/src/App.test.tsx | No UI-level test shows that a `csrf_invalid` refusal surfaces the "security token expired" message and keeps typed input. It is covered only at the ApiClient level in `api.test.ts`. The tests that exist assert real behaviour and none are vacuous. | Add one AdForm or AuthPanels test for the `csrf_invalid` message with input kept. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npm --prefix bulletin-board-frontend test` | PASS: 6 files, 45 tests | Matches the code summary. Tests assert concrete values: header re-read per call, no resend after `csrf_invalid`, no storage calls, and markup rendered as text. |
| `npm --prefix bulletin-board-frontend run lint` | PASS: oxlint clean | No findings. |
| `npm --prefix bulletin-board-frontend run build` | PASS: `tsc -b` and `vite build`; JS 72.17 kB gzip | Matches the summary (+2.68 kB against a 15 kB budget). |
| Source scope check against `source-manifest.json` | PASS | Only manifest paths are touched; nothing unrelated was found. |

### Summary

The unit holds up under adversarial checks of the focus areas.
- CSRF: the cookie is re-read on every non-safe request, `csrf_invalid` refreshes through `/auth/me` and never resends, and credentials are `same-origin`.
- Password and storage: the password is cleared on every submit, and no browser storage is used.
- XSS: user text renders as React text only.
- Owner-only UI: Edit is shown only for `user && ownedByMe`, and the code says the backend is the real control.
- Error mapping: it uses `code` first and falls back to status.
- Accessibility: fields have labels, `aria-describedby`, and `role="alert"` on errors.
- Double submit: the auth panels block it with a ref.

Only minor polish items remain.
