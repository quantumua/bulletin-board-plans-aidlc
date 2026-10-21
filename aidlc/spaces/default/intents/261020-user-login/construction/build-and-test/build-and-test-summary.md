# Build and Test Summary: User Login (intent 261020-user-login)

Scope **security-patch**, test strategy **Standard**, Construction autonomy **autonomous**. Units: U1 `u1-backend-auth` (bulletin-board-backend, Spring Boot 4.1.1, Java) and U2 `u2-frontend-login` (bulletin-board-frontend, React 19, Vite 8, Vitest).

## Overall Status

**Result: FAILED, on 1 of 64 targets.** Every build step and every test suite passed. One measured performance target is **Not Met: NFR1.6** (log-in latency p50 ≤ 400 ms). The root cause is BCrypt cost 12 (NFR1.1), which takes ≈ 630 ms per verification on this machine; the latency budget assumed ≈ 250 ms. Fixing it needs a human decision on an approved requirement. Details and impact-estimated options are in `test-results.md`, under Failure Details.

| Item | Status |
|---|---|
| Backend build (`mvnw package`) | Success, on **JDK 26** (JDK 25 is not installed; the README says "JDK 25 or newer") |
| Frontend build (`tsc -b && vite build`), lint (oxlint), type check | Success |
| Backend full suite | **91 / 91** passed (73 existing + 18 new) |
| Frontend full suite | **51 / 51** passed (45 existing + 6 new) |
| Unit-scoped commands | U1 72 / 72, U2 45 / 45 |
| Cross-unit API smoke (C1 + C2) | 47 / 47; restart replay 4 / 4; through the Vite proxy every `/api` check passed (46 / 46, plus one expected non-API probe) |
| HTTPS cookie check | 4 / 4 |
| NFR measurements | 4 / 5 backend measurement tests pass; NFR3.7 Met; **NFR1.6 Not Met** |
| Production dependency audit | `npm audit --omit=dev`: 0 vulnerabilities |
| Target Verification Matrix | **Met 63 · Not Met 1 · Unverified 0** |
| Cross-unit traceability (31 FR + 8 NFR) | **PASS**: 39 / 39 covered, none uncovered |

Prerequisites: JDK 25+ (built on 26.0.2.1), Node 20.19+, npm, and the Maven wrapper. No external services (see `build-instructions.md`).

## Test Type Inventory

| Type | Instruction file | Generated because |
|---|---|---|
| Unit (per unit) | `../u1-backend-auth/code-generation/unit-test-instructions.md`, `../u2-frontend-login/code-generation/unit-test-instructions.md` | Code Generation |
| Integration / cross-unit contract | `integration-test-instructions.md` | Standard strategy |
| Performance and capacity | `performance-test-instructions.md` | Measurable NFRs, and no later performance-validation stage in the plan |
| Security | `security-test-instructions.md` | Security-patch scope; security NFRs in both units |
| Build | `build-instructions.md` | always |

## Coverage Expectations per Unit

- **U1:** 5–8+ tests per component (accounts 27, ads 33, auth API 23, default deny 7). The security-patch targeted regressions cover AC4.2, AC4.4, AC4.6, AC4.7 and NFR5.3. The existing suite stays green. There is no line-coverage floor for this scope, and no coverage tool is configured.
- **U2:** 5–8+ tests per component (ApiClient 12, CurrentUser 8, AuthPanels 12, AdBoard 10, AdForm 8). The targeted regression is the visibility rule (no New ad or Edit when logged out; Edit only on own ads). There is no line-coverage floor.
- **Cross-unit:** every C1 and C2 endpoint is exercised against the running backend.

## Target Verification Matrix

Inventory sources: U1 `nfr-requirements/{security,performance,scalability,reliability,observability}-requirements.md`; U2 `nfr-requirements/{security,performance}-requirements.md`; both units' `code-generation-plan.md` `## Testing Contract` (unchanged since approval); and the inception `requirements.md` NFR1–NFR8 pass criteria. There is no `nfr-design/` directory for either unit. "B&T" means Build and Test (this stage). No later validation stage owns any target in this plan.

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| NFR1.1 | U1 security-requirements | BCrypt `$2a$12$`/`$2b$12$`, distinct salts | cost 12, distinct hashes for the same password | `AccountServiceTests` (91/91 run) | B&T | Met |
| NFR1.2 | U1 security-requirements | raw password never persisted, logged or returned | no marker password in bodies or logs | `AuthControllerTests.passwordsHashes…`, `SignupSessionFailureTests`, smoke NFR1.2 | B&T | Met |
| NFR1.3 | U1 security-requirements | median difference < 50 ms over 20 attempts each | 10.4 ms (631.9 vs 621.5 ms); identical bodies | `NfrPerformanceMeasurements#nfr1_3` | B&T | Met |
| NFR1.4 | U1 security-requirements | 7/129-char password, 51-char name → 400 with field errors | 400 `validation_failed` with fields | `AccountServiceTests`, `AuthControllerTests.invalidFields…`, smoke AC1.3/AC1.4 | B&T | Met |
| NFR1.5 | U1 security-requirements | parallel same-email sign-ups → one account, other 409 | exactly one account | `AccountServiceTests.concurrentSignUpsWithTheSameEmail…` | B&T | Met |
| NFR1.6 | U1 performance-requirements | log-in p50 ≤ 400 ms, p95 ≤ 600 ms | p50 493.7–786.4 ms, p95 526.3–931.9 ms (4 runs) | `NfrPerformanceMeasurements#nfr1_6`, `scripts/nfr1-6-login-latency.mjs` | B&T | **Not Met** |
| NFR1.7 | U1 scalability-requirements | 10,000 accounts, no measurable log-in latency change | 10,000 seeded; p50 change +3.8% / −1.4% | `NfrPerformanceMeasurements#nfr1_6` (NFR1.7 line) | B&T | Met |
| NFR1.8 | U1 reliability-requirements | session failure after save → account exists, user told to log in, later log-in OK | 500 "…Please log in."; account exists; log-in 200; re-sign-up 409 | `SignupSessionFailureTests` | B&T | Met |
| NFR2.1 | U1 security-requirements | ad list/view contain no email | no `@` in list or view | `AdV1ControllerTests.listAndView…`, smoke AC5.2 | B&T | Met |
| NFR2.2 | U1 security-requirements | no password, hash, session id or token in logs, URLs, detail or instance | none found; session ids travel only in cookies | `AuthControllerTests` log capture, smoke (Location headers have no `;jsessionid`), `application.properties` tracking-modes=cookie | B&T | Met |
| NFR2.3 | U1 security-requirements | security log by account id, never email | ids only | `AuthControllerTests`, `SecurityEventLogTests` | B&T | Met |
| NFR2.4 | U1 observability-requirements | each of signup, login_success, login_failure, account_locked, logout, write_refused logged for its scenario | all six asserted; account_locked exactly once | `AuthControllerTests`, `AdV1ControllerTests`, `SecurityEventLogTests` | B&T | Met |
| NFR2.5 | U1 observability-requirements | no email/password/cookie/token in log lines; unknown email → `accountId=none` | as expected | `SecurityEventLogTests.unknownEmail…`, `AuthControllerTests` | B&T | Met |
| NFR2.6 | U1 observability-requirements | `GET /api/v1/ads` 200 when up | 200 JSON array | smoke NFR2.6 | B&T | Met |
| NFR3.1 | U1 security-requirements | session cookie HttpOnly, SameSite=Lax, Path=/, Secure on HTTPS, no expiry | all attributes over HTTP; Secure present over HTTPS | `AuthControllerTests.signUpSets…`, smoke NFR3.1, `scripts/https-cookie-check.mjs` | B&T | Met |
| NFR3.2 | U1 security-requirements | session id replaced at sign-up/log-in; old id not accepted | new id each time; old and attacker-chosen ids anonymous | `SessionFixationTests`, smoke NFR3.2 | B&T | Met |
| NFR3.3 | U1 security-requirements | log-out invalidates; old cookie → 401 on write | 401 `not_authenticated`; cookie cleared (also over HTTPS) | `AuthControllerTests.logOut…`, `SessionFixationTests`, smoke AC3.2 | B&T | Met |
| NFR3.4 | U1 security-requirements | POST/PUT need a matching `X-XSRF-TOKEN`, else 403 `csrf_invalid` | 403 `csrf_invalid` without the token | `AuthControllerTests`, `AdV1ControllerTests`, `DefaultDenyTests`, smoke NFR3 | B&T | Met |
| NFR3.5 | U1 security-requirements | token issued on `/me`; rotated after sign-up, log-in, log-out | issued; changes at all three | `SessionFixationTests.theAntiForgeryTokenChanges…`, smoke NFR3.5 | B&T | Met |
| NFR3.6 | U1 security-requirements | 10 parallel wrong attempts lock; clock +15 min unlocks | locked; unlocked | `AccountServiceTests.tenParallelWrongAttemptsEndLocked`, `…UnlocksAfterFifteenMinutes` | B&T | Met |
| NFR3.7 | U1 performance-requirements | ≤ 10 ms added at p95 vs the pre-change request | worst +0.75 ms (baseline p95 11.55 ms) | `scripts/nfr3-7-overhead.mjs` vs the pre-change jar | B&T | Met |
| NFR3.8 | U1 scalability-requirements | 500 sessions, each lists ads, no errors | 500 distinct sessions; 0 failures; 0 lost | `NfrPerformanceMeasurements#nfr3_8` | B&T | Met |
| NFR3.9 | U1 scalability-requirements | 10 parallel log-ins ≤ 3 s, no failures | 698 ms, 0 failures | `NfrPerformanceMeasurements#nfr3_9` | B&T | Met |
| NFR3.10 | U1 reliability-requirements | after a restart the old cookie → normal answer or 401, never 500 | `/me` 200 `{user:null}`; write 401 | smoke `restart-save` / `restart-check` with a real restart | B&T | Met |
| NFR5.1 | U1 security-requirements | listed paths open; other POST/PUT under `/api/**` need a session; rest denied | as specified; default deny gives 401/403 with `code` | `DefaultDenyTests`, `AdV1ControllerTests`, smoke | B&T | Met |
| NFR5.2 | U1 security-requirements | owner only from the caller; non-owner 403 `not_owner`; unowned 403 `unowned` | as specified | `AdServiceTests`, `AdV1ControllerTests`, smoke AC4.4/AC4.7 | B&T | Met |
| NFR5.3 | U1 security-requirements | legacy `/api/ads` same rules | 401 / 403 `not_owner` / 200, old shape | `AdControllerTests`, smoke NFR5.3 | B&T | Met |
| NFR5.4 | U1 security-requirements | no token → 403 before 401; with token → 401; nothing changed | 403 `csrf_invalid` then 401 | `AdV1ControllerTests`, smoke NFR5.4 | B&T | Met |
| NFR5.5 | U1 performance-requirements | 1,000 ads / 100 posters: ≤ 2 SQL, p95 ≤ 150 ms | 2 statements; p95 43.5 ms | `NfrPerformanceMeasurements#nfr5_5` | B&T | Met |
| NFR6.1 | U1 reliability-requirements | existing suite green; `AdControllerTests` changed only for log-in and token | 73/73 → 91/91; the diff adds log-in/token steps, a `throws` clause and an owner on the edited fixture ad (needed for owner-only edit), plus 3 regressions | backend full-suite runs; `git diff` of `AdControllerTests` | B&T | Met |
| NFR6.2 | U1 reliability-requirements | regressions for anonymous create/edit, non-owner, owner in the body, legacy, failing on the pre-change code | all present; the pre-change jar accepted an anonymous create (201) | `AdV1ControllerTests`, `AdControllerTests`; NFR3.7 baseline seeding | B&T | Met |
| NFR6.3 | U1 reliability-requirements | happy path + ≥ 2 error cases per endpoint (sign-up, log-in, log-out, me) | sign-up 201/403/409/400/500; log-in 200/401/423; log-out 204/204-anonymous/403; me user/null/after-restart | `AuthControllerTests`, `SignupSessionFailureTests`, `SessionFixationTests`, `DefaultDenyTests` | B&T | Met |
| NFR7.1 | U1 security-requirements | every non-2xx has a listed `code` | every refusal tested carries `code` | all backend tests; smoke NFR7 | B&T | Met |
| NFR7.2 | U1 security-requirements | 401/403 as `application/problem+json` | problem+json | `AdV1ControllerTests`, `DefaultDenyTests` | B&T | Met |
| NFR7.3 | U1 reliability-requirements | storage error → 500 problem, no internals, ERROR log | as specified | `AdV1ControllerTests.storageFailure…`, `SignupSessionFailureTests` | B&T | Met |
| NFR7.4 | U1 observability-requirements | ERROR log with exception and path, no body | as specified | `AdV1ControllerTests.storageFailure…`, `SignupSessionFailureTests` | B&T | Met |
| NFR2.7 | U2 security-requirements | password cleared after submit; no storage, URL or console | cleared; no storage calls; code search clean | `AuthPanels.test.tsx`, `api.test.ts`, rg search | B&T | Met |
| NFR2.8 | U2 security-requirements | nothing about the user persisted in the browser | no `localStorage`/`sessionStorage` | `api.test.ts`, rg search | B&T | Met |
| NFR2.9 | U2 security-requirements | user text rendered as text only | markup shown literally; no `dangerouslySetInnerHTML`/`innerHTML` | `AuthPanels.test.tsx`, rg search | B&T | Met |
| NFR3.11 | U2 security-requirements | never touches the session cookie; `credentials: 'same-origin'` | as specified | `api.test.ts`, rg search (no `JSESSIONID`) | B&T | Met |
| NFR3.12 | U2 security-requirements | XSRF header on every POST/PUT, re-read each time; none on GET | as specified; manual retry sends the fresh token | `api.test.ts`, `App.csrf.test.tsx` | B&T | Met |
| NFR3.13 | U2 security-requirements | `me` once on mount, before any POST | as specified | `CurrentUserContext.test.tsx` | B&T | Met |
| NFR4.1 | U2 security-requirements | relative `/api/v1`; dev proxy keeps same origin | relative URLs; every `/api` smoke check passes through :5173 | `api.test.ts`, smoke via the Vite proxy | B&T | Met |
| NFR4.2 | U2 performance-requirements | JS gzip ≤ 69.49 + 15 kB | 72.17 kB (+2.68 kB) | `npm run build` output | B&T | Met |
| NFR4.3 | U2 performance-requirements | exactly 2 parallel requests on load | 2, parallel | `App.test.tsx` | B&T | Met |
| NFR4.4 | U2 performance-requirements | busy within one render; double click → one request | as specified (also AdForm: one request) | `AuthPanels.test.tsx`, `AdForm.double-submit.test.tsx` | B&T | Met |
| NFR4.5 | U2 performance-requirements | 10 s timeout → generic message | as specified | `api.test.ts` (fake timers) | B&T | Met |
| NFR5.6 | U2 security-requirements | 403 `not_owner` on Save shows the message, keeps the form | as specified; also `csrf_invalid` keeps the form | `AdForm.test.tsx`, `App.csrf.test.tsx` | B&T | Met |
| NFR7.5 | U2 security-requirements | errors carry status/code/detail; behaviour keyed on `code` | as specified | `api.test.ts`, `App.csrf.test.tsx` | B&T | Met |
| NFR7.6 | U2 security-requirements | 204 resolves without a body; network error → generic message | as specified | `api.test.ts` | B&T | Met |
| NFR8.1 | U2 security-requirements | labelled fields, right types/autocomplete, keyboard-only flow | as specified | `AuthPanels.test.tsx` | B&T | Met |
| NFR8.2 | U2 security-requirements | field errors via `aria-describedby`; form errors `role="alert"` | as specified | `AuthPanels.test.tsx` | B&T | Met |
| TC-U1-strategy | U1 code-generation-plan Testing Contract | Standard: 5–8 tests per component plus integration tests | 7–33 per component; MockMvc and real-HTTP integration | test inventory in `test-results.md` | B&T | Met |
| TC-U1-floor | U1 code-generation-plan Testing Contract | targeted regression; existing suite green | present; 91/91 | `AdV1ControllerTests`, `AdControllerTests` | B&T | Met |
| TC-U2-strategy | U2 code-generation-plan Testing Contract | Standard: 5–8 tests per component plus integration tests | 8–12 per component; `App.test.tsx`/`App.csrf.test.tsx` through the real ApiClient | test inventory in `test-results.md` | B&T | Met |
| TC-U2-floor | U2 code-generation-plan Testing Contract | targeted regression; existing suite green | visibility regression present; 51/51 | `App.test.tsx` | B&T | Met |
| REQ-NFR1 | requirements.md NFR1 | no response or log contains the password; the stored value is not the password | as specified | NFR1.1, NFR1.2 evidence | B&T | Met |
| REQ-NFR2 | requirements.md NFR2 | no password or session id in URLs, logs or errors | as specified | NFR2.2, NFR2.5 evidence | B&T | Met |
| REQ-NFR3 | requirements.md NFR3 | forged cross-site create/edit refused | 403 `csrf_invalid`, ad unchanged | smoke "forged write", `AdV1ControllerTests` | B&T | Met |
| REQ-NFR4 | requirements.md NFR4 | sign-up, log-in, create, edit, log-out work through the dev proxy | all pass through :5173 | smoke via the Vite proxy | B&T | Met |
| REQ-NFR5 | requirements.md NFR5 | AC4.x pass against the API directly | AC4.1–AC4.7 pass in the smoke | `scripts/api-smoke.mjs` | B&T | Met |
| REQ-NFR6 | requirements.md NFR6 | full backend suite green; AC4.x automated | 91/91; AC4.x covered | backend suite | B&T | Met |
| REQ-NFR7 | requirements.md NFR7 | new errors are RFC 9457 problem details | problem+json with `code` | smoke NFR7, backend tests | B&T | Met |
| REQ-NFR8 | requirements.md NFR8 | keyboard-only forms, visible labels, errors in text | as specified (automated; no manual screen-reader pass in this plan) | `AuthPanels.test.tsx` | B&T | Met |

**Verdict count:** Met 63, Not Met 1 (NFR1.6), Unverified 0.

## Readiness Assessment

| Readiness | Status | Why |
|---|---|---|
| Build-ready | **Yes** | Both units build, lint and type-check cleanly. Caveat: built on JDK 26, not the declared JDK 25. |
| Test-ready | **Yes** | All suites are green and reproducible from the instruction files. The perf class and scripts are documented. |
| Deployment-ready | **No** | NFR1.6 is Not Met and needs a decision. The open H2 console (OQ1) and the lack of a rate limit also keep this limited to trusted environments, as the requirements state. |

## Known Limitations and Outstanding Items

1. **NFR1.6 Not Met, accepted by the product owner (2026-10-21).** BCrypt stays at cost 12, and re-baselining the target stays open. BCrypt cost 12 takes about 630 ms per hash on this machine, against a p50 budget of 400 ms. Options: A, cost 11 (security trade-off, about 1–2 h); B, re-baseline NFR1.6 (human only); C, target hardware; D, Argon2id (about 1 day). See `test-results.md`.
2. **JDK 25 is not installed.** Everything was built and run on OpenJDK 26.0.2.1 (`release 25` bytecode). A JDK 25 build, for example in CI, is still to be confirmed.
3. **Existing vite dev-server advisory not fixed:** `npm audit` reports 1 high in vite 8.3.2 through launch-editor (GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm). It is dev-only (`--omit=dev`: 0), it was not introduced by this work, and `npm audit fix` resolves it, outside this plan.
4. **Accepted risks:** the open H2 console (requirements C3/OQ1); no rate limit on log-in or sign-up; account existence revealed by 409/423 (A5, A6).
5. **Default deny:** unknown non-API paths answer 401/403 with a `code`, not 404 (documented behaviour, asserted by `DefaultDenyTests`).
6. No line-coverage tool is configured in either unit. That is not required by the security-patch scope; requirement coverage is used instead.
7. NFR1.7's "no measurable change" has no number in its source. Build and Test read it as a p50 change of 10% or less, and recorded that reading in `performance-test-instructions.md`.
