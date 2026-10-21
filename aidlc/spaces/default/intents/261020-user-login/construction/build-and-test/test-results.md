# Test Results: User Login (intent 261020-user-login)

Run date: 2026-10-21, on Windows 11 Pro, 16 logical cores, OpenJDK 26.0.2.1 (JDK 25 is not installed), Node 20.20.2. Raw logs are in the session scratchpad (`backend-*.log`, `vite-dev.log`, `backend-https.log`). Nothing was committed.

**Overall: FAILED on one target.** Every build step and every functional, integration and security test passed. The single failure is a performance target: **NFR1.6 log-in latency p50 is Not Met**, root-caused below.

## Build Status

| Step | Command | Result |
|---|---|---|
| Backend package | `mvnw -f bulletin-board-backend/pom.xml -q package -DskipTests` (JAVA_HOME = JDK 26) | **Success** (exit 0), `target/bulletin-board-backend-0.0.1-SNAPSHOT.jar` |
| Frontend type check + bundle | `npm --prefix bulletin-board-frontend run build` (`tsc -b && vite build`) | **Success** (exit 0). `dist/assets/index-Cf_YDRZz.js` 231.54 kB, **72.17 kB gzip** |
| Frontend type check (unit command) | `npm --prefix bulletin-board-frontend exec -- tsc -b bulletin-board-frontend --noEmit` | **Success** (exit 0) |
| Frontend lint | `npm --prefix bulletin-board-frontend run lint` (oxlint) | **Success** (exit 0, no findings) |
| Pre-change baseline package (for NFR3.7 only) | `git archive` of the backend submodule HEAD, then `mvnw package -DskipTests` in the scratchpad | **Success** |

## Test Results

Commands are deduplicated, and each distinct command ran once. The full-suite runs include the unit-scoped classes. The per-unit commands were run once each, as the stage requires, and are not added to the totals.

| Suite / command | Total | Passed | Failed | Skipped | Notes |
|---|---|---|---|---|---|
| Backend full suite, baseline before additions: `mvnw … test` | 73 | 73 | 0 | 0 | Matches the code summary |
| **Backend full suite, final: `mvnw … test`** | **91** | **91** | 0 | 0 | 73 existing + 18 added in this stage (5 test classes, below) |
| U1 unit-scoped: `mvnw … test -Dtest=UserAccountTests,UserAccountRepositoryTests,AccountServiceTests,AdServiceTests,AuthControllerTests,AdV1ControllerTests,AdControllerTests` | 72 | 72 | 0 | 0 | The 7 named classes |
| Backend NFR measurements: `mvnw … test -Dtest=NfrPerformanceMeasurements` (run separately) | 5 | 4 | **1** | 0 | `nfr1_6_…` fails on the NFR1.6 p50 assertion; see Failure Details |
| **Frontend full suite: `npm --prefix bulletin-board-frontend test`** | **51** (8 files) | **51** | 0 | 0 | 45 existing + 6 added in this stage (2 files) |
| U2 unit-scoped: `vitest run --root bulletin-board-frontend <6 files>` | 45 (6 files) | 45 | 0 | 0 | |
| Cross-unit API smoke on :8080 (`scripts/api-smoke.mjs`) | 47 checks | 47 | 0 | 0 | Contract C1 and C2 against the running backend |
| Restart replay, NFR3.10 (`api-smoke.mjs --phase restart-save` / `restart-check`, with a real restart in between) | 1 + 3 checks | 4 | 0 | 0 | The old cookie after the restart: `/me` 200 `{user:null}`; writes 401 `not_authenticated`; never 500 |
| Smoke through the Vite dev proxy :5173, NFR4 | 47 checks | 46 | 1* | 0 | *The one miss is the backend-only default-deny probe of `/does-not-exist`. Vite serves non-`/api` paths, so the request never reaches the backend. That is expected and not a defect. Every `/api` check passed same-origin through the proxy. |
| HTTPS cookie check, NFR3.1 Secure (`scripts/https-cookie-check.mjs` against the jar on :8443 with a throwaway self-signed cert) | 4 checks | 4 | 0 | 0 | Run 1 failed on my own check (Tomcat writes `Max-Age=0` as `Expires=…1970`). The check was fixed and re-run; no product change. |
| NFR1.6 on the running app (`scripts/nfr1-6-login-latency.mjs`) | 2 runs | 0 | **2** | 0 | `spring-boot:run` and the jar, both above the target |
| NFR3.7 overhead vs the pre-change baseline (`scripts/nfr3-7-overhead.mjs`) | 1 | 1 | 0 | 0 | |
| `npm audit` (all deps) / `npm audit --omit=dev` | — | — | — | — | 1 high (vite 8.3.2 dev server, existing) / **0 vulnerabilities** |

### Tests added in this stage (test sources only; no production source changed)

| File | Tests | Covers |
|---|---|---|
| `bulletin-board-backend/src/test/java/com/example/bulletinboard/auth/SignupSessionFailureTests.java` | 3 | NFR1.8. The session store fails after sign-up, then 500 `internal_error` "…Please log in.", the account exists, the left-over session is anonymous, an ERROR log line by id only, a later log-in 200; a repeated sign-up gives 409, not 500. |
| `bulletin-board-backend/src/test/java/com/example/bulletinboard/auth/SessionFixationTests.java` | 5 | NFR3.2, NFR3.3, NFR3.5 over real HTTP: replaying the pre-log-in id (log-in as another user) and the pre-sign-up id is anonymous; an attacker-chosen id is not adopted; the XSRF token changes after sign-up, log-in and log-out; the pre-log-out cookie is anonymous. |
| `bulletin-board-backend/src/test/java/com/example/bulletinboard/config/DefaultDenyTests.java` | 7 | NFR5.1 default deny: DELETE (v1 and legacy), PATCH, unmapped POST/GET under `/api/**`, and `/actuator/env` and `/index.html` give 401 `not_authenticated` / 403 `forbidden`, as problem+json; DELETE without a token gives 403 `csrf_invalid`; the open reads stay 200. |
| `bulletin-board-backend/src/test/java/com/example/bulletinboard/auth/SecurityEventLogTests.java` | 3 | NFR2.4, NFR2.5: `account_locked` logged exactly once; the refused log-in during the lock is `login_failure … outcome=account_locked`; an unknown email is logged as `accountId=none`; a CSRF refusal is `write_refused … outcome=csrf`; no email or password in the log. |
| `bulletin-board-backend/src/test/java/com/example/bulletinboard/perf/NfrPerformanceMeasurements.java` | 5 | NFR1.3, NFR1.6, NFR1.7, NFR3.8, NFR3.9, NFR5.5 (run separately; excluded from `mvnw test` by its name) |
| `bulletin-board-frontend/src/AdForm.double-submit.test.tsx` | 3 | A double click, or Enter while a save is pending, sends one request; a new save works afterwards |
| `bulletin-board-frontend/src/App.csrf.test.tsx` | 3 | `csrf_invalid` on Save and on create shows the token-expired message and keeps the typed text; exactly one PUT/POST (no automatic resend); one `/me` refresh; no session-ended notice; a manual retry carries the fresh token |

Scripts (in this stage's `scripts/`): `api-smoke.mjs`, `nfr1-6-login-latency.mjs`, `nfr3-7-overhead.mjs`, `https-cookie-check.mjs`.

## Performance Measurements

| ID | Actual | Target | Verdict |
|---|---|---|---|
| NFR1.3 | median unknown email 631.9 ms vs known email + wrong password 621.5 ms, **difference 10.4 ms**; identical 401 bodies | < 50 ms | Met |
| NFR1.6 (in-process, run 1, loaded machine) | p50 **608.1 ms**, p95 **741.2 ms** | p50 ≤ 400, p95 ≤ 600 | Not Met |
| NFR1.6 (in-process, run 2, idle machine) | p50 **493.7 ms**, p95 526.3 ms, max 620.1 ms | p50 ≤ 400, p95 ≤ 600 | Not Met (p50) |
| NFR1.6 (running app, `spring-boot:run`) | p50 **786.4 ms**, p95 931.9 ms | p50 ≤ 400, p95 ≤ 600 | Not Met |
| NFR1.6 (running app, packaged jar) | p50 **622.7 ms**, p95 **753.4 ms** | p50 ≤ 400, p95 ≤ 600 | Not Met |
| NFR1.7 | 10,000 accounts seeded (3.0–3.3 s); p50 change **+3.8%** (run 1) and **−1.4%** (run 2) | no measurable change (≤ 10% p50 change) | Met |
| NFR3.7 | pre-change `GET /api/ads/{id}` p95 11.55 ms; new v1 visitor p95 12.31 ms (+0.75), v1 logged-in 11.84 ms (+0.29), legacy 7.99 ms (−3.57); **worst +0.75 ms** | ≤ 10 ms added at p95 | Met |
| NFR3.8 | 500 distinct sessions, 0 log-in failures (53.9 s on 16 threads), 0 list failures, 0 lost sessions (1,000 requests in 1.5 s) | 500 sessions, no errors | Met |
| NFR3.9 | 10 parallel log-ins in **698 ms**, 0 failures | ≤ 3,000 ms, 0 failures | Met |
| NFR5.5 | 1,000 ads by 100 posters: **2 SQL statements** per list request; p50 19.6 ms, **p95 43.5 ms**; every author named; no email | ≤ 2 statements, p95 ≤ 150 ms | Met |
| NFR4.2 (U2) | 72.17 kB gzip, **+2.68 kB** over 69.49 kB | ≤ +15 kB | Met |
| Raw BCrypt verification, this machine (diagnostic, not a target) | cost 10: 144 ms; cost 11: 343 ms; **cost 12: 630 ms** (median of 15) | — | — |

## Failure Details

### NFR1.6: log-in latency p50 (and p95 under load) above target

- **Test:** `com.example.bulletinboard.perf.NfrPerformanceMeasurements.nfr1_6_logInLatencyAndNfr1_7_tenThousandAccounts`
- **Assertion:** `[NFR1.6 p50 ms] Expecting actual: 493.7 to be less than or equal to: 400.0` (idle run). Run 1 also failed p95: 741.2 > 600. The running-app script `nfr1-6-login-latency.mjs` exits 1 with `p50=622.7 ms p95=753.4 ms … NOT MET`.
- **Stack trace:** a soft-assertion failure (`org.assertj.core.error.AssertJMultipleFailuresError`) in the test method; there is no exception in production code. Every log-in answered 200.

**In-stage attempts (2 of 2 used):**
1. Re-measured "against the running app", exactly as the NFR text describes. With `spring-boot:run`: p50 786 ms. I then suspected the launch mode, because the Maven plugin starts the JVM with an optimized-launch C1-only flag.
2. Re-measured against the packaged jar, which is production-like JIT, on an idle machine: p50 623 ms. In-process on an idle machine: p50 494 ms. Neither meets p50 ≤ 400 ms.

**Root cause:** log-in time is dominated by one BCrypt verification at cost 12. The cost-12 rule is NFR1.1, from the NFR question Q2. On this machine a single cost-12 verification alone takes **≈ 630 ms median**, measured outside Spring. The performance NFR was written assuming "about 0.25 s per hash" (`performance-requirements.md`, Resource constraints). So two approved targets, **NFR1.1 (BCrypt cost 12)** and **NFR1.6 (p50 ≤ 400 ms)**, cannot both hold on this hardware. This is not a defect in the generated code or tests: there is exactly one hash per log-in, no extra queries, and NFR1.7 and NFR5.5 show the data path is fast. The miss traces to an approach chosen upstream (the hash cost against the latency budget).

**Classification:** an approach chosen at NFR Requirements and implemented at Code Generation (U1). The fix is not inside Build and Test's remit, and every candidate changes an approved requirement.

**Candidate fixes with estimated impact:**

| # | Fix | Effort | Cost | Risk / consequence |
|---|---|---|---|---|
| A | Lower BCrypt cost to **11** (`AccountService.BCRYPT_STRENGTH`); update the `$2a$12$` assertion in `AccountServiceTests` and the NFR1.1 text. Expected log-in p50 ≈ 350–370 ms here (343 ms hash + about 15 ms request). | ~1–2 h, including a re-run of the measurements | none | **Security trade-off:** halves an attacker's offline guessing cost per hash. It changes the approved NFR1.1 / Q2 answer, so the product owner and security must decide. Stored hashes are irrelevant (in-memory store). Throughput and NFR3.9 improve. |
| B | Keep cost 12 and **re-baseline NFR1.6** to the measured hardware, for example p50 ≤ 700 ms and p95 ≤ 900 ms. | ~0.5 h (documentation) | none | No code risk. It **changes an approved target**, which only the human can do; Build and Test may never weaken it. Log-in stays about 0.6 s for users. |
| C | Keep both and validate on the real target hardware (if faster than this developer machine). | unknown: needs a deployment environment, which is out of scope | depends on hardware | May still fail. No such environment exists in this plan. |
| D | Replace BCrypt with Argon2id, tuned to about 250 ms (new dependency, ADR change). | ~1 day | none | Medium: a new crypto dependency and decision, and it also changes NFR1.1. |

**Recommendation:** a human decision between A and B. The construction-autonomous loop-back cannot settle this by itself, because both realistic fixes change an approved requirement (NFR1.1 or NFR1.6). Option A is the smallest code change if the security trade-off is accepted.

### Decision (2026-10-21)

The product owner chose **Accept failure** at the halt-and-ask:
- BCrypt stays at cost 12 (NFR1.1 unchanged);
- NFR1.6 remains recorded as **Not Met** on this hardware (log-in p50 about 0.5–0.8 s);
- no loop-back was run.

Re-baselining NFR1.6, or revisiting the hashing cost, stays open for the product owner.

## Coverage Report

- No line-coverage floor applies to the security-patch scope (Testing Contract `scope_floor`: a targeted regression and an existing suite that stays green). The Maven build has no coverage plugin (JaCoCo), and the frontend has no coverage provider configured, so no line-coverage figure is produced. Requirement coverage is reported in `cross-unit-traceability.md` instead.
- Standard strategy volume (5–8 tests per component). **U1:** accounts 27 (entity 7, repository 5, service 15), ads 33 (service 10, v1 API 14, legacy 9), auth API 23 (12 + 5 + 3 + 3), config/default deny 7. **U2:** ApiClient 12, CurrentUser 8, AuthPanels 12, AdBoard 10 (7 + 3), AdForm 8 (5 + 3). Every component has at least 5.
- Security-patch floor: targeted regressions for anonymous create (AC4.2), anonymous edit (AC4.6), non-owner edit (AC4.4), owner in the body (AC4.7) and the legacy path (NFR5.3) are present. They would fail on the pre-change code: the pre-change backend accepted an anonymous `POST /api/ads` with 201 during the NFR3.7 baseline seeding. The existing suite is green: 73 of 73 before the additions, 91 of 91 after.
