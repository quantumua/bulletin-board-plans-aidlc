# Code Generation Plan: u2-frontend-login

## Summary

- Builds: sign-up and log-in panels, log-out, a shared current-user state, and an owner-aware ad board on /api/v1 with CSRF and session-ended handling
- Touches: bulletin-board-frontend package.json, vite.config.ts, src/api.ts, src/App.tsx, src/AdForm.tsx, new src/auth/ (CurrentUser context, AuthPanels), src/index.css, README
- Tests: about 35 Vitest and React Testing Library component tests in 5 new test files (API client, current user, panels, board, ad form)

## Inputs

- Requirements: `inception/requirements-analysis/requirements.md` (FR1–FR5, AC1.1–AC5.2, NFR2–NFR4, NFR7, NFR8)
- Design: `inception/domain-design/components.md` (ApiClient, CurrentUser, AuthPanels, AdBoard), `decisions.md` (ADR-001, ADR-004 panels without a router, ADR-006 CSRF)
- Contract: `inception/contract-design/contract-summary.md` (C1 `/api/v1`), plus the additive problem `code` field the backend unit added to every error response
- Unit NFRs: `construction/u2-frontend-login/nfr-requirements/*` (NFR2.7–NFR8.2)
- Code knowledge base: `aidlc/spaces/default/codekb/bulletin-board-frontend/`
- Repository: `bulletin-board-frontend/` (brownfield; modify files in place)

## Decisions carried from the NFR review

- **Fallback when `code` is missing.** ApiClient maps a problem by `code` first, then by HTTP status when `code` is absent:
  - 401 outside log-in means the session ended;
  - 401 at log-in, 409 and 423 show `detail` under the form;
  - 403 shows `detail`;
  - anything else shows the generic error.
  A test covers this.
- **`csrf_invalid` handling.** On a 403 `csrf_invalid`, ApiClient refreshes the token with one `GET /api/v1/auth/me` and rejects with the message "Your session security token expired. Please try again." It never resends the POST/PUT automatically (contract: no automatic retries). A test covers this.
- **`VITE_API_BASE_URL`** must point to the same origin. Cross-origin deployment is unsupported in this version, and the README says so (NFR4).
- **Bundle baseline.** Record the measured `npm run build` gzip size of the JS bundle before changes, then check growth of no more than 15 kB at Step 12 (NFR4.2).
- **Test tooling versions.** Install the latest compatible versions with `npm install -D`, which writes the lockfile ranges. The `npm test` script runs the whole frontend suite.

## Steps

### Step 1: Project structure and test runner bootstrap
- [x] Install dev dependencies: `npm --prefix bulletin-board-frontend install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom`.
- [x] Add the `test` script (`vitest run`) to `package.json`.
- [x] Add a `test` block to `vite.config.ts`: `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, `globals: false`. Keep the `/api` proxy.
- [x] Create `src/test/setup.ts`, which imports `@testing-library/jest-dom/vitest` and cleans up after each test.
- [x] Create a `src/auth/` folder for the new auth UI.
- [x] Record the bundle baseline: run `npm --prefix bulletin-board-frontend run build` before any source change and note the `dist/assets/index-*.js` gzip size for the code summary.
- Traces: NFR4.2, tech-stack decisions

### Step 2: Verify the test runner and record the unit-scoped command
- [x] Add a smoke test `src/test/smoke.test.ts` that asserts jsdom is present, and run `npm --prefix bulletin-board-frontend exec -- vitest run --root bulletin-board-frontend src/test/smoke.test.ts`. It must pass before the first real test step. Confirm the unit-scoped commands in `unit-test-instructions.md` resolve.
- Traces: Testing Contract runner step

### Step 3: Data model (types) — implement
- [x] In `src/api.ts`:
  - extend `Ad` with `authorName: string` and `ownedByMe: boolean`;
  - add `CurrentUser { id; email; displayName }`, `SignupInput`, `LoginInput` and `MeResponse { user: CurrentUser | null }`;
  - add `ApiError extends Error` with `status`, `code?`, `detail` and `fieldErrors: Record<string, string>`.
- Traces: FR5.1, FR4.6, NFR7.5

### Step 4: Data model — write and run its tests
- [x] Type-level checks are covered by `tsc -b` in the build (no runtime behaviour in types). Run `npm --prefix bulletin-board-frontend exec -- tsc -b bulletin-board-frontend --noEmit` to confirm.
- Traces: FR5.1

### Step 5: Data access (ApiClient) — implement
- [x] Rewrite `request<T>()` in `src/api.ts`:
  - base `${VITE_API_BASE_URL ?? ''}/api/v1`;
  - `credentials: 'same-origin'`;
  - JSON headers;
  - on POST/PUT, read the `XSRF-TOKEN` cookie fresh from `document.cookie` (`readCookie` helper) and send `X-XSRF-TOKEN`;
  - 10-second timeout with `AbortController`, giving the generic message;
  - `204` resolves `undefined` without parsing;
  - non-2xx parses problem details into `ApiError` (`code`, `detail`, `errors[]` mapped to `fieldErrors`) and falls back to status mapping when `code` is absent;
  - non-JSON or network failures give the generic message;
  - `csrf_invalid` refreshes the token via `GET /auth/me` and rejects with the "token expired" message, with no resend.
- [x] Export `listAds`, `createAd`, `updateAd` (now `/api/v1/ads`), and `getMe`, `signup`, `login`, `logout` (`/api/v1/auth/*`).
- [x] Add a session-ended subscription in `src/api.ts`: `onSessionEnded(listener)` returns an unsubscribe function. It fires when a non-auth request answers 401 / `not_authenticated` (FR3.4).
- [x] Never log request bodies. Never touch `localStorage` or `sessionStorage`.
- Traces: FR3.4, FR4.7, NFR3.11, NFR3.12, NFR4.1, NFR4.5, NFR7.5, NFR7.6, NFR2.7, NFR2.8

### Step 6: Data access — write and run its tests
- [x] `src/api.test.ts` (Vitest, `fetch` mocked with `vi.fn`):
  - relative `/api/v1` URLs with `credentials: 'same-origin'`;
  - a GET has no `X-XSRF-TOKEN`;
  - a POST/PUT sends the current cookie value, re-read between two calls with different cookies;
  - 204 log-out resolves;
  - a problem with `code` becomes an `ApiError` with `fieldErrors`;
  - the fallback without `code` maps 401/409/423;
  - `not_authenticated` on `/ads` fires `onSessionEnded`, while `bad_credentials` on `/auth/login` does not;
  - `csrf_invalid` calls `GET /auth/me` once and rejects without resending;
  - a network error gives the generic message;
  - a timeout aborts after 10 s (fake timers);
  - no storage API is touched.
- [x] Run `npm --prefix bulletin-board-frontend exec -- vitest run --root bulletin-board-frontend src/api.test.ts`.
- Traces: NFR3.11, NFR3.12, NFR4.1, NFR4.5, NFR7.5, NFR7.6, NFR2.8, FR3.4

### Step 7: Business logic (CurrentUser state) — implement
- [x] `src/auth/CurrentUserContext.tsx` (`CurrentUserProvider`, `useCurrentUser`):
  - calls `getMe` once on mount, which also issues the XSRF cookie (NFR3.13);
  - exposes `user`, `loading`, `signup`, `login`, `logout`, plus `sessionEnded` and `clearSessionEnded`;
  - `signup` and `login` set the user from the response;
  - `logout` clears it;
  - subscribes to `onSessionEnded` and sets `user = null` and `sessionEnded = true` without remounting children, so typed form input survives (FR3.4, AC3.4).
- [x] `src/main.tsx` wraps `<App />` in `CurrentUserProvider`.
- Traces: FR1.6, FR3.1, FR3.3, FR3.4, NFR3.13, NFR2.8

### Step 8: Business logic — write and run its tests
- [x] `src/auth/CurrentUserContext.test.tsx` (React Testing Library with a test consumer, ApiClient mocked):
  - `me` is called once on mount, before any POST;
  - `user: null` gives the logged-out state;
  - `me` with a user gives the logged-in state, so a reload keeps the login (AC3.3);
  - log-in sets the user;
  - log-out clears it;
  - a session-ended event clears the user and sets `sessionEnded` while a sibling input keeps its typed value;
  - a failed `me` (network) gives the logged-out state with no crash.
- [x] Run `npm --prefix bulletin-board-frontend exec -- vitest run --root bulletin-board-frontend src/auth/CurrentUserContext.test.tsx`.
- Traces: FR3.1, FR3.3, FR3.4, AC3.3, NFR3.13

### Step 9: API / endpoint — not applicable
- The frontend exposes no endpoints. Server calls are covered by Steps 5–6.

### Step 10: Frontend behaviour — implement
- [x] `src/auth/AuthPanels.tsx`, rendered at the top of `App`:
  - when logged out: "Log in" and "Sign up" buttons, each opening its panel (only one open at a time); "Log in" holds email and password, "Sign up" holds email, display name and password;
  - visible `<label>`s, correct `type` and `autocomplete`, Enter submits, Escape and Cancel close;
  - field errors next to their fields with `aria-describedby`, form errors with `role="alert"`;
  - the submit button disables with a busy label while pending, so a double submit sends one request;
  - the password is cleared after every submit, and other input is kept on error;
  - the panel closes on success.
  - When logged in: "Signed in as {displayName}" (React text) and a "Log out" button.
  - When `sessionEnded`: an alert "Your session ended. Please log in again." with the log-in panel opened.
  - `data-testid` attributes on interactive elements.
- [x] `src/App.tsx` (AdBoard):
  - use `useCurrentUser()`;
  - load ads from `/api/v1/ads` on mount and reload them after log-in and log-out so `ownedByMe` updates;
  - show the "New ad" section only when logged in (AC4.1);
  - show each ad's `authorName` as text ("by {authorName}");
  - show "Edit" only when `ad.ownedByMe` (FR4.6);
  - add `data-testid` attributes.
- [x] `src/AdForm.tsx`:
  - show `ApiError.detail`, for example 403 `not_owner`;
  - keep input when a save fails, including session-ended (AC3.4);
  - mark the error with `role="alert"`;
  - add `data-testid` attributes.
- [x] `src/index.css`: styles for the panels, the signed-in bar and the author line, reusing the existing classes. Status is never shown by colour alone.
- Traces: FR1.1, FR1.6, FR1.7, FR2.1–FR2.3, FR3.1, FR3.4, FR4.1, FR4.6, FR4.7, FR5.1, FR5.3, NFR2.7, NFR2.9, NFR4.4, NFR5.6, NFR8.1, NFR8.2, AC1.1–AC1.4, AC2.1–AC2.4, AC3.1, AC3.4, AC4.1, AC5.1

### Step 11: Frontend behaviour — write and run its tests
- [x] `src/auth/AuthPanels.test.tsx` (React Testing Library and user-event, ApiClient mocked):
  - sign-up with the keyboard only gives the signed-in name (AC1.1, NFR8.1);
  - 409 `email_taken` shows its detail and keeps email and name while clearing the password (AC1.2, NFR2.7);
  - 400 `validation_failed` shows the field error linked by `aria-describedby` (AC1.3, AC1.4, NFR8.2);
  - log-in shows the display name (AC2.1);
  - `bad_credentials` shows "Email or password is incorrect" in `role=alert` (AC2.2, AC2.3);
  - `account_locked` shows the locked message (AC2.4);
  - a double click while pending sends one request (NFR4.4);
  - log-out returns to the logged-out view (AC3.1);
  - session-ended opens the log-in panel with an alert;
  - a display name with markup renders as literal text (NFR2.9).
- [x] `src/App.test.tsx` (board):
  - logged out: no "New ad" and no Edit buttons, but ads and author names visible (AC4.1, AC5.1);
  - logged in: "New ad" is shown and Edit appears only on `ownedByMe` ads (FR4.6);
  - "Unknown" author shows for unowned ads (FR5.3);
  - exactly 2 requests on mount (`me` and `ads`) (NFR4.3);
  - the list reloads after log-in.
- [x] `src/AdForm.test.tsx`:
  - a 403 `not_owner` on Save shows its detail and keeps the input (NFR5.6);
  - session-ended on Save keeps the input (AC3.4);
  - a successful create clears the form, and edit mode keeps its values.
- [x] Run `npm --prefix bulletin-board-frontend exec -- vitest run --root bulletin-board-frontend src/auth/AuthPanels.test.tsx src/App.test.tsx src/AdForm.test.tsx`.
- Traces: AC1.1–AC1.4, AC2.1–AC2.4, AC3.1, AC3.4, AC4.1, AC5.1, FR4.6, FR5.3, NFR2.7, NFR2.9, NFR4.3, NFR4.4, NFR5.6, NFR8.1, NFR8.2

### Step 12: Environment and build configuration
- [x] Run the whole frontend suite: `npm --prefix bulletin-board-frontend test`.
- [x] Run `npm --prefix bulletin-board-frontend run lint` (oxlint clean).
- [x] Run `npm --prefix bulletin-board-frontend run build`, and check JS gzip growth of no more than 15 kB against the Step 1 baseline (NFR4.2).
- Traces: NFR4.2

### Step 13: Documentation and traceability
- [x] Update `bulletin-board-frontend/README.md`:
  - the log-in and sign-up flow;
  - the backend `/api/v1` requirement;
  - the same-origin requirement for `VITE_API_BASE_URL`;
  - `npm test`.
- Traces: NFR4.1

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
