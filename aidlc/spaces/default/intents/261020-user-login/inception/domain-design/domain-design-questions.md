# Domain Design — Questions

Context: the requirements (FR1–FR5, NFR1–NFR8) add accounts, a login session, and ad ownership to a backend that today has one feature package (`ad/`) and a frontend that is a single screen with one API helper (`src/api.ts`). Frontend and API are served from the same address (Q7 of requirements).

## Q1. How should the backend remember who is logged in?

The login has to end when the browser closes (FR3.2), survive a page reload (FR3.3), and be invalidated on log-out (FR3.1); the credential must not be readable by page scripts (NFR3).

A. Server-side session, identified by an HttpOnly session cookie (recommended: log-out invalidates it immediately, nothing to store in the browser beyond the cookie, fits same-origin serving)
B. Signed token (e.g. JWT) kept in an HttpOnly cookie (no server session state, but log-out cannot revoke a token before it expires)
C. Signed token kept by the frontend in browser storage and sent as an Authorization header (readable by page scripts, which NFR3 forbids)
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. How should accounts be split from the login mechanics?

A. Two building blocks: **Accounts** (sign-up, user records, password check, lockout) and **Authentication** (log-in/log-out, session, deciding who the caller is) (recommended: account data and request security change for different reasons)
B. One **Identity** building block that does all of it
C. Put users inside the existing ads feature
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. How does an ad know its owner and show the poster's name?

A. The ad stores the owner's account id; the display name is looked up from Accounts when ads are returned (recommended: one source of truth for the name)
B. The ad stores the owner's account id and a copy of the display name taken at posting time (simpler reads; the copy would go stale if names ever become editable)
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. How should the frontend add the sign-up and log-in screens?

The app has a single screen and no routing library today.

A. Add a routing library with separate pages for the board, log-in and sign-up, plus a shared "current user" state (recommended: clean URLs like /login, room to grow)
B. No routing library: show log-in / sign-up as panels on the existing single screen, plus a shared "current user" state (fewest new dependencies)
C. Not yet defined
X. Other (please specify)

[Answer]: B

## Q5. Where should the "only the owner may edit" rule live in the backend?

A. In the ads business logic (the ad service compares the ad's owner with the caller) (recommended: keeps the rule next to the data, easy to test, also guards against an owner in the request body)
B. In a security layer in front of the ads endpoints (rule declared on the endpoint)
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Logins are server-side sessions identified by an HttpOnly session cookie; log-out invalidates the session immediately [Q1]
- Two backend building blocks: Accounts (sign-up, user records, password check, lockout) and Authentication (log-in/log-out, session, identifying the caller) [Q2]
- An ad stores its owner's account id; the poster's display name is looked up from Accounts when ads are returned [Q3]
- Frontend: no routing library; log-in and sign-up appear as panels on the existing single screen, with a shared "current user" state [Q4]
- The "only the owner may edit" rule lives in the ads business logic, which compares the ad's owner with the caller and never takes an owner from the request body [Q5]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
