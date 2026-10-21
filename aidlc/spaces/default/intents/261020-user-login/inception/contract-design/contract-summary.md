# Contract Summary: User Login for the Bulletin Board

Sources: `units-generation/unit-of-work.md`, `unit-of-work-dependency.md` (U1 and U2 are integrated only through this contract), `domain-design/components.md` and `decisions.md` (ADR-001 sessions, ADR-005 ownership, ADR-006 anti-forgery), `requirements-analysis/requirements.md` (FR1–FR5, NFR1–NFR8), the current API in `codekb/bulletin-board-backend/api-documentation.md`, and the confirmed answers in `contract-design-questions.md` (Q1–Q7).

## Contracts

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| C1 | U1 `u1-backend-auth` | U2 `u2-frontend-login` | Synchronous HTTP JSON, same origin, `/api/v1` (auth + ads) | U1 (backend team) |
| C2 | U1 `u1-backend-auth` | Existing clients of the old unversioned path (legacy) | Synchronous HTTP JSON, `/api/ads` (old response shape, new rules) | U1 (backend team) |

## Cross-Cutting Rules (apply to C1 and C2)

**Session (ADR-001, FR3.2, NFR3)**
- The backend sets an opaque session cookie at sign-up and log-in. The session id is replaced each time, including when the caller was already logged in, so the new login replaces the old session.
- Cookie attributes: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` when served over HTTPS, and no `Expires`/`Max-Age`, so it ends when the browser closes.
- Log-out invalidates the session on the server and clears the cookie.
- The frontend never reads or sets this cookie. Same-origin `fetch` sends it automatically (NFR4).
- There is no server-side idle timeout in this version.

**Anti-forgery token (ADR-006, NFR3)**
- The backend sets a script-readable cookie `XSRF-TOKEN` on every response where none exists yet. The first such response is `GET /api/v1/auth/me` on page load.
- Every `POST` and `PUT`, including sign-up, log-in and log-out, must send the same value in the `X-XSRF-TOKEN` header. A missing or mismatched token answers `403` with detail `Invalid or missing anti-forgery token`.
- The token is replaced after sign-up, log-in and log-out. The frontend must re-read the cookie before each state-changing request.

**Errors (NFR7)**
- Every error is RFC 9457 problem details, `Content-Type: application/problem+json`, with at least `status`, `title` and `detail`.
- Validation errors add an `errors` array of `{ "field", "message" }`.
- The frontend shows `detail`, and shows field messages next to their fields (FR1.7).

**Privacy (FR5.2, NFR2)**
- No response other than the caller's own `GET /api/v1/auth/me` contains an email address.
- No password hash or session id appears in any response body, URL or log.

**Timeouts and retries**
- The backend answers synchronously with no downstream calls.
- The frontend applies a 10-second request timeout and treats a timeout as an error message.
- The frontend never retries `POST` or `PUT` automatically. A failed `GET` may be retried by the user.

**Status codes used**

| Status | Meaning | Example `detail` |
|---|---|---|
| 200 / 201 / 204 | Success | — |
| 400 | Validation failed or malformed body | `Validation failed` + `errors[]` |
| 401 | Not logged in, or wrong credentials at log-in | `You need to log in` / `Email or password is incorrect` |
| 403 | Logged in but not allowed, or missing anti-forgery token | `You can only edit your own ads` / `This ad has no owner and cannot be edited` / `Invalid or missing anti-forgery token` |
| 404 | Ad not found | `Ad {id} not found` (unchanged) |
| 409 | Email already registered | `Email already registered` |
| 423 | Account temporarily locked | `Account temporarily locked. Try again later.` |

## C1 — Frontend ↔ Backend, `/api/v1`

```yaml
openapi: 3.1.0
info:
  title: Bulletin Board API
  version: 1.0.0
  description: >
    Contract C1 between U1 (provider, bulletin-board-backend) and U2 (consumer, bulletin-board-frontend).
    Served on the same origin as the web app. Session cookie and XSRF rules are in the Cross-Cutting Rules.
servers:
  - url: /api/v1
components:
  securitySchemes:
    session:
      type: apiKey
      in: cookie
      name: SESSION_COOKIE
      description: Opaque HttpOnly session cookie set at sign-up/log-in; name chosen by U1, never read by U2.
    xsrf:
      type: apiKey
      in: header
      name: X-XSRF-TOKEN
      description: Must equal the XSRF-TOKEN cookie on every POST and PUT.
  schemas:
    SignupRequest:
      type: object
      required: [email, displayName, password]
      properties:
        email: { type: string, format: email, maxLength: 254, description: "Trimmed, compared case-insensitively (FR1.2)" }
        displayName: { type: string, minLength: 1, maxLength: 50, description: "1-50 visible characters after trim (FR1.5)" }
        password: { type: string, minLength: 8, maxLength: 128, description: "FR1.4" }
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email: { type: string }
        password: { type: string }
    CurrentUser:
      type: object
      required: [id, email, displayName]
      properties:
        id: { type: integer, format: int64 }
        email: { type: string, description: "Only ever returned to the account itself" }
        displayName: { type: string }
    MeResponse:
      type: object
      required: [user]
      properties:
        user:
          oneOf:
            - $ref: '#/components/schemas/CurrentUser'
            - type: 'null'
    AdRequest:
      type: object
      required: [title, description]
      additionalProperties: true
      description: Unknown fields (e.g. an owner) are ignored; the owner is never taken from the body (FR4.2, ADR-005).
      properties:
        title: { type: string, minLength: 1, maxLength: 100 }
        description: { type: string, minLength: 1, maxLength: 2000 }
    Ad:
      type: object
      required: [id, title, description, createdAt, updatedAt, authorName, ownedByMe]
      properties:
        id: { type: integer, format: int64 }
        title: { type: string }
        description: { type: string }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
        authorName: { type: string, description: "Poster's display name; \"Unknown\" for an unowned ad (FR5.1, FR5.3). Plain text: consumers must render it as text, never as markup." }
        ownedByMe: { type: boolean, description: "Derived per request: true only when the caller is logged in and owns the ad (FR4.6). Not stored." }
    Problem:
      type: object
      required: [status, title, detail]
      properties:
        type: { type: string }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string }
        errors:
          type: array
          items:
            type: object
            required: [field, message]
            properties:
              field: { type: string }
              message: { type: string }
  responses:
    Problem:
      description: Problem details
      content:
        application/problem+json:
          schema: { $ref: '#/components/schemas/Problem' }
paths:
  /auth/me:
    get:
      summary: Who am I (FR3.3). Also issues the XSRF-TOKEN cookie if absent.
      responses:
        '200':
          description: Current user, or user null for a visitor
          content:
            application/json:
              schema: { $ref: '#/components/schemas/MeResponse' }
  /auth/signup:
    post:
      summary: Create an account and log in (FR1.1-FR1.6)
      security: [{ xsrf: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/SignupRequest' }
      responses:
        '201':
          description: Account created; new session cookie set; XSRF token rotated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CurrentUser' }
        '400': { $ref: '#/components/responses/Problem' }
        '403': { $ref: '#/components/responses/Problem' }
        '409': { $ref: '#/components/responses/Problem' }
  /auth/login:
    post:
      summary: Log in (FR2.1-FR2.5). Replaces any existing session.
      security: [{ xsrf: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LoginRequest' }
      responses:
        '200':
          description: Logged in; new session cookie set; XSRF token rotated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CurrentUser' }
        '401': { $ref: '#/components/responses/Problem' }
        '403': { $ref: '#/components/responses/Problem' }
        '423': { $ref: '#/components/responses/Problem' }
  /auth/logout:
    post:
      summary: Log out (FR3.1). Idempotent - also 204 when not logged in.
      security: [{ xsrf: [] }]
      responses:
        '204': { description: Session invalidated and cookie cleared; XSRF token rotated }
        '403': { $ref: '#/components/responses/Problem' }
  /ads:
    get:
      summary: List ads, newest first (FR4.1, FR5.1). Open to everyone.
      responses:
        '200':
          description: Ads
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Ad' }
    post:
      summary: Create an ad as the logged-in user (FR4.2)
      security: [{ session: [], xsrf: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/AdRequest' }
      responses:
        '201':
          description: Created; Location header /api/v1/ads/{id}
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Ad' }
        '400': { $ref: '#/components/responses/Problem' }
        '401': { $ref: '#/components/responses/Problem' }
        '403': { $ref: '#/components/responses/Problem' }
  /ads/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: integer, format: int64 }
    get:
      summary: View one ad (FR4.1). Open to everyone.
      responses:
        '200':
          description: Ad
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Ad' }
        '404': { $ref: '#/components/responses/Problem' }
    put:
      summary: Edit an ad - owner only (FR4.3-FR4.5). Changes title and description only; owner never changes.
      security: [{ session: [], xsrf: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/AdRequest' }
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Ad' }
        '400': { $ref: '#/components/responses/Problem' }
        '401': { $ref: '#/components/responses/Problem' }
        '403': { $ref: '#/components/responses/Problem' }
        '404': { $ref: '#/components/responses/Problem' }
```

**Order of checks on protected ad operations:**
1. Anti-forgery token (403).
2. Logged in (401).
3. Body validation (400).
4. Ad exists (404).
5. Owner (403).

## C2 — Legacy unversioned path `/api/ads` (transition)

`/api/ads` and `/api/ads/{id}` stay available with **today's request and response shape**: `{ id, title, description, createdAt, updatedAt }`, with no `authorName` or `ownedByMe` (Q5). They apply **the same rules as C1** (Q6):
- create and edit require a session and an anti-forgery token;
- only the owner may edit;
- the status codes and problem details are the ones above;
- listing and viewing stay open;
- create answers `201` with `Location: /api/ads/{id}`.

```yaml
openapi: 3.1.0
info:
  title: Bulletin Board API (legacy, deprecated)
  version: 0.9.0
  description: >
    Contract C2. Old response shape, same login, ownership and XSRF rules as C1. Every response carries
    `Deprecation: true` and `Link: </api/v1/ads>; rel="successor-version"`. No removal date yet (Q7).
servers:
  - url: /api
paths:
  /ads:
    get:
      responses:
        '200':
          description: Ads in the old shape
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/LegacyAd' }
    post:
      security: [{ session: [], xsrf: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LegacyAdRequest' }
      responses:
        '201': { description: Created; Location /api/ads/{id} }
        '400': { description: Problem details }
        '401': { description: Problem details }
        '403': { description: Problem details }
  /ads/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: integer, format: int64 }
    get:
      responses:
        '200':
          description: Ad in the old shape
          content:
            application/json:
              schema: { $ref: '#/components/schemas/LegacyAd' }
        '404': { description: Problem details }
    put:
      security: [{ session: [], xsrf: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LegacyAdRequest' }
      responses:
        '200': { description: Updated ad in the old shape }
        '400': { description: Problem details }
        '401': { description: Problem details }
        '403': { description: Problem details }
        '404': { description: Problem details }
components:
  securitySchemes:
    session: { type: apiKey, in: cookie, name: SESSION_COOKIE }
    xsrf: { type: apiKey, in: header, name: X-XSRF-TOKEN }
  schemas:
    LegacyAdRequest:
      type: object
      required: [title, description]
      properties:
        title: { type: string, minLength: 1, maxLength: 100 }
        description: { type: string, minLength: 1, maxLength: 2000 }
    LegacyAd:
      type: object
      required: [id, title, description, createdAt, updatedAt]
      properties:
        id: { type: integer, format: int64 }
        title: { type: string }
        description: { type: string }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
```

U2 uses only C1. C2 exists only so that any old client keeps reading ads during the transition, and it never weakens the login rules.

## Contract Ownership Rules

- **Owner:** U1 (the backend team) owns C1 and C2 and implements them. U2 (the frontend team) is the consumer of C1 and is consulted on every change.
- **Additive changes** (a new optional response field, a new endpoint, a new error `detail` text) can ship within `/api/v1` without agreement. Consumers must ignore unknown response fields, and the backend ignores unknown request fields.
- **Breaking changes** (a removed or renamed field, a changed type, a new required request field, changed status codes or rules) go into a new version path (`/api/v2/...`). The previous version keeps running until both teams agree to retire it (Q2). Both teams agree the change by updating this contract before any code changes.
- **Legacy C2:** C2 is deprecated from the day `/api/v1` ships and is announced with `Deprecation` headers. It is never extended. Removing it needs a product-owner decision (Q7).
- **Security rules are not versioned.** Login, ownership and anti-forgery rules apply to every version, old and new (Q6, NFR5).

## Open Questions

| Contract | Question | Blocks |
|---|---|---|
| C2 | When is the legacy `/api/ads` path removed? No end date was set (Q7); the product owner decides. | Neither (removal is a later change in U1) |
| C1 | Should a locked account answer `423`, or the generic `401`, so it doesn't reveal that the email is registered? The approved requirements keep the distinct message (FR2.3); a requirements-review finding flagged the trade-off. | Neither (current contract follows FR2.3) |
