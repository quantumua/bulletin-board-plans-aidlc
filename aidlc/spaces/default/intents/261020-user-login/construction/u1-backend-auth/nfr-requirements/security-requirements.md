# Security Requirements: u1-backend-auth

Sources: `requirements.md` (NFR1–NFR7, FR1–FR5), `contract-summary.md` (C1, C2), `decisions.md` (ADR-001, ADR-005, ADR-006), and `nfr-requirements-questions.md` (Q1 Spring Security, Q2 BCrypt 12, Q3 security logging).

## Authentication

| ID | Requirement | Pass / fail check |
|---|---|---|
| NFR1.1 | Passwords are stored only as BCrypt hashes at cost factor 12, each with its own random salt (Q2). | The stored value starts with `$2a$12$` or `$2b$12$` and two accounts with the same password have different stored values. |
| NFR1.2 | The raw password is never persisted, logged or returned. It lives only in the request object for the duration of the sign-up or log-in call. | No log line, response body or database column contains the submitted password (test with a unique marker password). |
| NFR1.3 | Password verification runs a BCrypt check even when the email is unknown, comparing against a fixed dummy hash, so response time does not reveal whether an account exists. | Median log-in time for an unknown email and a known email with a wrong password differ by less than 50 ms over 20 attempts each. |
| NFR1.4 | Sign-up enforces the password length 8–128 characters, the display name 1–50 visible characters, and an email ≤ 254 characters, both in validation and before hashing (FR1.4, FR1.5). | 7- and 129-character passwords and a 51-character display name are refused with 400 and field errors. |
| NFR1.5 | Email uniqueness holds under concurrent sign-ups. It is enforced by a unique constraint on the normalised email, and a constraint violation maps to 409 (FR1.3). | Two parallel sign-ups with the same email produce exactly one account; the other gets 409. |

## Sessions and anti-forgery

| ID | Requirement | Pass / fail check |
|---|---|---|
| NFR3.1 | Sessions are server-side, managed by Spring Security (Q1). The session cookie is `HttpOnly`, `SameSite=Lax` and `Path=/`; it is `Secure` when the request arrived over HTTPS, and it has no `Max-Age`/`Expires` (ADR-001, FR3.2). | Response headers after log-in show these attributes. |
| NFR3.2 | The session id is replaced at sign-up and log-in, including when the caller was already logged in (session-fixation protection). | The cookie value before and after log-in differs; the old id is no longer accepted. |
| NFR3.3 | Log-out invalidates the server session and clears the cookie; a request with the old cookie is treated as anonymous (FR3.1, AC3.2). | Replaying the pre-logout cookie on `POST /api/v1/ads` answers 401. |
| NFR3.4 | Every `POST`/`PUT` (including sign-up, log-in and log-out) requires the `X-XSRF-TOKEN` header to match the `XSRF-TOKEN` cookie; a mismatch answers 403 with `code: csrf_invalid` (ADR-006, contract). | A request without the header answers 403; the same request with it succeeds. |
| NFR3.5 | The `XSRF-TOKEN` cookie is issued on `GET /api/v1/auth/me` (and any response lacking one), and is rotated after sign-up, log-in and log-out. | The token value changes after log-in. |
| NFR3.6 | Lockout state changes are atomic per account. Concurrent wrong-password attempts are counted without loss, so a lock always happens after at most 5 failures. Lock expiry is computed from an injectable clock, so tests can advance time (FR2.3–FR2.5). | 10 parallel wrong-password attempts lock the account. Advancing the test clock by 15 minutes unlocks it. |

## Authorisation

| ID | Requirement | Pass / fail check |
|---|---|---|
| NFR5.1 | Path access rules: `GET /api/v1/ads/**`, `GET /api/ads/**`, `GET /api/v1/auth/me`, `POST /api/v1/auth/signup`, `POST /api/v1/auth/login` and `POST /api/v1/auth/logout` are open; every other `POST`/`PUT` under `/api/**` requires an authenticated session (401 otherwise). | An anonymous create carrying a valid XSRF token answers 401. |
| NFR5.2 | Ownership is enforced in the ads service, which receives the caller's account id as an explicit parameter from the controller. It is never read from a request body (ADR-005). A non-owner gets 403 `code: not_owner`; an unowned ad gets 403 `code: unowned`. | AC4.4, AC4.6 and AC4.7 pass through the API directly, and an edit body that names another owner leaves the owner unchanged. |
| NFR5.3 | The legacy `/api/ads` paths apply exactly the same rules as `/api/v1/ads` (contract C2). | The AC4.x checks pass on both path sets. |
| NFR5.4 | Order of checks on protected writes, as fixed in the contract: anti-forgery token (403), then authentication (401), then validation (400), then existence (404), then ownership (403). A direct API caller with no token therefore gets 403 `csrf_invalid` before 401. This is accepted: the requirement that anonymous writes are refused (AC4.2, AC4.6) still holds, and callers that do send a token get 401. | An anonymous call without a token answers 403; with a token it answers 401. Neither creates or changes an ad. |

## Data protection

| ID | Requirement | Pass / fail check |
|---|---|---|
| NFR2.1 | Only `GET /api/v1/auth/me` (for the caller's own account) and the sign-up and log-in responses contain an email address. Ad responses carry only `authorName` (FR5.2). | Responses to list and view ads contain no `@`-addressed email. |
| NFR2.2 | No password, password hash, session id or XSRF token appears in logs, URLs, error `detail` texts or problem `instance` values. | A grep of the test logs for the marker password, the session cookie value and the token finds nothing. |
| NFR2.3 | Security log lines identify accounts by account id, never by email (Q3). | See `observability-requirements.md` NFR2.4. |

## Error signalling

| ID | Requirement | Pass / fail check |
|---|---|---|
| NFR7.1 | All new errors are RFC 9457 problem details and add a stable machine-readable `code` extension:<br>• `validation_failed`<br>• `not_authenticated`<br>• `bad_credentials`<br>• `account_locked`<br>• `email_taken`<br>• `csrf_invalid`<br>• `not_owner`<br>• `unowned`<br>• `ad_not_found`<br>The frontend keys behaviour on `code`, never on `detail` text. This is an additive change to contract C1. | Every non-2xx response in the tests carries one of the listed codes. |
| NFR7.2 | Spring Security's default 401/403 responses (an HTML or empty body) are replaced by problem-details responses with the codes above. | An anonymous create answers `application/problem+json`. |

## Accepted risks (recorded, not mitigated in this unit)

- The H2 console `/h2-console` stays open and bypasses all of the above (requirements C3, OQ1). Spring Security must explicitly permit it and disable CSRF and frame protection for it only, so it keeps working as today.
- A locked account answers 423 `account_locked`, which reveals that the email is registered (FR2.3; contract open question).
- Sign-up answers 409 for a registered email, which also reveals existence (requirements A6).
- Anyone can lock someone else's account by entering wrong passwords (requirements A5).

## Assumptions & Open Questions

None.
