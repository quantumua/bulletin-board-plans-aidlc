# Contract Design — Questions

Context: one boundary, U2 `u2-frontend-login` (frontend) → U1 `u1-backend-auth` (backend), synchronous HTTP JSON on the same web address under `/api`, with a session cookie and an anti-forgery token (ADR-001, ADR-006). The existing ads API (`GET/POST /api/ads`, `GET/PUT /api/ads/{id}`) and its problem-details errors stay; ad responses gain the poster's display name and an "is this mine" flag.

## Q1. What should the login endpoints look like?

A. Action-style under `/api/auth`: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` (recommended: easy to read, one prefix to protect)
B. Resource-style: `POST /api/accounts` (sign up), `POST /api/session` (log in), `DELETE /api/session` (log out), `GET /api/session` (current user)
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. How should the contract handle change over time?

A. Keep paths unversioned; only additive changes (new optional fields, new endpoints) without agreement; any breaking change is agreed by both teams by changing this contract first (recommended: two small teams, one product)
B. Version the paths (`/api/v1/...`) and keep old versions running during breaking changes
C. Not yet defined
X. Other (please specify)

[Answer]: B

## Q3. When a logged-in user tries to edit someone else's ad, what should the API answer?

A. 403 Forbidden ("You can only edit your own ads") — honest, and the ad's existence is already public (recommended)
B. 404 Not Found — pretend the ad does not exist for them
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. What should "who am I" return to a visitor who is not logged in?

The frontend calls it on every page load (FR3.3); it is also where the anti-forgery token is first handed out.

A. 200 with `{ "user": null }` (recommended: a normal state, not an error; no console noise on every visit)
B. 401 Unauthorized
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. Follow-up: what happens to the existing ads paths with versioning?

You chose versioned paths (Q2). The ads API lives today at unversioned `/api/ads`, and the ad response is changing in this work (new poster name and "is mine" fields; create and edit now need login).

A. Move everything to `/api/v1/...` (`/api/v1/ads`, `/api/v1/auth/...`) and remove the old `/api/ads` in the same release; the only client (our frontend) switches at the same time (recommended: one consistent scheme, no old version to keep secure)
B. Move everything to `/api/v1/...` but keep the old `/api/ads` running unchanged for a transition period (the old path would still allow anonymous create and edit, which undoes the fix)
C. Keep `/api/ads` as is and version only the new login endpoints (`/api/v1/auth/...`)
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q6. Follow-up: the old `/api/ads` path and the login protection

Keeping the old `/api/ads` running unchanged (Q5) conflicts with the approved requirements: create must need login and only the owner may edit (FR4.2, FR4.3), enforced on the server for every path (NFR5). An unchanged old path would let anyone create or edit any ad, which is the problem this work fixes (intent).

A. Keep `/api/ads` for the transition, but with the same login and ownership protection as `/api/v1/ads` (old response shape, new rules), removed when the transition ends
B. Keep `/api/ads` fully unchanged, including anonymous create and edit, accepting that ownership is not enforced while it exists
C. Drop the old path after all and move everything to `/api/v1` in one release
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q7. Follow-up: how long does the transition last?

A. Until the frontend release that switches to `/api/v1` ships, then the old path is removed
B. A fixed period after `/api/v1` ships (e.g. 30 days)
C. No end date yet; removal is a later decision
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Consolidated Summary Confirmation

- Login endpoints: `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` [Q1, Q5]
- Paths are versioned under `/api/v1/...`; a breaking change goes into a new version while the old one keeps running [Q2]
- Ads move to `/api/v1/ads` (with poster name and "is mine"); the old `/api/ads` keeps its old response shape but gets the same login and ownership rules [Q5, Q6]
- The old `/api/ads` has no removal date yet; removal is a later decision [Q7]
- Editing someone else's ad answers 403 Forbidden ("You can only edit your own ads") [Q3]
- "Who am I" answers 200 with `{ "user": null }` for visitors and hands out the anti-forgery token [Q4]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
