# Cross-Unit Traceability: User Login (intent 261020-user-login)

## Verdict

**PASS.** All 39 enumerated IDs (31 FR and 8 NFR from `inception/requirements-analysis/requirements.md`) are covered by at least one unit. Each covering target file exists on disk. **Uncovered elements: none.**

- The User Stories stage did not run, so there is no `stories.md` and no three-segment `AC` IDs to enumerate. The requirements' two-segment ACs (AC1.1–AC5.2) are exercised by the API smoke and by the unit tests listed in `test-results.md`.
- There is no stage-level `construction/code-generation/traceability.json`; only per-unit files exist.
- Coverage is not target attainment. NFR1's sub-target **NFR1.6 is covered by code but Not Met** in the Target Verification Matrix (`build-and-test-summary.md`), and it is surfaced there as a finding.

## Method and Sources

- **Unit assignment:** `inception/units-generation/unit-of-work-story-map.md`. It gives the primary unit and the "Also" unit for each FR and NFR.
- **FR to file:** the units' code-generation `traceability.json` files list only detailed `NFRx.y` IDs, so FR coverage is taken from the `Traces:` lines of each unit's approved `code-generation-plan.md` steps, which name the FR IDs each step implemented. Each step is resolved to the production file it created or modified. Every file was checked to exist.
- **NFR to file:** inception `NFRn` → the per-unit `nfr-requirements/traceability.json` (`NFRn` → `NFRx.y`) → the per-unit `code-generation/traceability.json` (`NFRx.y` → target file, status `OK`).
- In U1's code-generation file, NFR1.6, NFR1.7, NFR3.7, NFR3.8 and NFR3.9 are `Deferred` to Build and Test. They were measured here (`test-results.md`). The parent NFRs remain covered through their `OK` siblings and the implementing files.

## Functional Requirements

Paths: `BE` = `bulletin-board-backend/src/main/java/com/example/bulletinboard/`, `FE` = `bulletin-board-frontend/src/`.

| ID | Owning Unit (also) | Covering target file(s) | Plan step trace | Status | Verdict |
|---|---|---|---|---|---|
| FR1 | U1 (U2) | `BE/account/AccountService.java`; `FE/auth/AuthPanels.tsx` | U1 S7, S9; U2 S10 | OK | pass |
| FR1.1 | U1 (U2) | `BE/auth/AuthController.java`, `BE/account/AccountService.java`; `FE/auth/AuthPanels.tsx` | U1 S7, S9; U2 S10 | OK | pass |
| FR1.2 | U1 | `BE/account/AccountService.java` (normalise, validate) | U1 S3, S7 | OK | pass |
| FR1.3 | U1 | `BE/account/AccountService.java`, `BE/account/UserAccount.java` (unique constraint) | U1 S3, S6, S7 | OK | pass |
| FR1.4 | U1 | `BE/account/AccountService.java` (8–128 characters, 72 bytes) | U1 S7 | OK | pass |
| FR1.5 | U1 | `BE/account/AccountService.java` (1–50 visible characters) | U1 S7 | OK | pass |
| FR1.6 | U1 (U2) | `BE/auth/AuthController.java` (`startSession`); `FE/auth/CurrentUserContext.tsx` | U1 S9; U2 S7, S10 | OK | pass |
| FR1.7 | U2 (U1) | `FE/auth/AuthPanels.tsx`; `BE/config/ApiProblems.java` (`errors[]`) | U2 S10; U1 S9 | OK | pass |
| FR2 | U1 (U2) | `BE/auth/AuthController.java`, `BE/account/AccountService.java`; `FE/auth/AuthPanels.tsx` | U1 S7, S9; U2 S10 | OK | pass |
| FR2.1 | U1 (U2) | `BE/account/AccountService.java` (`authenticate`); `FE/auth/AuthPanels.tsx` | U1 S7, S9; U2 S10 | OK | pass |
| FR2.2 | U1 | `BE/account/AccountService.java` (generic `BadCredentialsException`, dummy hash) | U1 S7, S9 | OK | pass |
| FR2.3 | U1 | `BE/account/UserAccount.java` (lockout rule), `BE/account/AccountService.java` | U1 S3, S7 | OK | pass |
| FR2.4 | U1 | `BE/account/UserAccount.java` (`recordSuccessfulLogin`) | U1 S3, S7 | OK | pass |
| FR2.5 | U1 | `BE/account/UserAccount.java` (`isLocked`, expiry) | U1 S3, S7 | OK | pass |
| FR3 | U1 (U2) | `BE/auth/AuthController.java`; `FE/auth/CurrentUserContext.tsx` | U1 S9; U2 S7 | OK | pass |
| FR3.1 | U1 (U2) | `BE/auth/AuthController.java` (`logout`); `FE/auth/AuthPanels.tsx`, `FE/auth/CurrentUserContext.tsx` | U1 S9; U2 S7, S10 | OK | pass |
| FR3.2 | U1 | `bulletin-board-backend/src/main/resources/application.properties` (timeout 0, no Max-Age) | U1 S1 | OK | pass |
| FR3.3 | U2 (U1) | `FE/auth/CurrentUserContext.tsx`; `BE/auth/AuthController.java` (`me`) | U2 S7; U1 S9 | OK | pass |
| FR3.4 | U2 (U1) | `FE/api.ts` (session-ended signal), `FE/App.tsx`; `BE/config/SecurityProblemHandler.java` | U2 S5, S7, S10; U1 S9 | OK | pass |
| FR4 | U1 (U2) | `BE/ad/AdService.java`, `BE/config/SecurityConfig.java`; `FE/App.tsx` | U1 S7, S9; U2 S10 | OK | pass |
| FR4.1 | U1 | `BE/config/SecurityConfig.java` (open GETs), `BE/ad/AdV1Controller.java` | U1 S9 | OK | pass |
| FR4.2 | U1 | `BE/ad/AdService.java` (owner from the caller), `BE/ad/Ad.java` | U1 S3, S7 | OK | pass |
| FR4.3 | U1 | `BE/ad/AdService.java` (`NotOwnerException`), `BE/config/SecurityConfig.java` | U1 S7, S9 | OK | pass |
| FR4.4 | U1 | `BE/ad/AdService.java` (no admin path) | U1 S7 | OK | pass |
| FR4.5 | U1 | `BE/ad/AdService.java` (`UnownedAdException`), `BE/ad/Ad.java` (nullable owner) | U1 S3, S7 | OK | pass |
| FR4.6 | U2 (U1) | `FE/App.tsx` (New ad and Edit visibility); `BE/ad/AdView.java` (`ownedByMe`) | U2 S3, S10; U1 S9 | OK | pass |
| FR4.7 | U1 (U2) | `BE/config/ProblemDetailsAdvice.java`, `BE/config/ApiProblems.java`; `FE/api.ts` | U1 S9; U2 S5, S10 | OK | pass |
| FR5 | U1 (U2) | `BE/ad/AdService.java`, `BE/ad/AdView.java`; `FE/App.tsx` | U1 S7, S9; U2 S10 | OK | pass |
| FR5.1 | U1 (U2) | `BE/ad/AdService.java` (batched names), `BE/ad/AdView.java`; `FE/App.tsx` | U1 S7; U2 S3, S10 | OK | pass |
| FR5.2 | U1 | `BE/ad/AdView.java` (only `authorName`, no email) | U1 S9 | OK | pass |
| FR5.3 | U1 (U2) | `BE/ad/AdService.java` (`"Unknown"`); `FE/App.tsx` | U1 S7; U2 S10 | OK | pass |

## Non-Functional Requirements

| ID | Owning Unit (also) | Per-unit NFR trace (nfr-requirements/traceability.json) | Covering target file(s) (code-generation/traceability.json, status OK) | Verdict |
|---|---|---|---|---|
| NFR1 | U1 | U1: NFR1.1–NFR1.8 OK; U2: N/A (backend concern) | `BE/account/AccountService.java`, `BE/account/UserAccount.java`, `BE/auth/AuthController.java`, `.../auth/AuthControllerTests.java`, `.../account/AccountServiceTests.java` (NFR1.6/1.7 Deferred → measured in B&T; NFR1.6 **Not Met**) | pass (covered) |
| NFR2 | U1 (U2) | U1: NFR2.1–NFR2.6 OK; U2: NFR2.7–NFR2.9 OK | `BE/ad/AdView.java`, `application.properties`, `BE/auth/SecurityEventLogger.java`, `BE/ad/AdV1Controller.java`; `FE/auth/AuthPanels.tsx`, `FE/api.test.ts`, `FE/auth/AuthPanels.test.tsx` | pass |
| NFR3 | U1 (U2) | U1: NFR3.1–NFR3.10 OK; U2: NFR3.11–NFR3.13 OK | `application.properties`, `BE/auth/AuthController.java`, `BE/config/SecurityConfig.java`, `BE/config/CsrfCookieFilter.java`, `.../auth/AuthControllerTests.java`, `.../account/AccountServiceTests.java`; `FE/api.ts`, `FE/auth/CurrentUserContext.tsx` (NFR3.7–3.9 Deferred → measured, Met) | pass |
| NFR4 | U2 (U1) | U2: NFR4.1–NFR4.5 OK; U1: N/A (CORS unchanged) | `FE/api.ts`, `bulletin-board-frontend/vite.config.ts`, `FE/App.test.tsx`, `FE/auth/AuthPanels.test.tsx`, `FE/api.test.ts` | pass |
| NFR5 | U1 | U1: NFR5.1–NFR5.5 OK; U2: NFR5.6 OK | `BE/config/SecurityConfig.java`, `BE/ad/AdService.java`, `.../ad/AdControllerTests.java`, `.../ad/AdV1ControllerTests.java`, `.../ad/AdServiceTests.java`; `FE/AdForm.test.tsx` | pass |
| NFR6 | U1 | U1: NFR6.1–NFR6.3 OK; U2: N/A (no pre-existing frontend suite) | `.../ad/AdControllerTests.java`, `.../ad/AdV1ControllerTests.java`, `.../auth/AuthControllerTests.java` | pass |
| NFR7 | U1 (U2) | U1: NFR7.1–NFR7.4 OK; U2: NFR7.5–NFR7.6 OK | `BE/config/ApiProblems.java`, `BE/config/SecurityProblemHandler.java`, `BE/config/ProblemDetailsAdvice.java`; `FE/api.ts`, `FE/api.test.ts` | pass |
| NFR8 | U2 | U2: NFR8.1–NFR8.2 OK; U1: N/A (frontend concern) | `FE/auth/AuthPanels.tsx`, `FE/auth/AuthPanels.test.tsx` | pass |

(`.../` = `bulletin-board-backend/src/test/java/com/example/bulletinboard/`.)

## Per-Unit Code-Generation Traceability Check

| Unit | IDs in `code-generation/traceability.json` | OK | Deferred | GAP / ORPHAN | Target files exist |
|---|---|---|---|---|---|
| U1 `u1-backend-auth` | 36 (NFR1.1–NFR7.4) | 31 | 5: NFR1.6, NFR1.7, NFR3.7, NFR3.8, NFR3.9, all owned by B&T and measured here | 0 | yes (all 31 `OK` targets) |
| U2 `u2-frontend-login` | 16 (NFR2.7–NFR8.2) | 16 | 0 | 0 | yes (all 16) |

## Uncovered Elements

None. Every FR1–FR5.3 and NFR1–NFR8 has at least one covering unit with an existing target file.

The finding to surface at the gate concerns target attainment, not coverage: **NFR1.6** (a sub-target of NFR1) is **Not Met**. See `build-and-test-summary.md` and `test-results.md`.
