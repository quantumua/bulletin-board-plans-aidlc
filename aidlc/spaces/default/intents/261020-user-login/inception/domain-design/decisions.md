# Architecture Decisions: User Login for the Bulletin Board

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Server-side sessions with an HttpOnly cookie | Accepted |
| ADR-002 | Separate Accounts and Authentication building blocks | Accepted |
| ADR-003 | Ads reference their owner by account id; names are looked up | Accepted |
| ADR-004 | Frontend log-in and sign-up as panels, no routing library | Accepted |
| ADR-005 | Owner-only editing enforced in the ads business logic | Accepted |
| ADR-006 | Anti-forgery tokens for state-changing requests | Accepted |

## ADR-001: Server-side sessions with an HttpOnly cookie

### Status
Accepted

### Context
Login must end when the browser closes (FR3.2), survive a page reload (FR3.3), stop working immediately on log-out (FR3.1, AC3.2), and the credential must not be readable by page scripts (NFR3). Frontend and API share one web address (NFR4). Storage is in-memory and wiped on restart (C2). Chosen in Q1.

### Decision
We will keep login state in a server-side session identified by an HttpOnly, same-site session cookie with no expiry date (a browser-session cookie). The session id is replaced at sign-up and log-in, and the session is invalidated on log-out.

### Consequences
- Positive: log-out revokes access at once; nothing sensitive is stored in the browser beyond an opaque id; page scripts cannot read it; the browser sends it automatically on same-origin requests.
- Negative: state lives on the server, so a backend restart logs everyone out (accepted under C2, handled by FR3.4); horizontal scaling would later need a shared session store.
- Security: because the cookie is sent automatically, cross-site request forgery must be handled (ADR-006). Session fixation is handled by replacing the id at log-in. No server-side idle timeout is set in this version; the session ends with the browser or log-out (open point from the requirements review).

### Alternatives Rejected
- **Signed token (JWT) in an HttpOnly cookie:** no server state, but log-out cannot revoke a token before it expires, which weakens FR3.1 and AC3.2.
- **Signed token in browser storage with an Authorization header:** readable by page scripts, which NFR3 forbids.

## ADR-002: Separate Accounts and Authentication building blocks

### Context
The feature needs account data (email, display name, password hash, lockout counters) and request security (sessions, caller identity, CSRF). These change for different reasons: account features such as password reset are out of scope now but likely later; the session model depends on hosting. Chosen in Q2.

### Decision
We will create two backend building blocks: **Accounts** owns `UserAccount`, registration, password verification and lockout; **Authentication** owns the session, sign-up/log-in/log-out endpoints, caller identity and CSRF, and calls Accounts.

### Consequences
- Positive: each block has one reason to change; Accounts can be tested without HTTP or sessions; password and lockout rules sit with the data they use.
- Negative: two blocks to wire instead of one; sign-up crosses both (Authentication calls Accounts to register, then starts the session).
- Security: password hashes never leave Accounts; Authentication sees only "valid", "invalid" or "locked".

### Alternatives Rejected
- **One Identity block:** fewer parts, but mixes account data with request security, so every session change touches account code.
- **Users inside the Ads feature:** smallest diff, but puts unrelated account data and rules in the ads package and grows it with every account feature.

## ADR-003: Ads reference their owner by account id; names are looked up

### Context
Each ad needs an owner for the edit rule (FR4.3) and must show the poster's display name (FR5.1) without any email (FR5.2). Display names are not editable in this version, but profile editing is a likely follow-up. Chosen in Q3.

### Decision
We will store the owner's account id on `Ad` (`ownerId`). When ads are returned, Ads looks up display names from Accounts; an ad with no owner shows "Unknown" (FR5.3).

### Consequences
- Positive: one source of truth for names; future name changes show everywhere; no personal data copied into ads.
- Negative: listing ads needs a name lookup (one batched lookup per list keeps it cheap).
- Security: only display names cross from Accounts to Ads; emails and hashes never do.

### Alternatives Rejected
- **Copy the display name onto the ad at posting time:** simpler reads, but the copy goes stale as soon as names become editable and duplicates personal data.

## ADR-004: Frontend log-in and sign-up as panels, no routing library

### Context
The frontend is one screen with no routing or shared state (codekb frontend architecture). It needs log-in and sign-up forms and an app-wide "current user". Chosen in Q4 (the team picked panels over the recommended router).

### Decision
We will show log-in and sign-up as panels on the existing screen and add one shared **CurrentUser** state (React context) that panels and the board read. No routing library is added.

### Consequences
- Positive: no new dependency; smallest change to the existing app; the board stays visible behind the panels.
- Negative: no bookmarkable /login or /signup URLs; if more screens arrive later, a router will be needed.
- Security: none beyond normal form handling; all enforcement is on the backend (NFR5).

### Alternatives Rejected
- **Routing library with separate pages:** clean URLs and room to grow, but adds a dependency and restructures the app for two forms.

## ADR-005: Owner-only editing enforced in the ads business logic

### Context
The core goal is that nobody can edit another person's ad (intent, FR4.3–FR4.5), enforced on the server (NFR5). The request body must never set or change the owner (FR4.2; requirements review finding about owner changes on edit). Chosen in Q5.

### Decision
We will enforce ownership in the ads service. Create sets `ownerId` to the caller's account id. Edit loads the ad, refuses anonymous callers ("not logged in"), refuses callers who are not the owner, and refuses every caller for unowned ads ("not allowed"). Edit changes only title and description; `ownerId` is never read from a request body, so it cannot change on edit.

### Consequences
- Positive: the rule sits next to the data and is unit-testable; it cannot be bypassed by a different endpoint; it also guards the owner field on edit.
- Negative: the service needs the caller identity passed in, so its method signatures change and existing tests must be updated (NFR6).
- Security: defence in depth with Authentication, which already refuses anonymous callers before the service runs.

### Alternatives Rejected
- **Declare the rule on the endpoint in a security layer:** keeps the service unaware of users, but splits the rule from the data, needs an extra load of the ad, and is easier to miss on a new endpoint.

## ADR-006: Anti-forgery tokens for state-changing requests

### Context
Session cookies are sent automatically by the browser, so a malicious site could submit create, edit or log-out requests on a logged-in user's behalf (NFR3). The frontend is a script-driven single-page app on the same address as the API (NFR4).

### Decision
We will require an anti-forgery token on every state-changing request (POST, PUT, log-out). The backend issues the token in a cookie the page can read; ApiClient copies it into a request header. Requests without a matching token are refused. The session cookie is also marked same-site.

### Consequences
- Positive: forged cross-site requests are refused (NFR3 pass criterion); this is the standard pattern for cookie sessions with a script-driven frontend.
- Negative: ApiClient must read the token and send the header; tests must include the token.
- Security: the token cookie is readable by page scripts by design; it is not a credential on its own.

### Alternatives Rejected
- **Same-site cookie attribute only:** simpler, but depends on browser behaviour and does not cover every request type, so it does not meet NFR3's pass criterion on its own.
- **No CSRF protection:** leaves create, edit and log-out open to forgery.
