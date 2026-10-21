# Code Quality Assessment: bulletin-board-frontend

## Summary

Small, clean, idiomatic React 19 + TypeScript code with consistent style and accurate documentation. The main gaps are process gaps: no tests, no CI, and TypeScript `strict` mode off.

## Quick Assessment

| Dimension | Rating | Evidence |
|---|---|---|
| Naming clarity | good | `listAds`, `handleCreate`, `editingId`, `loadError` |
| Function size | good | every function is under 30 lines; the largest is the `App` render |
| Error handling | fair | API errors are surfaced to the user with the backend's `detail`; no retry; `request()` assumes every success has a JSON body |
| Test presence | poor | no tests and no test framework |
| Duplication | good | one form component serves create and edit |
| Dead code | good | none found; `noUnusedLocals`/`noUnusedParameters` on |

## Test Coverage

- Test directories: none. Test frameworks: none. `test` script: none. Coverage config: absent.
- Measured coverage: 0% (nothing to measure).
- Brownfield test baseline for later stages: there is no existing suite to keep green; any test floor needs new tooling.

## Linting and Static Analysis

- oxlint (`npm run lint`), config `.oxlintrc.json`: plugins `react`, `typescript`, `oxc`; `react/rules-of-hooks: error`, `react/only-export-components: warn` (constant exports allowed).
- TypeScript type-check runs as part of `npm run build` (`tsc -b`). Enabled checks: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`, `verbatimModuleSyntax`. `strict` is not enabled.
- No lint suppressions in `src/`.
- No formatter (Prettier or similar) configured; formatting is consistent by hand.

## CI/CD

None. No `.github/` workflows or any other pipeline definition; no Dockerfile or deployment configuration. Lint and build run only when a developer runs them.

## Documentation

- `README.md`: accurate and sufficient (prerequisites, run, build, `VITE_API_BASE_URL`, backend CORS note, lint).
- Inline comments are rare and limited to the non-obvious (base URL fallback, dev proxy purpose).
- No architecture or API docs beyond the README.

## Technical Debt

| # | Item | Location | Impact |
|---|---|---|---|
| TD-1 | No automated tests | repo-wide | regressions undetected; intent's test floor needs new tooling |
| TD-2 | No CI pipeline | repo-wide | lint/type errors can merge |
| TD-3 | `strict` TypeScript off | `tsconfig.app.json` | null/undefined bugs not caught at compile time |
| TD-4 | `request()` always parses JSON on success | `src/api.ts` line 26 | a 204 No Content response (e.g. logout) would throw |
| TD-5 | `Content-Type: application/json` on all requests including GET | `src/api.ts` line 20 | forces CORS preflight in split-origin setups |
| TD-6 | No auth/ownership handling in the UI | `src/App.tsx` lines 31-34, 55-57 | any visitor can create and edit any ad (the intent's problem) |
| TD-7 | Single screen, no routing | `src/App.tsx` | new screens need structural change |
| TD-8 | Non-null assertion on root element | `src/main.tsx` line 6 | minor |
| TD-9 | Stock Vite favicon | `public/favicon.svg` | cosmetic |

No TODO/FIXME/HACK markers, no hard-coded secrets, and no files over 300 lines.

## Security Observations

- No credentials or secrets in the code; the only configuration is the public API base URL.
- React escapes rendered ad text (no `dangerouslySetInnerHTML`), so stored ad content is not rendered as HTML.
- There is no authentication or authorisation at all; client-side checks would in any case be cosmetic, so the server must enforce ownership.
