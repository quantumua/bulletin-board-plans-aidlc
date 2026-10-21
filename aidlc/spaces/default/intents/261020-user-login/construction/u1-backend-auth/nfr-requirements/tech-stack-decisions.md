# Tech Stack Decisions: u1-backend-auth

Existing stack kept unchanged: Java 25, Spring Boot 4.1.1, Spring MVC, Spring Data JPA with Hibernate, Bean Validation, H2 in-memory, Maven wrapper (codekb `technology-stack.md`).

| Addition | Choice | Rationale | Alternatives rejected |
|---|---|---|---|
| Security framework | `spring-boot-starter-security` (version managed by the Boot 4.1.1 BOM) | Provides server-side sessions, session-id change at log-in, CSRF via cookie and header, BCrypt and a security filter chain. These map one-to-one onto ADR-001 and ADR-006 (Q1). | Hand-written filters: every security detail would be ours to get right and to test. |
| Security tests | `spring-boot-starter-security-test` (test scope) | Boot 4 splits test support per starter (codekb). Provides `with(csrf())`, `with(user(...))` and similar request helpers for MockMvc. | none |
| Password hashing | `BCryptPasswordEncoder` with strength 12 | Built in, salted and adaptive (Q2, NFR1.1). | Argon2id: needs an extra crypto library for a marginal gain at this scale. |
| CSRF token storage | `CookieCsrfTokenRepository` with HttpOnly off (cookie `XSRF-TOKEN`, header `X-XSRF-TOKEN`) | The standard pattern for a script-driven frontend on the same origin (ADR-006, contract). | Session-stored token returned in a body: needs an extra round trip and contract change. |
| Session store | Servlet container in-memory `HttpSession` | Matches in-memory storage (C2) and single instance (scalability). | Spring Session with JDBC or Redis: not needed until there are several instances. |
| Clock | An injected `java.time.Clock` bean | Lockout expiry must be testable (NFR3.6). | Calling `Instant.now()` directly: lock expiry could not be tested. |
| Logging | Existing SLF4J and Logback, with a `security` logger | No new dependency (NFR2.4). | Structured JSON logging: not needed at this scale. |

No new runtime dependencies beyond the security starter. No database migration tool is added, because the schema is still generated with `create-drop` (C2).

## Assumptions & Open Questions

None.
