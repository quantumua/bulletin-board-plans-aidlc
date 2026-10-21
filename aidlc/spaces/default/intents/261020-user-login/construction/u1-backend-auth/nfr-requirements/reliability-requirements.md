# Reliability Requirements: u1-backend-auth

No availability SLA is set for this first version: it runs only in trusted environments, and all data is wiped on restart (requirements C2, C3).

| ID | Requirement | Pass / fail check |
|---|---|---|
| NFR6.1 | The existing backend test suite passes after the change. Tests are changed only where they relied on anonymous create and edit: they now log in first and send the XSRF token (security-patch floor). | `./mvnw test` is green, and the diff of `AdControllerTests` shows only the added login and token steps. |
| NFR6.2 | Targeted regression tests cover the fixed vulnerability: anonymous create (AC4.2), anonymous edit (AC4.6), editing another user's ad (AC4.4), an owner in the edit body (FR4.2, NFR5.2), and the legacy `/api/ads` paths (NFR5.3). | Each named scenario has at least one automated test that fails on the pre-change code. |
| NFR6.3 | Tests cover the happy path and at least two error cases per new endpoint (construction testing standard): sign-up, log-in, log-out and me. | Test inventory per endpoint. |
| NFR3.10 | After a backend restart, a browser that still holds an old session cookie is treated as anonymous: requests answer normally or with 401, never 500 (FR3.4). | Integration test: invalidate the session store, then replay the old cookie. |
| NFR7.3 | A storage error or other unexpected exception on any endpoint answers 500 as problem details without stack traces or internal details, and is logged at ERROR. Errors are never swallowed (construction error-handling rule). | Forced repository failure in a test answers 500 problem details, and an ERROR log line is present. |
| NFR1.8 | Sign-up is all or nothing. If the session cannot be created after the account is saved, the account still exists and the response tells the user to log in. No half-created account blocks the email. | Test: simulate a session failure after save, then log in with the same credentials succeeds. |

## Data durability

None in this version: accounts, sessions, lockout state and ads are wiped on restart. This is accepted (requirements C2, OQ2).

## Assumptions & Open Questions

None.
