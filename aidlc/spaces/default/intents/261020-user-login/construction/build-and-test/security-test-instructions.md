# Security Test Instructions: User Login (intent 261020-user-login)

This is a security-patch intent. It fixes the vulnerability that anyone could create or edit any ad. The security NFRs come from `requirements.md` (NFR1–NFR3, NFR5, NFR7) and from the per-unit `nfr-requirements/security-requirements.md`: U1 NFR1.1–NFR7.2 and U2 NFR2.7–NFR8.2. The security-patch floor requires targeted regressions that fail on the pre-change code, and an existing suite that stays green.

## Test Framework Setup and Configuration

| Kind | Tool | Scope |
|---|---|---|
| Authentication, session and anti-forgery tests | JUnit 5 + MockMvc (in-process) and `java.net.http.HttpClient` against the embedded Tomcat (real cookies) | U1 |
| Authorisation regressions (the vulnerability) | JUnit 5 + MockMvc: `ad/AdV1ControllerTests`, `ad/AdControllerTests` (legacy) | U1 |
| Secret-leak checks | `OutputCaptureExtension` log capture with marker passwords; response-body assertions | U1 |
| Frontend credential handling, XSS rendering, CSRF header | Vitest + React Testing Library (`fetch` mocked, `document.cookie` set per test) | U2 |
| DAST-style probe of the running API | `scripts/api-smoke.mjs` (anonymous, forged, non-owner, replayed-session and default-deny requests) | U1 via C1/C2 |
| Static code search | ripgrep over `bulletin-board-frontend/src` and `bulletin-board-backend/src/main` | U1, U2 |
| Dependency scan | `npm audit` (frontend). No Maven dependency scanner is configured in the backend build; the security starter's version is managed by the Spring Boot 4.1.1 BOM. | U1, U2 |

No SAST product or OWASP ZAP scan is part of this plan. Recording that is an honest limitation, not a passed check.

## Security Test Inventory

| Area | Target IDs | Tests |
|---|---|---|
| Password storage | NFR1, NFR1.1, NFR1.2, NFR1.4 | `AccountServiceTests` (BCrypt `$2a$12$`, distinct salts, length rules, 72-byte rule), `AuthControllerTests.passwordsHashesAndEmailsNeverReachResponsesOrLogs` |
| Account enumeration | NFR1.3, FR2.2 | `AuthControllerTests.wrongPasswordAndUnknownEmailGetTheSame401` (identical body); `NfrPerformanceMeasurements.nfr1_3_*` (timing parity) |
| Lockout | FR2.3–FR2.5, NFR3.6 | `UserAccountTests`, `AccountServiceTests` (expiry with the mutable clock; 10 parallel wrong attempts), smoke AC2.4 |
| Session cookie | NFR3.1 | `AuthControllerTests.signUpSetsAnHttpOnlySameSiteSessionCookieWithoutExpiry` (real HTTP), smoke NFR3.1 |
| Session fixation | NFR3.2 | `SessionFixationTests` (**new**): replaying the pre-log-in and pre-sign-up session ids is anonymous, and an attacker-chosen id is never adopted |
| Log-out | NFR3.3, AC3.2 | `AuthControllerTests.logOutEndsTheSessionAndTheOldSessionIsAnonymous`, `SessionFixationTests.theSessionCookieBeforeLogOutIsAnonymousAfterwards` (**new**), smoke AC3.2 |
| Anti-forgery | NFR3, NFR3.4, NFR3.5, NFR5.4 | `AuthControllerTests.signUpWithoutAntiForgeryTokenIsRefusedWith403`, `AdV1ControllerTests.anonymousCreateWithoutTokenIsRefusedWith403…`, `SessionFixationTests.theAntiForgeryTokenChangesAfterSignUpLogInAndLogOut` (**new**), smoke "forged write" |
| Authorisation, i.e. the vulnerability | NFR5, NFR5.1–NFR5.3, NFR6.2, AC4.2/4.4/4.6/4.7 | `AdV1ControllerTests` (anonymous create and edit, non-owner, owner in the body, unowned), `AdControllerTests` (legacy), `DefaultDenyTests` (**new**: DELETE, PATCH, unmapped paths), smoke |
| Restart replay | NFR3.10 | smoke `restart-save` / `restart-check` against a restarted backend |
| Sign-up/session failure | NFR1.8 | `SignupSessionFailureTests` (**new**) |
| Data exposure | NFR2, NFR2.1–NFR2.5, FR5.2 | `AdV1ControllerTests.listAndViewAreOpenWithAuthorNamesAndNoEmail`, `AuthControllerTests` log capture, smoke AC5.2 |
| Error format | NFR7, NFR7.1–NFR7.4 | every refusal test asserts `application/problem+json` and `code`; `AdV1ControllerTests.storageFailureIsA500ProblemWithoutInternalsAndIsLogged` |
| Frontend credentials | NFR2.7, NFR2.8, NFR3.11, NFR3.12, NFR3.13 | `api.test.ts` (credentials, header re-read, no storage), `AuthPanels.test.tsx` (password cleared), `CurrentUserContext.test.tsx` (`me` first); a code search finds no `localStorage`, `sessionStorage`, `console.log` or session-cookie access |
| Frontend XSS | NFR2.9 | `AuthPanels.test.tsx` (markup shown as text); a code search finds no `dangerouslySetInnerHTML` or `innerHTML` |
| Frontend refusals | NFR5.6, NFR7.5 | `AdForm.test.tsx` (`not_owner`), `App.csrf.test.tsx` (**new**: `csrf_invalid` keeps input, no resend) |

## How to Run

```bash
# All backend security tests (they are part of the full suite)
JAVA_HOME=C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1 bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test

# Only the security-focused classes
JAVA_HOME=C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1 bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=AuthControllerTests,AdV1ControllerTests,AdControllerTests,AccountServiceTests,SignupSessionFailureTests,SessionFixationTests,DefaultDenyTests

# Frontend security-relevant tests (part of the full frontend suite)
npm --prefix bulletin-board-frontend test

# Probe of the running API (see integration-test-instructions.md for start/stop and the restart phases)
node aidlc/spaces/default/intents/261020-user-login/construction/build-and-test/scripts/api-smoke.mjs http://localhost:8080

# Dependency scan (frontend): all dependencies, then production dependencies only
npm --prefix bulletin-board-frontend audit
npm --prefix bulletin-board-frontend audit --omit=dev
```

Static code search, run with the editor's search or ripgrep:

```bash
rg "dangerouslySetInnerHTML|innerHTML|localStorage|sessionStorage|console\.log|JSESSIONID" bulletin-board-frontend/src
rg -i "log\.(info|warn|error|debug)\(.*(email|password|getEmail)" bulletin-board-backend/src/main
```

Expected: no matches in either search.

## Expected Coverage Targets

- Every vulnerability scenario named in NFR6.2 has a test that fails on the pre-change code. They are: anonymous create, anonymous edit, non-owner edit, owner in the body, and the legacy path. The pre-change code accepted all of these writes with 200/201.
- Every new endpoint has a happy path and at least two refusal cases (NFR6.3).
- Every non-2xx response in the tests carries a `code` (NFR7.1).
- No high or critical vulnerability in **production** dependencies. Dev-only advisories are reported and tracked as open items.

## Test Data Management and Environment

- Marker passwords (`Marker-P4ss-<uuid>`) and unique emails make leak assertions exact. A grep of captured logs and bodies for the marker must find nothing.
- Session-store failure is simulated with `@MockitoSpyBean` on `SecurityContextRepository` (test only). No production code is changed.
- The real-HTTP tests manage cookies by hand, so a replayed session id really reaches the container's session store.

## Accepted Risks and Known Limits (recorded, not tested as failures)

- The H2 console `/h2-console` is open, without CSRF protection, and frameable by the same origin (requirements C3, OQ1). It bypasses every control above. It must be closed before any deployment beyond trusted environments.
- There is no rate limit on log-in and sign-up (trusted environments; code-generation plan).
- Account existence is revealed by 409 at sign-up and by 423 for a locked account (requirements A6, FR2.3). Anyone can lock another account (A5).
- A locked account answers 423 without running BCrypt, so a locked account answers faster than a wrong password. This only reveals what 423 already reveals.
- Under default deny, unknown non-API paths answer 401/403 rather than 404.
- The `npm audit` high-severity advisory in vite 8.3.2 (launch-editor, dev server only) is existing and not fixed. `npm audit --omit=dev` is clean.
