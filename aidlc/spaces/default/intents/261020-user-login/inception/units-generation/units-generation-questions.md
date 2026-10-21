# Units Generation — Questions

Context: the design has 3 backend building blocks (Accounts, Authentication, Ads) in `bulletin-board-backend` and 4 frontend building blocks (ApiClient, CurrentUser, AuthPanels, AdBoard) in `bulletin-board-frontend`. The two repositories are owned by separate teams and deploy separately. The next stage (Contract Design) pins the API between them.

## Q1. How should the work be split into units?

A. One unit per repository: a backend unit (Accounts + Authentication + Ads ownership) and a frontend unit (all four frontend blocks) (recommended: matches team ownership and deployment, 2 units)
B. Three units: backend accounts + login, backend ad ownership, and frontend (finer backend steps, more hand-offs)
C. One unit spanning both repositories
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. Can the frontend team start before the backend is finished?

A. Yes — the frontend unit builds against the agreed API contract and does not depend on the backend unit; both are integrated at the end (recommended: the teams work in parallel)
B. No — the frontend unit depends on the backend unit and starts once the backend is done
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Decomposition Plan (approved: Approve Plan)

- U1 `backend-auth` (kind: service, bulletin-board-backend): Accounts, Authentication, ownership in Ads; complexity M
- U2 `frontend-login` (kind: ui, bulletin-board-frontend): ApiClient, CurrentUser, AuthPanels, AdBoard; complexity M
- No dependency edge between U1 and U2; both build against the API contract and are integrated at the end

## Consolidated Summary Confirmation

- Two units, one per repository and team: a backend unit and a frontend unit [Q1]
- The frontend unit does not depend on the backend unit; both build in parallel against the agreed API contract and are integrated at the end [Q2]
- U1 `backend-auth` is a service in bulletin-board-backend (Accounts, Authentication, ad ownership); U2 `frontend-login` is a UI in bulletin-board-frontend (ApiClient, CurrentUser, AuthPanels, AdBoard) [plan]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
