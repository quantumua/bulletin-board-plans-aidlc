# Code Generation Plan: u1-backend-auth

## Summary

- Builds: accounts with sign-up, session log-in/log-out with CSRF and lockout, and owner-only ad editing under /api/v1 plus the protected legacy /api/ads
- Touches: bulletin-board-backend pom.xml, application.properties, new account/ and auth/ packages, ad/ package, config/ (security, CORS, errors), README
- Tests: about 40 JUnit/MockMvc tests in 5 new test classes plus the updated AdControllerTests, including targeted regressions for anonymous and non-owner writes

## Inputs

- Requirements: `inception/requirements-analysis/requirements.md` (FR1–FR5, AC1.1–AC5.2, NFR1–NFR8)
- Design: `inception/domain-design/components.md`, `decisions.md` (ADR-001 to ADR-006)
- Contract: `inception/contract-design/contract-summary.md` (C1 `/api/v1`, C2 legacy `/api/ads`)
- Unit NFRs: `construction/u1-backend-auth/nfr-requirements/*` (NFR1.1–NFR7.4)
- Code knowledge base: `aidlc/spaces/default/codekb/bulletin-board-backend/`
- Repository: `bulletin-board-backend/` (brownfield; modify files in place)

## Decisions carried from the NFR review

- **BCrypt 72-byte limit:** sign-up refuses a password whose UTF-8 encoding is longer than 72 bytes, with 400 `validation_failed` on `password`, in addition to the 8–128 character rule. Nothing is silently truncated and nothing answers 500.
- **Session timeout and cookie:** `server.servlet.session.timeout=0`, so sessions never expire on the server and end only on log-out or browser close (FR3.2, contract). The cookie keeps the servlet default name `JSESSIONID`, set `HttpOnly`, `SameSite=Lax` and `Secure` when HTTPS. Unbounded in-memory sessions are accepted for trusted single-instance use (scalability NFR3.8 target: 500).
- **Error codes:**
  - every problem response carries a `code`;
  - `internal_error` covers 500;
  - `not_found` covers unknown paths and 404s other than ads;
  - `method_not_allowed` covers 405;
  - `unsupported_media_type` covers 415;
  - `bad_request` covers malformed JSON and a non-numeric id;
  - all other codes follow security NFR7.1.
- **CORS:** the existing `CorsConfig` origins are wired into the security filter chain (`http.cors(...)`), so the existing preflight test passes unchanged.
- **Custom log-in and sign-up:**
  - a JSON controller calls `AuthService`;
  - on success it changes the session id (`request.changeSessionId()`, or a new session), builds the `SecurityContext` and saves it through `HttpSessionSecurityContextRepository`;
  - log-out invalidates the session and clears the context;
  - every request not explicitly permitted is denied by default (`anyRequest().denyAll()` after the listed rules).
- **Accepted risk:** log-in and sign-up have no rate limit (trusted environments), recorded in the code summary.

## Steps

### Step 1: Project structure and production configuration
- [x] Add `spring-boot-starter-security` and test-scoped `spring-boot-starter-security-test` to `bulletin-board-backend/pom.xml` (tech-stack decisions).
- [x] In `application.properties`, set `server.servlet.session.timeout=0`, `server.servlet.session.cookie.http-only=true` and `server.servlet.session.cookie.same-site=lax` (NFR3.1, FR3.2).
- [x] Create the packages `com.example.bulletinboard.account` and `com.example.bulletinboard.auth`. Add a `Clock` bean (`java.time.Clock.systemUTC()`) in `config/ClockConfig.java` (NFR3.6).
- Traces: NFR3.1, NFR3.6, FR3.2

### Step 2: Verify the test runner and record the unit-scoped command
- [x] Run `bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=AdControllerTests` on the unchanged code to record the baseline: it must pass before any change, and its counts go into the code summary (brownfield test baseline).
- [x] Confirm the unit-scoped command in `unit-test-instructions.md` resolves.
- Traces: NFR6.1

### Step 3: Data model — implement
- [x] `account/UserAccount.java`: JPA entity, table `user_accounts`, with:
  - `id` (identity);
  - `email` (normalised, unique constraint, ≤ 254);
  - `displayName` (≤ 50);
  - `passwordHash`;
  - `failedLoginCount`;
  - `lockedUntil` (nullable `Instant`);
  - `createdAt`.
  Mutators `recordFailedLogin(Instant now)`, `recordSuccessfulLogin()` and `isLocked(Instant now)` hold the lockout rule: lock for 15 minutes after the 5th consecutive failure; expiry allows log-in; success resets the count.
- [x] `ad/Ad.java`: add a nullable `ownerId` (`Long`, column `owner_id`). Add a constructor `Ad(String title, String description, Long ownerId)` and keep the existing two-argument constructor (owner `null`, used by existing tests as an unowned ad). `update(...)` never touches `ownerId`.
- Traces: FR1.2, FR1.3, FR2.3, FR2.4, FR2.5, FR4.2, FR4.5, NFR1.5, NFR3.6

### Step 4: Data model — write and run its tests
- [x] `src/test/java/com/example/bulletinboard/account/UserAccountTests.java` (plain JUnit):
  - 4 failures do not lock;
  - the 5th failure locks for 15 minutes;
  - locked at 14:59 and unlocked at 15:00 with a fixed clock;
  - success resets the count;
  - a failure after the lock expires starts a new count.
- [x] Run `bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=UserAccountTests`.
- Traces: FR2.3, FR2.4, FR2.5, NFR3.6

### Step 5: Repository — implement
- [x] `account/UserAccountRepository.java`: `JpaRepository<UserAccount, Long>` with `Optional<UserAccount> findByEmail(String normalisedEmail)` and `List<UserAccount> findAllById(...)` (inherited) for the batched name lookup. Lockout updates use a pessimistic write lock (`@Lock(PESSIMISTIC_WRITE)` on `findByEmailForUpdate`) so concurrent failures are counted atomically.
- [x] `ad/AdRepository.java` stays unchanged (`findAllByOrderByCreatedAtDesc`).
- Traces: NFR1.5, NFR3.6, NFR5.5

### Step 6: Repository — write and run its tests
- [x] `src/test/java/com/example/bulletinboard/account/UserAccountRepositoryTests.java` (`@DataJpaTest`):
  - find by normalised email;
  - the duplicate email unique constraint throws `DataIntegrityViolationException`;
  - the batched `findAllById` returns names for several owners;
  - the locked read returns the row.
- [x] Run `bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=UserAccountRepositoryTests`.
- Traces: FR1.3, NFR1.5, NFR5.5

### Step 7: Business logic — implement
- [x] `account/AccountService.java`:
  - `register(email, displayName, password)`: normalise (trim, lower-case), validate (password 8–128 characters and ≤ 72 UTF-8 bytes, display name 1–50 visible characters after trim), hash with `BCryptPasswordEncoder(12)` and save. A unique-constraint violation maps to `EmailTakenException`.
  - `authenticate(email, password)`: under a pessimistic lock; an unknown email still runs one BCrypt check against a fixed dummy hash (NFR1.3). It returns the account or throws `BadCredentialsException`, or `AccountLockedException` when locked. It records a failure or success atomically with the injected `Clock`.
  - `displayNames(Collection<Long> ids)` returns a `Map<Long, String>`.
- [x] `auth/CurrentUser.java`: a record `(Long accountId)` that represents the caller, or `anonymous()`. It is passed explicitly into the ads service (ADR-005, NFR5.2).
- [x] `ad/AdService.java`:
  - `findAll(CurrentUser)` and `findById(id, CurrentUser)` map to `AdView` with `authorName` (from one batched `displayNames` call, "Unknown" when unowned) and `ownedByMe`.
  - `create(request, CurrentUser)` requires an account id and sets `ownerId` from it.
  - `update(id, request, CurrentUser)`: 404 when the ad is missing, `UnownedAdException` when it has no owner, `NotOwnerException` when the caller is not the owner; it changes only title and description.
  - The legacy mapping to `AdResponse` (old shape) is kept for C2.
- [x] New exceptions extend `ErrorResponseException` with problem details and a `code` property: `EmailTakenException` (409 `email_taken`), `AccountLockedException` (423 `account_locked`), `NotOwnerException` (403 `not_owner`, "You can only edit your own ads"), `UnownedAdException` (403 `unowned`, "This ad has no owner and cannot be edited"). `AdNotFoundException` gains `code: ad_not_found` and keeps its detail text.
- Traces: FR1.1–FR1.5, FR2.1–FR2.5, FR4.2–FR4.5, FR5.1–FR5.3, NFR1.1, NFR1.3, NFR1.4, NFR5.2, NFR7.1

### Step 8: Business logic — write and run its tests
- [x] `src/test/java/com/example/bulletinboard/account/AccountServiceTests.java` (`@SpringBootTest` with a fixed `Clock`):
  - registers and hashes with `$2a$12$`;
  - the same password gives different hashes;
  - a duplicate email (case and space variants) gives 409;
  - 7 and 129 characters are refused;
  - a 40-character multi-byte password over 72 bytes is refused with no exception other than validation;
  - display names that are empty, whitespace or 51 characters are refused;
  - authenticate succeeds;
  - a wrong password and an unknown email both throw bad credentials;
  - the lock happens after 5 failures and expires after 15 minutes;
  - 10 parallel wrong attempts end locked.
- [x] `src/test/java/com/example/bulletinboard/ad/AdServiceTests.java` (`@SpringBootTest`):
  - create sets the owner from the caller;
  - the owner edits;
  - a non-owner gets `NotOwnerException`;
  - unowned gets `UnownedAdException`;
  - an edit never changes `ownerId`;
  - the list carries `authorName` and "Unknown";
  - `ownedByMe` is true only for the owner;
  - the list issues a single batched name lookup.
- [x] Run `bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=AccountServiceTests,AdServiceTests`.
- Traces: FR1.2–FR1.5, FR2.2–FR2.5, FR4.2–FR4.5, FR5.1, FR5.3, NFR1.1, NFR1.3, NFR1.4, NFR1.5, NFR3.6, NFR5.2, NFR5.5

### Step 9: API and security — implement
- [x] `config/SecurityConfig.java`, a `SecurityFilterChain`:
  - `cors(withDefaults)` reusing the `CorsConfig` origins;
  - CSRF with `CookieCsrfTokenRepository.withHttpOnlyFalse()` and the plain `CsrfTokenRequestAttributeHandler`, so the raw cookie value is the header value;
  - CSRF ignored for `/h2-console/**` only;
  - frame options set to `sameOrigin` for `/h2-console/**`.
  - Access rules:
    - permitted: `GET /api/v1/ads/**`, `GET /api/ads/**`, `GET /api/v1/auth/me`, `POST /api/v1/auth/{signup,login,logout}` and `/h2-console/**`;
    - authenticated: `POST`/`PUT` on `/api/v1/ads/**` and `/api/ads/**`;
    - everything else: `denyAll()`.
  - `formLogin` and `httpBasic` are disabled, and `SecurityContextRepository` is `HttpSessionSecurityContextRepository`.
  - The entry point and access-denied handler write problem details with `code` `not_authenticated` (401) or `csrf_invalid` / `forbidden` (403).
  - A `CsrfCookieFilter` makes the token load on every response so the `XSRF-TOKEN` cookie is issued on `GET /api/v1/auth/me` (NFR3.5).
- [x] `auth/AuthController.java` (`/api/v1/auth`):
  - `POST /signup` (201 `CurrentUser` JSON);
  - `POST /login` (200);
  - `POST /logout` (204, idempotent);
  - `GET /me` (200 `{ "user": ... | null }`).
  - Sign-up and log-in call `AccountService`, then change the session id, create a `UsernamePasswordAuthenticationToken` with the account id as principal, and save the context. The CSRF token is rotated after sign-up, log-in and log-out.
  - Request DTO records `SignupRequest` and `LoginRequest` use Bean Validation.
- [x] `ad/AdV1Controller.java` (`/api/v1/ads`) returns `AdView` (`id`, `title`, `description`, `createdAt`, `updatedAt`, `authorName`, `ownedByMe`). Create answers 201 with `Location: /api/v1/ads/{id}`. The request DTO ignores unknown fields.
- [x] `ad/AdController.java` (legacy `/api/ads`) keeps the old shape (`AdResponse`) and passes `CurrentUser` to the service. It adds the response headers `Deprecation: true` and `Link: </api/v1/ads>; rel="successor-version"`.
- [x] `auth/CurrentUserArgumentResolver.java` resolves `CurrentUser` from the `SecurityContext` for controller parameters. Nothing is read from the request body.
- [x] `config/ProblemDetailsAdvice.java` (`@RestControllerAdvice`):
  - adds `code` to validation errors (`validation_failed` plus `errors[]` with `field`/`message`);
  - malformed JSON and type mismatch map to `bad_request`;
  - 404 for unknown paths maps to `not_found`;
  - 405 maps to `method_not_allowed`;
  - 415 maps to `unsupported_media_type`;
  - any other exception maps to 500 `internal_error`, logged at ERROR without the body.
- [x] `auth/SecurityEventLogger.java` writes to logger `security`: `event=… accountId=… outcome=… path=…` for `signup`, `login_success`, `login_failure`, `account_locked`, `logout` and `write_refused`. It never logs email, password, session id or token.
- Traces: FR1.1, FR1.6, FR1.7, FR2.1, FR2.2, FR3.1–FR3.4, FR4.1–FR4.7, FR5.1, FR5.2, NFR2.1–NFR2.5, NFR3.1–NFR3.5, NFR5.1, NFR5.3, NFR5.4, NFR7.1–NFR7.4

### Step 10: API and security — write and run its tests (targeted regressions included)
- [x] `src/test/java/com/example/bulletinboard/auth/AuthControllerTests.java` (MockMvc):
  - sign-up gives 201 and the new session cookie is HttpOnly;
  - sign-up without CSRF gives 403 `csrf_invalid`;
  - a duplicate email gives 409;
  - invalid fields give 400 with `errors[]`;
  - log-in gives 200 and changes the session id;
  - a wrong password and an unknown email give the same 401 `bad_credentials` detail;
  - 5 failures then the correct password give 423;
  - `me` as an anonymous visitor gives `{user: null}` and sets `XSRF-TOKEN`;
  - `me` after log-in gives the user;
  - log-out gives 204 and the old session is then anonymous;
  - log-out while logged out gives 204;
  - the response bodies contain no password or hash.
- [x] `src/test/java/com/example/bulletinboard/ad/AdV1ControllerTests.java` (MockMvc), **targeted regressions**:
  - anonymous create with a token gives 401 and no ad (AC4.2);
  - anonymous create without a token gives 403 and no ad;
  - anonymous edit gives 401 and the ad is unchanged (AC4.6);
  - user B editing user A's ad gives 403 `not_owner` and the ad is unchanged (AC4.4);
  - the owner editing gives 200 (AC4.5);
  - an owner field in the edit or create body is ignored (AC4.7, NFR5.2);
  - editing an unowned ad gives 403 `unowned` (FR4.5);
  - the list and view are open, carry `authorName` and `ownedByMe`, and contain no email (AC5.1, AC5.2);
  - a non-numeric id gives 400 `bad_request`;
  - an unknown path gives a 404 problem;
  - a forced repository failure gives a 500 `internal_error` problem.
- [x] Update `src/test/java/com/example/bulletinboard/ad/AdControllerTests.java` (legacy path):
  - `createsAd` and `updatesAd` now log in a test user and send `with(csrf())`;
  - `updatesAd` creates the ad owned by that user;
  - `rejectsInvalidAd` and `returnsNotFoundWhenUpdatingMissingAd` also log in with CSRF;
  - `listsAdsNewestFirst` and `allowsFrontendOrigin` stay unchanged.
  - **Regressions added:** anonymous legacy create gives 401, non-owner legacy edit gives 403, and legacy responses keep the old shape and carry the `Deprecation` header (NFR5.3).
- [x] Run `bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=AuthControllerTests,AdV1ControllerTests,AdControllerTests`.
- Traces: AC1.1–AC1.4, AC2.1–AC2.5, AC3.2, AC4.2–AC4.7, AC5.1, AC5.2, NFR1.2, NFR2.1, NFR2.2, NFR3.2–NFR3.5, NFR5.1–NFR5.4, NFR6.1, NFR6.2, NFR6.3, NFR7.1–NFR7.3

### Step 11: Frontend behavior — not applicable
- No frontend code in this unit; U2 owns it.

### Step 12: Environment and build configuration
- [x] Run the whole backend suite once: `bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test`. Every existing test stays green (NFR6.1).
- [x] Check `bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml -q package -DskipTests` builds.
- Traces: NFR6.1

### Step 13: Documentation and traceability
- [x] Update `bulletin-board-backend/README.md`:
  - the API table for `/api/v1/auth/*` and `/api/v1/ads`;
  - legacy `/api/ads` marked deprecated;
  - the session cookie and the CSRF header;
  - the error `code` list;
  - the H2 console note (open, trusted environments only).
- [x] Javadoc on `SecurityConfig`, `AuthController` and `AccountService` explaining the security decisions (ADR-001, ADR-005, ADR-006).
- Traces: NFR7.1

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "security-patch",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Include a targeted regression for the bug or vulnerability.",
      "Keep the existing test suite green."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:365b95b097bb6febd0613d860200b09c3bca4cd2f9ce5088c5eaafe859b215f2",
  "contract_sha256": "sha256:b0c3dfb7eb37de3d91def015a6e1a0c3b92a85c2f28fba99b0714295144b1d9a"
}
```
