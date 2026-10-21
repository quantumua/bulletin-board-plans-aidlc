# Intent Statement: User Login for the Bulletin Board

## Problem Statement

The bulletin board is an existing application made of two parts, a backend and a frontend, kept in separate team repositories, and it has no login today [desc].

The problem to solve is ownership: strangers can currently edit or deface ads that other people posted, and login should stop that [Q1].

## Target Customer

- **People who post ads** benefit because only they can change the ads they created [Q1] [Q4].
- **Anyone can become a member** by signing up themselves and then logging in [Q2].
- **Visitors who are not logged in** keep the ability to browse the list of ads and view a single ad [Q3].

## Success Metrics

| Metric | Target | Source |
|--------|--------|--------|
| A new user can sign up, log in and log out from the web UI | Each of the three flows completes successfully in an end-to-end check | [Q6] [Q9] |
| Attempts by visitors who are not logged in to create or edit an ad | 100% refused | [Q6] [Q3] |
| Attempts by a logged-in user to edit an ad they did not create | 100% refused | [Q6] [Q4] |

## Initiative Trigger

The trigger is the ownership gap: any visitor can change any ad, so the board cannot protect what people post [Q1].

It is needed now because of a planned launch, or because the board is opening to more people [Q10].

## Initial Scope Signal

### Workflow-selected scope

- `security-patch`, adapted into a custom plan for this piece of work (workflow-selected) [scope].

### User-confirmed product boundary

**In the first version:**

- Self sign-up, log in and log out [Q2] [Q9].
- Creating an ad requires being logged in; browsing and viewing ads do not [Q3].
- A logged-in user can edit only the ads they created; there is no administrator role [Q4].
- Ads that existed before login become unowned, and nobody can edit them [Q5] [Q4].

**Left out of the first version:**

- Password reset ("forgot password") [Q9].
- Email verification on sign-up [Q9].
- Social or single sign-on login [Q9].
- Profile editing and account deletion [Q8].

## Assumptions & Open Questions

None.
