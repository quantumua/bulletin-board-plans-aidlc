# Technology Stack: bulletin-board-frontend

Versions: declared range in `package.json` / resolved version in `package-lock.json`.

## Languages

| Language | Version | Where |
|---|---|---|
| TypeScript (TSX) | `~6.0.2` / 6.0.3 | `src/*.ts(x)`, `vite.config.ts` |
| CSS | n/a | `src/index.css` |
| HTML | n/a | `index.html` |

Compile targets: ES2023 with `DOM` lib for the app; ES2023 + Node types for `vite.config.ts`; `jsx: react-jsx`; `moduleResolution: bundler` (app) / `nodenext` (config); `noEmit` (Vite does the transpiling).

## Runtime and Platform

| Item | Version | Notes |
|---|---|---|
| Browser | modern evergreen | ES2023 output, native `fetch` |
| Node.js (tooling only) | `^20.19.0 \|\| >=22.12.0` | from the toolchain's `engines`; README says 20.19+ |
| npm | lockfileVersion 3 | npm 7+ |

## Frameworks and Libraries

| Name | Declared | Resolved | Role |
|---|---|---|---|
| react | `^19.2.8` | 19.3.0 | UI library |
| react-dom | `^19.2.8` | 19.3.0 | DOM renderer |

## Build and Developer Tooling

| Name | Declared | Resolved | Role |
|---|---|---|---|
| vite | `^8.3.0` | 8.3.2 | dev server (port 5173), `/api` proxy, production bundler |
| @vitejs/plugin-react | `^6.1.1` | 6.1.1 | React transform and fast refresh |
| typescript | `~6.0.2` | 6.0.3 | type-check (`tsc -b`) |
| oxlint | `^1.81.0` | 1.86.0 | linter |
| @types/react | `^19.2.18` | 19.3.0 | types |
| @types/react-dom | `^19.2.7` | 19.3.0 | types |
| @types/node | `^24.13.3` | 24.19.0 | types for `vite.config.ts` |

Notable transitive tooling: rolldown 1.2.12 (Vite 8 bundler), lightningcss 1.33.0.

## Not Present

- Routing (no React Router, TanStack Router, etc.)
- State management (no Redux, Zustand, React Query, context providers)
- HTTP client library (native `fetch` only)
- Form or validation library
- UI component or CSS framework
- Testing (no Vitest, Jest, Testing Library, Playwright, Cypress)
- Formatter (no Prettier config)
- Containerisation or CI configuration

## Environment Variables

| Variable | When | Default | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | build time | `''` (same origin, dev proxy) | origin of the backend API |
