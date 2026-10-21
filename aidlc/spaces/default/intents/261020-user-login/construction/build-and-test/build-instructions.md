# Build Instructions: User Login (intent 261020-user-login)

Two units are built here: U1 `u1-backend-auth` in `bulletin-board-backend/` and U2 `u2-frontend-login` in `bulletin-board-frontend/`. Both are git submodules of this workspace. All commands run from the workspace root, `C:\Users\MTsybulskyi\Code\bulletin-board-plans-aidlc`. The examples use Git Bash syntax.

## Prerequisites

| Tool | Required | Used on this machine | Notes |
|---|---|---|---|
| JDK | 25 or newer (`pom.xml`: `java.version` 25) | **OpenJDK 26.0.2.1** at `C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1` | JDK 25 is not installed here. Every Maven run sets `JAVA_HOME` for that command only. This is an open item: CI should build on JDK 25. |
| Maven | Wrapper `bulletin-board-backend/mvnw` (downloads Maven itself) | wrapper | On Windows `cmd` use `bulletin-board-backend\mvnw.cmd`. |
| Node.js | 20.19+ | v20.20.2 | Also runs the API smoke scripts (global `fetch`). |
| npm | bundled with Node | bundled | |

No database, message broker or other service is needed: the backend uses in-memory H2, and the data is wiped on restart (requirements C2).

## Dependency Installation

```bash
# Backend: the wrapper resolves Maven and all dependencies on the first run
JAVA_HOME=C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1 bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml -q dependency:resolve

# Frontend: exact versions from package-lock.json
npm --prefix bulletin-board-frontend ci
```

Unit U1 adds `spring-boot-starter-security`, plus `spring-boot-starter-security-test` in test scope. Unit U2 adds dev dependencies only: vitest, jsdom, @testing-library/react, user-event and jest-dom. No runtime dependency is added to the frontend.

## Environment Setup

| Setting | Where | Value | Why |
|---|---|---|---|
| `JAVA_HOME` | shell, per command | JDK 25+ (here JDK 26) | Maven compiles with `release 25` |
| `server.servlet.session.*` | `bulletin-board-backend/src/main/resources/application.properties` | timeout 0, HttpOnly, SameSite=lax, tracking by cookie only | FR3.2, NFR3.1, NFR2.2 |
| `app.cors.allowed-origins` | same file | `http://localhost:5173` | the existing CORS list, now wired into the security chain |
| `VITE_API_BASE_URL` | frontend build env (optional) | empty, or the same origin as the page | NFR4: cross-origin deployment is unsupported |
| Vite dev proxy | `bulletin-board-frontend/vite.config.ts` | `/api` to `http://localhost:8080` | keeps development same-origin (NFR4) |

No secrets are needed. Nothing reads credentials from the environment.

## Build Commands

```bash
# Backend: compile and package without tests (tests run separately, see test-results.md)
JAVA_HOME=C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1 bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml -q package -DskipTests

# Frontend: type check (tsc -b) and production bundle (vite build)
npm --prefix bulletin-board-frontend run build

# Frontend lint (oxlint)
npm --prefix bulletin-board-frontend run lint
```

Outputs: `bulletin-board-backend/target/bulletin-board-backend-0.0.1-SNAPSHOT.jar` and `bulletin-board-frontend/dist/`.

## Run Locally

```bash
# Backend on http://localhost:8080 (in its own terminal, or in the background)
JAVA_HOME=C:/Users/MTsybulskyi/.jdks/openjdk-26.0.2.1 bulletin-board-backend/mvnw -f bulletin-board-backend/pom.xml spring-boot:run

# Frontend dev server on http://localhost:5173, proxying /api to the backend
npm --prefix bulletin-board-frontend run dev
```

## Build Verification

| Check | Command | Expected |
|---|---|---|
| Backend compiles and packages | `mvnw -q package -DskipTests` | exit 0, jar in `target/` |
| Backend starts | `mvnw spring-boot:run`, then `GET http://localhost:8080/api/v1/ads` | 200 and `[]` (NFR2.6 health) |
| Frontend types and bundle | `npm --prefix bulletin-board-frontend run build` | exit 0. The gzip size of `dist/assets/index-*.js` is at most 69.49 + 15 kB (NFR4.2) |
| Frontend lint | `npm --prefix bulletin-board-frontend run lint` | 0 errors |

The actual results are in `test-results.md`.

## Troubleshooting

- **`release version 25 not supported` or `invalid target release`:** `JAVA_HOME` points to a JDK older than 25. Set it for the command, as shown above.
- **Surefire runs 0 tests for `-Dtest=A+B`:** Surefire 3.5.6 reads `A+B` as one pattern. Separate class names with commas (code-generation deviation 1).
- **Vitest cannot find `jsdom`, or tests see no `document`, when run from the root:** pass `--root bulletin-board-frontend` so `vite.config.ts` is loaded.
- **Port 8080 in use:** stop the earlier `spring-boot:run`, or start with `-Dspring-boot.run.arguments=--server.port=<port>`.
- **`npm audit` reports a high-severity advisory:** this is the existing vite 8.3.2 dev-server advisory through launch-editor (GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm). It affects the dev server only, and it was not introduced by this work. It is an open item (see `build-and-test-summary.md`). `npm audit fix` resolves it, but that is outside this intent's plan.
- **Unknown path answers 401 or 403 instead of 404:** this is expected under default deny. Only paths inside the open read paths answer 404 `not_found`.
