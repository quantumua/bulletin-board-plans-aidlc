# Tech Stack Decisions: u2-frontend-login

Existing stack kept unchanged: React 19, TypeScript 6, Vite 8, oxlint, native `fetch`, and one global stylesheet (codekb `technology-stack.md`). There is no routing library (ADR-004).

| Addition | Choice | Rationale | Alternatives rejected |
|---|---|---|---|
| Shared current-user state | React Context (`CurrentUserProvider`) with `useState`/`useEffect` | Built into React. One small piece of app-wide state (ADR-004). | Redux or Zustand: a dependency for a single value. |
| Test runner | Vitest (dev dependency) with `environment: 'jsdom'` | Uses the existing Vite config and TypeScript directly (Q1). | Jest: needs a separate transform setup. |
| Component testing | `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` (dev dependencies) | Tests behaviour the way users see it, and covers keyboard use for NFR8 (Q1). | Enzyme: unmaintained. |
| DOM for tests | `jsdom` (dev dependency) | Needed for `environment: 'jsdom'`. | happy-dom: fine, but jsdom is the Testing Library default. |
| npm script | `"test": "vitest run"` | Lets one command run the frontend tests. | none |
| Cookie reading | A small helper that reads `document.cookie` for `XSRF-TOKEN` | No dependency needed for one cookie. | js-cookie: a dependency for one line. |

No runtime dependencies are added. Every new package is a dev dependency.

## Assumptions & Open Questions

None.
