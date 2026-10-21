# Requirements Analysis — Questions

Context: the intent is confirmed (self sign-up, log in, log out; only logged-in users create ads; users edit only their own ads; visitors browse and view). The code scan shows the backend stores everything in an in-memory database that is wiped on every restart, has no security layer, and leaves its database console open to anyone; the frontend is a single screen with no notion of a user.

## Q1. What do people use to sign up and log in?

A. Email address + password
B. Username + password
C. Username + email + password (log in with either)
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. What rules should a password follow?

Applies at sign-up. Longer minimums are safer; complexity rules are often less useful than length.

A. At least 8 characters, no other rules
B. At least 12 characters, no other rules
C. At least 8 characters with a mix of letters, digits and symbols
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. How long should a user stay logged in?

A. Until they close the browser
B. A fixed period (e.g. 7 days) unless they log out
C. Short session (e.g. 30 minutes of inactivity), with a "Remember me" option for longer
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. Must accounts and ads survive a restart of the backend?

Today the database is wiped on every restart, so every user would have to sign up again after each restart.

A. Yes — accounts and ads must be kept across restarts (durable storage)
B. No — wiping on restart is fine for this first version
C. Accounts must survive; ads may be wiped
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q5. What should happen after repeated wrong passwords?

Protects accounts from someone guessing passwords.

A. Lock the account temporarily (e.g. 15 minutes after 5 failed attempts)
B. Slow down further attempts from the same source (rate limiting) without locking the account
C. No protection in the first version
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q6. Should an ad show who posted it?

A. Yes — show the poster's username / display name to everyone
B. Only show a "Your ad" marker to the logged-in owner
C. No author information on ads
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q7. How will the board be served when it goes live?

This decides how the login session travels between the web page and the API.

A. Frontend and API from the same web address (e.g. one domain, API under /api)
B. Frontend and API on different web addresses
C. Only run locally for now
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q8. What should happen to the open database console (`/h2-console`)?

Today anyone can open it and read or change all data; once accounts exist it would expose them.

A. Turn it off outside local development
B. Remove it entirely
C. Leave it as is
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q9. Follow-up: what name appears on an ad?

You chose to show the poster on every ad (Q6) and to sign up with email + password (Q1). Showing the email address would make every poster's email public.

A. Ask for a display name at sign-up and show that
B. Show only the part of the email before the "@"
C. Show the full email address (accepting that it becomes public)
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q10. Follow-up: the open database console vs. ad ownership

You chose to leave the database console open (Q8). Anyone who opens it can read every account and change any ad, including who owns it, which undoes the ownership protection login is meant to add (intent: stop strangers editing other people's ads).

A. Keep it open anyway — this first version only runs in trusted environments
B. Turn it off outside local development after all
C. Keep it, but only reachable after logging in
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Sign up and log in with email address + password [Q1]
- Password: at least 8 characters, no other rules [Q2]
- A login lasts until the browser is closed, or until the user logs out [Q3]
- Accounts and ads may be wiped when the backend restarts; no durable storage in this first version [Q4]
- After repeated wrong passwords the account is locked temporarily (e.g. 15 minutes after 5 failed attempts) [Q5]
- Every ad shows its poster's display name, which is asked for at sign-up; email addresses are never shown [Q6, Q9]
- When live, the frontend and API are served from the same web address (API under /api) [Q7]
- The database console stays open as it is today; this first version runs only in trusted environments, and you accept that the console can bypass ad ownership [Q8, Q10]

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
