# Business Overview: bulletin-board-backend

## Purpose

`bulletin-board-backend` is the REST API of a small bulletin board. People post short classified-style ads (a title and a description), browse the list of ads, open one ad, and edit an ad. The web UI lives in the separate `bulletin-board-frontend` repository (React/Vite) and calls this API from `http://localhost:5173`.

## Business Domain

- **Domain**: community bulletin board / classified ads.
- **Core entity**: the **Ad** — a title (required, up to 100 characters), a description (required, up to 2000 characters), and the times it was created and last updated.
- **Actors today**: a single anonymous actor. The API has no notion of a user, member, or author; every caller can do everything.

## Key Functionality

| Capability | How it works today | Endpoint |
|---|---|---|
| Browse ads | Returns every ad, newest first, in one response (no paging) | `GET /api/ads` |
| View one ad | Returns one ad by id; a missing id answers 404 with a problem-details body | `GET /api/ads/{id}` |
| Post an ad | Validates title and description, stores the ad, answers 201 with a `Location` header | `POST /api/ads` |
| Edit an ad | Replaces title and description of any existing ad; anyone may edit any ad | `PUT /api/ads/{id}` |

Not offered: deleting an ad, searching or filtering, categories, images, contact details, user accounts, login.

## Business Rules Implemented in Code

- An ad must have a non-blank title of at most 100 characters and a non-blank description of at most 2000 characters (`AdRequest`).
- The list is ordered by creation time, newest first (`AdRepository.findAllByOrderByCreatedAtDesc`).
- Creation and update timestamps are set by the server, never by the client (`Ad` lifecycle callbacks).
- Only the frontend origins configured in `app.cors.allowed-origins` may call the API from a browser.

## Data Lifetime

Data lives in an in-memory H2 database whose schema is created at startup and dropped at shutdown. Every restart starts with an empty board.

## Relevance to the Active Intent (261020-user-login)

The intent is to stop strangers from editing other people's ads by adding self sign-up, log in and log out, and ad ownership, while keeping browsing and viewing open to visitors. Today the backend has no users, no ad owner, and no access control on `POST` or `PUT`; see `architecture.md` and `code-quality-assessment.md` for the touch points. This document records the current state only; it does not design the login.
