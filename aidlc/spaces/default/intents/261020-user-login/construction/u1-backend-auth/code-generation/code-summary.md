# Code Summary: u1-backend-auth

## Result

- All 12 applicable plan steps are done (Step 11, frontend, does not apply).
- Full backend suite: **73 tests, 0 failures, 0 errors, 0 skipped**. The baseline before the change was 7 of 7, including `AdControllerTests` at 6 of 6.
- `mvnw -q package -DskipTests` succeeds. Nothing was committed.
- Build JDK: JDK 25 isn't installed on this machine, so all Maven runs used JDK 26 (README: "JDK 25 or newer"), with `JAVA_HOME` set per command only.

## Files

All paths are in `bulletin-board-backend/`. No files were deleted.

**Modified (9):**
- `README.md`, `pom.xml` (adds `spring-boot-starter-security` and test-scoped `spring-boot-starter-security-test`)
- `src/main/resources/application.properties`:
  - session timeout 0;
  - HttpOnly, SameSite=Lax cookie;
  - cookie-only session tracking.
- `ad/`: `Ad.java` (nullable `ownerId`), `AdController.java` (legacy `/api/ads`, protected), `AdNotFoundException.java` (`code`), `AdRequest.java`, `AdService.java` (ownership)
- `src/test/.../ad/AdControllerTests.java` (log-in and real CSRF token added; 3 legacy regressions)

**Created, main (29):**
- `account/`: `UserAccount`, `UserAccountRepository`, `AccountService`, `AccountValidationException`, `AccountLockedException`, `BadCredentialsException`, `EmailTakenException`
- `ad/`: `AdV1Controller`, `AdView`, `NotOwnerException`, `UnownedAdException`, `LegacyAdsDeprecationFilter`
- `auth/`: `AuthController`, `CurrentUser`, `CurrentUserArgumentResolver`, `LoginRequest`, `SignupRequest`, `MeResponse`, `UserResponse`, `NotAuthenticatedException`, `SecurityEventLogger`
- `config/`: `ApiProblems`, `AuthenticatedAccount`, `ClockConfig`, `CsrfCookieFilter`, `ProblemDetailsAdvice`, `SecurityConfig`, `SecurityProblemHandler`, `WebMvcConfig`

**Created, tests (9):** `account/UserAccountTests`, `UserAccountRepositoryTests`, `AccountServiceTests`; `ad/AdServiceTests`, `AdV1ControllerTests`; `auth/AuthControllerTests`; `support/MutableClock`, `MutableClockConfig`, `TestAccounts`

## Key Implementation Decisions

- **Ownership (ADR-005):** owner-only editing lives in `AdService`. The caller arrives as an explicit `CurrentUser`, built only from the security context, never from a request body.
- **Session principal:** the account id. Sign-up and log-in change the session id and save the security context explicitly (ADR-001, NFR3.2).
- **CSRF (ADR-006):** a cookie token repository (`XSRF-TOKEN` / `X-XSRF-TOKEN`). `CsrfCookieFilter` issues the cookie on `GET /api/v1/auth/me`.
- **Default deny:** every path not explicitly permitted is refused. The H2 console has its own open filter chain (accepted risk C3). An empty user store prevents Spring Boot's generated default user.
- **Errors:** every error response carries a `code`. Unexpected errors answer 500 `internal_error`, logged at ERROR with the path and no body.
- **Lockout:**
  - the 5th failure answers 401 and logs `login_failure` and `account_locked`; later attempts within 15 minutes answer 423;
  - counting is atomic in a short `PESSIMISTIC_WRITE` transaction after the BCrypt check;
  - 10 parallel wrong attempts give exactly 5 bad-credentials answers and then a lock.
- **Passwords:** BCrypt cost 12. Passwords over 72 UTF-8 bytes are refused with 400 (from the NFR review).
- **Logging:** the `security` logger records sign-up, log-in success and failure, lock, log-out and refused writes by account id only.
- **Failed session after sign-up (NFR1.8):** if the session cannot be created after sign-up, the response is 500 and says the account exists and to log in.

## Test Coverage Summary

| Test class | Tests | Focus |
|---|---|---|
| UserAccountTests | 7 | Lockout rule with a fixed clock |
| UserAccountRepositoryTests | 5 | Normalised email, unique constraint, batched ids, locked read |
| AccountServiceTests | 15 | Validation (incl. the 72-byte limit), BCrypt 12, bad credentials, lockout and expiry, concurrency |
| AdServiceTests | 10 | Owner from caller, owner-only edit, unowned, poster names, `ownedByMe`, batched lookup |
| AuthControllerTests | 12 | Sign-up, log-in, log-out, me; CSRF; session-id change; 401/409/423; no secrets in bodies |
| AdV1ControllerTests | 14 | **Targeted regressions**: anonymous create/edit, non-owner edit, owner in body, unowned; error codes; 500 |
| AdControllerTests | 9 | 6 existing (now with log-in) + 3 legacy regressions |
| BulletinBoardBackendApplicationTests | 1 | Context loads |

## Deviations from the Plan

1. **Test command syntax:** the plan's multi-class `-Dtest=A+B` matches no tests on Surefire 3.5.6. The commands were run with the comma form, and both the plan and the test instructions now use commas.
2. **Legacy write tests:** they send the real CSRF token through `TestAccounts` instead of `with(csrf())`. In the shared test context, `csrf()` replaced the token repository and broke cookie issuance. The diff to the existing tests is still only the added log-in and token steps.
3. **Lockout transaction:** BCrypt runs before the short locked transaction rather than inside it. This avoids H2 lock timeouts and keeps counting atomic.
4. **Email validation:** `SignupRequest` validates email with a shared pattern instead of `@Email`, so `"Ann@Example.com "` reaches the duplicate check (AC1.2).
5. **Session tracking:** an extra `server.servlet.session.tracking-modes=cookie` keeps session ids out of URLs (NFR2.2).
6. **Extra files:** helper classes and response records beyond the plan's list, listed above. The deprecation headers are set by `LegacyAdsDeprecationFilter`, so they also appear on 401 and 403 answers.

## Open Points for Build and Test

- **Unknown paths:** under default deny, an unknown path outside the open read paths answers 401 or 403, not 404 `not_found`. 404 applies inside open paths (for example `GET /api/v1/ads/1/comments`).
- **Not yet measured:** NFR1.3, NFR1.6, NFR1.7, NFR3.7, NFR3.8, NFR3.9 and NFR5.5 at 1,000 ads.
- **NFR1.8** (session failure after sign-up) is implemented but not covered by a test.
- **Accepted risks:** the open H2 console, and no rate limit on log-in and sign-up (trusted environments). Both are documented in the README.
