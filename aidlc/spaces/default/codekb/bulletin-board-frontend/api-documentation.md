# API Documentation: bulletin-board-frontend

The frontend exposes no API of its own. This document records (1) the REST API it consumes from `bulletin-board-backend` and (2) its internal module API in `src/api.ts`.

## External API Consumed: bulletin-board-backend `/api/ads`

Base URL: `${VITE_API_BASE_URL ?? ''}/api/ads` (`src/api.ts` line 15). In development `VITE_API_BASE_URL` is unset, so requests are relative and the Vite dev server proxies `/api` to `http://localhost:8080` (`vite.config.ts`).

Common request behaviour (`request<T>()`, `src/api.ts` lines 17-27):

- Header `Content-Type: application/json` on every request (GET included); caller headers are merged after it.
- No `Authorization` header, no `credentials` option (browser default `same-origin`), no cookies set or read by the app.
- Success: any 2xx; the body is always parsed with `response.json()`.
- Failure: any non-2xx; the body is parsed as JSON if possible and `Error(body.detail)` is thrown, otherwise `Error("Request failed with status <status>")`.
- No timeout, retry, cancellation (`AbortController`) or request deduplication.

| Client function | Method and path | Request body | Success response | Errors surfaced | Auth |
|---|---|---|---|---|---|
| `listAds()` | `GET /api/ads` | none | `200` `Ad[]` | message shown as "Could not load ads: ..." in `App` | none |
| `createAd(input)` | `POST /api/ads` | `AdInput` JSON | `201 Created` + `Location` header, body `Ad` (Location not used) | `400` validation ProblemDetail -> shown under form | none |
| `updateAd(id, input)` | `PUT /api/ads/{id}` | `AdInput` JSON | `200` `Ad` | `404` "Ad {id} not found", `400` validation -> shown under form | none |

Backend endpoint present but NOT called by the frontend: `GET /api/ads/{id}` (single ad). The backend allows CORS methods `GET, POST, PUT` for the configured origins (default `http://localhost:5173`) and does not enable credentials; this matters only when the frontend is served from a different origin than the API.

### Data Contracts (`src/api.ts`)

```ts
interface Ad {
  id: number
  title: string
  description: string
  createdAt: string   // ISO-8601 timestamp from the backend
  updatedAt: string   // ISO-8601 timestamp from the backend
}

interface AdInput {
  title: string        // client: required, maxLength 100, trimmed
  description: string  // client: required, maxLength 2000, trimmed
}
```

Neither type carries an owner, author or permission field.

### Error Contract

Spring `ProblemDetail` (RFC 9457) JSON; the client reads only `detail`. Example used by the backend for an unknown id: `{"status":404,"detail":"Ad 7 not found", ...}`.

## Internal Module API (`src/api.ts`)

| Export | Signature | Used by |
|---|---|---|
| `Ad` | interface | `App.tsx`, `AdForm.tsx` |
| `AdInput` | interface | `App.tsx`, `AdForm.tsx` |
| `listAds` | `() => Promise<Ad[]>` | `App.tsx` (mount effect) |
| `createAd` | `(input: AdInput) => Promise<Ad>` | `App.tsx` `handleCreate` |
| `updateAd` | `(id: number, input: AdInput) => Promise<Ad>` | `App.tsx` `handleUpdate` |
| `request<T>` (not exported) | `(url: string, init?: RequestInit) => Promise<T>` | the three functions above |

## Component Props API

| Component | Props |
|---|---|
| `AdForm` | `ad?: Ad` (present = edit mode, prefilled, not cleared on success); `onSubmit: (input: AdInput) => Promise<void>` (required; rejections are shown as errors); `onCancel?: () => void` (shows a Cancel button) |
| `App` | none |
