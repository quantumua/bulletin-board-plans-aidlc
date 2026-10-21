# Code Summary: u2-frontend-login

## Result

- All applicable plan steps are done (Step 9, API endpoints, does not apply).
- Frontend suite: **6 files, 45 tests, all passing**, with no React act or console warnings.
- `oxlint`: 0 warnings, 0 errors. `tsc -b` passes. `npm run build` succeeds.
- Bundle (NFR4.2): the JS bundle went from 69.49 kB to 72.17 kB gzip (222.21 kB to 231.54 kB raw). That is **+2.68 kB**, inside the 15 kB budget.
- Nothing was committed. Nothing in `bulletin-board-backend/` was touched.

## Files

All paths are in `bulletin-board-frontend/`. No files were deleted.

**Modified:**
- `package.json`: adds the `test` script and dev dependencies vitest ^4.1.12, jsdom ^29.1.1, @testing-library/react ^16.3.3, @testing-library/user-event ^14.6.8, @testing-library/jest-dom ^6.9.1.
- `package-lock.json`, `vite.config.ts` (test block; the `/api` proxy is kept), `README.md`
- `src/api.ts`, `src/App.tsx`, `src/AdForm.tsx`, `src/main.tsx`, `src/index.css`

**Created:**
- `src/test/setup.ts`, `src/test/smoke.test.ts`
- `src/api.test.ts`
- `src/auth/CurrentUserContext.tsx`, `src/auth/CurrentUserContext.test.tsx`
- `src/auth/AuthPanels.tsx`, `src/auth/AuthPanels.test.tsx`
- `src/App.test.tsx`, `src/AdForm.test.tsx`

## Key Implementation Decisions

- **ApiClient (`src/api.ts`):**
  - `/api/v1` with `credentials: 'same-origin'`;
  - the `X-XSRF-TOKEN` header goes on every non-safe method, with the cookie read fresh each time;
  - 10-second timeout;
  - 204 responses resolve without parsing a body;
  - errors map by problem `code` first, then by HTTP status when `code` is missing;
  - on `csrf_invalid` it refreshes the token through `/auth/me` and never resends automatically;
  - `onSessionEnded` fires for 401 or `not_authenticated` on non-auth calls only;
  - the generic message replaces server internals, network failures and timeouts.
- **CurrentUser context:**
  - loads `me` once on mount;
  - `sessionVersion` goes up only on sign-up, log-in and log-out, so page load makes exactly 2 requests and the board reloads after auth changes (NFR4.3);
  - a failed `me` logs one generic `console.warn`.
- **AuthPanels:**
  - one component switches between log-in and sign-up (ADR-004, no router), using `noValidate` so the backend's field errors appear next to their fields;
  - fields are linked to their error text with `aria-describedby`, and form errors use `role="alert"`;
  - a ref prevents a double submit;
  - the password is cleared after every submit;
  - the logged-in name is rendered as React text.
- **Board:**
  - "New ad" shows only for a logged-in user, and Edit only for a logged-in owner (`ownedByMe`);
  - every ad shows "by {authorName}";
  - while a session-ended notice is up, the "New ad" section and an open edit form stay mounted so typed input survives (AC3.4).
- **No effects for derived state.** Panel opening and edit closing follow React's adjust-while-rendering pattern instead of effects (oxlint `set-state-in-effect`).
- **No browser storage** is used anywhere.

## Test Coverage Summary

| Test file | Tests | Focus |
|---|---|---|
| `src/test/smoke.test.ts` | 1 | Runner check (jsdom) |
| `src/api.test.ts` | 12 | CSRF header re-read, credentials, 204, codes and fallback, `csrf_invalid` refresh without resend, session-ended signal, timeout, no storage |
| `src/auth/CurrentUserContext.test.tsx` | 8 | `me` on mount, reload keeps the login, log-in and log-out, session ended keeps input, failed `me` |
| `src/auth/AuthPanels.test.tsx` | 12 | Keyboard sign-up and log-in, 409/400/401/423 display, double submit, markup shown as text, labels and `aria` links |
| `src/App.test.tsx` | 7 | **Targeted regression:** no New ad or Edit when logged out, Edit only on own ads; author names, "Unknown", 2 requests on mount, reload after log-in |
| `src/AdForm.test.tsx` | 5 | `not_owner` message keeps input, session ended keeps input, create reset, edit values |

## Deviations from the Plan

1. **Unit-scoped commands.** Run from the project root, Vitest needs `--root bulletin-board-frontend` to load `vite.config.ts`, and `tsc -b` needs the project folder. The test instructions and the plan now use those forms. `npm --prefix bulletin-board-frontend test` works unchanged.
2. **One lint suppression.** `CurrentUserContext.tsx` exports both the provider and the `useCurrentUser` hook, as the plan specifies. That needs one documented `eslint-disable-next-line` for `react/only-export-components`.

## Open Points

- **Existing dev-server advisory (not introduced by this unit).** `npm audit` reports 1 high-severity advisory in vite 8.3.2 through launch-editor (GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm). It affects the dev server only, and `npm audit fix` resolves it. Not applied, because it is outside this plan.
