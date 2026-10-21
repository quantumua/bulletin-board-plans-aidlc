# Performance Test Instructions: User Login (intent 261020-user-login)

This plan has no later performance-validation stage, so every locally measurable performance and capacity target is measured here, in Build and Test. The targets come from `construction/u1-backend-auth/nfr-requirements/performance-requirements.md` and `scalability-requirements.md`, plus NFR1.3 from `security-requirements.md`, and from `construction/u2-frontend-login/nfr-requirements/performance-requirements.md`. Targets are reproduced exactly as written. None is relaxed.

## Targets and Methods

| ID | Target (source) | Method | Tool / file |
|---|---|---|---|
| NFR1.3 | Median log-in time for an unknown email and for a known email with a wrong password differ by < 50 ms over 20 attempts each | Interleaved attempts over real HTTP. 5 accounts × 4 wrong attempts, so no account reaches the lock. The two response bodies are also compared. | `NfrPerformanceMeasurements#nfr1_3_*` |
| NFR1.6 | Log-in latency p50 ≤ 400 ms, p95 ≤ 600 ms; "50 sequential log-ins against the running app", after ≥ 10 warm-up requests | (a) in-process: embedded Tomcat on a random port, over HTTP; (b) **running app**: packaged jar, and also `spring-boot:run`, measured by a Node client | `NfrPerformanceMeasurements#nfr1_6_*`, `scripts/nfr1-6-login-latency.mjs` |
| NFR1.7 | 10,000 accounts in memory "without a measurable change to log-in latency" | Measure NFR1.6, seed 10,000 accounts, then measure again in the same JVM. **Reading of "measurable":** the p50 changes by no more than 10%. The source gives no number; 10% is above the run-to-run noise seen here, and the absolute latency stays judged by NFR1.6. | `NfrPerformanceMeasurements#nfr1_6_*` |
| NFR3.7 | ≤ 10 ms added at p95 on non-log-in requests compared with the same request **before this change** | The pre-change backend (`git archive` of the backend submodule's HEAD, built and run on port 8081) against the changed jar on port 8080. 50 warm-up requests, then 300 interleaved samples per series: baseline `GET /api/ads/{id}`; new `GET /api/v1/ads/{id}` as a visitor and logged in; new legacy `GET /api/ads/{id}`. | `scripts/nfr3-7-overhead.mjs` |
| NFR3.8 | 500 logged-in sessions held in memory without errors; each lists ads | 500 seeded accounts logged in by a pool of 16 threads; then every session lists ads and is recognised by `/me` | `NfrPerformanceMeasurements#nfr3_8_*` |
| NFR3.9 | 10 parallel log-ins finish within 3 s total, no failures | 10 threads released by one latch, 10 distinct accounts | `NfrPerformanceMeasurements#nfr3_9_*` |
| NFR5.5 | List of 1,000 ads by 100 posters: p95 ≤ 150 ms, ≤ 2 SQL statements per list request | Seed 100 accounts and 1,000 ads. Count prepared statements with Hibernate statistics (test-only property) for one request; then time 50 requests. The body is also checked for every author name and no email. | `NfrPerformanceMeasurements#nfr5_5_*` |
| NFR4.2 (U2) | JS bundle gzip grows ≤ 15 kB over the 69.49 kB baseline | `npm run build` output | build log |
| NFR4.3 (U2) | Exactly 2 API requests on page load, sent in parallel | Component test counting `fetch` calls | `src/App.test.tsx` |
| NFR4.4 (U2) | Submit disables within one render; a second click sends no second request | Component test | `src/auth/AuthPanels.test.tsx` |
| NFR4.5 (U2) | A request with no answer after 10 s is aborted with the generic message | Fake-timer test | `src/api.test.ts` |
| NFR2.6 | `GET /api/v1/ads` answers 200 when the backend is up (health) | API smoke | `scripts/api-smoke.mjs` |

## Test Framework Setup and Configuration

- **Backend measurements:** `bulletin-board-backend/src/test/java/com/example/bulletinboard/perf/NfrPerformanceMeasurements.java` (new, test-only).
  - The class name does not end in `Tests`, so Surefire's default includes leave it out of `mvnw test`. That keeps the regular suite fast. Run it on its own with `-Dtest=...`.
  - It is a `@SpringBootTest(webEnvironment = RANDOM_PORT)`, measured with `java.net.http.HttpClient`.
  - Test-only properties: `hibernate.generate_statistics=true` (to count SQL statements). Hibernate's per-session statistics logging and the `security` logger are both set to WARN, to keep 500+ log-ins from flooding the console.
  - Every test prints one `NFR-MEASURE <id> …` line and asserts the target. NFR1.6 and NFR1.7 use soft assertions, so one result never hides the other.
- **Running-app scripts:** `construction/build-and-test/scripts/*.mjs` (Node 20, no dependencies).
- **Pre-change baseline for NFR3.7:**

  ```bash
  git -C bulletin-board-backend archive --prefix=baseline-backend/ -o <scratch>/baseline-backend.tar HEAD
  tar --force-local -xf <scratch>/baseline-backend.tar -C <scratch>
  JAVA_HOME=<jdk> <scratch>/baseline-backend/mvnw -f <scratch>/baseline-backend/pom.xml -q package -DskipTests
  ```

  This is read-only on the repository: nothing is checked out, and no worktree is added.

## How to Run

```bash
# Backend in-process measurements (about 3.5 minutes; keep the machine otherwise idle)
JAVA_HOME=C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1 bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test -Dtest=NfrPerformanceMeasurements

# One measurement only
JAVA_HOME=C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1 bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml test "-Dtest=NfrPerformanceMeasurements#nfr1_6_logInLatencyAndNfr1_7_tenThousandAccounts"

# Running app: start the packaged jar (production-like JIT). spring-boot:run starts the JVM with an
# optimized-launch flag that is slower, so use the jar for timing.
JAVA_HOME=C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1 bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml -q package -DskipTests
C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1/bin/java -jar bulletin-board-backend/target/bulletin-board-backend-0.0.1-SNAPSHOT.jar          # port 8080
node aidlc/spaces/default/intents/261020-user-login/construction/build-and-test/scripts/nfr1-6-login-latency.mjs http://localhost:8080

# NFR3.7: baseline jar on 8081 next to the changed jar on 8080
C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1/bin/java -jar <scratch>/baseline-backend/target/bulletin-board-backend-0.0.1-SNAPSHOT.jar --server.port=8081
node aidlc/spaces/default/intents/261020-user-login/construction/build-and-test/scripts/nfr3-7-overhead.mjs http://localhost:8080 http://localhost:8081 300

# Frontend bundle size (NFR4.2): read the gzip column for dist/assets/index-*.js
npm --prefix bulletin-board-frontend run build
```

Stop every server you started afterwards. On Windows, the `java` child process can outlive the Maven wrapper; stop it by PID (`netstat -ano`, then `taskkill /PID <pid> /F`).

## Expected Coverage Targets

Every row in the targets table gets an actual value and exactly one verdict in `build-and-test-summary.md`: Met, Not Met or Unverified. A missed target is reported as **Not Met**, with its root cause and the candidate fixes with their impact. It is never re-interpreted to pass.

## Test Data Management and Environment

- Accounts used only as data are inserted through `UserAccountRepository` with one BCrypt-12 hash computed in advance, because hashing 10,000+ passwords would take hours. Every **measured** log-in still runs the real BCrypt check.
- Emails are run-unique (`<prefix>-<run>-<n>@example.com`). The data lives in H2 in-memory and goes when the JVM stops.
- Environment of record: Windows 11 Pro, 16 logical cores, OpenJDK 26.0.2.1, Node 20.20.2, on a developer machine. This matches the NFRs' "developer machine" basis. Absolute timings depend on the CPU. To show that, the raw BCrypt verification cost was measured separately (`<scratch>/BcryptCost.java`, median of 15 after warm-up): cost 10 = 144 ms, cost 11 = 343 ms, cost 12 = 630 ms.
