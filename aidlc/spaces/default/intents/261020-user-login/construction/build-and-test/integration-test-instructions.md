# Integration Test Instructions: User Login (intent 261020-user-login)

Test strategy: **Standard**, which means key boundary tests and the cross-unit interaction. Scope: **security-patch**, which adds targeted regressions for the fixed vulnerability and requires the existing suite to stay green. U1 and U2 are integrated only through contract C1 (`/api/v1`). U1 also provides the legacy contract C2 (`/api/ads`).

## Test Framework Setup and Configuration

| Layer | Framework | Boundary exercised | Location |
|---|---|---|---|
| Backend HTTP boundary (in-process) | JUnit 5, Spring MockMvc, `@SpringBootTest` | security filter chain, controllers, services, H2 | `bulletin-board-backend/src/test/java/.../{auth,ad,config}/*Tests.java` |
| Backend HTTP boundary (real container) | JUnit 5, `@SpringBootTest(webEnvironment = RANDOM_PORT)`, `java.net.http.HttpClient` with hand-managed cookies | Tomcat session store, `Set-Cookie` attributes, session-id replay | `auth/AuthControllerTests` (cookie attributes), `auth/SessionFixationTests` (new) |
| Frontend through its real ApiClient | Vitest + React Testing Library, only `fetch` mocked | `CurrentUserProvider` + `App` + `src/api.ts` against C1-shaped responses | `src/App.test.tsx`, `src/App.csrf.test.tsx` (new) |
| Cross-unit, against the running backend | Node 20 script, global `fetch`, a cookie-keeping "browser" | the real C1 and C2 HTTP contract, exactly as the frontend calls it | `construction/build-and-test/scripts/api-smoke.mjs` (new) |

Integration tests added in this stage (test-only, no production change):

- `auth/SignupSessionFailureTests` (NFR1.8): the session store fails after the account is saved, then 500 `internal_error` "Please log in", the account exists, the left-over session is anonymous, a later log-in gives 200, and a repeated sign-up gives 409 (not 500).
- `auth/SessionFixationTests` (NFR3.2, NFR3.3, NFR3.5), over real HTTP:
  - after log-in, and after sign-up while holding another session, replaying the old session id is anonymous (`/me` gives `{"user":null}`, a write gives 401);
  - an attacker-chosen session id is never adopted;
  - the XSRF token changes after sign-up, log-in and log-out.
- `config/DefaultDenyTests` (NFR5.1): DELETE and PATCH on an ad, unmapped POST/GET under `/api/**`, and paths outside `/api/**` all give 401 `not_authenticated` (visitor) or 403 `forbidden` (logged in), as problem+json. A DELETE without a token gives 403 `csrf_invalid`. The open reads stay 200.
- `src/App.csrf.test.tsx` (U2, NFR3.12, NFR7.5): `csrf_invalid` on Save and on create shows the token-expired message and keeps the typed text. It sends exactly one PUT (no automatic resend) and refreshes `/me` once. A manual retry carries the fresh token.
- `src/AdForm.double-submit.test.tsx` (U2): a double click or Enter while a save is pending sends one request.

## How to Run

```bash
# 1. Backend boundary tests: part of the full backend suite
JAVA_HOME=C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1 bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test

#    only the Build and Test additions
JAVA_HOME=C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1 bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=SignupSessionFailureTests,SessionFixationTests,DefaultDenyTests

# 2. Frontend integration through the real ApiClient: part of the full frontend suite
npm --prefix bulletin-board-frontend test

# 3. Cross-unit API smoke against the running backend
JAVA_HOME=C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1 bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml spring-boot:run   # background, wait for "Started"
node aidlc/spaces/default/intents/261020-user-login/construction/build-and-test/scripts/api-smoke.mjs http://localhost:8080

# 4. Restart replay (NFR3.10): save a live session, restart the backend, replay it
node aidlc/spaces/default/intents/261020-user-login/construction/build-and-test/scripts/api-smoke.mjs http://localhost:8080 --phase restart-save --state <scratch>/session.json
#    stop the backend, start it again, wait for "Started", then:
node aidlc/spaces/default/intents/261020-user-login/construction/build-and-test/scripts/api-smoke.mjs http://localhost:8080 --phase restart-check --state <scratch>/session.json
#    stop the backend
```

The smoke prints one `PASS|FAIL <id> <text>` line per check and a `SUMMARY` line. It exits 0 only when every check passed.

### Smoke flow (contract C1, then C2)

1. `GET /api/v1/ads` gives 200 (NFR2.6 health).
2. `GET /api/v1/auth/me` gives `{user:null}` and issues `XSRF-TOKEN` (script-readable).
3. Sign-up Ann with an upper-case email padded with spaces. Expect 201, a normalised email and a trimmed name, no password or hash in the body, and a session cookie that is HttpOnly, SameSite=Lax, `Path=/` and has no expiry. The XSRF token rotates, and `/me` shows Ann.
4. A duplicate email gives 409 `email_taken`. Invalid fields give 400 `validation_failed` with field errors for `email`, `displayName` and `password`.
5. Bob signs up, logs out (204) and logs in (200, new session id). A wrong password and an unknown email give the same 401 `bad_credentials`.
6. Ann creates an ad with `ownerId`/`owner` set to Bob in the body. Expect 201, `Location` `/api/v1/ads/{id}`, the author Ann and `ownedByMe` true. A visitor can list and view it; the list shows "Ann" and no `@` appears anywhere.
7. Bob edits Ann's ad: 403 `not_owner`, and the ad is unchanged. Ann edits it: 200, still owned by Ann.
8. Anonymous create with a token gives 401 `not_authenticated`. Without a token it gives 403 `csrf_invalid` (check order). Anonymous edit gives 401. Ann's session without a token (a forged cross-site write) gives 403 `csrf_invalid`. Nothing changed.
9. Legacy `/api/ads`: the list keeps the old shape with `Deprecation` and successor `Link` headers. Anonymous create gives 401, Bob's edit gives 403 `not_owner`, Ann's edit gives 200 (old shape), and create gives 201 with `Location` `/api/ads/{id}`.
10. Ann logs out (204, token rotated). Her old session cookie is anonymous on `/me`, and a write with it gives 401.
11. Default deny: an unknown non-API path gives 401/403 with a `code`. `DELETE /api/v1/ads/{id}` gives 403 `forbidden`.
12. Lockout: five wrong passwords give 401 each, then the right password gives 423 `account_locked`.
13. Every refusal checked is `application/problem+json` with a `code` (NFR7).

## Expected Coverage Targets

- Standard strategy: every C1 endpoint (`/auth/me`, `/auth/signup`, `/auth/login`, `/auth/logout`, `GET/POST /ads`, `GET/PUT /ads/{id}`) and every C2 endpoint is exercised at least once on its happy path and on at least two refusal paths.
- Security-patch floor: the AC4.x refusals (anonymous create and edit, non-owner edit, owner in the body, legacy path) pass against the running backend, without the UI (NFR5 pass criterion).
- No line-coverage floor applies to the security-patch scope. Requirement coverage is verified in `cross-unit-traceability.md`.

## Test Data Management and Environment

- In-process tests: each class clears `AdRepository` and `UserAccountRepository` in `@BeforeEach`. Accounts are created through the real API (`support/TestAccounts`) with unique emails (`user-<uuid>@example.com`) and marker passwords.
- The smoke uses run-unique emails (`<name>-<base36 time>@example.com`), so it can run repeatedly against the same backend. All data is in-memory and disappears when the backend stops.
- The restart replay writes the saved cookies to a scratch file, never into the repository.
- No real credentials or personal data are used anywhere.
