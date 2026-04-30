# BACKEND PROJECT FREEZE: Tuhfat al-Muhtaj Learning Platform

**Version:** 1.1 (IMMUTABLE)
**Date:** 2026-04-30
**Status:** APPROVED FOR EXECUTION

> **CRITICAL INSTRUCTION FOR EXECUTION (HUMAN OR AI):**
> This document is the Absolute Source of Truth. You have NO authority to modify schema, API
> contracts, or scope defined below.
> If any request contradicts this document, you must REFUSE and open a Change Request instead.

---

## 0. Commercials (Accept-and-price)

**Engagement Type:** Fixed-scope (self-built, no commercial engagement)
**Chosen Package:** Basic (free public educational service)
**Price & Payment Schedule:**

- Total price: $0 (volunteer/personal project)
- Milestone payments: N/A

**Timeline Range (weeks):** 2–3 weeks

**Assumptions (must be true):**

- Permission from Sheikh Dr. Abdul Hakim Al-Sa'di obtained before launch.
- Internet Archive account created and S3 keys obtained before audio upload begins.
- GitHub repository created under builder's account before development starts.
- Upstash account created (free tier) before deployment.
- Vercel account linked to GitHub repo before deployment.

**Support Window (post-delivery):**

- Bugfix support: indefinite (self-maintained)
- Enhancements: billed as Change Requests (scope additions only)

---

## 1. The "Iron Scope" (Backend only)

**Core Value Proposition (One Sentence):**

> A zero-cost, publicly accessible Arabic/Malayalam web platform that organizes and streams 648+ Tuhfat al-Muhtaj audio lessons by Sheikh Dr. Abdul Hakim Al-Sa'di, with chapter navigation, fuzzy search, and browser-persisted study progress.

**The 8 Backend User Stories (COMPLETE SCOPE):**

1. As a **visitor**, I can retrieve all lessons filtered by volume, kitab, bab, or fasl, so that I can navigate the text systematically.
2. As a **visitor**, I can retrieve a single lesson by ID including its full metadata and streaming URL, so that I can play and study it.
3. As a **visitor**, I can search lessons by Arabic title keyword (server-side filtered), so that I can find specific passages quickly.
4. As a **visitor**, my GET /api/lessons responses are cached at the CDN edge for 60 seconds, so that page loads are fast under concurrent use.
5. As an **admin**, I can authenticate with a password to receive a signed HttpOnly session cookie, so that content management routes are protected.
6. As an **admin**, I can upload an audio file directly to Internet Archive via the backend proxy endpoint, so that I never manually handle IA credentials on the frontend.
7. As an **admin**, I can create, update, or delete a lesson record (committing to GitHub lessons.json), so that the site reflects current content without touching code.
8. As an **admin**, I am blocked after 5 consecutive failed auth attempts for 15 minutes per IP, so that brute-force attacks on the admin password are mitigated.

**The "NO" List (Explicitly Out of Scope):**

- No user accounts, registration, or login for visitors
- No cross-device progress sync (progress is localStorage only)
- No comments, discussion, or social features
- No PDF text of Tuhfat al-Muhtaj
- No video content
- No email/SMS notifications of any kind
- No payment or donation processing
- No multi-language beyond Arabic + Malayalam UI
- No mobile app (web only)
- No offline mode or PWA service workers
- No analytics dashboard or usage reporting
- No automated Telegram scraping or bot integration
- No real-time features or WebSockets
- No multi-tenancy
- No data warehouse or analytics pipeline
- No volumes 5–10 until content exists (Change Request required)
- No GraphQL
- No microservices

**User Roles (Backend authorization truth):**

- **Visitor (unauthenticated):** Read-only access to GET /api/lessons and GET /api/lessons/[id]. No write access. No session required.
- **Admin (password-authenticated):** Full access to all /api/admin/\* routes after successful auth. Session cookie required. Single admin only — no role hierarchy.

**Success Definition (measurable):**

- All 648 existing lessons browsable and streamable at launch
- p95 API response latency < 200ms on Vercel serverless (measured via Vercel Analytics)
- Admin panel: lesson add/edit/delete completes and reflects on site within 90 seconds (GitHub commit + Vercel ISR revalidation)
- Zero 5xx errors on public read routes under 50 concurrent users
- Admin auth lockout triggers correctly after 5 failed attempts within 15 minutes per IP

---

## 1.2 Assumptions & External Dependencies

**External Systems (2):**

- **Dependency 1:** Internet Archive (archive.org) S3-compatible API
  - Purpose: Permanent free audio file storage and streaming (64.5GB total)
  - Auth: AWS S3-compatible keys (IA_ACCESS_KEY + IA_SECRET_KEY)
  - Failure mode: If IA is unreachable, audio streams fail but the site remains browsable (metadata still loads). No fallback storage. Admin upload fails with 502 and must be retried.
- **Dependency 2:** GitHub Contents API (api.github.com)
  - Purpose: lessons.json read/write (the CMS data layer)
  - Auth: GitHub Personal Access Token (GITHUB_TOKEN) with `repo` scope
  - Failure mode: If GitHub API is unreachable, GET /api/lessons falls back to the last Vercel build-time cached version. Admin write operations fail with 502 and must be retried. No data loss as Vercel serves stale cache.

**Operational Assumptions:**

- Hosting: Vercel free tier (serverless functions, Edge Middleware, CDN)
- Audio storage: Internet Archive (no cost, no retention limit)
- Lessons data: GitHub repository JSON file (`/data/lessons.json`)
- Data retention: Indefinite (no purge policy — educational archive)
- Expected user scale: ~500 DAU peak, <5 RPS sustained, <20 RPS burst
- Admin/support operations: Single admin (project owner) manages all content additions

---

## 1.5 System Configuration (The Environment)

```bash
# .env.example — Tuhfat al-Muhtaj Platform
# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
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

# Rate Limiting (Upstash Redis free tier)
UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_upstash_token"

# CORS
ALLOWED_ORIGINS="http://localhost:3000"

# ISR Revalidation
REVALIDATION_SECRET="min_32_chars_revalidation_token"
```

**Configuration Rules:**

- `ADMIN_PASSWORD` >= 16 characters. Enforced at startup via Zod config validation.
- `SESSION_SECRET` >= 32 characters. Enforced at startup via Zod config validation.
- `NODE_ENV` ∈ {development, test, production}.
- `GITHUB_TOKEN` must have `repo` scope (read + write to target repository).
- `IA_ACCESS_KEY` and `IA_SECRET_KEY` must be valid Internet Archive S3 keys.
- `UPSTASH_REDIS_REST_URL` must be a valid HTTPS URL.
- All secrets must never be committed to version control. `.env.local` is gitignored.
- API request timeout: 10,000ms. IA upload timeout: 300,000ms (large files).

---

## 1.6 Tech Stack & Key Libraries (Backend toolbelt)

**Core Stack:**

- **Language/Runtime:** TypeScript 5.x + Node.js 22 LTS
- **Framework:** Next.js 16 (App Router) — API routes as serverless functions
- **Data Store:** GitHub JSON file (`data/lessons.json`) via GitHub Contents API
- **Validation:** `zod` (all API input/output schemas)
- **Auth:** `iron-session` (HttpOnly cookie sessions) + bcrypt-free (plain constant-time comparison via `crypto.timingSafeEqual`)
- **Rate Limiting:** `@upstash/ratelimit` + `@upstash/redis`
- **File Upload:** `@aws-sdk/client-s3` (IA is S3-compatible) + `formidable` for multipart parsing
- **OpenAPI:** `zod-to-openapi` + `swagger-ui-react` at `/api/docs`

**Critical Packages (exact names):**

- Config validation: `zod`
- Session: `iron-session`
- Rate limiting: `@upstash/ratelimit`, `@upstash/redis`
- S3 upload: `@aws-sdk/client-s3`
- Multipart: `formidable`
- Logging: `pino` (structured JSON logs via Pino)
- Testing: `vitest` + `@testing-library/react` + `msw` (mock service worker for API mocking)
- Linting: `eslint` + `@typescript-eslint/eslint-plugin`
- Type checking: `tsc --noEmit` (strict mode)

**Explicitly Banned Libraries/Patterns:**

- No Prisma, Drizzle, TypeORM, or any ORM (no SQL database exists)
- No GraphQL (REST only)
- No microservices (single Next.js monorepo)
- No DB triggers (no database)
- No `any` TypeScript type (strict mode enforced)
- No `console.log` in production (use pino logger only)
- No storing admin password in plain text (use `crypto.timingSafeEqual` for comparison)
- No committing `.env.local` or any secrets file
- No `next lint` command (removed in Next.js 16 — use `eslint` CLI directly: `eslint src/`)
- No `middleware.ts` (renamed to `proxy.ts` in Next.js 16 — see Section 8)

---

## 2. Data Layer (Schema Truth)

**Data Store Type:** GitHub-hosted JSON file (no SQL database)
**File path in repo:** `data/lessons.json`
**Access method:** GitHub Contents API (REST) with GITHUB_TOKEN

```typescript
// RULES:
// 1) This is the ONLY data schema. No other persistent storage exists.
// 2) No placeholders. Every field is required unless explicitly marked optional.
// 3) Uniqueness: id is globally unique. lesson_number is unique per volume.
// 4) All timestamps are ISO 8601 UTC strings.
// 5) The root object MUST contain version, last_updated, and lessons array.

// Root schema (lessons.json)
{
  "version": 1,                          // Integer. Increment on breaking schema changes.
  "last_updated": "2026-04-20T00:00:00Z", // ISO 8601 UTC. Updated on every write.
  "lessons": [Lesson]                    // Array of Lesson objects. May be empty.
}

// Lesson object schema
{
  "id": 1,                               // Integer. Auto-incremented. Globally unique. Never reused.
  "volume": 1,                           // Integer. ∈ {1, 2, 3, 4}.
  "lesson_number": 1,                    // Integer > 0. Unique within volume.
  "title_ar": "قول المصنف: ...",          // String. Non-empty. Arabic passage title as posted on Telegram.
  "chapter": {
    "kitab": "كتاب الطهارة",              // String. Non-empty. Top-level book chapter.
    "bab": "باب الماء",                  // String or null. Sub-chapter.
    "fasl": null                          // String or null. Sub-sub-chapter.
  },
  "duration_seconds": 3720,              // Integer > 0. Audio duration in seconds.
  "upload_date": "2023-01-15",           // String. ISO 8601 date (YYYY-MM-DD). Date posted to Telegram.
  "archive_url": "https://archive.org/download/tuhfat-al-muhtaj-abdulhakim-saadi/lesson-v1-001.mp3",
                                         // String. Valid HTTPS URL. Must be reachable before lesson is saved.
  "telegram_post_id": 12                 // Integer > 0. Telegram message ID for reference.
}
```

**Data Invariants (application-enforced):**

- `id` is assigned by the backend as `max(existing ids) + 1`. Never client-supplied.
- `lesson_number` must be unique within its `volume`. Enforced before GitHub commit.
- `archive_url` must begin with `https://archive.org/download/`. Enforced by Zod.
- `volume` must be ∈ {1, 2, 3, 4}. Enforced by Zod.
- `duration_seconds` must be > 0. Enforced by Zod.
- `title_ar` must be non-empty string after trim. Enforced by Zod.
- `chapter.kitab` must be non-empty string after trim. Enforced by Zod.
- The `lessons` array is always sorted by `volume ASC, lesson_number ASC` after every write.
- The GitHub file is updated atomically using the SHA-based optimistic lock (GitHub Contents API requires current file SHA for PUT — this is the built-in concurrency mechanism).

**Soft & Hard Delete Rules (explicit):**

- Lesson: soft delete — NO. Hard delete — YES. Retention window — none (permanent deletion). Restore rules — none (admin must re-add manually). Rationale: educational archive, lessons are never "suspended" — they either exist or don't.
- Deletion removes the lesson object from the array and recommits the full JSON file to GitHub.

---

## 2.1 Transactions, Concurrency, Idempotency

**Transaction boundaries (by workflow):**

- **Add lesson:** (1) Validate input, (2) Upload audio to IA, (3) Fetch current lessons.json + SHA from GitHub, (4) Append new lesson, (5) PUT updated file to GitHub using SHA. If step 5 fails with 409 (SHA conflict), return 409 to admin and require retry. Audio file already uploaded to IA is left as-is (orphaned file — acceptable).
- **Update lesson:** (1) Validate input, (2) Fetch current lessons.json + SHA, (3) Replace lesson object, (4) PUT to GitHub using SHA. No file upload involved.
- **Delete lesson:** (1) Fetch current lessons.json + SHA, (2) Filter out lesson, (3) PUT to GitHub using SHA.

**Concurrency strategy:**

- GitHub Contents API PUT requires the current file's SHA. If two admin writes occur simultaneously, the second will receive a 409 conflict from GitHub. The backend forwards this as a 409 to the admin client with message "Concurrent edit conflict — please retry." This is optimistic concurrency via GitHub's native SHA mechanism.
- No advisory locks needed (single admin, low write frequency).

**Idempotency strategy:**

- Audio upload to Internet Archive: IA S3 PUT is idempotent by key (filename). Re-uploading the same filename overwrites silently. Admin is responsible for unique filenames (enforced by naming convention: `lesson-v{volume}-{lesson_number_padded}.mp3`).
- Lesson metadata writes: Not idempotent (each POST /api/admin/lessons creates a new record). Admin must not double-submit — frontend disables submit button after first click until response received.
- No Idempotency-Key header needed (single admin, no distributed clients).

---

## 3. API Contract (Backend truth)

**Protocol:** REST
**Base Path:** `/api`
**Versioning:** URI-based (`/api/v1`) — all routes prefixed `/api/v1`
**Auth Mechanism:** `iron-session` HttpOnly cookie (`tuhfa_session`). Set on POST /api/v1/admin/auth. Required for all /api/v1/admin/\* routes.
**Request Content-Type:** `application/json` (except POST /api/v1/admin/upload which is `multipart/form-data`)
**Response Content-Type:** `application/json`

**Global Error Response Format (LOCKED):**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message in English",
    "details": {}
  },
  "requestId": "uuid-v4",
  "timestamp": "2026-04-20T10:00:00.000Z"
}
```

**Common Status Codes (allowed):**

- 200 (success with body), 201 (created), 204 (success no body)
- 400 (bad request / validation failure), 401 (unauthenticated), 403 (forbidden)
- 404 (not found), 409 (conflict — SHA race or duplicate lesson_number in volume)
- 422 (unprocessable — Zod validation failure with field details)
- 429 (rate limited)
- 500 (internal server error — no stack traces in response)
- 502 (upstream dependency failure — GitHub API or Internet Archive unreachable)

**Pagination Standard:**

- GET /api/v1/lessons supports `limit` (default: 50, max: 200) and `offset` (default: 0) query params.
- Cursor-based pagination: NOT used (dataset is static JSON, offset is sufficient).

**Rate limits:**

- Public endpoints (GET /api/v1/lessons, GET /api/v1/lessons/[id]): 120 requests/minute/IP
- Admin auth endpoint (POST /api/v1/admin/auth): 5 requests/15 minutes/IP
- Admin write endpoints (POST/PUT/DELETE /api/v1/admin/\*): 60 requests/minute/IP
- Upload endpoint (POST /api/v1/admin/upload): 10 requests/hour/IP

---

### Endpoints (MVP only — ALL listed)

---

#### GET /api/v1/lessons

- **Purpose:** List all lessons with optional filtering and pagination.
- **Auth required:** No
- **Query params:**
  - `volume`: Integer (1–4) | Optional — filter by volume
  - `kitab`: String | Optional — exact match on chapter.kitab
  - `bab`: String | Optional — exact match on chapter.bab
  - `search`: String (min 2 chars, max 100 chars) | Optional — substring match on title_ar
  - `limit`: Integer (1–200, default 50) | Optional
  - `offset`: Integer (≥0, default 0) | Optional
- **Request body:** None
- **Response 200:**

```json
{
  "data": {
    "lessons": [
      {
        "id": 1,
        "volume": 1,
        "lesson_number": 1,
        "title_ar": "قول المصنف: باب في أحكام الطهارة",
        "chapter": {
          "kitab": "كتاب الطهارة",
          "bab": "باب الماء",
          "fasl": null
        },
        "duration_seconds": 3720,
        "upload_date": "2023-01-15",
        "archive_url": "https://archive.org/download/tuhfat-al-muhtaj-abdulhakim-saadi/lesson-v1-001.mp3",
        "telegram_post_id": 12
      }
    ]
  },
  "meta": {
    "total": 648,
    "limit": 50,
    "offset": 0,
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "timestamp": "2026-04-20T10:00:00.000Z"
  }
}
```

- **Errors:** 400 (invalid query param), 422 (validation failure), 429 (rate limited), 500, 502

---

#### GET /api/v1/lessons/[id]

- **Purpose:** Retrieve a single lesson by its integer ID.
- **Auth required:** No
- **Path params:** `id` — positive integer
- **Query params:** None
- **Request body:** None
- **Response 200:**

```json
{
  "data": {
    "lesson": {
      "id": 1,
      "volume": 1,
      "lesson_number": 1,
      "title_ar": "قول المصنف: باب في أحكام الطهارة",
      "chapter": {
        "kitab": "كتاب الطهارة",
        "bab": "باب الماء",
        "fasl": null
      },
      "duration_seconds": 3720,
      "upload_date": "2023-01-15",
      "archive_url": "https://archive.org/download/tuhfat-al-muhtaj-abdulhakim-saadi/lesson-v1-001.mp3",
      "telegram_post_id": 12
    }
  },
  "meta": {
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "timestamp": "2026-04-20T10:00:00.000Z"
  }
}
```

- **Errors:** 400 (id not integer), 404 (lesson not found), 429, 500, 502

---

#### POST /api/v1/admin/auth

- **Purpose:** Authenticate admin with password. Sets HttpOnly session cookie on success.
- **Auth required:** No (this IS the auth endpoint)
- **Query params:** None
- **Request body schema (strict):**
  - `password`: String | Required | min 1 char | max 128 chars

```json
{ "password": "your_admin_password" }
```

- **Response 200:**

```json
{
  "data": {
    "authenticated": true
  },
  "meta": {
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "timestamp": "2026-04-20T10:00:00.000Z"
  }
}
```

- **Side effect:** Sets `Set-Cookie: tuhfa_session=<iron-session-token>; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
- **Errors:** 401 (wrong password), 422 (missing password field), 429 (rate limited — 5 attempts/15min/IP), 500

---

#### POST /api/v1/admin/lessons

- **Purpose:** Create a new lesson record in lessons.json via GitHub API.
- **Auth required:** Yes (Admin session cookie)
- **Query params:** None
- **Request body schema (strict):**
  - `volume`: Integer ∈ {1,2,3,4} | Required
  - `lesson_number`: Integer > 0 | Required | must be unique within volume
  - `title_ar`: String | Required | non-empty after trim | max 500 chars
  - `chapter.kitab`: String | Required | non-empty after trim | max 200 chars
  - `chapter.bab`: String or null | Required (nullable)
  - `chapter.fasl`: String or null | Required (nullable)
  - `duration_seconds`: Integer > 0 | Required
  - `upload_date`: String | Required | format YYYY-MM-DD
  - `archive_url`: String | Required | must start with `https://archive.org/download/`
  - `telegram_post_id`: Integer > 0 | Required

```json
{
  "volume": 1,
  "lesson_number": 214,
  "title_ar": "قول المصنف: فصل في أحكام الغسل",
  "chapter": {
    "kitab": "كتاب الطهارة",
    "bab": "باب الغسل",
    "fasl": "فصل في موجبات الغسل"
  },
  "duration_seconds": 4200,
  "upload_date": "2026-04-01",
  "archive_url": "https://archive.org/download/tuhfat-al-muhtaj-abdulhakim-saadi/lesson-v1-214.mp3",
  "telegram_post_id": 679
}
```

- **Response 201:**

```json
{
  "data": {
    "lesson": {
      "id": 649,
      "volume": 1,
      "lesson_number": 214,
      "title_ar": "قول المصنف: فصل في أحكام الغسل",
      "chapter": {
        "kitab": "كتاب الطهارة",
        "bab": "باب الغسل",
        "fasl": "فصل في موجبات الغسل"
      },
      "duration_seconds": 4200,
      "upload_date": "2026-04-01",
      "archive_url": "https://archive.org/download/tuhfat-al-muhtaj-abdulhakim-saadi/lesson-v1-214.mp3",
      "telegram_post_id": 679
    }
  },
  "meta": {
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "timestamp": "2026-04-20T10:00:00.000Z"
  }
}
```

- **Errors:** 401, 409 (duplicate lesson_number in volume OR GitHub SHA conflict), 422 (Zod validation — field-level details in error.details), 429, 500, 502

---

#### PUT /api/v1/admin/lessons/[id]

- **Purpose:** Update metadata of an existing lesson in lessons.json.
- **Auth required:** Yes (Admin session cookie)
- **Path params:** `id` — positive integer
- **Query params:** None
- **Request body schema (strict):** Same fields as POST but ALL are Optional. Only provided fields are updated. `id`, `volume`, `lesson_number` cannot be changed (immutable identifiers). Submit only the fields that changed.

```json
{
  "title_ar": "قول المصنف: فصل في أحكام الغسل — مراجعة",
  "duration_seconds": 4350
}
```

- **Response 200:**

```json
{
  "data": {
    "lesson": {
      "id": 649,
      "volume": 1,
      "lesson_number": 214,
      "title_ar": "قول المصنف: فصل في أحكام الغسل — مراجعة",
      "chapter": {
        "kitab": "كتاب الطهارة",
        "bab": "باب الغسل",
        "fasl": "فصل في موجبات الغسل"
      },
      "duration_seconds": 4350,
      "upload_date": "2026-04-01",
      "archive_url": "https://archive.org/download/tuhfat-al-muhtaj-abdulhakim-saadi/lesson-v1-214.mp3",
      "telegram_post_id": 679
    }
  },
  "meta": {
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "timestamp": "2026-04-20T10:00:00.000Z"
  }
}
```

- **Errors:** 400 (id not integer), 401, 404 (lesson not found), 409 (GitHub SHA conflict — retry), 422, 429, 500, 502

---

#### DELETE /api/v1/admin/lessons/[id]

- **Purpose:** Permanently remove a lesson from lessons.json.
- **Auth required:** Yes (Admin session cookie)
- **Path params:** `id` — positive integer
- **Query params:** None
- **Request body:** None
- **Response 204:** No body
- **Errors:** 400, 401, 404, 409 (GitHub SHA conflict), 429, 500, 502

---

#### POST /api/v1/admin/upload

- **Purpose:** Upload an audio file to Internet Archive via backend proxy. Returns the archive_url for use in lesson creation.
- **Auth required:** Yes (Admin session cookie)
- **Content-Type:** `multipart/form-data`
- **Request body (form fields):**
  - `file`: Binary audio file | Required | max 500MB | accepted MIME: audio/mpeg, audio/mp4, audio/ogg, audio/wav
  - `volume`: String (integer string) ∈ {"1","2","3","4"} | Required
  - `lesson_number`: String (integer string) > 0 | Required — used to generate filename `lesson-v{volume}-{lesson_number_padded3}.mp3`
- **Response 200:**

```json
{
  "data": {
    "archive_url": "https://archive.org/download/tuhfat-al-muhtaj-abdulhakim-saadi/lesson-v1-214.mp3",
    "filename": "lesson-v1-214.mp3",
    "size_bytes": 104857600
  },
  "meta": {
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "timestamp": "2026-04-20T10:00:00.000Z"
  }
}
```

- **Errors:** 400 (missing file or invalid fields), 401, 413 (file too large >500MB), 422, 429, 500, 502 (IA unreachable)

---

## 4. Critical Business Logic (Pseudocode only)

### Flow: Admin Authentication

```
1. Parse request body with Zod: { password: string }
2. Check Upstash rate limit: key="auth:IP", limit=5, window=15min
   → If rate limit exceeded: return 429
3. Load ADMIN_PASSWORD from env
4. Use crypto.timingSafeEqual(Buffer.from(input), Buffer.from(ADMIN_PASSWORD))
   → If false: increment failure counter in Upstash (for logging)
   → Return 401 with generic message "Invalid credentials"
5. If true: create iron-session with { authenticated: true, createdAt: Date.now() }
6. Set session cookie: HttpOnly, Secure, SameSite=Strict, Max-Age=86400
7. Return 200 { authenticated: true }
```

### Flow: Admin Authorization (Middleware)

```
1. For every request to /api/v1/admin/* (except POST /api/v1/admin/auth):
2. Read iron-session cookie from request
3. If no cookie or invalid signature: return 401
4. If session.authenticated !== true: return 401
5. If Date.now() - session.createdAt > SESSION_MAX_AGE_SECONDS * 1000: return 401 (expired)
6. Allow request to proceed
```

### Flow: Create Lesson (Most failure-prone workflow)

```
1. Validate request body with Zod LessonCreateSchema
   → On failure: return 422 with field-level error details
2. Check admin session (middleware already ran)
3. Fetch lessons.json from GitHub API:
   GET /repos/{owner}/{repo}/contents/{path}
   → Extract: content (base64), sha
   → If GitHub unreachable: return 502
4. Decode base64 → parse JSON → validate schema version matches expected version
5. Check uniqueness: does any existing lesson have same volume + lesson_number?
   → If yes: return 409 { code: "DUPLICATE_LESSON_NUMBER" }
6. Assign new id = max(existing ids) + 1 (or 1 if empty)
7. Build new lesson object with all validated fields
8. Append to lessons array
9. Sort lessons array: volume ASC, lesson_number ASC
10. Update root: last_updated = now ISO string
11. Serialize to JSON (2-space indent for readability)
12. Base64-encode the JSON string
13. PUT to GitHub Contents API:
    { message: "Add lesson v{volume} #{lesson_number}", content: base64, sha: sha }
    → If 409 from GitHub (SHA conflict): return 409 { code: "CONCURRENT_EDIT_CONFLICT" }
    → If GitHub unreachable: return 502
14. Trigger ISR revalidation via the revalidation route handler:
    fetch(`/api/revalidate?secret={REVALIDATION_SECRET}&path=/lessons`)
    (fire-and-forget — do not block response on this)
    Note: The /api/revalidate handler must call revalidateTag with a cacheLife profile
    (Next.js 16 requirement): revalidateTag('lessons', 'minutes')
    Single-argument revalidateTag is deprecated and throws a TypeScript error in Next.js 16.
15. Return 201 with new lesson object
```

### Flow: Audio Upload to Internet Archive

```
1. Parse multipart form with formidable (max 500MB)
   → On size exceeded: return 413
2. Validate: file present, volume valid, lesson_number valid
3. Generate filename: lesson-v{volume}-{padStart(lesson_number, 3, '0')}.mp3
4. Initialize S3Client with:
   endpoint: IA_S3_ENDPOINT
   credentials: { accessKeyId: IA_ACCESS_KEY, secretAccessKey: IA_SECRET_KEY }
   region: "us-east-1" (required by SDK, ignored by IA)
5. PutObjectCommand:
   Bucket: IA_COLLECTION_IDENTIFIER
   Key: filename
   Body: file stream
   ContentType: "audio/mpeg"
   Metadata: { volume, lesson_number }
6. Set upload timeout: 300,000ms
   → On timeout or IA error: return 502 { code: "UPLOAD_FAILED" }
7. Construct archive_url:
   "https://archive.org/download/{IA_COLLECTION_IDENTIFIER}/{filename}"
8. Delete temp file from /tmp (formidable temp storage)
9. Return 200 with { archive_url, filename, size_bytes }
```

---

## 5. Integrations & Failure Behavior

**Integration: Internet Archive S3 API**

- Purpose: Audio file storage and streaming (permanent, free, 64.5GB+)
- Auth method: AWS S3 Signature V4 (via @aws-sdk/client-s3)
- Endpoint: `https://s3.us.archive.org`
- Upload timeout: 300,000ms (5 minutes — large files)
- Read timeout: 10,000ms
- Retries/backoff: No automatic retry (upload is too large). Admin retries manually if 502.
- Circuit breaker: OFF (low write frequency — single admin, manual process)
- Idempotency: S3 PUT is idempotent by key. Same filename = overwrite. Guaranteed by IA.
- Webhook verification: N/A
- Data reconciliation job: N/A (IA is write-once archive storage)

**Integration: GitHub Contents API**

- Purpose: lessons.json read/write (CMS data layer)
- Auth method: Bearer token (GITHUB_TOKEN in Authorization header)
- Base URL: `https://api.github.com`
- Request timeout: 10,000ms
- Retries/backoff: 1 retry after 1,000ms delay on 5xx from GitHub. No retry on 409.
- Circuit breaker: OFF (admin writes are infrequent, manual retry is acceptable)
- Idempotency: Guaranteed by GitHub SHA-based optimistic lock
- Rate limit: 5,000 requests/hour for authenticated requests (PAT). Well within limits at <10 writes/day.

---

## 6. Observability, Audit, Safety

**Logging (structured JSON via pino):**

- Required fields on every log line: `requestId`, `route`, `method`, `statusCode`, `latencyMs`, `timestamp`
- On authenticated admin routes: also log `action` (e.g., "lesson.create", "lesson.delete")
- PII rules: **NEVER log** ADMIN_PASSWORD, SESSION_SECRET, GITHUB_TOKEN, IA_ACCESS_KEY, IA_SECRET_KEY, REVALIDATION_SECRET, cookie values, or any env variable value.

**Audit log:**

- All admin write operations (POST/PUT/DELETE /api/v1/admin/lessons, POST /api/v1/admin/upload) are logged to pino at INFO level with fields: `action`, `lessonId` (if applicable), `volume`, `lesson_number`, `requestId`, `timestamp`.
- GitHub commit history serves as immutable audit trail for all lessons.json changes.
- Immutable: YES (GitHub commit history cannot be silently altered)
- Retention: indefinite (GitHub history)

**Metrics (via Vercel Analytics — free tier):**

- RPS per route (Vercel built-in)
- p95 latency per route (Vercel built-in)
- Error rate per route (Vercel built-in)
- Rate limit trigger count (logged to pino, visible in Vercel log drain)

**Alerts:**

- 5xx error rate > 1% over 5 minutes → Admin reviews Vercel function logs manually
- GitHub API 401 (token expired) → Pino ERROR log → Admin rotates GITHUB_TOKEN in Vercel env
- IA upload 502 repeated → Admin checks archive.org status page

---

## 7. Acceptance Criteria (Backend)

### Phase 1 — Foundation

- [ ] `data/lessons.json` committed to repo with correct schema (version, last_updated, lessons array)
- [ ] `.env.example` complete; app boots locally with `next dev`
- [ ] All env vars validated at startup via Zod — app refuses to start if invalid
- [ ] POST /api/v1/admin/auth works: correct password → 200 + cookie; wrong password → 401; 6th attempt in 15 min → 429
- [ ] Standard error format includes `requestId` and `timestamp` on all error responses

### Phase 2 — Core API

- [ ] GET /api/v1/lessons returns all 648 lessons; filters (volume, kitab, search) work correctly
- [ ] GET /api/v1/lessons/[id] returns correct lesson or 404
- [ ] POST /api/v1/admin/lessons creates lesson, commits to GitHub, returns 201 with new lesson
- [ ] PUT /api/v1/admin/lessons/[id] updates metadata correctly; returns 404 for missing lesson
- [ ] DELETE /api/v1/admin/lessons/[id] removes lesson from JSON, returns 204
- [ ] POST /api/v1/admin/upload streams file to Internet Archive, returns archive_url
- [ ] All admin routes return 401 if session cookie missing or invalid
- [ ] Duplicate lesson_number within volume returns 409

### Phase 3 — Reliability & Security

- [ ] Rate limiting enforced: 120/min on public routes, 5/15min on auth route
- [ ] Input validation on all endpoints: invalid body → 422 with field-level details
- [ ] No secrets, stack traces, or internal paths in any error response
- [ ] ADMIN_PASSWORD compared using `crypto.timingSafeEqual` (not `===`)
- [ ] Session cookie is HttpOnly, Secure, SameSite=Strict in production
- [ ] GitHub SHA conflict (409) handled gracefully — returns 409 to admin, no data corruption

### Phase 4 — Deployment Proof

- [ ] Vercel deployment URL responds to GET /api/v1/lessons with 200
- [ ] OpenAPI docs accessible at /api/docs
- [ ] All 7 endpoints verified against OpenAPI spec via contract test
- [ ] Smoke test checklist documented in README.md

---

## 8. Project Structure (Backend skeleton)

```text
/
├── .env.example
├── .env.local                  ← gitignored
├── .gitignore
├── package.json
├── tsconfig.json               ← strict mode enabled
├── next.config.ts
├── README.md
├── /data
│   └── lessons.json            ← THE CMS DATA FILE
├── /src
│   ├── /app
│   │   ├── /api
│   │   │   └── /v1
│   │   │       ├── /lessons
│   │   │       │   ├── route.ts            ← GET /api/v1/lessons
│   │   │       │   └── /[id]
│   │   │       │       └── route.ts        ← GET /api/v1/lessons/[id]
│   │   │       └── /admin
│   │   │           ├── /auth
│   │   │           │   └── route.ts        ← POST /api/v1/admin/auth
│   │   │           ├── /lessons
│   │   │           │   ├── route.ts        ← POST /api/v1/admin/lessons
│   │   │           │   └── /[id]
│   │   │           │       └── route.ts    ← PUT, DELETE /api/v1/admin/lessons/[id]
│   │   │           └── /upload
│   │   │               └── route.ts        ← POST /api/v1/admin/upload
│   │   └── /revalidate
│   │       └── route.ts                    ← ISR revalidation webhook
│   ├── /config
│   │   ├── env.ts              ← Zod env validation (fails fast at startup)
│   │   └── session.ts          ← iron-session config
│   ├── /lib
│   │   ├── github.ts           ← GitHub Contents API client
│   │   ├── internet-archive.ts ← IA S3 upload client
│   │   ├── rate-limit.ts       ← Upstash ratelimit helpers
│   │   └── logger.ts           ← pino instance
│   ├── /proxy.ts               ← Admin session check + rate limiting (Next.js 16 proxy — replaces middleware.ts)
│   ├── /schemas
│   │   ├── lesson.schema.ts    ← Zod schemas for lesson CRUD
│   │   └── auth.schema.ts      ← Zod schema for auth
│   ├── /types
│   │   ├── lesson.ts
│   │   └── api.ts              ← ApiResponse<T>, ApiError types
│   └── /utils
│       ├── response.ts         ← buildSuccess(), buildError() response helpers
│       └── request-id.ts       ← UUID v4 requestId generator
└── /tests
    ├── /unit
    │   ├── github.test.ts
    │   ├── lesson-schema.test.ts
    │   └── rate-limit.test.ts
    ├── /integration
    │   ├── lessons.test.ts
    │   ├── admin-auth.test.ts
    │   └── admin-lessons.test.ts
    └── /contract
        └── openapi-compliance.test.ts
```

**Naming convention:** camelCase for variables/functions, PascalCase for types/interfaces, kebab-case for filenames.
**Import alias:** `@/` maps to `/src/`

---

## 9. Constraints (Non-Functional)

**Performance Targets (LOCKED):**

- p95 latency: < 200ms for all API routes (Vercel serverless cold start included)
- Error rate: < 1% on public GET routes under normal load
- Sustained RPS: 20 RPS for 5 minutes (well within Vercel free tier)
- Admin upload: Completes within 5 minutes for a 500MB file (IA S3 write speed)
- ISR revalidation: Site reflects new lesson within 90 seconds of GitHub commit

**Security Baseline (LOCKED):**

- Password comparison: `crypto.timingSafeEqual` (constant-time, no timing attacks)
- Session: `iron-session` (signed + encrypted, HttpOnly, Secure, SameSite=Strict)
- HTTPS in production: Enforced by Vercel (automatic TLS)
- Secrets: Never committed. All in Vercel environment variables.
- CORS: `ALLOWED_ORIGINS` env var. Only listed origins receive CORS headers.
- No CSRF token needed: API is JSON-only (no HTML form submissions). SameSite=Strict on session cookie provides CSRF protection.
- Input validation: Zod on every endpoint. Unknown fields stripped (`.strip()` mode).
- Error messages: Generic messages only on auth failures (no user enumeration risk).
- No SQL (no SQL injection risk). No eval/exec usage.

**Hosting/Budget Constraints:**

- Monthly hosting budget: $0
- Vercel: free tier (serverless functions, 100GB bandwidth/month, 6,000 function invocations/day)
- Upstash Redis: free tier (10,000 requests/day — sufficient for rate limiting at this scale)
- Internet Archive: free (unlimited storage and bandwidth for educational content)
- GitHub: free (public or private repo — public recommended for transparency)
- Single-region: Vercel free tier (no multi-region — acceptable for audience size)

---

## 10. Deployment, Rollback, Backups, DR

**Deployment method:**

- Git push to `main` branch → Vercel auto-deploys (CI/CD via Vercel GitHub integration)
- Preview deployments on PRs (Vercel free tier includes this)
- No Docker needed (Vercel manages serverless runtime)

**Environments:**

- `development`: local (`next dev`) with `.env.local`
- `preview`: Vercel preview deployment (auto-created per PR/branch)
- `production`: Vercel production deployment (from `main` branch)

**Rollback strategy:**

- Code rollback: Vercel dashboard → Deployments → click previous deployment → "Promote to Production" (instant, no downtime)
- Data rollback: GitHub revert commit on `data/lessons.json` → Vercel auto-redeploys → data restored. GitHub commit history is the backup.
- No database rollback needed (no SQL database).

**Backup policy:**

- `lessons.json`: GitHub history = continuous backup. Every commit is a snapshot. Retention: indefinite.
- Audio files: Internet Archive = permanent storage. IA does not delete files. No additional backup needed.
- Backup drill cadence: N/A (GitHub history is self-evident; IA is permanent)

**DR (Disaster Recovery):**

- RPO: 0 minutes (GitHub history = real-time backup of all lesson data)
- RTO: < 5 minutes (Vercel rollback to last known good deployment via dashboard)
- Failure scenarios:
  - Vercel down: Site unreachable. No fallback. RTO = when Vercel recovers.
  - GitHub API down: Admin writes fail (502). Site continues serving last cached build. No data loss.
  - Internet Archive down: Audio streams fail. Site metadata/navigation fully functional. No data loss.

---

## 11. Forbidden Changes (Scope Lock)

**BANNED without a new Freeze version + scope review:**

- Add any user account system or visitor authentication
- Add cross-device progress sync or any database (SQL or NoSQL)
- Switch from GitHub JSON to any other data store
- Add any external integrations beyond Internet Archive and GitHub
- Add real-time features (WebSockets, SSE, polling)
- Change auth mode (iron-session cookie is locked)
- Change pagination standard (offset-based is locked)
- Add volumes 5–10 (requires content to exist first)
- Add any analytics, tracking, or telemetry beyond Vercel Analytics
- Add Malayalam-language lesson metadata (currently Arabic-only titles)

If requested:
→ Create Change Request → review scope/cost impact → approve/reject → bump Freeze version.

---

## 12. Change Control (Accept-and-price rules)

**Change Request Format:**

- Requested change:
- Reason:
- Scope impact:
- Timeline impact:
- Cost impact (hosting/services):
- Risk impact:
- Decision: Approved / Rejected
- New Freeze version: v1.1 / v2.0

**Billing rule:** N/A (personal project — time cost only)
**Response SLA for change requests:** Self-imposed: review within 7 days

---

## 13. Version History

- v1.1 (2026-04-30): Stack version corrections before implementation start. Node.js 20 → 22 LTS (Node 20 EOL 2026-04-30). Next.js 14 → 16. Added `proxy.ts` (replaces `middleware.ts`). Banned `next lint` (removed in Next.js 16). Updated `revalidateTag` call to require cacheLife second argument. No scope, API contract, or architecture changes.
- v1.0 (2026-04-20): Initial backend freeze approved for execution. 8 user stories, 7 API endpoints, GitHub JSON CMS, Internet Archive audio storage, Vercel hosting. Zero cost.
