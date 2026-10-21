## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-20T16:22:21Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261020-user-login/inception/contract-design/contract-summary.md > C1 "Order of checks on protected ad operations" and C2 | The anti-forgery check runs before the login check. A direct API call from an anonymous caller with no XSRF token (for example a script or old client) gets 403 "Invalid or missing anti-forgery token", not 401 "not logged in". Requirements AC4.2, AC4.6 and the NFR5 pass criterion expect "refused as not logged in" when the API is called directly. Legacy C2 clients cannot send the token, so every write from them is a 403 CSRF refusal, which is not stated. | Either state explicitly that AC4.2, AC4.6 and AC3.2 are met by "refused" (401 or 403) when called without a token, or reorder so an anonymous caller gets 401 first. Also state the effect on C2 clients, which can never write. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261020-user-login/inception/contract-design/contract-summary.md > Status codes table and /auth/login | The frontend must raise a "session ended" signal on a "not logged in" 401. But 401 is also the response to wrong credentials at log-in, and the two differ only by the `detail` text. Matching on text is brittle (additive changes may reword `detail`). 403 is likewise overloaded: CSRF versus not-owner versus unowned ad. | Add a stable machine-readable discriminator, for example a problem `type` URI or a `code` field per error. Alternatively state that the session-ended signal applies only to non-auth endpoints. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261020-user-login/inception/contract-design/contract-summary.md > C1 /auth/login and /auth/signup responses | `/auth/login` lists no 400 for a malformed or missing body. The ad endpoints already document 400, so login would be the odd one out. The `Problem` examples also do not say whether the `type` field is `about:blank`. | Add 400 to `/auth/login`, and say whether `type` is always `about:blank`. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261020-user-login/inception/contract-design/contract-summary.md > C1 `session` security scheme | The cookie name is the placeholder `SESSION_COOKIE`, while the cross-cutting rules say U1 chooses it. A reader may take the placeholder literally. | Note in the scheme that the name is not part of the contract, or fix a name. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261020-user-login/inception/contract-design/contract-summary.md > C2 | The existing API returns `400` when `id` is not a number. Neither C1 nor C2 documents this on `/ads/{id}`. The XSRF cookie on GET requests is also not stated for C2. | Add 400 for a non-numeric id on `/ads/{id}` in C1 and C2, and say whether C2 GETs issue the XSRF cookie. | New |
| R-06 | Minor | aidlc/spaces/default/intents/261020-user-login/inception/contract-design/contract-summary.md > Open Questions (423 vs 401) | The 423 lock response reveals that an email is registered. This contradicts the generic message in FR2.2 and is a user-enumeration vector. It is already flagged and follows FR2.3 as approved, so the human should weigh it at the gate. | Confirm at the gate that the 423 behaviour stays. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| none listed | n/a | Manual cross-check of the contract against FR1 to FR5, NFR1 to NFR8 and the U1/U2 boundaries. Every U2 call (me, signup, login, logout, ads CRUD) resolves to a C1 path. |

### Summary

The contracts cover every U1/U2 integration point and agree with the requirements, the components and the existing API. The main item to weigh is that checking the anti-forgery token before login changes what a direct anonymous call returns (403, where the acceptance criteria say "not logged in"). The other findings are minor clarifications.
