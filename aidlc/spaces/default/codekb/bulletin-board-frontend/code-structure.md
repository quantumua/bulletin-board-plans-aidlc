# Code Structure: bulletin-board-frontend

## Repository Layout

```
bulletin-board-frontend/
├── .gitignore            # node_modules, dist, *.local, logs, editor files
├── .oxlintrc.json        # linter config
├── README.md             # run/build/lint instructions
├── index.html            # Vite HTML entry, mounts #root, loads /src/main.tsx
├── package.json          # scripts and dependency ranges
├── package-lock.json     # npm lockfile v3
├── public/
│   └── favicon.svg       # static asset (stock Vite logo)
├── src/
│   ├── main.tsx          # bootstrap
│   ├── App.tsx           # single screen: list + create + inline edit
│   ├── AdForm.tsx        # create/edit form component
│   ├── api.ts            # types + REST client
│   └── index.css         # global styles
├── tsconfig.json         # project references only
├── tsconfig.app.json     # browser code (src/)
├── tsconfig.node.json    # vite.config.ts
└── vite.config.ts        # React plugin + dev proxy /api -> :8080
```

Not in the repo (gitignored, absent at scan time): `node_modules/`, `dist/`.

## Module Organization

Flat `src/` folder with one file per concern; there are no sub-folders, barrels (`index.ts`) or feature directories. Total hand-written source: 5 files in `src/` (about 230 lines including CSS).

## File Classification

| File | Category | Exports | Imports |
|---|---|---|---|
| `src/main.tsx` | Configuration (bootstrap) | none | `react` (StrictMode), `react-dom/client` (createRoot), `./index.css`, `./App.tsx` |
| `src/App.tsx` | Controller/Handler (container view) | `default App` | `react` (useEffect, useState), `./AdForm`, `./api` (createAd, listAds, updateAd, types Ad, AdInput) |
| `src/AdForm.tsx` | View (presentational form) | `default AdForm` | `react` (useState, type FormEvent), `./api` (types Ad, AdInput) |
| `src/api.ts` | Model/Entity (types) + Repository/DAO (REST client) | `interface Ad`, `interface AdInput`, `listAds`, `createAd`, `updateAd` | none (uses global `fetch`, `import.meta.env`) |
| `src/index.css` | Static/Asset | n/a | n/a |
| `index.html` | Static/Asset (entry) | n/a | `/src/main.tsx`, `/favicon.svg` |
| `public/favicon.svg` | Static/Asset | n/a | n/a |
| `vite.config.ts` | Configuration | `default` Vite config | `@vitejs/plugin-react`, `vite` |
| `tsconfig*.json`, `.oxlintrc.json`, `package.json` | Configuration | n/a | n/a |

No Test, Middleware, Migration or Service files exist.

## Dependency Adjacency List (internal)

```
src/main.tsx   -> [src/index.css, src/App.tsx]
src/App.tsx    -> [src/AdForm.tsx, src/api.ts]
src/AdForm.tsx -> [src/api.ts (types only)]
src/api.ts     -> []
```

No circular references.

## Code Patterns and Conventions

- **Components**: function components with default exports, one component per file, PascalCase file names (`App.tsx`, `AdForm.tsx`).
- **State**: local `useState`; data loading in `useEffect` with an empty dependency array; immutable updates (`[created, ...current]`, `current.map(...)`).
- **Props typing**: an `interface <Component>Props` beside the component; optional props for mode switching (`ad?` = edit mode, `onCancel?` shows Cancel).
- **Async handlers**: `async function handleX()` inside the component; errors surface through thrown `Error` caught by `AdForm`.
- **Type-only imports**: `import type` / `type` specifiers, required by `verbatimModuleSyntax`.
- **Imports**: relative, extensionless except `./App.tsx` in `main.tsx` (allowed by `allowImportingTsExtensions`).
- **Formatting**: 2-space indent, no semicolons, single quotes, trailing commas in multi-line literals; no formatter config enforces it.
- **Styling**: one global stylesheet with class names (`ad-form`, `ad-card`, `muted`, `error`, `secondary`); no CSS modules or CSS-in-JS.
- **Environment config**: `import.meta.env.VITE_API_BASE_URL`, defaulting to an empty string (same origin).
