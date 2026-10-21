# Security Requirements: u2-frontend-login

Sources: `requirements.md` (NFR2–NFR4, NFR7, FR1–FR5), `contract-summary.md` (C1, cross-cutting rules), `decisions.md` (ADR-001, ADR-004, ADR-006), and the backend unit's error-code decision (`code` on every problem response). The backend enforces every rule; the frontend must not weaken it and must not leak credentials.

## Credentials and session

| ID | Requirement | Pass / fail check |
|---|---|---|
| NFR3.11 | The frontend never reads, stores or sets the session cookie. It sends requests same-origin with `credentials: 'same-origin'` so the browser attaches the cookie (ADR-001). | Code search finds no access to the session cookie. Tests assert that `fetch` is called with `credentials: 'same-origin'`. |
| NFR3.12 | Before every `POST`/`PUT` (including sign-up, log-in and log-out), ApiClient reads the current `XSRF-TOKEN` cookie and sends it as the `X-XSRF-TOKEN` header. The value is re-read on every request because the backend rotates it (ADR-006, contract). | A unit test with two different cookie values sees two different header values. A GET carries no header. |
| NFR3.13 | On page load, CurrentUser calls `GET /api/v1/auth/me` before any write, so the token cookie exists before the first sign-up or log-in (contract). | The test asserts that `me` is called once on mount, before any POST. |
| NFR2.7 | Passwords exist only in form component state. They are cleared after submit (success or failure), never put in `localStorage`, `sessionStorage`, URLs or console output, and never shown back (FR1.7). | Tests assert that the password field is empty after a failed log-in and that the storage APIs are not called. A code search finds no `console.log` of form values. |
| NFR2.8 | Nothing about the user is persisted in the browser. "Logged in" is always derived from `/api/v1/auth/me` (FR3.2, FR3.3). | Code search finds no `localStorage` or `sessionStorage` use. |

## Rendering and input

| ID | Requirement | Pass / fail check |
|---|---|---|
| NFR2.9 | User-supplied text (ad title, ad description, `authorName`, `displayName`) is rendered only as React text children, never through `dangerouslySetInnerHTML` or `innerHTML`. | A test renders a display name `<img src=x onerror=alert(1)>` and finds the literal text with no `img` element. A code search finds no `dangerouslySetInnerHTML`. |
| NFR4.1 | Requests use the relative base `/api/v1` (or `VITE_API_BASE_URL` when set). The dev proxy keeps the frontend and API same-origin, so no cross-origin credentials are needed (NFR4, contract). | ApiClient tests assert relative URLs. `vite.config.ts` keeps the `/api` proxy. |
| NFR5.6 | UI rules are convenience only. Hiding "New ad" and "Edit" does not replace backend checks, and the frontend still handles a 401/403 on a write it did offer (NFR5). | Test: a 403 `not_owner` on Save shows the message and keeps the form. |

## Error handling

| ID | Requirement | Pass / fail check |
|---|---|---|
| NFR7.5 | ApiClient turns non-2xx responses into an error carrying `status`, `code` and `detail` from the problem details. Behaviour keys on `code`, not on `detail` text. `not_authenticated` on any request other than log-in raises the "session ended" signal (FR3.4). `bad_credentials` and `account_locked` show their `detail` under the log-in form. | Tests cover the signal for `not_authenticated` and show `detail` for `bad_credentials`, `account_locked` and `email_taken`. |
| NFR7.6 | A `204 No Content` response (log-out) resolves without parsing a body. A non-JSON or network error shows a generic "Something went wrong, please try again" message and logs nothing sensitive. | Test: log-out resolves, and a network failure shows the generic message. |

## Accessibility of the security forms

The sign-up, log-in and log-out controls are the security entry points, so their accessibility is specified here.

| ID | Requirement | Pass / fail check |
|---|---|---|
| NFR8.1 | Every sign-up and log-in field has a visible `<label>` bound to its input. Fields use the right `type` and `autocomplete` (`email`, `username`/`email`, `new-password`, `current-password`). The forms work with the keyboard alone: Tab order, Enter submits, Escape or Cancel closes the panel. | Testing Library finds each field by its label. A user-event test completes sign-up and log-in with the keyboard only. |
| NFR8.2 | Errors are announced in text: field errors sit next to their field, linked with `aria-describedby`, and form-level errors use `role="alert"`. Status is never shown by colour alone. | Tests find the error text via `role="alert"` and via each field's description. |

## Assumptions & Open Questions

None.
