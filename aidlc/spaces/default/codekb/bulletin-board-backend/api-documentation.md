# API Documentation: bulletin-board-backend

## Overview

- **Style**: REST over HTTP, JSON bodies.
- **Base URL (local)**: `http://localhost:8080`
- **Base path**: `/api/ads`
- **Implementation**: `com.example.bulletinboard.ad.AdController`
- **Authentication / authorization**: none on any endpoint.
- **Rate limiting / throttling**: none.
- **Versioning**: none (unversioned path).
- **Spec**: no OpenAPI document; the README table is the only published contract.
- **Errors**: RFC 9457 problem details (`application/problem+json`), enabled by `spring.mvc.problemdetails.enabled=true`.

## Data Contracts

### AdRequest (request body for POST and PUT)

| Field | Type | Rules |
|---|---|---|
| `title` | string | required, not blank, max 100 characters |
| `description` | string | required, not blank, max 2000 characters |

```json
{ "title": "Bike for sale", "description": "Almost new" }
```

### AdResponse

| Field | Type | Notes |
|---|---|---|
| `id` | number (long) | database identity |
| `title` | string | |
| `description` | string | |
| `createdAt` | string (ISO-8601 instant) | set by server on insert, never changes |
| `updatedAt` | string (ISO-8601 instant) | set by server on insert and on every update |

There is no owner, author, or permission field in the response.

### Problem detail (error body)

```json
{ "type": "about:blank", "title": "Not Found", "status": 404, "detail": "Ad 999 not found", "instance": "/api/ads/999" }
```

Illustrative shape: fields follow Spring's standard `ProblemDetail` rendering (exact presence of `type`/`instance` depends on the framework version and was not observed at runtime); `detail` text for not-found is `Ad {id} not found` (asserted in tests).

## Endpoints

### GET /api/ads

- **Purpose**: list all ads, newest first (`createdAt` descending).
- **Parameters**: none (no paging, filtering or sorting parameters).
- **Responses**: `200` with a JSON array of `AdResponse`.
- **Auth**: none.

### GET /api/ads/{id}

- **Path**: `id` (long).
- **Responses**: `200` `AdResponse`; `404` problem detail when no ad has that id; `400` when `id` is not a number (framework type-mismatch handling).
- **Auth**: none.

### POST /api/ads

- **Body**: `AdRequest` (`Content-Type: application/json`).
- **Responses**: `201 Created` with header `Location: <request URL>/{id}` and body `AdResponse`; `400` problem detail on validation failure or malformed JSON.
- **Auth**: none — any caller can create ads; no creator is recorded.

### PUT /api/ads/{id}

- **Semantics**: full replacement of `title` and `description` (both required).
- **Body**: `AdRequest`.
- **Responses**: `200` `AdResponse` (with refreshed `updatedAt`); `400` on validation failure; `404` when the ad does not exist.
- **Auth**: none — any caller can edit any ad.

### Not implemented

`DELETE /api/ads/{id}`, `PATCH`, search/filter endpoints, and any user, account, session, sign-up, login or logout endpoints.

## CORS Contract

Configured in `config/CorsConfig.java` for path pattern `/api/**`:

| Setting | Value |
|---|---|
| Allowed origins | `app.cors.allowed-origins` (comma-separated), default `http://localhost:5173` |
| Allowed methods | `GET`, `POST`, `PUT` |
| Allowed headers | Spring default (all requested headers) |
| Allow credentials | not set (false) — cookies are not accepted cross-origin by browsers |
| Exposed headers | not set — the `Location` header on 201 is not exposed to browser JavaScript |

## Non-Business Endpoints

| Path | Source | Exposure |
|---|---|---|
| `/h2-console` | `spring-boot-h2console`, `spring.h2.console.enabled=true` | Open, no auth; README documents user `sa` with empty password |
| `/error` | Spring Boot default | standard error fallback |

No Actuator endpoints are present.

## Internal APIs

Within the application, the only internal interface used across classes is `AdService` (`findAll`, `findById(long)`, `create(AdRequest)`, `update(long, AdRequest)`) and the Spring Data repository `AdRepository extends JpaRepository<Ad, Long>` with the derived query `findAllByOrderByCreatedAtDesc()`. See `component-inventory.md`.
