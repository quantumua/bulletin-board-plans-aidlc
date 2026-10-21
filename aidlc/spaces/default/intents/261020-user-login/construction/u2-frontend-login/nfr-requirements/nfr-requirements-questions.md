# NFR Requirements — Questions (u2-frontend-login)

Context: the frontend (React 19, TypeScript, Vite 8) has no test runner today (codekb `technology-stack.md`). The organisation's testing posture treats tests as a first-class deliverable, and the requirements need the login UI (panels, logged-in state, owner-only Edit) verifiable (FR1.7, FR3.3, FR3.4, FR4.6, NFR8).

## Q1. How should the frontend's new behaviour be tested?

A. Add Vitest with React Testing Library (jsdom) and write component tests for the API client, the current-user state, the panels and the board (recommended: same toolchain as Vite, no browser needed)
B. Add Playwright end-to-end tests against the running backend and frontend (closest to real use, slower, needs both apps running)
C. Both A and B
D. No frontend tests in this version; rely on manual checks and the backend tests
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- The frontend adds Vitest with React Testing Library (jsdom) and gets component tests for the API client, the current-user state, the log-in and sign-up panels, and the board [Q1]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
