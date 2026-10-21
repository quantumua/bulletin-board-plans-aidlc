# Business Overview: bulletin-board-frontend

## Purpose

`bulletin-board-frontend` is the web user interface of the bulletin board. It lets anyone who opens the page see the list of ads, post a new ad, and edit any existing ad. It holds no data of its own: every ad is read from and written to the `bulletin-board-backend` REST API (`/api/ads`).

The README describes it as "Web UI for the bulletin board: add ads and edit existing ones."

## Business Domain

- **Ad**: a posting with a `title` (up to 100 characters) and a `description` (up to 2000 characters). The backend assigns an `id`, `createdAt` and `updatedAt`.
- There is no concept of a user, author, owner, account or session anywhere in the frontend.

## Key Functionality (as built today)

| Capability | Where | Who can use it today |
|---|---|---|
| Browse all ads (newest-first order comes from the backend; newly created ads are prepended locally) | `src/App.tsx` | Anyone |
| Post a new ad (title + description) | `src/App.tsx` "New ad" section, `src/AdForm.tsx` | Anyone |
| Edit any ad inline (title + description) | `src/App.tsx` "Edit" button, `src/AdForm.tsx` | Anyone, for every ad |
| See when an ad was last updated | `src/App.tsx` (`updatedAt`, local time format) | Anyone |
| View a single ad on its own page | Not implemented; ads are only shown inline in the list | n/a |
| Delete an ad | Not implemented (backend has no delete either) | n/a |

## Business Context for the Active Intent (261020-user-login)

The intent adds self sign-up, log in and log out, makes creating an ad require a login, and limits editing to the ad's creator. Relevant facts about today's frontend:

- The "New ad" form and every "Edit" button are rendered unconditionally (`src/App.tsx` lines 31-34 and 55-57), which is the visible side of the ownership gap the intent describes.
- The ad payload carries no owner information, so the UI cannot currently tell whose ad is whose.
- There is a single screen and no navigation, so sign-up and log-in screens have no existing place to live.

See `architecture.md` for the structure and `api-documentation.md` for the API contract.
