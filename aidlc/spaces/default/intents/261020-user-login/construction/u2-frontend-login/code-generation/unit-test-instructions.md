# Unit Test Instructions: u2-frontend-login

## Framework and Setup

- **Vitest** (`environment: 'jsdom'`) with **React Testing Library**, **user-event** and **jest-dom** matchers. All are dev dependencies installed in plan Step 1.
- Configuration lives in the `test` block of `bulletin-board-frontend/vite.config.ts`. The setup file `src/test/setup.ts` imports `@testing-library/jest-dom/vitest` and runs `cleanup()` after each test.
- Requires Node.js 20.19+ and `npm --prefix bulletin-board-frontend ci` (or `install`). No backend is needed: `fetch` and the API client are mocked.
- Run commands from the project root.

## Unit-Scoped Run Commands

Run this unit's tests only. Each command names exact test files.

```bash
npm --prefix bulletin-board-frontend exec -- vitest run --root bulletin-board-frontend src/test/smoke.test.ts src/api.test.ts src/auth/CurrentUserContext.test.tsx src/auth/AuthPanels.test.tsx src/App.test.tsx src/AdForm.test.tsx
```

| Layer | Command |
|---|---|
| Runner check | `npm --prefix bulletin-board-frontend exec -- vitest run --root bulletin-board-frontend src/test/smoke.test.ts` |
| API client | `npm --prefix bulletin-board-frontend exec -- vitest run --root bulletin-board-frontend src/api.test.ts` |
| Current-user state | `npm --prefix bulletin-board-frontend exec -- vitest run --root bulletin-board-frontend src/auth/CurrentUserContext.test.tsx` |
| UI (panels, board, form) | `npm --prefix bulletin-board-frontend exec -- vitest run --root bulletin-board-frontend src/auth/AuthPanels.test.tsx src/App.test.tsx src/AdForm.test.tsx` |
| Types | `npm --prefix bulletin-board-frontend exec -- tsc -b bulletin-board-frontend --noEmit`

Note: when run from the project root, Vitest needs `--root bulletin-board-frontend` to load `vite.config.ts` (jsdom), and `tsc -b` needs the project folder. |

## Test Inventory and Coverage Expectations

| Test file | Component | Tests (approx.) | Focus |
|---|---|---|---|
| `src/test/smoke.test.ts` | Runner | 1 | jsdom present |
| `src/api.test.ts` | ApiClient | 10 | CSRF header, credentials, 204, codes and fallback, `csrf_invalid` refresh without resend, session-ended signal, timeout, no storage |
| `src/auth/CurrentUserContext.test.tsx` | CurrentUser | 6 | `me` on mount, reload keeps login, log-in and log-out, session-ended keeps input |
| `src/auth/AuthPanels.test.tsx` | AuthPanels | 9 | Keyboard sign-up and log-in, error display, double submit, markup as text, accessibility |
| `src/App.test.tsx` | AdBoard | 5 | Visibility of New ad and Edit, author names, request count on mount |
| `src/AdForm.test.tsx` | AdForm | 4 | Refusal messages, input kept, reset after create |

- Standard strategy: 5–8 tests per component, plus integration through the real `CurrentUserProvider` and ApiClient with only `fetch` mocked in `App.test.tsx`.
- The security-patch scope's targeted regression is the visibility rule: logged out shows no New ad and no Edit, and Edit appears only on own ads.
- No line-coverage floor applies to this scope. Every AC and NFR row mapped to U2 must have at least one test.

## Mocking and Stubbing Guidance

- Mock `fetch` with `vi.stubGlobal('fetch', vi.fn())`. Build `Response` objects for each case, including `new Response(null, { status: 204 })` and `application/problem+json` bodies with a `code`.
- Set cookies in jsdom with `document.cookie = 'XSRF-TOKEN=abc'` before write calls. Change the value between calls to prove it is re-read.
- Use fake timers (`vi.useFakeTimers()`) for the 10-second timeout. Never use real waits.
- Component tests mock `./api` with `vi.mock` where only UI behaviour is under test. `App.test.tsx` keeps the real ApiClient and mocks only `fetch`.
- Spy on `Storage.prototype.setItem` to assert no browser storage is used.

## Test Data Management

- Fixture builders in each test file: `makeAd({ ownedByMe, authorName })` and `makeUser()`.
- Reset mocks and cookies in `afterEach` (`vi.restoreAllMocks()`, clear `document.cookie`).
- A marker password (`Marker-P4ss-123`) lets tests assert it never stays in the form after submit.
