# NFR Requirements — Questions (u1-backend-auth)

Context: the backend is Spring Boot 4.1 on Java 25 with no security library today (codekb `technology-stack.md`). Requirements and the contract already fix the behaviour (NFR1–NFR8, contract C1/C2); these questions settle only the technical choices still open for this unit.

## Q1. What should provide sessions, CSRF protection and the login checks in the backend?

A. Spring Security (the framework's standard security module: session handling, session-id change at login, CSRF token cookie/header, password encoders) (recommended: well-tested, matches ADR-001 and ADR-006 directly)
B. Hand-written servlet filters and session code (no new dependency, but every security detail is ours to get right)
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. Which password hashing algorithm should be used (NFR1)?

A. BCrypt, cost 12 (built into Spring Security; about 0.2–0.3 s per hash on a typical server) (recommended)
B. Argon2id (stronger against GPU attacks, but needs an extra crypto library)
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. Which security events should the backend log?

Logs must never contain passwords, session ids or tokens (NFR2).

A. Sign-up, log-in success and failure, account lock, log-out, and refused create/edit attempts — with account id (not email) and time (recommended: enough to spot guessing and abuse)
B. Only failures and account locks
C. No security logging in this version
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Spring Security provides sessions, the session-id change at login, the CSRF token cookie and header, and the password encoder [Q1]
- Passwords are hashed with BCrypt at cost 12 [Q2]
- The backend logs sign-up, log-in success and failure, account lock, log-out, and refused create/edit attempts, with account id (not email) and time, never passwords, session ids or tokens [Q3]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
