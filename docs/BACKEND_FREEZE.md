# BACKEND PROJECT FREEZE: Tuhfat al-Muhtaj Learning Platform

**Version:** 1.2 (IMMUTABLE)
**Date:** 2026-05-09
**Status:** APPROVED FOR EXECUTION
**Supersedes:** v1.1 (2026-04-30)
**Amending documents:** CR-001 (2026-05-09) · Vercel Upload Fix (2026-05-09)

> **CRITICAL INSTRUCTION FOR EXECUTION (HUMAN OR AI):**
> This document is the Absolute Source of Truth. You have NO authority to modify schema, API
> contracts, or scope defined below.
> If any request contradicts this document, you must REFUSE and open a Change Request instead.

---

## 0. Commercials

**Engagement Type:** Fixed-scope (self-built, no commercial engagement)
**Price:** $0 · **Timeline:** 2–3 weeks

**Assumptions (must be true before execution):**

- Permission from Sheikh Dr. Abdul Hakim Al-Sa'di confirmed before data entry.
- Internet Archive account + S3 keys obtained before upload testing begins.
- GitHub repository created with GITHUB_TOKEN (`repo` scope) before development.
- Upstash Redis free tier instance live before deployment.
- Vercel account linked to GitHub repo before deployment.

---

## 1. The "Iron Scope"

**Core Value Proposition:**

> A zero-cost, publicly accessible English/Arabic web platform that organizes and streams 648+ Tuhfat al-Muhtaj audio lessons by Sheikh Dr. Abdul Hakim Al-Sa'di, with chapter navigation, fuzzy search, and browser-persisted study progress. _(CR-001)_

**The 8 Backend User Stories:**

1. As a **visitor**, I can retrieve all lessons filtered by volume, kitab, bab, or fasl.
2. As a **visitor**, I can retrieve a single lesson by ID including its streaming URL.
3. As a **visitor**, I can search lessons by Arabic title keyword (server-side filtered).
4. As a **visitor**, GET /api/v1/lessons responses are cached at the CDN edge for 60 seconds.
5. As an **admin**, I can authenticate with a password to receive a signed HttpOnly session cookie.
6. As an **admin**, I can obtain a time-limited presigned PUT URL from the backend, then upload audio directly to Internet Archive from my browser — bypassing Vercel's payload limit entirely. _(Vercel Upload Fix)_
7. As an **admin**, I can create, update, or delete a lesson record (committing to GitHub lessons.json).
8. As an **admin**, I am rate-limited after 5 failed auth attempts per 15 minutes per IP.

**The "NO" List:**

- No user accounts, registration, or visitor login
- No cross-device progress sync (localStorage only)
- No comments, ratings, or social features
- No PDF text, video, or Telegram scraping
- No email/SMS/payment
- No multi-language beyond English (UI) + Arabic (lesson content). Malayalam removed. _(CR-001)_
- No mobile app, offline mode, PWA, or service workers
- No analytics dashboard, real-time features, WebSockets, multi-tenancy, or data warehouse
- No volumes 5–10 without content (Change Request required)
- No GraphQL, microservices
- No CORS — deployment is same-origin on Vercel. ALLOWED_ORIGINS removed. _(CR-001)_
- No `/api/docs` UI endpoint _(CR-001)_
- No server-proxied file upload through any Vercel route (6MB free-tier hard limit). _(Vercel Upload Fix)_
- No chunked/resumable upload protocol (presigned single-PUT is sufficient for single-admin use). _(Vercel Upload Fix)_

**Success Definition:**

- All 648 lessons browsable and streamable at launch
- p95 API latency < 200ms on Vercel serverless
- Lesson visible on site within 90 seconds of admin create/edit/delete (ISR revalidation)
- Zero 5xx on public GET routes under 50 concurrent users
- Auth lockout fires after 5 failed attempts per 15 min per IP
- Admin can upload 100MB+ audio without Vercel 413 errors _(Vercel Upload Fix)_

---

## 1.2 Assumptions & External Dependencies

**Dependency 1: Internet Archive (archive.org) S3-compatible API**

- Purpose: Audio file storage and CDN streaming (64.5GB total)
- Auth: AWS SigV4 via IA_ACCESS_KEY + IA_SECRET_KEY — **server-side only, never exposed to browser**
- Upload model: Backend generates presigned PUT URL. Client uploads directly to IA. Vercel never handles file bytes. _(Vercel Upload Fix)_
- **Known CORS risk:** `s3.us.archive.org` may not respond with `Access-Control-Allow-Origin` for browser PUT requests. If browser CORS blocks the XHR, a `curl`-based fallback UI is required — see §4 Fallback Upload Pattern.
- Failure (presign): If IA unreachable → backend 502. Admin retries.
- Failure (streaming): Browser shows native audio error. Site metadata remains functional. No fallback storage.

**Dependency 2: GitHub Contents API (api.github.com)**

- Purpose: lessons.json read/write (CMS data layer)
- Auth: GITHUB_TOKEN (Bearer, `repo` scope)
- Failure: GET /lessons falls back to ISR cached version. Admin writes → 502, retry required. No data loss.

**Operational Assumptions:**

- Hosting: Vercel free tier. Audio: Internet Archive. Data: GitHub JSON. Rate-limiting: Upstash Redis.
- Scale: ~500 DAU, <5 RPS sustained, <20 RPS burst. Single admin operator.

---

## 1.5 System Configuration

```bash
# .env.example — single canonical copy (no duplication)
# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api/v1"
NODE_ENV="development"

# Admin Auth (iron-session)
ADMIN_PASSWORD="min_16_chars_required_here"
SESSION_SECRET="min_32_chars_required_for_iron_session"
SESSION_MAX_AGE_SECONDS=86400

# GitHub CMS
GITHUB_TOKEN="ghp_your_personal_access_token"
GITHUB_REPO_OWNER="your_github_username"
GITHUB_REPO_NAME="tuhfa-learning-platform"
GITHUB_FILE_PATH="data/lessons.json"
GITHUB_BRANCH="main"

# Internet Archive S3-compatible API
IA_ACCESS_KEY="your_ia_access_key"
IA_SECRET_KEY="your_ia_secret_key"
IA_COLLECTION_IDENTIFIER="tuhfat-al-muhtaj-abdulhakim-saadi"
IA_S3_ENDPOINT="https://s3.us.archive.org"
UPLOAD_PRESIGN_EXPIRY_SECONDS=900

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_upstash_token"

# ISR Revalidation (server-side only — NEVER in NEXT_PUBLIC_* vars)
REVALIDATION_SECRET="min_32_chars_revalidation_token"

# Vercel Speed Insights (optional)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=""
```

**Rules:**

- `ADMIN_PASSWORD` ≥ 16 chars · `SESSION_SECRET` ≥ 32 chars · `REVALIDATION_SECRET` ≥ 32 chars — all Zod-enforced at startup.
- `IA_ACCESS_KEY`, `IA_SECRET_KEY`: server-side only. The presigned URL contains a time-limited SigV4 signature — not the raw keys.
- `UPLOAD_PRESIGN_EXPIRY_SECONDS`: default 900 (15 min). Admin must complete upload before expiry.
- `ALLOWED_ORIGINS`: **not present** — removed entirely. _(CR-001)_
- No secrets committed to version control. `.env.local` gitignored.
- API timeout: 10,000ms. Presign timeout: 5,000ms (no file I/O involved).

---

## 1.6 Tech Stack & Key Libraries

**Core Stack (LOCKED):**

| Layer | Choice |
|---|---|
| Language | TypeScript 5.x |
| Runtime | Node.js 22 LTS |
| React | **19.x** (required by Next.js 16) _(CR-001)_ |
| Framework | Next.js 16 (App Router, serverless functions) |
| Data store | GitHub JSON file via GitHub Contents API |
| Validation | `zod` |
| Auth | `iron-session` + `crypto.timingSafeEqual` |
| Rate limiting | `@upstash/ratelimit` + `@upstash/redis` |
| Upload | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (presign only — no file transfer) _(Vercel Upload Fix)_ |
| Logging | `pino` |
| Testing | `vitest` + `@testing-library/react` |

**Explicitly Banned:**

- No Prisma/Drizzle/TypeORM (no database)
- No GraphQL
- No `any` TypeScript type — ESLint `no-explicit-any: error` _(CR-001)_
- No `console.log` in production
- No plain-text password storage
- No committing `.env.local`
- No `next lint` (removed in Next.js 16 — use `eslint src/`)
- No `middleware.ts` (renamed to `proxy.ts` in Next.js 16)
- No `formidable` — banned entirely _(CR-001 + Vercel Upload Fix)_
- No `allowJs: true` in tsconfig _(CR-001)_
- No `ignoreDeprecations` in tsconfig _(CR-001)_
- No server-proxied file upload route _(Vercel Upload Fix)_
- No `Buffer.concat` accumulation of upload bytes _(CR-001)_
- No revalidation secret in URL query strings _(CR-001)_

---

## 2. Data Layer

**Data Store:** GitHub-hosted JSON file — `data/lessons.json`

```typescript
// Root (lessons.json)
{
  "version": 1,
  "last_updated": "2026-04-20T00:00:00Z",  // ISO 8601 UTC — updated on every write
  "lessons": [Lesson]
}

// Lesson
{
  "id": 1,                    // integer, auto-incremented, globally unique, never reused
  "volume": 1,                // integer ∈ {1,2,3,4}
  "lesson_number": 1,         // integer > 0, unique within volume
  "title_ar": "...",          // string, non-empty, Arabic lesson title
  "chapter": {
    "kitab": "...",           // string, non-empty
    "bab": "..." | null,
    "fasl": null | "..."
  },
  "duration_seconds": 3720,   // integer > 0
  "upload_date": "2023-01-15",// ISO 8601 date string (YYYY-MM-DD)
  "archive_url": "https://archive.org/download/{IA_COLLECTION_IDENTIFIER}/{filename}",
  "telegram_post_id": 12      // integer > 0
}
```

**Invariants (all application-enforced):**

- `id` = `max(existing ids) + 1`. Never client-supplied.
- `lesson_number` unique per `volume`. Checked before GitHub commit.
- `archive_url` must begin with `https://archive.org/download/`. Zod-enforced.
- `volume` ∈ {1,2,3,4}. Zod-enforced.
- `lessons` always sorted `volume ASC, lesson_number ASC` after every write.
- GitHub PUT always uses current SHA (optimistic lock → 409 on conflict).

**Delete:** Hard delete only. No soft delete. No restore.

---

## 2.1 Transactions, Concurrency, Idempotency

**Transactions by flow:**

- **Add lesson:** Validate → (audio already on IA via presign) → Fetch JSON + SHA → Check uniqueness → Append → Sort → PUT to GitHub.
- **Update lesson:** Validate → Fetch + SHA → Replace → PUT.
- **Delete lesson:** Fetch + SHA → Filter → PUT.
- SHA conflict (409 from GitHub) → return 409 `CONCURRENT_EDIT_CONFLICT` → admin retries.

**Presign idempotency:** Same `volume` + `lesson_number` → same IA filename. Re-presigning generates a fresh URL for the same key. IA PUT by key = idempotent overwrite.

**Lesson writes:** Not idempotent. Frontend disables submit after first click.

---

## 3. API Contract

**Protocol:** REST · **Base:** `/api/v1` · **Auth:** `iron-session` HttpOnly cookie `tuhfa_session`
**All request/response bodies:** `application/json` _(multipart/form-data removed — Vercel Upload Fix)_

**Global Error Format (LOCKED):**

```json
{
  "error": { "code": "ERROR_CODE", "message": "Human-readable English message", "details": {} },
  "requestId": "uuid-v4",
  "timestamp": "ISO8601"
}
```

**Status codes:** 200, 201, 204, 400, 401, 404, 409, 413 (client-enforced only), 422, 429, 500, 502.

**Pagination:** `limit` (1–200, default 50), `offset` (≥0, default 0). `meta.total` = total matching records before slice. Frontend uses `Math.ceil(meta.total / limit)` for `totalPages`. _(CR-001)_

**Rate limits:**

| Endpoint group | Limit |
|---|---|
| Public (GET /lessons, GET /lessons/[id]) | 120 req/min/IP |
| Admin auth (POST /admin/auth) | 5 req/15min/IP |
| Admin writes (CRUD) | 60 req/min/IP |
| Upload presign | 10 req/hour/IP _(Vercel Upload Fix)_ |

---

### Endpoints (ALL — MVP)

---

#### GET /api/v1/lessons

**Auth:** No | **Query params:** `volume`, `kitab`, `bab`, `fasl`, `search` (min 2/max 100), `limit`, `offset`

**Response 200:**
```json
{
  "data": { "lessons": [Lesson] },
  "meta": { "total": 648, "limit": 50, "offset": 0, "requestId": "...", "timestamp": "..." }
}
```

**Caching:** `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
`github.ts` fetch uses `{ next: { tags: ['lessons'] } }` on every call. _(CR-001)_
**Errors:** 400, 422, 429, 500, 502

---

#### GET /api/v1/lessons/[id]

**Auth:** No | **Response 200:** `{ "data": { "lesson": Lesson }, "meta": { ... } }`
**Errors:** 400 (non-integer id), 404, 429, 500, 502

---

#### POST /api/v1/admin/auth

**Auth:** No | **Body:** `{ "password": string }` (min 1, max 128)
**Response 200:** `{ "data": { "authenticated": true }, "meta": { ... } }`
**Side effect:** Sets `tuhfa_session` cookie (HttpOnly, Secure, SameSite=Strict, Max-Age=86400)
**Errors:** 401, 422, 429 (5/15min/IP), 500

---

#### POST /api/v1/admin/upload/presign _(new — replaces POST /api/v1/admin/upload — Vercel Upload Fix)_

**Auth:** Yes | **Body:**
```json
{ "volume": 1, "lesson_number": 214, "content_type": "audio/mpeg" }
```
- `volume`: integer ∈ {1,2,3,4} — required
- `lesson_number`: integer > 0 — required
- `content_type`: string — optional, default `"audio/mpeg"`, must be one of `audio/mpeg | audio/mp4 | audio/ogg | audio/wav`

**Response 200:**
```json
{
  "data": {
    "presigned_url": "https://s3.us.archive.org/{bucket}/{filename}?X-Amz-Algorithm=...&X-Amz-Signature=...",
    "archive_url": "https://archive.org/download/{IA_COLLECTION_IDENTIFIER}/{filename}",
    "filename": "lesson-v1-214.mp3",
    "expires_in": 900,
    "method": "PUT",
    "required_headers": { "Content-Type": "audio/mpeg" }
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Implementation:** `getSignedUrl(s3Client, new PutObjectCommand({ Bucket, Key, ContentType, Metadata }), { expiresIn })` from `@aws-sdk/s3-request-presigner`. Backend never touches the file.
**Client usage:**
1. XHR `PUT presigned_url` with body = file binary and header `Content-Type` from `required_headers`.
2. `xhr.upload.onprogress` → progress bar.
3. XHR 200 → advance to lesson form with `archive_url` pre-filled.
4. XHR CORS error (status 0) → show fallback UI (see §4).

> ⚠️ **CORS Risk:** `s3.us.archive.org` may not respond with `Access-Control-Allow-Origin` for browser XHR PUT. If this occurs the fallback pattern in §4 must be presented to the admin.

**Errors:** 400 (invalid body), 401, 422, 429 (10/hr/IP), 502 (IA unreachable at presign time)

---

#### POST /api/v1/admin/lessons

**Auth:** Yes | **Body:** All lesson fields except `id` (server-assigned).
**Response 201:** `{ "data": { "lesson": Lesson }, "meta": { ... } }`
**Side effects:** GitHub commit → `triggerRevalidation()` (fire-and-forget POST /api/revalidate)
**Errors:** 401, 409 (duplicate lesson_number OR SHA conflict), 422, 429, 500, 502

---

#### PUT /api/v1/admin/lessons/[id]

**Auth:** Yes | **Body:** Any subset of mutable fields. `id`, `volume`, `lesson_number` immutable.
**Response 200:** `{ "data": { "lesson": Lesson }, "meta": { ... } }`
**Side effects:** GitHub commit → `triggerRevalidation()`
**Errors:** 400, 401, 404, 409, 422, 429, 500, 502

---

#### DELETE /api/v1/admin/lessons/[id]

**Auth:** Yes | **Response 204:** No body.
**Side effects:** GitHub commit → `triggerRevalidation()`
**Errors:** 400, 401, 404, 409, 429, 500, 502

---

#### POST /api/revalidate _(internal — not in public OpenAPI)_

**Method:** POST only → 405 on any other method. _(CR-001)_
**Auth:** `Authorization: Bearer {REVALIDATION_SECRET}` header → 401 if missing/wrong. _(CR-001)_
**Replay protection:** `X-Revalidate-Nonce` header (timestamp ms as string) → 401 if absent or `Date.now() - parseInt(nonce) > 60000`. _(CR-001)_
**Effect:** `revalidateTag('lessons')` — **single string argument only.** _(CR-001)_
**Response 200:** `{ "data": { "revalidated": true }, "meta": { ... } }`
**Caller:** `triggerRevalidation()` in `src/utils/revalidate.ts` — fire-and-forget, never awaited.

---

## 4. Critical Business Logic

### Flow: Admin Authentication

```
1. Parse body (Zod): { password: string }
2. Check auth rate limit: 5/15min/IP → 429 if exceeded
3. crypto.timingSafeEqual(Buffer.from(input), Buffer.from(ADMIN_PASSWORD)) → 401 if false
4. Create iron-session: { authenticated: true, createdAt: Date.now() }
5. Set tuhfa_session cookie: HttpOnly, Secure, SameSite=Strict, Max-Age=86400
6. Return 200
```

### Flow: Admin Authorization (proxy.ts)

```
For /api/v1/admin/* (except POST /api/v1/admin/auth):
  1. Deserialize iron-session from request cookie
  2. If absent or invalid signature → 401
  3. If session.authenticated !== true → 401
  4. If Date.now() - session.createdAt > SESSION_MAX_AGE_SECONDS * 1000 → 401 (expired)
  5. Allow request

For /admin/* page routes (except /admin/login):          [CR-001]
  1. Same full iron-session deserialization + authenticated check + expiry check
  2. If invalid or expired → redirect to /admin/login
  PROHIBITED: Cookie name presence alone is NOT sufficient for page routes.

applyCorsHeaders() / getAllowedOrigins(): REMOVED. CORS is not used.  [CR-001]
```

### Flow: Generate Presigned Upload URL _(Vercel Upload Fix)_

```
1. Parse body (Zod): { volume ∈ {1,2,3,4}, lesson_number > 0, content_type? }
2. Check presign rate limit: 10/hr/IP → 429 if exceeded
3. Resolve content_type = body.content_type || "audio/mpeg"
4. Validate content_type ∈ allowed set → 422 if not
5. filename = `lesson-v${volume}-${String(lesson_number).padStart(3, '0')}.mp3`
6. presigned_url = getSignedUrl(s3Client,
     new PutObjectCommand({
       Bucket: env.IA_COLLECTION_IDENTIFIER,
       Key: filename,
       ContentType: content_type,
       Metadata: { volume: String(volume), lesson_number: String(lesson_number) },
     }),
     { expiresIn: env.UPLOAD_PRESIGN_EXPIRY_SECONDS }
   )
   → If IA S3 unreachable: return 502
7. archive_url = `https://archive.org/download/${env.IA_COLLECTION_IDENTIFIER}/${filename}`
8. Log: { action: 'upload.presign', volume, lesson_number, filename, expires_in }
   NEVER log: presigned_url (contains SigV4 signature)
9. Return 200 { presigned_url, archive_url, filename, expires_in: env.UPLOAD_PRESIGN_EXPIRY_SECONDS,
               method: 'PUT', required_headers: { 'Content-Type': content_type } }
```

> The server never receives or buffers file bytes. The presigned URL embeds a
> time-limited SigV4 signature. IA_ACCESS_KEY and IA_SECRET_KEY never leave the server.

### Client Upload via Presigned URL (frontend contract — documented here for handoff clarity)

```
Step 1 — Request presign:
  POST /api/v1/admin/upload/presign { volume, lesson_number, content_type }
  ← { presigned_url, archive_url, required_headers, expires_in }

Step 2 — Upload directly to IA via XHR:
  xhr.open('PUT', presigned_url)
  xhr.setRequestHeader('Content-Type', required_headers['Content-Type'])
  xhr.upload.onprogress = (e) => updateProgressBar(e.loaded / e.total)
  xhr.send(file)                   // file = File object from <input type="file">
  xhr.timeout = expires_in * 1000  // abort if takes longer than presign window

Step 3 — XHR status 200:
  → Advance wizard to Step 2, archive_url pre-filled in form.

Step 4 — XHR status 0 (CORS error — see Fallback Pattern below)

Step 5 — XHR status 403 (presigned URL expired):
  → Toast "Upload URL expired — please request a new one." → Reset to Step 1.
```

### Fallback Upload Pattern (IA CORS failure) _(Vercel Upload Fix)_

> If `xhr.onerror` fires with `xhr.status === 0`, the IA S3 endpoint rejected the
> browser request via CORS. Display the following admin UI:

```
1. Show inline warning (English):
   "Direct upload is blocked by your browser's security policy.
    Use the command below in your terminal instead."

2. Show a "Copy command" button that copies to clipboard:
   curl -X PUT "{presigned_url}" \
     -H "Content-Type: audio/mpeg" \
     --data-binary @/path/to/your-file.mp3

3. Show a "I uploaded successfully" button.
   When clicked → advance wizard to Step 2 with archive_url pre-populated.
   (archive_url was already returned in the presign response — no server callback needed.)

4. Show a "Request new upload URL" link in case the presign expires during curl.
```

> This fallback requires zero backend changes. archive_url is deterministic and
> known at presign time regardless of whether the upload used XHR or curl.

### Flow: Create Lesson

```
1. Validate body (Zod LessonCreateSchema)
2. Check admin write rate limit (60/min/IP)
3. Fetch lessons.json + SHA from GitHub
   (fetch call includes: next: { tags: ['lessons'] })    [CR-001]
   → 502 if GitHub unreachable
4. Check uniqueness: volume + lesson_number → 409 DUPLICATE_LESSON_NUMBER if found
5. id = max(existing ids) + 1
6. Append new lesson, sort (volume ASC, lesson_number ASC), update last_updated
7. PUT to GitHub with current SHA
   → 409 CONCURRENT_EDIT_CONFLICT if SHA stale
   → 502 if GitHub unreachable
8. triggerRevalidation()          // fire-and-forget — never await
9. Return 201 with new lesson
```

### Revalidation Helper _(CR-001)_

```typescript
// src/utils/revalidate.ts
export function triggerRevalidation(): void {
  fetch(`${env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.REVALIDATION_SECRET}`,
      'X-Revalidate-Nonce': Date.now().toString(),
    },
  }).catch(() => {});  // fire-and-forget — errors silently discarded
}
```

---

## 5. Integrations & Failure Behavior

**Internet Archive S3 API**

- Backend role: presign generation only — never file transfer.
- Presign timeout: 5,000ms. No retry on presign failure (admin retries manually).
- CORS status for browser PUT: unverified at freeze time. Fallback pattern defined in §4.
- IA PUT is idempotent by key. Same filename = overwrite.

**GitHub Contents API**

- Timeout: 10,000ms. Retry: 1× after 1,000ms on 5xx. No retry on 409.
- Rate: 5,000 req/hr authenticated (well within limits at <10 admin writes/day).

---

## 6. Observability, Audit, Safety

**Logging (pino, structured JSON):**

Required fields: `requestId`, `route`, `method`, `statusCode`, `latencyMs`, `timestamp`.
Admin routes also log: `action` (e.g. `lesson.create`, `upload.presign`).

**PII / Secret rules — NEVER log:**
`ADMIN_PASSWORD`, `SESSION_SECRET`, `GITHUB_TOKEN`, `IA_ACCESS_KEY`, `IA_SECRET_KEY`,
`REVALIDATION_SECRET`, `presigned_url` (contains SigV4 signature), cookie values.

**Audit:** GitHub commit history is the immutable lesson audit trail.

---

## 7. Acceptance Criteria

### Phase 1 — Foundation

- [ ] `data/lessons.json` committed with correct root schema
- [ ] `.env.example`: single canonical block, ALLOWED_ORIGINS absent, `UPLOAD_PRESIGN_EXPIRY_SECONDS` present _(CR-001 + Vercel Upload Fix)_
- [ ] App boots; all env vars validated at startup (Zod)
- [ ] POST /api/v1/admin/auth: correct → 200 + cookie; wrong → 401; 6th attempt/15min → 429

### Phase 2 — Core API

- [ ] GET /api/v1/lessons: 200, `meta.total` present and correct, all filters work (volume, kitab, bab, fasl, search) _(CR-001)_
- [ ] GET /api/v1/lessons/[id]: 200 or 404
- [ ] POST /api/v1/admin/upload/presign: 200 with `presigned_url`, `archive_url`, `filename` _(Vercel Upload Fix)_
- [ ] Presigned URL verified functional: `curl -X PUT {presigned_url} --data-binary @test.mp3` → IA file present
- [ ] XHR browser upload to presigned_url succeeds (if IA CORS allows) _(Vercel Upload Fix)_
- [ ] CORS fallback UI displays correctly on `xhr.status === 0` _(Vercel Upload Fix)_
- [ ] POST /api/v1/admin/lessons → 201; GitHub lessons.json updated; ISR revalidation triggered
- [ ] PUT /api/v1/admin/lessons/[id] → 200; revalidation triggered
- [ ] DELETE /api/v1/admin/lessons/[id] → 204; revalidation triggered
- [ ] All admin routes: missing/invalid/expired cookie → 401
- [ ] Duplicate lesson_number within volume → 409

### Phase 3 — Reliability & Security

- [ ] Rate limits enforced on all routes including presign (10/hr/IP) _(Vercel Upload Fix)_
- [ ] POST /api/revalidate: GET → 405; no Bearer → 401; stale nonce → 401; valid → 200 _(CR-001)_
- [ ] `revalidateTag('lessons')` single argument; github.ts fetch uses `next: { tags: ['lessons'] }` _(CR-001)_
- [ ] proxy.ts page-route guard: full iron-session validation (not cookie-presence) _(CR-001)_
- [ ] Production CSP: no `unsafe-inline`, no `unsafe-eval`, no Google Fonts domains _(CR-001)_
- [ ] IA_ACCESS_KEY, IA_SECRET_KEY absent from all client-readable responses and logs _(Vercel Upload Fix)_
- [ ] presigned_url absent from server logs _(Vercel Upload Fix)_
- [ ] No secrets or stack traces in any error response
- [ ] Session cookie: HttpOnly, Secure, SameSite=Strict in production
- [ ] ESLint `no-explicit-any: error` — zero violations _(CR-001)_
- [ ] tsconfig: `allowJs` absent, `ignoreDeprecations` absent _(CR-001)_
- [ ] No `formidable` in package.json or node_modules _(CR-001 + Vercel Upload Fix)_

### Phase 4 — Deployment Proof

- [ ] Vercel production: GET /api/v1/lessons → 200
- [ ] Admin uploads 100MB+ file to production via presigned URL — no Vercel 413 error _(Vercel Upload Fix)_
- [ ] Lesson visible on site within 90 seconds of create/edit/delete
- [ ] README: no `/api/docs` reference; smoke test list updated _(CR-001)_

---

## 8. Project Structure

```text
/
├── .env.example                  ← single canonical copy; ALLOWED_ORIGINS absent;
│                                    UPLOAD_PRESIGN_EXPIRY_SECONDS present
├── .env.local                    ← gitignored
├── package.json                  ← react@^19, react-dom@^19, @types/react@^19
│                                    @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
│                                    formidable: ABSENT
├── tsconfig.json                 ← strict; allowJs: absent; ignoreDeprecations: absent
├── next.config.js                ← split CSP (nonce prod / relaxed dev); no font CDN domains
├── eslint.config.mjs             ← no-explicit-any: error, no-unused-vars: error, no-empty: error
├── README.md                     ← no /api/docs reference
├── /data
│   └── lessons.json
├── /src
│   ├── proxy.ts                  ← full iron-session validation: /api/v1/admin/* AND /admin/* pages
│   │                                applyCorsHeaders() REMOVED; ALLOWED_ORIGINS REMOVED
│   ├── /app
│   │   ├── layout.tsx            ← lang="en"; system fonts; NO Google Fonts link or preconnect
│   │   └── /api
│   │       ├── /revalidate
│   │       │   └── route.ts     ← POST only; Authorization: Bearer; X-Revalidate-Nonce;
│   │       │                       revalidateTag('lessons') — single argument
│   │       └── /v1
│   │           ├── /lessons
│   │           │   ├── route.ts ← GET; meta.total; fasl filter supported
│   │           │   └── /[id]/route.ts
│   │           └── /admin
│   │               ├── /auth/route.ts
│   │               ├── /lessons
│   │               │   ├── route.ts     ← POST; triggerRevalidation()
│   │               │   └── /[id]/route.ts ← PUT, DELETE; triggerRevalidation()
│   │               └── /upload
│   │                   └── /presign
│   │                       └── route.ts ← POST only; no file bytes; getSignedUrl()
│   │                                       (old /upload/route.ts: DELETED)
│   ├── /config
│   │   ├── env.ts               ← Zod; ALLOWED_ORIGINS ABSENT; UPLOAD_PRESIGN_EXPIRY_SECONDS present
│   │   └── session.ts
│   ├── /lib
│   │   ├── github.ts            ← all fetch() calls: next: { tags: ['lessons'] }
│   │   ├── internet-archive.ts  ← generatePresignedUrl() ONLY; uploadToIA() DELETED; no Buffer.concat
│   │   ├── rate-limit.ts        ← checkPresignRateLimit (10/hr) + auth + public + admin helpers
│   │   └── logger.ts
│   ├── /schemas
│   │   ├── lesson.schema.ts
│   │   ├── lesson-query.schema.ts  ← includes fasl field
│   │   └── auth.schema.ts
│   ├── /types
│   │   ├── lesson.ts
│   │   └── api.ts
│   └── /utils
│       ├── response.ts
│       ├── request-id.ts
│       └── revalidate.ts        ← triggerRevalidation(): POST + Bearer + Nonce; fire-and-forget
└── /tests
    ├── /unit
    ├── /integration
    └── /contract
```

---

## 9. Non-Functional Constraints

**Performance:**

- p95 API latency: < 200ms
- Error rate: < 1% on public GET routes
- Presign endpoint: < 1s (no file I/O)
- Upload: No Vercel timeout — Vercel never handles the bytes _(Vercel Upload Fix)_

**Security (LOCKED):**

- Password: `crypto.timingSafeEqual` (constant-time comparison)
- Session: `iron-session` — HttpOnly, Secure, SameSite=Strict
- Upload credentials: IA_ACCESS_KEY and IA_SECRET_KEY server-side only. Presigned URL contains time-limited SigV4 signature — NOT the raw keys. _(Vercel Upload Fix)_
- CORS: Same-origin only. ALLOWED_ORIGINS removed. No CORS headers. _(CR-001)_
- CSP (production): No `unsafe-inline`, no `unsafe-eval`. Nonce-based `script-src` + `strict-dynamic`. No Google Fonts domains. Dev policy relaxed for HMR. _(CR-001)_
- Admin proxy: Full iron-session validation (authenticated + createdAt + expiry) for both API and page routes. _(CR-001)_
- Revalidation: `Authorization: Bearer` header + nonce only. Never in URL. _(CR-001)_
- ESLint `no-explicit-any: error`. _(CR-001)_

**Budget:** $0 total — Vercel free, Upstash free, Internet Archive free, GitHub free.

---

## 10. Deployment, Rollback, DR

**Deploy:** Push to `main` → Vercel auto-deploys.
**Environments:** development (local), preview (Vercel per PR), production (main).
**Rollback:** Code → Vercel dashboard → previous deployment → Promote. Data → GitHub revert on `data/lessons.json`.
**RPO:** 0 min (GitHub history). **RTO:** < 5 min (Vercel rollback).

---

## 11. Forbidden Changes (Scope Lock)

**BANNED without a new Freeze version:**

- Add user accounts, visitor auth, or any database
- Switch from GitHub JSON to any other data store
- Add integrations beyond Internet Archive and GitHub
- Change auth model (iron-session is locked)
- Change pagination model (offset-based is locked)
- Add volumes 5–10 without existing content
- Add real-time features, WebSockets, analytics dashboard
- Re-add `formidable` or any server-side multipart parsing _(CR-001 + Vercel Upload Fix)_
- Re-add server-proxied upload route through Vercel _(Vercel Upload Fix)_
- Re-add `ALLOWED_ORIGINS` or cross-origin CORS _(CR-001)_
- Re-add revalidation secret in URL query string _(CR-001)_
- Revert admin page guard to cookie-presence check _(CR-001)_
- Re-add `unsafe-inline` or `unsafe-eval` to production CSP _(CR-001)_
- Add Malayalam content or strings _(CR-001)_
- Re-add chunked/resumable upload protocol (out of scope — single presigned PUT only) _(Vercel Upload Fix)_

---

## 12. OpenAPI Impact _(version bump required)_

The upload change requires **OpenAPI v1.0.1**:

| Change | v1.0.0 | v1.0.1 |
|---|---|---|
| `POST /api/v1/admin/upload` | `multipart/form-data` | **Removed** |
| `POST /api/v1/admin/upload/presign` | Does not exist | **Added** (JSON in, presign response out) |
| GET /lessons `meta` | `requestId`, `timestamp` | + `meta.total` (required integer) _(CR-001)_ |

Frontend Freeze and build-plan must reference **OpenAPI v1.0.1** after this document is applied.

---

## 13. Change Control

**Format:** Requested change / Reason / Scope impact / Timeline impact / Cost impact / Risk impact / Decision / New Freeze version.
**Response SLA:** 7 days.

---

## 14. Copilot Handoff

**Execute tasks in this exact order. Do not proceed until current task checkpoint passes.**

---

**TASK 1 — React 19 upgrade + formidable removal**
```
Files: package.json
Set:   react@^19.0.0, react-dom@^19.0.0, @types/react@^19.0.0, @types/react-dom@^19.0.0
Add:   @aws-sdk/s3-request-presigner
Remove: formidable (and @types/formidable if present)
Delete: src/types/formidable.d.ts (if exists)
Run:   npm install
Check: package.json shows react@19.x; formidable absent from dependencies and node_modules
```

---

**TASK 2 — tsconfig**
```
File:   tsconfig.json
Remove: "allowJs": true
Remove: "ignoreDeprecations": "5.0" (or any value)
Run:    npx tsc --noEmit
Check:  Zero errors
```

---

**TASK 3 — ESLint**
```
File:  eslint.config.mjs
Set:   "@typescript-eslint/no-explicit-any": "error"
Set:   "@typescript-eslint/no-unused-vars": "error"
Set:   "no-empty": "error"
Run:   eslint src/
Check: Zero violations (fix any as any casts revealed)
```

---

**TASK 4 — env.ts**
```
File:   src/config/env.ts
Remove: ALLOWED_ORIGINS from Zod schema and any getAllowedOrigins() export
Add:    UPLOAD_PRESIGN_EXPIRY_SECONDS: z.coerce.number().int().positive().default(900)
Check:  Unit test env.test.ts passes; ALLOWED_ORIGINS throws at import if accidentally set
```

---

**TASK 5 — .env.example**
```
File:   .env.example
Action: Replace entire file with the canonical single block from §1.5.
        ALLOWED_ORIGINS line: ABSENT
        UPLOAD_PRESIGN_EXPIRY_SECONDS=900: PRESENT
Check:  Single block only; no duplicate headers
```

---

**TASK 6 — proxy.ts**
```
File:   src/proxy.ts
Action: Replace cookie-presence check for /admin/* page routes with:
          const session = await getIronSession(request, response, sessionOptions)
          if (!session.authenticated || Date.now() - session.createdAt > expiry) redirect
        Remove getAllowedOrigins(), applyCorsHeaders(), and all call sites.
        Confirm /api/v1/admin/* path already does full validation (it does per existing code).
Check:  proxy.test.ts — fabricated cookie value → redirect; expired session → redirect;
        valid session → pass; missing cookie → redirect
```

---

**TASK 7 — github.ts (cache tags)**
```
File:   src/lib/github.ts
Action: Add `next: { tags: ['lessons'] }` to every fetch() call inside fetchLessons()
        and any other function that fetches lessons.json content.
        Example: fetch(url, { headers, next: { tags: ['lessons'] } })
Check:  Unit test — fetch mock called with next.tags containing 'lessons'
```

---

**TASK 8 — internet-archive.ts (presign only)**
```
File:   src/lib/internet-archive.ts
Action: DELETE uploadToIA() function and all Buffer.concat / chunk accumulation code.
        ADD generatePresignedUrl(volume, lesson_number, contentType, expiresIn):
          - Creates S3Client pointing to IA_S3_ENDPOINT with IA credentials
          - Calls getSignedUrl(client, PutObjectCommand({Bucket, Key, ContentType, Metadata}), {expiresIn})
          - Returns { presigned_url, archive_url, filename, expires_in, method: 'PUT',
                      required_headers: { 'Content-Type': contentType } }
Check:  Unit test with mocked s3Client — returns correct shape; no real IA call
```

---

**TASK 9 — rate-limit.ts (presign limiter)**
```
File:   src/lib/rate-limit.ts
Action: Add checkPresignRateLimit(headers): 10 requests / 1 hour / IP
        (same pattern as existing checkAuthRateLimit)
Check:  Unit test — 10 requests pass; 11th returns { success: false, retryAfter }
```

---

**TASK 10 — upload/presign route (NEW)**
```
File:   src/app/api/v1/admin/upload/presign/route.ts  ← CREATE THIS FILE
Delete: src/app/api/v1/admin/upload/route.ts          ← DELETE OLD FILE
Action: POST handler only.
        Parse body (Zod): { volume, lesson_number, content_type? }
        Call checkPresignRateLimit(request.headers) → 429 if exceeded
        Resolve contentType = body.content_type ?? 'audio/mpeg'
        Validate contentType ∈ allowed set → 422 if invalid
        Call generatePresignedUrl(volume, lesson_number, contentType, env.UPLOAD_PRESIGN_EXPIRY_SECONDS)
        Log { action: 'upload.presign', volume, lesson_number, filename } — NOT presigned_url
        Return 200 with presign data
Check:  Integration test — 200 with correct shape; 401 without session; 429 after 10 calls/hr
```

---

**TASK 11 — revalidate/route.ts**
```
File:   src/app/api/revalidate/route.ts
Action: Change export function GET → export function POST.
        Add: export function GET() { return NextResponse.json({error:{code:'METHOD_NOT_ALLOWED'}}, {status:405}) }
        Read secret: const auth = request.headers.get('Authorization')
                     if (auth !== `Bearer ${env.REVALIDATION_SECRET}`) return 401
        Read nonce:  const nonce = request.headers.get('X-Revalidate-Nonce')
                     if (!nonce || Date.now() - parseInt(nonce) > 60000) return 401
        Call:        revalidateTag('lessons')   ← single argument only
        Return 200 { revalidated: true }
Check:  GET → 405; no auth → 401; stale nonce → 401; valid POST → 200
```

---

**TASK 12 — revalidate.ts helper (NEW)**
```
File:   src/utils/revalidate.ts  ← CREATE
Action: Export triggerRevalidation():
          fetch(`${env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.REVALIDATION_SECRET}`,
              'X-Revalidate-Nonce': Date.now().toString(),
            },
          }).catch(() => {})      // fire-and-forget — never await
Check:  Unit test — fetch called with POST method and correct headers
```

---

**TASK 13 — Admin mutation routes (revalidation)**
```
Files:  src/app/api/v1/admin/lessons/route.ts
        src/app/api/v1/admin/lessons/[id]/route.ts
Action: Remove fireAndForgetRevalidate() function (builds GET URL with searchParams secret).
        Import triggerRevalidation from '@/utils/revalidate'.
        Call triggerRevalidation() after each successful GitHub PUT — fire-and-forget.
Check:  Integration tests pass; confirm revalidation call uses POST (not GET)
```

---

**TASK 14 — lesson-query.schema.ts (fasl filter)**
```
File:   src/schemas/lesson-query.schema.ts (or wherever LessonListQuerySchema is defined)
Action: Add fasl: z.string().optional() to the schema.
        Pass fasl through filterAndPaginate() for exact-match filtering on chapter.fasl.
Check:  GET /api/v1/lessons?fasl=someValue filters correctly
```

---

**TASK 15 — next.config.js (split CSP)**
```
File:   next.config.js
Action: Generate nonce per-request (crypto.randomUUID() or equivalent).
        Production CSP (NODE_ENV === 'production'):
          script-src: 'self' 'nonce-{NONCE}' 'strict-dynamic'
          style-src:  'self' 'nonce-{NONCE}'
          font-src:   'self'
          media-src:  https://archive.org
          connect-src: 'self'
          frame-ancestors: 'none'
          NO: unsafe-inline, unsafe-eval, fonts.googleapis.com, fonts.gstatic.com
        Development CSP:
          script-src: 'self' 'unsafe-inline' 'unsafe-eval'
          style-src:  'self' 'unsafe-inline'
          connect-src: 'self' ws:
          font-src:   'self'
          media-src:  https://archive.org
          frame-ancestors: 'none'
        Keep: X-Frame-Options: DENY
Check:  Production build response headers — no unsafe-inline in script-src.
        Development — HMR works without CSP errors.
```

---

**TASK 16 — layout.tsx + fonts**
```
File:   src/app/layout.tsx
Action: Change <html lang="ar"> → <html lang="en">
        Remove any <link rel="preconnect"> to fonts.googleapis.com or fonts.gstatic.com
        Remove any Google Fonts stylesheet <link> elements
File:   src/app/globals.css
Action: Replace Inter or any named Google Font in font-family with system-ui stack
File:   tailwind.config.ts
Action: Set fontFamily.sans = ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
        Set fontFamily.arabic = ['Noto Naskh Arabic', 'Traditional Arabic', 'Arabic Typesetting', 'Geeza Pro', 'serif']
        Remove: noto-sans-malayalam, inter, or any Google Font name
Check:  Production build network tab — zero requests to fonts.googleapis.com or fonts.gstatic.com
        <html> element has lang="en"
```

---

**TASK 17 — LessonBrowser + useLessons (totalPages + Malayalam)**
```
File:   src/hooks/useLessons.ts
Action: Expose meta.total from useFilteredLessons return value.
File:   src/features/lessons/LessonBrowser.tsx
Action: Compute totalPages = Math.ceil(meta.total / LIMIT) — from API meta.total, not currentPage.
        Remove the Malayalam string from empty-state (line with ഉ...).
        Replace with English: "No matching lessons" + Arabic sub-label dir="rtl" lang="ar".
Check:  useLessons.test.tsx passes; LessonBrowser renders without Malayalam; totalPages correct.
```

---

**TASK 18 — README**
```
File:   README.md
Action: Remove all /api/docs references.
        Update smoke test checklist to reflect POST /api/revalidate and presign endpoint.
Check:  grep -r "/api/docs" README.md returns empty.
```

---

**TASK 19 — Full gate**
```
Run:    npx tsc --noEmit
Run:    eslint src/
Run:    vitest run
Run:    next build
Check:  All pass. Zero TypeScript errors. Zero ESLint violations. Zero test failures.
        Build completes without webpack/Turbopack errors.
```

---

## 15. Version History

- **v1.2 (2026-05-09):** CR-001 + Vercel Upload Fix applied simultaneously. Upload architecture rewritten: `POST /api/v1/admin/upload` (multipart, formidable, server proxy) → `POST /api/v1/admin/upload/presign` (JSON in, presigned PUT URL out; client uploads directly to IA; Vercel never handles bytes). `@aws-sdk/s3-request-presigner` added. `formidable` removed and banned. IA CORS fallback (curl command UI) defined in §4. `generatePresignedUrl()` replaces `uploadToIA()` in `internet-archive.ts`. `UPLOAD_PRESIGN_EXPIRY_SECONDS` env var added. Revalidation: GET+querystring → POST+`Authorization: Bearer`+`X-Revalidate-Nonce`. `revalidateTag('lessons')` single argument. Admin page proxy upgraded to full iron-session validation. `github.ts`: `next: { tags: ['lessons'] }` on all fetches. `meta.total` required in GET /lessons. `fasl` filter added to query schema. CSP: nonce-based prod / relaxed dev; Google Fonts domains removed. `ALLOWED_ORIGINS` and `applyCorsHeaders()` removed. React 18 → 19. ESLint `no-explicit-any: error`. tsconfig: `allowJs` and `ignoreDeprecations` removed. `.env.example`: single canonical copy. Language: English/Arabic, Malayalam removed. OpenAPI bump to v1.0.1 required (§12). 19 Copilot tasks defined.
- **v1.1 (2026-04-30):** Stack corrections. Node.js 20 → 22 LTS. Next.js 14 → 16. proxy.ts added. next lint banned.
- **v1.0 (2026-04-20):** Initial freeze.
