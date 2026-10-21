# Unit Test Instructions: u1-backend-auth

## Framework and Setup

- JUnit Jupiter, Spring Test with MockMvc, Hamcrest and JsonPath come from the existing `spring-boot-starter-webmvc-test`, `-data-jpa-test` and `-validation-test` starters.
- New test dependency: `spring-boot-starter-security-test`. It provides the MockMvc request post-processors `csrf()` and `user(...)`, but tests log in through the real `/api/v1/auth/login` endpoint wherever session behaviour is under test.
- Tests run against the in-memory H2 database from `application.properties`. No external services are involved.
- Requires JDK 25 (`JAVA_HOME`). Run from the project root. On Windows use `bulletin-board-backend\mvnw.cmd` in place of `bulletin-board-backend/mvnw`.

## Unit-Scoped Run Commands

Run this unit's tests only. Each command names exact test classes.

```bash
bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=UserAccountTests,UserAccountRepositoryTests,AccountServiceTests,AdServiceTests,AuthControllerTests,AdV1ControllerTests,AdControllerTests
```

Per layer (used by the plan steps):

| Layer | Command |
|---|---|
| Baseline (before changes) | `bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=AdControllerTests` |
| Data model | `bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=UserAccountTests` |
| Repository | `bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=UserAccountRepositoryTests` |
| Business logic | `bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=AccountServiceTests,AdServiceTests` |
| API and security | `bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=AuthControllerTests,AdV1ControllerTests,AdControllerTests`

Note: Maven Surefire separates several test classes with commas; `A+B` is read as one pattern and matches nothing. Requires JDK 25 or newer (the build was verified on JDK 26). |

## Test Inventory and Coverage Expectations

| Test class | Component | Tests (approx.) | Focus |
|---|---|---|---|
| `account/UserAccountTests` | Accounts (entity) | 5 | Lockout rule with a fixed clock |
| `account/UserAccountRepositoryTests` | Accounts (repository) | 4 | Normalised lookup, unique email, batched ids |
| `account/AccountServiceTests` | Accounts (service) | 8 | Validation including the 72-byte limit, BCrypt 12, bad credentials, lockout, concurrency |
| `ad/AdServiceTests` | Ads (service) | 7 | Owner set from caller, owner-only edit, unowned ads, poster names, `ownedByMe` |
| `auth/AuthControllerTests` | Authentication (API) | 8 | Sign-up, log-in, log-out, me, CSRF, session id change, 401/409/423 |
| `ad/AdV1ControllerTests` | Ads API v1 | 8 | **Targeted regressions** for anonymous and non-owner writes, ignored owner field, error codes |
| `ad/AdControllerTests` | Legacy ads API | 6 existing + 3 new | Existing behaviour kept (logged-in writes) and legacy regressions |

- Standard strategy: 5–8 tests per component, plus MockMvc integration tests at the HTTP boundary.
- The security-patch floor adds targeted regressions that fail on the pre-change code: anonymous create (AC4.2), anonymous edit (AC4.6), non-owner edit (AC4.4), owner in the body (AC4.7), and the legacy path (NFR5.3).
- The existing suite stays green. Only the login and CSRF steps are added to the legacy write tests.
- No line-coverage floor applies to the security-patch scope. Every FR/AC row mapped to U1 is covered by at least one test.

## Mocking and Stubbing Guidance

- **Clock:** tests that need time override the `Clock` bean with a mutable fixed clock (`@TestConfiguration`) to advance past the 15-minute lock. Never use `Thread.sleep`.
- **CSRF:** to test the real token flow, call `GET /api/v1/auth/me`, read the `XSRF-TOKEN` cookie and send it as the `X-XSRF-TOKEN` header with the cookie. Use `csrf()` only where CSRF itself is not under test.
- **Sessions:** keep the `MockHttpSession` returned by log-in and reuse it on later requests. After log-out, replay the old session to prove it is anonymous.
- **Failures:** force a repository failure with `@MockitoSpyBean` on `AdRepository` to assert the 500 `internal_error` problem response.
- Do not mock `AccountService` in controller tests. They exercise the real BCrypt and lockout path.

## Test Data Management

- Each test class clears its repositories in `@BeforeEach` (`adRepository.deleteAll()`, `userAccountRepository.deleteAll()`), following the existing `AdControllerTests` pattern.
- A small helper `TestAccounts` (test source) signs up a user through the API and returns the session and CSRF token. It uses unique emails per test (`user-<uuid>@example.com`).
- A marker password, `Marker-P4ss-<uuid>`, lets tests assert that the password never appears in responses or logs (log capture with `OutputCaptureExtension`).
