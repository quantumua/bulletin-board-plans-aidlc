# Developer Code Scan: bulletin-board-backend

Repo: `bulletin-board-backend` (git submodule of the project root) at commit `b75b6593bd48a9bb8b1c46f7aa4ac07a89832747` (2026-10-01, "Merge pull request #1 from quantumua/feat/initial-bulletin-board"). Working tree clean. Breadth: full scan of the whole repo. Depth: Standard.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `pom.xml`
  - `README.md`
  - `.gitignore`
  - `.gitattributes`
  - `.mvn/wrapper/maven-wrapper.properties`
  - `src/main/java/com/example/bulletinboard/BulletinBoardBackendApplication.java`
  - `src/main/java/com/example/bulletinboard/ad/` (all 7 files: `Ad.java`, `AdController.java`, `AdNotFoundException.java`, `AdRepository.java`, `AdRequest.java`, `AdResponse.java`, `AdService.java`)
  - `src/main/java/com/example/bulletinboard/config/CorsConfig.java`
  - `src/main/resources/application.properties`
  - `src/test/java/com/example/bulletinboard/BulletinBoardBackendApplicationTests.java`
  - `src/test/java/com/example/bulletinboard/ad/AdControllerTests.java`
- **Skimmed only**:
  - `mvnw`, `mvnw.cmd` (generated Maven Wrapper 3.3.4 launcher scripts; noted, not read line by line)
- **Left out**:
  - `target/` (Maven build output, gitignored; not present in the working tree at scan time)
  - `.mvn/wrapper/maven-wrapper.jar` (gitignored; not present)
  - IDE folders listed in `.gitignore` (`.idea`, `.vscode/`, `.settings`, etc.; none present)

Every tracked file in the repo (18 files from `git ls-files`) is accounted for above.

### Packages Found
- `com.example.bulletinboard` — application root — Java 25 — Spring Boot entry point (`BulletinBoardBackendApplication`, `@SpringBootApplication`)
- `com.example.bulletinboard.ad` — feature package (vertical slice) — Java 25 — the "ad" domain: JPA entity, repository, service, REST controller, request/response DTO records, not-found exception
- `com.example.bulletinboard.config` — configuration — Java 25 — CORS configuration (`CorsConfig implements WebMvcConfigurer`)
- Test packages mirror main: `com.example.bulletinboard` (context-load test), `com.example.bulletinboard.ad` (MockMvc integration tests)

Single Maven module; no multi-module structure.

### Build System
- **Type**: Maven 3.9.16 via Maven Wrapper 3.3.4 (`distributionType=only-script`)
- **Config Files**: `pom.xml`, `.mvn/wrapper/maven-wrapper.properties`, `mvnw`, `mvnw.cmd`
- **Build Dependencies**: parent `org.springframework.boot:spring-boot-starter-parent:4.1.1` (manages all dependency versions); plugin `spring-boot-maven-plugin` (version from parent). `java.version=25`. Coordinates `com.example:bulletin-board-backend:0.0.1-SNAPSHOT`.

### APIs Discovered
- REST (JSON) — `ad/AdController.java`, base path `/api/ads` — 4 endpoints:
  - `GET /api/ads` — list all ads, newest first (`createdAt` desc) — 200, `AdResponse[]`; no pagination
  - `GET /api/ads/{id}` — one ad — 200 `AdResponse`, 404 problem detail `"Ad {id} not found"`
  - `POST /api/ads` — create — body `AdRequest` (`title` NotBlank max 100, `description` NotBlank max 2000) — 201 + `Location` header + `AdResponse`; 400 on validation failure
  - `PUT /api/ads/{id}` — full update of title and description — 200 `AdResponse`; 400 on validation; 404 when missing
- No DELETE endpoint. No authentication or authorization on any endpoint (anyone can create and update any ad).
- `AdResponse` = `{id, title, description, createdAt, updatedAt}` (ISO-8601 `Instant`s). No owner/author field.
- Errors: RFC 9457 problem details (`spring.mvc.problemdetails.enabled=true`; `AdNotFoundException extends ErrorResponseException`).
- Non-business surface: H2 web console at `/h2-console` (`spring.h2.console.enabled=true`, via `spring-boot-h2console`), unauthenticated.
- CORS: `/api/**` allows origins from `app.cors.allowed-origins` (default `http://localhost:5173`), methods `GET, POST, PUT` only; no `allowCredentials`, default allowed headers.

### Frameworks & Libraries
- Java — 25 — language level (`java.version`)
- Spring Boot — 4.1.1 — application framework (parent POM)
- `spring-boot-starter-webmvc` — managed by Boot 4.1.1 — Spring MVC REST controllers, embedded servlet container
- `spring-boot-starter-data-jpa` — managed — Spring Data JPA + Hibernate ORM, `JpaRepository`
- `spring-boot-starter-validation` — managed — Jakarta Bean Validation (`@NotBlank`, `@Size`, `@Valid`)
- `spring-boot-h2console` — managed — H2 web console auto-configuration (Boot 4 split module)
- `com.h2database:h2` — managed, runtime scope — in-memory database `jdbc:h2:mem:bulletinboard`
- `spring-boot-starter-data-jpa-test`, `spring-boot-starter-validation-test`, `spring-boot-starter-webmvc-test` — managed, test scope — JUnit Jupiter, Spring Test, MockMvc (`org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc`), Hamcrest, JsonPath
- Not present: Spring Security, any JWT/OAuth library, Flyway/Liquibase, Lombok, OpenAPI/springdoc, Actuator.

### Test Coverage
- **Test Directories**: `src/test/java/com/example/bulletinboard/` and `.../ad/`
- **Test Frameworks**: JUnit 5 (Jupiter), Spring Boot Test (`@SpringBootTest`), MockMvc (`@AutoConfigureMockMvc`), Hamcrest matchers, JsonPath
- **Coverage Config**: absent (no JaCoCo or other coverage plugin)
- Tests (7 total): `contextLoads`; `AdControllerTests` — `createsAd`, `rejectsInvalidAd`, `updatesAd`, `returnsNotFoundWhenUpdatingMissingAd`, `listsAdsNewestFirst`, `allowsFrontendOrigin`. All are full-context integration tests against H2; `@BeforeEach` deletes all ads. Not covered: `GET /api/ads/{id}` (happy path and 404), oversize field validation, disallowed CORS origin/method.
- Tests were not executed in this scan (read-only analysis).

### Code Quality Indicators
- **Linting**: none configured (no Checkstyle, SpotBugs, PMD, Spotless, `.editorconfig`). Formatting: tabs in the generated application/test-bootstrap classes, 4 spaces in hand-written classes (mixed).
- **CI/CD**: none (no `.github/`, Jenkinsfile, or other pipeline file in the repo).
- **Documentation**: `README.md` present and accurate (stack, run, test, API table, request body, validation limits, configuration). No Javadoc; one explanatory inline comment in `AdService.update`. No OpenAPI spec.
- Code is small, cleanly layered (controller -> service -> repository), uses constructor injection, records for DTOs, `@Transactional(readOnly = true)` at class level, `open-in-view=false`. No TODO/FIXME/HACK markers, no `@SuppressWarnings`.

### Technical Debt Signals
- No authentication/authorization at all: `POST` and `PUT /api/ads/**` are open to anyone; any caller can overwrite any ad (`AdController.java` lines 36-46, `AdService.update` lines 31-37). This is the ownership gap the intent targets.
- `Ad` entity has no owner/author column (`Ad.java` lines 18-32); no `User` entity or table exists.
- Schema is generated by Hibernate with `spring.jpa.hibernate.ddl-auto=create-drop` on an in-memory H2 database (`application.properties` lines 3-4): all data is lost on restart and there are no migration scripts. Any new table (users) or column (owner) will be created implicitly; "ads that existed before login become unowned" has no persistent data to migrate in the current setup.
- H2 console enabled and unauthenticated (`application.properties` line 6); README documents the `sa` user with empty password. Fine for local dev, unsafe if deployed; it will also interact with Spring Security (frame options, CSRF) once security is added.
- CORS allows only `GET, POST, PUT` and does not set `allowCredentials` or explicit allowed headers (`CorsConfig.java` lines 19-21): cookie-based sessions or an `Authorization` header from the frontend origin, plus any new `DELETE`/logout methods, will need CORS changes.
- `listsAdsNewestFirst` saves two ads back-to-back and relies on distinct `Instant.now()` values for ordering (`AdControllerTests.java` lines 87-94; ordering by `createdAt` only in `AdRepository.java` line 9) — potential flakiness on low-resolution clocks; no tie-breaker on `id`.
- `GET /api/ads` returns the whole table unpaginated (`AdService.findAll`).
- Only a not-found exception is custom; there is no global `@RestControllerAdvice` (Boot's default problem-details handling covers validation 400s).
- No coverage tooling and no CI, so the org-level 80% line-coverage floor and CI-before-merge default cannot be checked today.
- Mixed indentation (tabs vs spaces) with no formatter enforcing a style.

## Handoff Summary
- **Intent-relevant finding**: The backend has zero security: no `spring-boot-starter-security` dependency in `pom.xml` (lines 19-57), no user model, no owner on `Ad` (`Ad.java` lines 18-32), and the write endpoints `POST /api/ads` and `PUT /api/ads/{id}` (`AdController.java` lines 36-46) accept any caller. The touch points for login are: `pom.xml` (security dependency), a new user/account slice beside `ad/`, an owner reference on `Ad` + `AdResponse`, an ownership check in `AdService.update`, the CORS policy in `config/CorsConfig.java` (methods/credentials/headers), and the H2 console exposure in `application.properties`.
- **Risks / follow-up**: (1) Persistence is in-memory with `create-drop`, so there is no existing ad data to backfill as "unowned" across restarts; whether a durable database is in scope must be decided upstream, not assumed. (2) Adding Spring Security will by default lock every endpoint, including `GET /api/ads/**` (which must remain public) and `/h2-console`, and will break the existing MockMvc tests and the CORS preflight test unless the security chain and CORS are configured together. (3) The frontend origin `http://localhost:5173` is the only allowed origin; the auth mechanism choice (session cookie vs token) drives CORS `allowCredentials`/headers. (4) Spring Boot 4.1.1 / Java 25 are very recent: Boot 4 split test auto-configuration into per-starter `*-test` modules, so a security test starter (e.g. a `spring-boot-starter-security-test` equivalent) will be needed for auth-aware tests.
