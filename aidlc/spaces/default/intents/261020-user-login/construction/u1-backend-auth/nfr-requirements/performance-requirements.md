# Performance Requirements: u1-backend-auth

The bulletin board is small (in-memory data, one instance). Targets are set to make sure the new security work does not slow the board down noticeably, and so that the deliberately slow password hash stays bounded. Measured on a developer machine with the backend running locally and warmed up (at least 10 prior requests).

| ID | Requirement | Target | How measured |
|---|---|---|---|
| NFR1.6 | Log-in and sign-up latency, which is dominated by BCrypt cost 12 (Q2). | p95 ≤ 600 ms, p50 ≤ 400 ms | 50 sequential log-ins against the running app; server-side timing in the security log or test timing. |
| NFR5.5 | Ad list latency with the poster-name lookup (ADR-003). Names are fetched in one batched query per list, not one query per ad. | p95 ≤ 150 ms for 1,000 ads by 100 different posters | Integration test seeding 1,000 ads; at most 2 SQL statements per list request (ads + accounts). |
| NFR3.7 | Overhead of the session and CSRF checks on non-login requests. | ≤ 10 ms added at p95 compared with the same request before this change | Compare `GET /api/v1/ads/{id}` timing with the current `GET /api/ads/{id}` baseline. |

## Resource constraints

- BCrypt hashing runs on the request thread. With a cost of 12 at about 0.25 s per hash, one CPU core can handle about 4 log-ins per second. That is enough for the expected load (see `scalability-requirements.md`).

## Assumptions & Open Questions

None.
