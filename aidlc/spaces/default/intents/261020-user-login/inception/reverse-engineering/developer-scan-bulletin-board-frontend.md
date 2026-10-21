# Developer Code Scan: bulletin-board-frontend

Repository: `bulletin-board-frontend/` (sibling of the project root). Commit `2161dbfbbd363a646e50e8f15aa1508638c9335c` (branch head, working tree clean). Scan breadth: full. Depth: Standard.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `./` (the whole repository: every tracked file listed below was read)
  - `src/App.tsx`
  - `src/AdForm.tsx`
  - `src/api.ts`
  - `src/main.tsx`
  - `src/index.css`
  - `index.html`
  - `vite.config.ts`
  - `package.json`
  - `package-lock.json` (resolved versions of the direct dependencies and engine constraints)
  - `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
  - `.oxlintrc.json`
  - `.gitignore`
  - `README.md`
- **Skimmed only**:
  - `public/favicon.svg` (static asset; the stock Vite logo)
- **Left out**:
  - `node_modules/` (dependency folder, gitignored; not present on disk at scan time)
  - `dist/` (build output, gitignored; not present on disk at scan time)

Cross-repo reference (not part of this repo's coverage): `bulletin-board-backend/src/main/java/com/example/bulletinboard/ad/AdController.java` and `.../config/CorsConfig.java` were opened only to confirm the contract the frontend calls. The backend is documented by its own scan.

### Packages Found
- `bulletin-board-frontend` (version `0.0.0`, `private: true`) — single-page web application — TypeScript + React (TSX) — web UI to list, add and edit bulletin board ads. No workspaces; a single package.

### Build System
- **Type**: npm (lockfileVersion 3) + Vite 8 bundler + TypeScript project references (`tsc -b`)
- **Config Files**: `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json` (references only), `tsconfig.app.json` (browser code under `src/`), `tsconfig.node.json` (`vite.config.ts`), `.oxlintrc.json`, `index.html` (Vite entry)
- **Build Dependencies**: single package; `npm run build` = `tsc -b` (type-check both project references, `noEmit`) then `vite build` into `dist/`. `npm run dev` starts the Vite dev server (port 5173 by default) with a proxy `/api -> http://localhost:8080` (the Spring Boot backend). `npm run preview` serves `dist/`. Node engine floor from the toolchain: `^20.19.0 || >=22.12.0` (README says 20.19+).

### APIs Discovered
- REST client (consumer, not provider) — `src/api.ts` — 3 calls against the backend's `/api/ads` resource:
  - `GET  {VITE_API_BASE_URL}/api/ads` -> `Ad[]` (`listAds`)
  - `POST {VITE_API_BASE_URL}/api/ads` body `AdInput` -> `Ad` (`createAd`; backend answers 201 + Location)
  - `PUT  {VITE_API_BASE_URL}/api/ads/{id}` body `AdInput` -> `Ad` (`updateAd`)
- Backend endpoint not used by the frontend: `GET /api/ads/{id}` (exists in `AdController.java` line 31; the UI has no single-ad view).
- Error contract consumed: on non-2xx, the client parses the body as JSON and reads `detail` (Spring `ProblemDetail`, RFC 9457), falling back to `Request failed with status <n>` (`src/api.ts` lines 22-25).
- No authentication: no `Authorization` header, no `credentials` option on `fetch` (defaults to `same-origin`), no cookies or token storage anywhere in `src/`.

### Frameworks & Libraries
- react — `^19.2.8` (lock: 19.3.0) — UI library (function components + hooks)
- react-dom — `^19.2.8` (lock: 19.3.0) — DOM renderer (`createRoot`, `StrictMode`)
- vite — `^8.3.0` (lock: 8.3.2) — dev server, proxy, production bundler (Rolldown 1.2.12 / Lightning CSS 1.33.0 transitively)
- @vitejs/plugin-react — `^6.1.1` (lock: 6.1.1) — React JSX transform / fast refresh for Vite
- typescript — `~6.0.2` (lock: 6.0.3) — type-checking (`tsc -b`, `noEmit`)
- oxlint — `^1.81.0` (lock: 1.86.0) — linter (react, typescript, oxc plugins)
- @types/react `^19.2.18` (lock 19.3.0), @types/react-dom `^19.2.7` (lock 19.3.0), @types/node `^24.13.3` (lock 24.19.0) — type definitions
- No router, no state-management library, no HTTP client library (native `fetch`), no form library, no CSS framework, no test framework.

### Test Coverage
- **Test Directories**: none
- **Test Frameworks**: none (no Vitest/Jest/Testing Library/Playwright/Cypress in `package.json`; no `test` script)
- **Coverage Config**: absent

### Code Quality Indicators
- **Linting**: oxlint via `npm run lint`; config `.oxlintrc.json` (plugins `react`, `typescript`, `oxc`; `react/rules-of-hooks: error`, `react/only-export-components: warn`). TypeScript strictness flags in `tsconfig.app.json`: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`. Note: `"strict": true` is NOT set. No formatter config (no Prettier); code is consistently formatted (2 spaces, no semicolons, single quotes).
- **CI/CD**: none (no `.github/`, no pipeline files, no Dockerfile)
- **Documentation**: `README.md` present and accurate (run, build, `VITE_API_BASE_URL`, CORS note, lint). Very few code comments; only the non-obvious ones (`api.ts` line 14, `vite.config.ts` line 8).

### Technical Debt Signals
- No automated tests of any kind; no `test` script (`package.json`).
- No CI pipeline; lint and type-check only run when a developer runs them locally.
- `tsconfig.app.json` does not enable `strict` (so `strictNullChecks`/`noImplicitAny` are off); `main.tsx` line 6 uses a non-null assertion on `getElementById('root')`.
- `api.ts` line 26: `request()` always calls `response.json()` on success, so a future 204 No Content response (e.g. a logout or delete endpoint) would throw.
- `api.ts` line 20: `Content-Type: application/json` is sent on every request, including GET, which makes every cross-origin call a CORS preflighted request.
- `App.tsx` line 13: the catch handler types the error as `Error` in the parameter; load failures are shown but there is no retry.
- `App.tsx`: one component holds list state, edit state and create/update handlers; no routing, so the app is a single screen. Acceptable at this size, but it is the only place to hang new screens.
- `public/favicon.svg` is the stock Vite logo (cosmetic).
- No TODO/FIXME/HACK markers and no lint suppressions in `src/`.

## Handoff Summary
- **Intent-relevant finding**: The frontend has no notion of a user. `src/api.ts` (lines 17-27) is the single HTTP choke point: every call goes through `request()`, which sets only `Content-Type` and never sends credentials (`fetch` default `credentials: 'same-origin'`) or an `Authorization` header. `src/App.tsx` renders the "New ad" form (line 33) and an "Edit" button on every ad (lines 55-57) unconditionally, and the `Ad` type (`src/api.ts` lines 1-7) carries no owner field. There is no router (single screen in `App.tsx`), no global state/context, and no token or cookie handling. In development, `/api` is proxied same-origin by Vite (`vite.config.ts` lines 9-11), so cookie-based sessions would work in dev without CORS changes; in a split-origin build (`VITE_API_BASE_URL` set) the backend CORS config (`CorsConfig.java`) allows only `GET, POST, PUT` and does not call `allowCredentials(true)`, so cookies would not be sent cross-origin today.
- **Risks / follow-up**: (1) Adding login screens needs either a router dependency or conditional rendering in `App.tsx`; no navigation exists today. (2) `request()` must be extended for credentials/auth headers, 401/403 handling, and bodiless (204) responses. (3) The UI cannot hide "Edit" for non-owners until the backend exposes ownership in the ad payload. (4) Cross-origin deployments need backend CORS changes (credentials, any new methods such as `DELETE` for logout if chosen). (5) No test framework or CI exists, so any test floor for this intent requires introducing test tooling (e.g. a test runner) as new work. (6) The backend's `GET /api/ads/{id}` is unused; "view a single ad" for visitors is satisfied today only by the inline list.
