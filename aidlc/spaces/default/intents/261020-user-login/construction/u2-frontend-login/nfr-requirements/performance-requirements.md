# Performance Requirements: u2-frontend-login

The frontend is a small single-page app with a 222 kB JavaScript bundle (69 kB gzip) today. These targets keep the login work from making it noticeably heavier or slower.

| ID | Requirement | Target | How measured |
|---|---|---|---|
| NFR4.2 | Production bundle growth from the login work (no routing library, ADR-004). | JavaScript gzip size grows by ≤ 15 kB over today's 69.5 kB. | `npm run build` output, compared before and after. |
| NFR4.3 | Requests made on page load. | Exactly 2 API requests: `GET /api/v1/auth/me` and `GET /api/v1/ads`, sent in parallel and not in sequence. | Component test counts the `fetch` calls on mount. |
| NFR4.4 | UI response while a log-in or sign-up request is pending (the backend hashes for about 0.3 s). | The submit button disables and shows a busy label within one render. A second click sends no second request (double-submit). | Component test: two clicks while pending give one request. |
| NFR4.5 | Request timeout (contract: 10 s). | A request with no answer after 10 s is aborted and shows the generic error message. | Test with fake timers. |

## Assumptions & Open Questions

None.
