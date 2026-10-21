# Requirements: User Login for the Bulletin Board

Sources: intent statement (`ideation/intent-capture/intent-statement.md`), the confirmed answers in `requirements-analysis-questions.md` (Q1–Q10), and the code knowledge base for `bulletin-board-backend` and `bulletin-board-frontend` (`aidlc/spaces/default/codekb/`).

## 1. Intent Analysis

- **Goal:** stop strangers from editing or defacing other people's ads by tying each ad to the account that posted it (intent: Problem Statement).
- **Type:** new feature (security-relevant) on existing code, spanning both repositories: backend API and frontend UI.
- **Today:** neither repository has users, sessions or access control. Anyone can create or edit any ad (`POST`/`PUT /api/ads`), and the UI shows "New ad" and "Edit" to everyone (codekb: backend `architecture.md`, frontend `business-overview.md`).
- **Success, from the intent:** a user can sign up, log in and log out from the web UI. 100% of create and edit attempts by visitors are refused, and 100% of attempts to edit someone else's ad are refused.
- **Complexity:** Standard. The functional surface is small, but the work is security-sensitive and has to land in both repositories.

## 2. Functional Requirements

### FR1 — Sign up

- **FR1.1** A visitor can create an account by giving an email address, a display name and a password (Q1, Q9; intent: self sign-up).
- **FR1.2** The email address must be a syntactically valid address of at most 254 characters. It is compared case-insensitively, with surrounding whitespace removed.
- **FR1.3** An email address can belong to only one account. Signing up with an email address that is already registered is refused with a clear message, and no second account is created.
- **FR1.4** The password must be at least 8 characters long (Q2). No other complexity rule applies. A maximum length of 128 characters is enforced (see Assumptions).
- **FR1.5** The display name is required: 1–50 visible characters after trimming whitespace (see Assumptions).
- **FR1.6** On successful sign-up the user is logged in straight away (see Assumptions).
- **FR1.7** On invalid input, the response names each field that is wrong and why. The form keeps everything the user typed except the password.

Acceptance criteria:
- **AC1.1** Given a visitor on the sign-up form, when they submit a new email, a display name and an 8-character password, then the account is created and they are shown as logged in.
- **AC1.2** Given an account exists for `ann@example.com`, when a visitor signs up with `Ann@Example.com `, then sign-up is refused with "email already registered" and no account is created.
- **AC1.3** Given a visitor on the sign-up form, when they submit a 7-character password, then sign-up is refused with a message naming the password field.
- **AC1.4** Given a visitor on the sign-up form, when they submit an empty or whitespace-only display name, then sign-up is refused with a message naming the display name field.

### FR2 — Log in

- **FR2.1** A visitor with an account can log in with their email address and password (Q1).
- **FR2.2** Wrong credentials are refused with one generic message, "Email or password is incorrect". The message does not reveal whether the email address exists.
- **FR2.3** After 5 consecutive failed attempts for the same account, the account is locked for 15 minutes. During the lock, log-in is refused even with the correct password, and the message says the account is temporarily locked (Q5).
- **FR2.4** A successful log-in resets that account's failed-attempt count.
- **FR2.5** When the lock period ends, the account can log in again with the correct password.

Acceptance criteria:
- **AC2.1** Given a registered user, when they log in with the correct email and password, then they are logged in and the UI shows their display name.
- **AC2.2** Given a registered user, when they log in with a wrong password, then they see "Email or password is incorrect" and remain logged out.
- **AC2.3** Given no account for `nobody@example.com`, when someone logs in with that email, then they see the same "Email or password is incorrect" message.
- **AC2.4** Given 5 consecutive failed attempts for an account, when the correct password is then entered within 15 minutes, then log-in is refused with a "temporarily locked" message.
- **AC2.5** Given an account locked more than 15 minutes ago, when the correct password is entered, then log-in succeeds.

### FR3 — Log out and session

- **FR3.1** A logged-in user can log out from the web UI. After logging out, every protected action is refused until they log in again (intent).
- **FR3.2** A login lasts until the browser is closed or the user logs out, whichever comes first. Nothing is remembered across browser restarts (Q3).
- **FR3.3** After a page reload in the same browser session, the user is still logged in and the UI shows them as logged in.
- **FR3.4** If a logged-in user's session is no longer valid (logged out in another tab, or the backend restarted), their next protected action is refused. The UI then shows them as logged out and asks them to log in, and any form input they typed is kept.

Acceptance criteria:
- **AC3.1** Given a logged-in user, when they click "Log out", then the UI shows them as logged out and the "New ad" form and "Edit" buttons are no longer available.
- **AC3.2** Given a user who has logged out, when a create or edit request is sent with their old session, then it is refused as not logged in.
- **AC3.3** Given a logged-in user, when they reload the page, then they are still shown as logged in.
- **AC3.4** Given a logged-in user editing an ad whose session has ended, when they click Save, then the save is refused, they are asked to log in, and the text they typed is still in the form.

### FR4 — Ownership and access control for ads

- **FR4.1** Browsing the list of ads and viewing a single ad stay available to everyone, whether logged in or not (intent).
- **FR4.2** Creating an ad requires being logged in. The new ad's owner is the logged-in user, set by the server and never taken from the request body (intent).
- **FR4.3** Editing an ad is allowed only for its owner (intent). Every other caller is refused: a visitor who isn't logged in gets "not logged in", and a different logged-in user gets "not allowed".
- **FR4.4** There is no administrator role. Nobody can edit another user's ad (intent).
- **FR4.5** Ads without an owner (ads that existed before login was introduced) cannot be edited by anyone (intent). With the in-memory store (Q4) the board starts empty after every restart, so in practice no such ads exist.
- **FR4.6** The frontend shows the "New ad" form only to logged-in users, and the "Edit" button only on ads the logged-in user owns. The backend enforces FR4.2–FR4.5 regardless of what the UI shows.
- **FR4.7** A refused request returns a problem-details error (the same error format the API uses today), and the UI shows its message.

Acceptance criteria:
- **AC4.1** Given a visitor who isn't logged in, when they open the board, then they see the list of ads with no "New ad" form and no "Edit" buttons.
- **AC4.2** Given a visitor who isn't logged in, when a `POST /api/ads` request is sent, then it is refused as not logged in and no ad is created.
- **AC4.3** Given user A is logged in, when A creates an ad, then the ad is stored with A as its owner.
- **AC4.4** Given an ad owned by user A, when user B (logged in) sends an edit request for it, then it is refused as not allowed and the ad is unchanged.
- **AC4.5** Given an ad owned by user A, when A edits it, then the change is saved.
- **AC4.6** Given an ad owned by user A, when a visitor who isn't logged in sends an edit request for it, then it is refused as not logged in and the ad is unchanged.
- **AC4.7** Given a create request whose body names a different owner, when it is processed, then the owner is still the logged-in user.

### FR5 — Author shown on ads

- **FR5.1** Every ad shows its poster's display name to everyone (Q6, Q9).
- **FR5.2** No email address appears in any ad, list or public API response (Q9).
- **FR5.3** An ad without an owner shows "Unknown" in place of a display name.

Acceptance criteria:
- **AC5.1** Given an ad posted by a user with display name "Ann", when anyone views the list, then the ad shows "Ann".
- **AC5.2** Given any ad, when the list or the single-ad response is read, then it contains no email address.

## 3. Non-Functional Requirements

- **NFR1 — Password storage:** passwords are stored only as salted hashes from an adaptive password-hashing function made for passwords. They are never stored or logged in plain text, and never returned by any API response. *Pass:* no response or log line contains the password; the stored value is not the password.
- **NFR2 — Credential privacy:** passwords and session identifiers never appear in URLs, logs or error messages. *Pass:* inspecting the request logs and URLs after sign-up and log-in shows neither.
- **NFR3 — Session safety:** the session credential cannot be read by page scripts, is sent only to the board's own web address, and is replaced at log-in so an identifier set before log-in cannot be reused afterwards. Requests that change data are protected against cross-site request forgery. *Pass:* a forged cross-site create or edit request is refused.
- **NFR4 — Same-origin serving:** the design targets a frontend and API served from the same web address, with the API under `/api` (Q7). Development keeps today's Vite proxy, which is already same-origin. *Pass:* sign-up, log-in, create, edit and log-out all work through the dev proxy without cross-origin credentials.
- **NFR5 — Server-side enforcement:** every rule in FR4 is enforced by the backend. Hiding a button in the UI is never the only control. *Pass:* the AC4.x checks succeed against the API directly, without the UI.
- **NFR6 — Regression safety:** the existing backend tests still pass, updated only where they relied on anonymous create and edit. Targeted regression tests cover the vulnerability being fixed: anonymous create and edit, and editing someone else's ad. This is the security-patch scope floor (org testing posture). *Pass:* the full backend suite is green and the AC4.x scenarios are covered by automated tests.
- **NFR7 — Error format:** new errors (not logged in, not allowed, validation, locked account, duplicate email) use the existing RFC 9457 problem-details format, so the frontend's existing error handling shows them.
- **NFR8 — Accessibility:** the sign-up and log-in forms can be completed with the keyboard alone, every field has a visible label, and errors are announced in text, not only by colour.

## 4. Constraints

- **C1** Work spans two separately owned repositories, `bulletin-board-backend` (Java 25, Spring Boot 4.1, Spring Data JPA, H2) and `bulletin-board-frontend` (React 19, TypeScript, Vite). Changes in each must follow that repository's existing conventions (codekb `code-structure.md`).
- **C2** Storage stays in-memory for this first version: accounts, sessions, lock state and ads are wiped on backend restart (Q4).
- **C3** The H2 database console (`/h2-console`) stays open as it is today. This first version runs only in trusted environments (Q8, Q10).
- **C4** The product owner, Maksym Tsybulskyi, decides scope and priority; the backend and frontend teams are consulted (intent stakeholder map).

## 5. Assumptions

- **A1** A display name is limited to 1–50 visible characters and need not be unique. Rationale: it is only a label on ads, and identity is the email address. Correct this if names must be unique.
- **A2** The password maximum is 128 characters. Rationale: it bounds hashing cost while allowing long passphrases.
- **A3** The user is logged in immediately after sign-up. Rationale: email verification is out of scope (intent), so nothing has to happen in between.
- **A4** Lockout is 5 consecutive failures, then a 15-minute lock. You confirmed these as example values; they can be tuned in later stages.
- **A5** An attacker could deliberately lock someone else's account by entering wrong passwords. This is accepted for the first version as the trade-off of Q5's choice.
- **A6** Telling a visitor at sign-up that an email address is already registered reveals that the account exists. This is accepted so the user understands why sign-up failed (FR1.3).

## 6. Out of Scope

- Password reset / "forgot password", email verification, social or single sign-on login (intent, Q9 in intent capture).
- Profile editing and account deletion (intent).
- Administrator role or moderation (intent).
- "Remember me" or sessions that survive a browser restart (Q3).
- Durable storage and data migration (Q4).
- Securing or disabling the H2 console (Q10).
- Deleting ads; that feature doesn't exist today (codekb).
- CI pipeline and frontend test tooling beyond what this change needs (plan: CI stage skipped).

## 7. Open Questions

- **OQ1** Before any deployment beyond trusted environments, the open H2 console (C3) must be closed. It can read every account and change any ad's owner, which undoes FR4. This needs a decision before the planned launch named in the intent.
- **OQ2** Losing all accounts on every restart (C2) also needs revisiting before the planned launch, because users would have to sign up again after each restart.

## 8. Traceability

| Requirement | Traces to |
|---|---|
| FR1 | Intent: self sign-up; Q1, Q2, Q9 |
| FR2 | Intent: log in; Q1, Q5 |
| FR3 | Intent: log out, success measure "sign in and out from the web UI"; Q3 |
| FR4 | Intent: Problem Statement (ownership), boundary (visitors browse/view; create needs login; own ads only; unowned ads) |
| FR5 | Q6, Q9 |
| NFR1–NFR3, NFR5 | Intent: Problem Statement (ownership is a security goal); corner checklist (secrets, per-object authorization) |
| NFR4 | Q7; codekb frontend architecture (dev proxy) |
| NFR6 | Org testing posture (security-patch floor); codekb backend code-quality-assessment (anonymous write tests) |
| NFR7 | codekb backend architecture (problem-details errors) |
| NFR8 | Corner checklist (screens and user input) |
