# Scalability Requirements: u1-backend-auth

This first version runs as **one backend instance** with in-memory storage and in-memory sessions (requirements C2, ADR-001). It does not scale horizontally, and that is accepted for this version.

| ID | Requirement | Target | Check |
|---|---|---|---|
| NFR3.8 | Concurrent logged-in sessions held in memory | Up to 500 sessions without errors | A load script holds 500 sessions and then lists ads with each one. |
| NFR3.9 | Concurrent log-ins (BCrypt-bound) | 10 parallel log-ins finish within 3 s total, with no failures | Parallel test with 10 threads. |
| NFR1.7 | Account count | 10,000 accounts in memory without a measurable change to log-in latency (indexed by normalised email) | Seed 10,000 accounts, then repeat the NFR1.6 measurement. |

## Scaling limits and triggers (for later versions)

- More than one backend instance needs a shared session store and a shared database. Durable storage is out of scope (requirements OQ2).
- Sustained log-in rates above about 4 per second per core would need either more cores or a lower BCrypt cost. Lowering the cost is a security trade-off and needs a new decision.

## Assumptions & Open Questions

None.
