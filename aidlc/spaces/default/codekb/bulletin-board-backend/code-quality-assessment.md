# Code Quality Assessment: bulletin-board-backend

## Overall

A small, clean, recently generated codebase (one feature, 10 main classes) with consistent layering and good boundary hygiene. The main gaps are missing security, missing quality automation (lint, coverage, CI), and non-durable persistence.

## Quick Ratings

| Dimension | Rating | Evidence |
|---|---|---|
| Naming clarity | good | `AdService.findAll`, `AdRequest`, `findAllByOrderByCreatedAtDesc` are self-describing |
| Function size | good | every method is under 10 lines |
| Error handling | good | 404 via `AdNotFoundException` (`ProblemDetail`); validation 400s via Spring defaults; no swallowed exceptions |
| Test presence | fair | all write paths and list are tested; `GET /api/ads/{id}`, oversize validation and CORS rejection are not |
| Duplication | good | length limits shared between DTO and entity via constants |
| Dead code | good | no unused classes, commented-out code, or TODO/FIXME/HACK markers |

## Test Coverage

- **Suites**: `BulletinBoardBackendApplicationTests` (context loads) and `AdControllerTests` (6 MockMvc integration tests).
- **Style**: full `@SpringBootTest` with H2; repository cleared in `@BeforeEach`.
- **Covered**: create (201 + Location + body), blank title (400), update (200), update missing (404 + detail), list order, CORS preflight for the allowed origin and POST.
- **Not covered**: `GET /api/ads/{id}` happy path and 404; over-length title/description; malformed JSON; disallowed origin or method in CORS; `updatedAt` refresh on update.
- **Coverage tooling**: none (no JaCoCo); line coverage is not measured.
- **Flakiness risk**: `listsAdsNewestFirst` saves two ads immediately one after another and orders only by `createdAt`; identical `Instant.now()` values would make order undefined.
- Tests were not executed during this scan.

## Linting and Formatting

- No linter or formatter configured (no Checkstyle, PMD, SpotBugs, Spotless, Error Prone, `.editorconfig`).
- Indentation is mixed: tabs in `BulletinBoardBackendApplication.java`, `BulletinBoardBackendApplicationTests.java` and `pom.xml`; 4 spaces in all hand-written classes.

## CI/CD

None in this repository (no `.github/workflows`, Jenkinsfile, or similar). No Dockerfile or deployment descriptors. The org default of CI execution before merge and an 80% line-coverage floor for feature-type scopes cannot be verified with the current setup.

## Documentation

- `README.md` is accurate and sufficient: stack, run, test, endpoint table, request body, validation limits, CORS configuration, H2 console access.
- No Javadoc; one explanatory comment in `AdService.update` (why `saveAndFlush`).
- No OpenAPI spec.

## Technical Debt

| # | Item | Location | Severity |
|---|---|---|---|
| TD-1 | No authentication or authorization; anyone can create and edit any ad | `pom.xml` (no security starter), `ad/AdController.java`, `ad/AdService.java` | high (the active intent) |
| TD-2 | Ads have no owner/author; no user model exists | `ad/Ad.java`, `ad/AdResponse.java` | high (the active intent) |
| TD-3 | In-memory H2 with `ddl-auto=create-drop`; data lost on restart; no migrations | `application.properties` | medium |
| TD-4 | H2 console enabled and unauthenticated; `sa` with empty password documented | `application.properties`, `README.md` | medium if ever deployed |
| TD-5 | No coverage tool, no linter, no CI | repo root | medium |
| TD-6 | Unpaginated list endpoint | `ad/AdService.findAll` | low |
| TD-7 | Potentially flaky ordering test (no `id` tie-breaker) | `AdControllerTests.listsAdsNewestFirst`, `AdRepository` | low |
| TD-8 | CORS does not expose `Location`, does not allow credentials, allows only GET/POST/PUT | `config/CorsConfig.java` | low today; relevant for login |
| TD-9 | Mixed tabs/spaces, no formatter | various | low |

No hard-coded credentials beyond the H2 local default, no suppressed warnings, no deep nesting, no god classes.

## Security Observations Relevant to the Active Intent

These are facts about the current code for later stages to use; they are not design decisions.

- **No security filter chain.** `spring-boot-starter-security` is absent; every request reaches the controllers.
- **CORS lives in Spring MVC** (`CorsConfig`), not in a security configuration. Once a security filter chain exists, preflight handling and CORS must be wired so the existing `allowsFrontendOrigin` behaviour is preserved.
- **Cross-origin credentials are not allowed** (`allowCredentials` unset) and only `GET, POST, PUT` are permitted. A cookie-based session would need credentials enabled with an explicit origin list; a header-based token would need the header allowed (default allows all requested headers). Any new HTTP methods (e.g. `DELETE`) would need adding.
- **Public reads must stay public.** `GET /api/ads` and `GET /api/ads/{id}` are used by visitors; a default-deny security setup would close them.
- **H2 console** requires same-origin frame allowance and CSRF exemption under Spring Security, or should be disabled outside local development.
- **Existing tests** call `POST`/`PUT` anonymously and will start failing once writes require login; they will need authenticated test requests (a security test starter in Boot 4's per-starter test layout).
- **Ownership data has nowhere to live yet**: `Ad` has no owner column; the update path (`AdService.update`) is the single place where an ownership check would apply.
- **Pre-existing ads**: because the database is in-memory and recreated at every start, there are no persisted pre-login ads today; the intent's "existing ads become unowned" rule only matters for ads created within a running instance or if persistence becomes durable.
