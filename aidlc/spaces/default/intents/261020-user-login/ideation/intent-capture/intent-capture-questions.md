# Intent Capture & Framing — Questions

## Sources

- [desc] Initial description: "I want to add login to a system. We have existing code in the current repository for a bulletin board application; it consists of 2 parts (separate team repositories) - backend and frontend. I want to add a new login functionality."
- [scope] Workflow-selected scope: `security-patch`.

Context: today anyone who opens the bulletin board can create, list, view and edit any ad. There are no user accounts.

## Q1. What problem should login solve?

Today any visitor can create and edit any ad. What is the main reason for adding login?

A. Stop strangers from editing or defacing other people's ads (ownership)
B. Know who posted each ad (accountability / contact)
C. Restrict the whole board to known people only (private board)
D. Prepare for future features that need user accounts (e.g. messaging, favourites)
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. Who should be able to log in, and how do they get an account?

This decides whether the first version includes a sign-up screen.

A. Anyone can sign up themselves (self-registration), then log in
B. Accounts are created by an administrator; users only log in
C. Users log in with an existing external account (e.g. Google, company SSO)
D. A small fixed set of known users (e.g. created at setup time)
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. What should a visitor who is NOT logged in be able to do? (select all that apply)

This decides which actions are protected behind login.

A. Browse the list of ads
B. View a single ad
C. Create an ad
D. Edit an ad
E. Nothing — the whole board requires login
X. Other (please specify)

[Answer]: A, B

## Q4. Once logged in, whose ads can a user edit?

Today there is no notion of who owns an ad.

A. Only ads they created themselves
B. Any ad (login only proves they are a member)
C. Their own ads; an administrator role can edit any ad
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. What happens to the ads that already exist (created before login existed)?

Data currently lives in memory and is lost on restart, so this may not matter yet.

A. Not applicable — data is in memory and starts empty on every restart
B. They become "unowned" and nobody (or only an admin) can edit them
C. They stay editable by any logged-in user
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q6. How will you know login is successful? (select all that apply)

A. A user can sign in and sign out from the web UI
B. Protected actions are refused for visitors who are not logged in
C. A user cannot edit an ad they are not allowed to edit
D. Existing ad features keep working for allowed users (no regressions)
E. Not yet defined
X. Other (please specify)

[Answer]: A, B, C

## Q7. Who are the stakeholders, and who decides on scope and priority?

You mentioned separate backend and frontend team repositories.

A. I decide; the backend and frontend teams implement
B. A product owner decides; the backend and frontend teams implement and are consulted
C. The backend and frontend team leads decide together
D. Not identified
X. Other (please specify)

[Answer]: B

## Q8. What should this first version of login leave out? (select all that apply)

The workflow-selected plan is already chosen; this is only about the product.

A. Password reset / "forgot password"
B. Email verification on sign-up
C. Social / single sign-on logins
D. User profile editing and account deletion
E. None — I want all of these in the first version
X. Other (please specify)

[Answer]: D

## Q9. Follow-up: which of these should the first version actually include? (select all that apply)

In Q8 you left out only profile editing and account deletion, which would put password reset, email verification and social / single sign-on login in the first version. In Q2, though, you chose self sign-up rather than logging in with an external account. Which of these do you want in the first version?

A. Password reset / "forgot password"
B. Email verification on sign-up
C. Social / single sign-on login, in addition to self sign-up
D. None of them: first version is sign-up, log in and log out only
X. Other (please specify)

[Answer]: D

## Consolidated Summary Confirmation

- Problem: stop strangers from editing or defacing other people's ads (ownership) [Q1]
- Accounts: anyone can sign up themselves, then log in [Q2]
- Visitors who are not logged in can browse the list of ads and view a single ad; creating and editing need login [Q3]
- A logged-in user can edit only the ads they created themselves; no admin role [Q4]
- Ads created before login existed become unowned and nobody can edit them [Q5]
- Success: users can sign in and out from the web UI; protected actions are refused for visitors; users cannot edit ads they don't own [Q6]
- Stakeholders: a product owner decides scope and priority; the backend and frontend teams implement and are consulted [Q7]
- Left out of the first version: password reset, email verification, social / SSO login, profile editing and account deletion. The first version is sign-up, log in and log out only [Q8, Q9]
- Why now: a planned launch, or opening the board to more people [Q10]
- Communication: updates in a shared channel or tracker (e.g. Slack, Jira) as work moves [Q11]
- Product owner: Maksym Tsybulskyi [Q12]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Requested Changes Feedback

What should change?

[Answer]: product owner is Maksym Tsybulskyi

## Assumption Confirmation

The intent statement and stakeholder map carry these assumptions:

- Why this is needed now (a deadline, an incident, or a planned launch) was not asked; the timing driver is an open question.
- The communication requirements and reporting cadence between the product owner and the two teams were not asked and remain an open question.
- The named person who acts as product owner was not identified.

A. Accept assumptions
B. Convert to follow-up questions

[Answer]: B. Convert to follow-up questions

## Q10. Why is login needed now?

This tells the team how urgent the work is.

A. An incident: ads were actually edited or defaced by strangers
B. A planned launch or opening the board to more people
C. A deadline set by the product owner or the business
D. No specific trigger; it is a known gap to close
E. Not yet defined
X. Other (please specify)

[Answer]: B

## Q11. How should the product owner and the two teams keep each other informed?

A. Regular sync meeting (e.g. weekly)
B. Updates in a shared channel or tracker (e.g. Slack, Jira) as work moves
C. Only at the approval points of this workflow
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q12. Who is the product owner?

A. I am the product owner
B. Someone else (please name them under Other)
C. Not identified
X. Other (please specify)

[Answer]: X. Maksym Tsybulskyi
