# Component Inventory: bulletin-board-frontend

Six components cover every hand-written file in the repository.

### Entry Point

- **Files**: `index.html`, `src/main.tsx`
- **Type**: bootstrap / configuration
- **Responsibility**: provide the `#root` element and page title, load the module script, import global CSS and render `App` inside React `StrictMode` with `createRoot`.
- **Depends on**: `react`, `react-dom/client`, Global Styles, App
- **Notes**: non-null assertion on `document.getElementById('root')!`.

### App

- **File**: `src/App.tsx` (67 lines)
- **Type**: container view (the only screen)
- **Responsibility**: own the ad list (`ads`), the id being edited (`editingId`) and the load error (`loadError`); load ads on mount; handle create and update by calling the API Client; render the "New ad" section and the ad list with per-ad Edit buttons and inline edit forms.
- **Depends on**: AdForm, API Client, `react`
- **Auth-relevant notes**: create form and Edit buttons are shown to everyone; no user state.

### AdForm

- **File**: `src/AdForm.tsx` (62 lines)
- **Type**: presentational form component (create and edit modes)
- **Responsibility**: controlled `title`/`description` inputs with `required` and `maxLength` (100/2000); trim on submit; show a saving state and the error message from a rejected `onSubmit`; clear fields after a successful create; optional Cancel.
- **Depends on**: `react`, API Client (types only)

### API Client

- **File**: `src/api.ts` (39 lines)
- **Type**: data access + data contracts
- **Responsibility**: define `Ad` and `AdInput`; build the base URL from `VITE_API_BASE_URL`; wrap `fetch` in `request<T>()` (JSON header, error extraction from ProblemDetail `detail`); expose `listAds`, `createAd`, `updateAd`.
- **Depends on**: browser `fetch`, `import.meta.env`; external: bulletin-board-backend `/api/ads`
- **Auth-relevant notes**: the single choke point for adding credentials, auth headers and 401/403 handling.

### Global Styles

- **File**: `src/index.css` (104 lines)
- **Type**: static asset
- **Responsibility**: page layout (max width 720px), form, button (`secondary`, disabled), list/card, `muted` and `error` text styles.
- **Depends on**: nothing

### Build and Dev Server Config

- **Files**: `vite.config.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `.oxlintrc.json`, `.gitignore`, `public/favicon.svg`
- **Type**: configuration
- **Responsibility**: React plugin, dev proxy `/api -> http://localhost:8080`, npm scripts (`dev`, `build`, `lint`, `preview`), TypeScript project references, lint rules, ignore list, favicon.
- **Depends on**: `vite`, `@vitejs/plugin-react`, `typescript`, `oxlint`

## Summary Table

| Component | Category | Internal dependencies | Lines (approx.) |
|---|---|---|---|
| Entry Point | Configuration | App, Global Styles | 24 |
| App | Container view | AdForm, API Client | 67 |
| AdForm | Presentational view | API Client (types) | 62 |
| API Client | Data access / model | none | 39 |
| Global Styles | Static asset | none | 104 |
| Build and Dev Server Config | Configuration | none | ~90 (excluding lockfile) |
