# Requirement-to-Unit Map: User Login for the Bulletin Board

No `stories.md` was produced (the User Stories stage is skipped), so the rows are keyed by functional requirement `FR`, with an extra row per `NFR`. **Unit** is the implementing Unit. **Also** names the other Unit when the requirement spans both.

| ID | Requirement (short) | Unit | Directory | Also |
|---|---|---|---|---|
| FR1 | Sign up | U1 | u1-backend-auth | U2 |
| FR1.1 | Account from email, display name, password | U1 | u1-backend-auth | U2 |
| FR1.2 | Valid, normalised email | U1 | u1-backend-auth | |
| FR1.3 | One account per email | U1 | u1-backend-auth | |
| FR1.4 | Password 8–128 characters | U1 | u1-backend-auth | |
| FR1.5 | Display name 1–50 characters | U1 | u1-backend-auth | |
| FR1.6 | Logged in after sign-up | U1 | u1-backend-auth | U2 |
| FR1.7 | Field errors, keep typed input | U2 | u2-frontend-login | U1 |
| FR2 | Log in | U1 | u1-backend-auth | U2 |
| FR2.1 | Log in with email and password | U1 | u1-backend-auth | U2 |
| FR2.2 | Generic wrong-credentials message | U1 | u1-backend-auth | |
| FR2.3 | Lock after 5 failures for 15 minutes | U1 | u1-backend-auth | |
| FR2.4 | Success resets the count | U1 | u1-backend-auth | |
| FR2.5 | Log-in allowed after the lock expires | U1 | u1-backend-auth | |
| FR3 | Log out and session | U1 | u1-backend-auth | U2 |
| FR3.1 | Log out ends access | U1 | u1-backend-auth | U2 |
| FR3.2 | Session lasts until the browser closes | U1 | u1-backend-auth | |
| FR3.3 | Still logged in after reload | U2 | u2-frontend-login | U1 |
| FR3.4 | Ended session handled, input kept | U2 | u2-frontend-login | U1 |
| FR4 | Ownership and access control | U1 | u1-backend-auth | U2 |
| FR4.1 | Browse and view open to all | U1 | u1-backend-auth | |
| FR4.2 | Create needs login; server sets owner | U1 | u1-backend-auth | |
| FR4.3 | Only the owner edits | U1 | u1-backend-auth | |
| FR4.4 | No admin role | U1 | u1-backend-auth | |
| FR4.5 | Unowned ads not editable | U1 | u1-backend-auth | |
| FR4.6 | UI shows create and edit only when allowed | U2 | u2-frontend-login | U1 |
| FR4.7 | Refusals as problem details, shown in UI | U1 | u1-backend-auth | U2 |
| FR5 | Author shown on ads | U1 | u1-backend-auth | U2 |
| FR5.1 | Display name on every ad | U1 | u1-backend-auth | U2 |
| FR5.2 | No email in public responses | U1 | u1-backend-auth | |
| FR5.3 | "Unknown" for unowned ads | U1 | u1-backend-auth | U2 |
| NFR1 | Hashed passwords | U1 | u1-backend-auth | |
| NFR2 | No credentials in URLs or logs | U1 | u1-backend-auth | U2 |
| NFR3 | Session safety and CSRF | U1 | u1-backend-auth | U2 |
| NFR4 | Same-origin serving | U2 | u2-frontend-login | U1 |
| NFR5 | Server-side enforcement | U1 | u1-backend-auth | |
| NFR6 | Regression safety | U1 | u1-backend-auth | |
| NFR7 | Problem-details errors | U1 | u1-backend-auth | U2 |
| NFR8 | Accessible forms | U2 | u2-frontend-login | |

## Cross-Cutting Rows

FR1, FR1.1, FR1.6, FR1.7, FR2, FR2.1, FR3, FR3.1, FR3.3, FR3.4, FR4, FR4.6, FR4.7, FR5, FR5.1, FR5.3, NFR2, NFR3, NFR4 and NFR7 each need both Units. The backend rule or behaviour lives in U1; the visible form, state or message lives in U2. Their API exchange is pinned in Contract Design.

## Implementation Order Within Each Unit

- **U1:**
  1. Accounts (entity, registration, hashing, lockout).
  2. Authentication (session, endpoints, CSRF, caller identity).
  3. Ads ownership (`ownerId`, owner-only edit, poster names).
  4. Update the existing tests and add the regression tests.
- **U2:**
  1. ApiClient extensions (credentials, CSRF header, 204 handling, auth calls).
  2. CurrentUser context.
  3. AuthPanels.
  4. AdBoard visibility and poster names.

## Coverage Verification

- All 31 functional requirement IDs (FR1–FR5.3) and all 8 NFRs are assigned to a Unit. None is unassigned.
- U1 has 33 primary rows and U2 has 6 primary rows. Both Units have rows.
