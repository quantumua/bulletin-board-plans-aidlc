# Units of Work: User Login for the Bulletin Board

Sources: `inception/domain-design/components.md` (7 components), `inception/domain-design/decisions.md` (ADR-001 to ADR-006), `inception/requirements-analysis/requirements.md`, and the confirmed answers in `units-generation-questions.md` (Q1, Q2, approved plan).

Strategy: one unit per repository and owning team (Q1). The units don't depend on each other; both build against the API contract pinned in Contract Design (Q2).

## Unit Index

| Unit ID | Directory | Name | Kind | Repository | Components | Complexity |
|---|---|---|---|---|---|---|
| U1 | `u1-backend-auth` | Backend accounts, login and ad ownership | service | `bulletin-board-backend` | Accounts, Authentication, Ads | M |
| U2 | `u2-frontend-login` | Frontend sign-up, log-in and owner-aware board | ui | `bulletin-board-frontend` | ApiClient, CurrentUser, AuthPanels, AdBoard | M |

## U1 — `u1-backend-auth`

**Description:** adds user accounts, server-side login sessions and ad ownership to the Spring Boot REST API.

**Boundaries:** everything inside `bulletin-board-backend`. It exposes the HTTP API defined in Contract Design and consumes nothing from U2.

**Responsibilities (what it owns and delivers):**
- **Accounts** (new feature package beside `ad/`):
  - the `UserAccount` entity;
  - sign-up validation (email format and uniqueness, password 8–128 characters, display name 1–50 characters);
  - salted adaptive password hashing;
  - credential verification;
  - failed-attempt counting with a 15-minute lockout after 5 failures;
  - display-name lookup by account id.
- **Authentication:**
  - sign-up-and-log-in, log-in, log-out and current-user endpoints;
  - server-side sessions with an HttpOnly, same-site browser-session cookie, with the id replaced at log-in (ADR-001);
  - caller identity resolution;
  - anti-forgery tokens on state-changing requests (ADR-006);
  - "not logged in" problem-details errors.
- **Ads (existing package, extended):**
  - `Ad` gains `ownerId`;
  - create sets the owner from the caller, and edit is allowed only for the owner, never changes the owner, and is refused for unowned ads (ADR-005);
  - responses carry the poster's display name ("Unknown" when unowned) and whether the caller owns the ad, and never an email.
- **Configuration:**
  - CORS stays as today, since serving is same-origin (NFR4);
  - the H2 console stays open (C3).
- **Tests:**
  - the existing `AdControllerTests` are updated where they relied on anonymous create and edit;
  - targeted regression tests cover anonymous create and edit, and editing someone else's ad (NFR6).

**Deployment model:** standalone. The backend Spring Boot application deploys as today, with in-memory H2 wiped on restart (C2).

**Implementation notes and constraints:**
- Follow the existing conventions (codekb backend `code-structure.md`):
  - one feature package per concern, with security configuration in `config/`;
  - constructor injection;
  - records for DTOs;
  - problem-details errors (NFR7).
- The ads service receives the caller's identity as an explicit parameter. It never reads it from a request body (ADR-005).
- Updates to the failed-attempt counter and lock must be safe under concurrent wrong-password attempts, and lock expiry must be testable against an injectable clock.
- Spring Boot 4 uses per-starter test modules, so a matching security test starter is needed (codekb backend `code-quality-assessment.md`).

## U2 — `u2-frontend-login`

**Description:** adds sign-up and log-in panels, a shared current-user state and owner-aware create and edit controls to the React single-page app.

**Boundaries:** everything inside `bulletin-board-frontend`. It calls the U1 API only through the contract pinned in Contract Design, and builds against that contract without waiting for U1.

**Responsibilities (what it owns and delivers):**
- **ApiClient** (`src/api.ts`, extended):
  - same-origin requests that carry the session cookie;
  - the anti-forgery header on state-changing requests;
  - tolerance for empty (204) responses;
  - a "session ended" signal on "not logged in" responses;
  - auth calls: sign-up, log-in, log-out, current user.
- **CurrentUser (new):** an app-wide state (React context) that:
  - loads the current user on page load;
  - provides sign-up, log-in and log-out actions;
  - switches to logged-out when the session ends, without clearing forms.
- **AuthPanels (new):** sign-up and log-in panels on the existing single screen with no routing library (ADR-004). They have:
  - labelled, keyboard-operable fields;
  - field-level error text;
  - typed input kept except the password;
  - the logged-in name shown with a "Log out" control.
- **AdBoard (`App.tsx` and `AdForm.tsx`, extended):**
  - poster names shown on every ad, as literal text;
  - the "New ad" form only when logged in;
  - "Edit" only on the user's own ads;
  - refusal messages shown, and typed input kept when a save is refused.

**Deployment model:** standalone. Static assets are built by Vite and served from the same web address as the API. Development keeps the Vite `/api` proxy (NFR4).

**Implementation notes and constraints:**
- Follow the existing conventions (codekb frontend `code-structure.md`):
  - function components;
  - local state plus the new context;
  - 2-space indent with no semicolons;
  - a single global stylesheet.
- The repository has no test runner today, so any frontend tests added for this unit bring their own tooling. The security-patch test floor applies to the backend regression (NFR6).

## Assumptions & Open Questions

None.
