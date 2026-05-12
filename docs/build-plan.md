# BUILD PLAN: Tuhfat al-Muhtaj Learning Platform

**Version:** 1.2
**Date:** 2026-05-10
**Governed by:** Backend Freeze v1.2 · Frontend Freeze v1.2 · OpenAPI v1.0.1
**Supersedes:** v1.1 (2026-05-09) — updated by Vercel Upload Fix (2026-05-10)
**Estimated timeline:** 2–3 weeks

> **Execution rule:** Every task references a freeze section or OpenAPI endpoint.
> No task may add scope, change stack, or invent API behaviour beyond what is documented.
> Before starting any task, read the freeze section cited in the task header.
> When in doubt, stop and open a Change Request.

---

## Dependency Map (read before starting)

```
Phase 0 — Prerequisites (external accounts)
    ↓
Phase 1 — Scaffold (repo, config, types, shared utilities)
    ↓
Phase 2 — Backend: Public Read API          ← unblocks Phase 7, 8
    ↓
Phase 3 — Backend: Auth + Proxy             ← unblocks Phase 9
    ↓
Phase 4 — Backend: Admin Lesson CRUD        ← unblocks Phase 10, 11, 12
    ↓
Phase 5 — Backend: IA Upload                ← unblocks Phase 11 (upload step)
    ↓  (backend acceptance checkpoint — ALL must pass before real API calls in frontend)
Phase 6 — Frontend: Design System + Foundation
    ↓
Phase 7 — Frontend: Lesson Browser (/)
    ↓
Phase 8 — Frontend: Lesson Detail + Audio Player (/lessons/[id])
    ↓
Phase 9 — Frontend: Admin Login (/admin/login)
    ↓
Phase 10 — Frontend: Admin Lesson List + Delete (/admin)
    ↓
Phase 11 — Frontend: Add Lesson Wizard (/admin/lessons/new)
    ↓
Phase 12 — Frontend: Edit Lesson (/admin/lessons/[id]/edit)
    ↓
Phase 13 — CI + Quality Gates
    ↓
Phase 14 — Deployment + Data Population
```

**Parallel work allowed:**

- Phase 6 can start in parallel with Phase 2 using the Prism mock server.
- Phases 7–8 can use Prism mock until Phase 2 is complete.
- Phase 9 can use Prism mock until Phase 3 is complete.
- Phases 10–12 must wait for Phases 4–5 to be complete and tested.

**Hard blockers:**

- Phase 0 must be fully complete before Phase 1.
- Backend acceptance checkpoint (end of Phase 5) must pass before Phases 10–12 connect to the real API.
- Phase 13 CI gates must pass before Phase 14.

---

## Phase 0 — Prerequisites

**Ref:** Backend Freeze v1.2 §0 Assumptions
**Estimated time:** 1–2 hours
**No code written in this phase.**

**P0-1 — GitHub repository**

- Create GitHub repository (public or private).
- Generate GITHUB_TOKEN (Personal Access Token) with `repo` scope.
- Confirm GITHUB_REPO_OWNER, GITHUB_REPO_NAME, GITHUB_BRANCH=main.

**P0-2 — Internet Archive account**

- Create account at archive.org.
- Generate IA_ACCESS_KEY and IA_SECRET_KEY from https://archive.org/account/s3.php.
- Create collection item with identifier matching IA_COLLECTION_IDENTIFIER value.

**P0-3 — Upstash Redis**

- Create free Upstash account and Redis database (free tier).
- Copy UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.

**P0-4 — Vercel account**

- Link Vercel to GitHub repo. Do not configure env vars yet — that is Phase 14.

### Checkpoint P0

- [ ] GitHub PAT generated, `repo` scope confirmed.
- [ ] IA account exists, S3 keys generated, collection identifier created.
- [ ] Upstash Redis instance live, REST URL and token available.
- [ ] Vercel account linked to GitHub repo.

---

## Phase 1 — Project Scaffold + Foundation

**Ref:** Backend Freeze v1.2 §1.5, §1.6, §2, §8 · Frontend Freeze v1.2 §1.5, §1.6, §5, §8, §11
**Estimated time:** 1 day
**Blocker:** Phase 0 complete.

**P1-1 — Repository initialisation**

- Bootstrap with `npx create-next-app@latest` selecting: TypeScript, App Router, Tailwind CSS, `src/` directory, import alias `@/*`.
- Set Node.js 22 LTS in `.nvmrc` and `package.json` engines field.
- **Upgrade React to 19.x immediately after scaffold:** `npm install react@19 react-dom@19 @types/react@19 @types/react-dom@19`. Do not leave React 18 from create-next-app. _(CR-001: Backend Freeze v1.2 §1.6)_
- Confirm `package.json` shows `react: ^19.x` and `react-dom: ^19.x`.

**P1-2 — TypeScript strict config**

- Set `strict: true`, `noEmit: true`, `paths: { "@/*": ["./src/*"] }` in `tsconfig.json`.
- Remove `allowJs: true` if present (not needed — TypeScript-only project).
- Remove `ignoreDeprecations` if present. _(CR-001: Backend Freeze v1.2 §8)_
- Confirm `tsc --noEmit` passes on clean scaffold.

**P1-3 — Environment configuration**

- Create `.env.example` with all vars from Backend Freeze v1.2 §1.5 and Frontend Freeze v1.2 §1.5.
- Single canonical copy — NO duplication. _(CR-001: Backend Freeze v1.2 §7 Phase 1)_
- Vars present: NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_BASE_URL, NODE_ENV, ADMIN_PASSWORD, SESSION_SECRET, SESSION_MAX_AGE_SECONDS, GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME, GITHUB_FILE_PATH, GITHUB_BRANCH, IA_ACCESS_KEY, IA_SECRET_KEY, IA_COLLECTION_IDENTIFIER, IA_S3_ENDPOINT, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, REVALIDATION_SECRET, NEXT_PUBLIC_VERCEL_ANALYTICS_ID.
- **ALLOWED_ORIGINS is NOT in .env.example** (removed — same-origin deployment). _(CR-001)_
- Create `.env.local` (gitignored) with local dev values.

**P1-4 — Zod env validation**

- Create `src/config/env.ts`.
- Validate all required env vars at module import time.
- Rules: ADMIN_PASSWORD ≥ 16 chars, SESSION_SECRET ≥ 32 chars, REVALIDATION_SECRET ≥ 32 chars, UPSTASH_REDIS_REST_URL valid HTTPS URL.
- **ALLOWED_ORIGINS removed from env schema.** _(CR-001)_
- App must refuse to start (throw at import time) if any required var is missing or invalid.
- Unit test: `tests/unit/env.test.ts` — missing var throws, short password throws, valid config passes.

**P1-5 — iron-session config**

- Create `src/config/session.ts`: cookieName `tuhfa_session`, HttpOnly, Secure in production, SameSite=strict, maxAge: SESSION_MAX_AGE_SECONDS.

**P1-6 — Shared types**

- `src/types/api.ts` — `ApiResponse<T>`, `ApiError` matching Backend Freeze v1.2 §3 global error format.
- `src/types/lesson.ts` — `Lesson`, `Chapter`, `LessonCreateBody`, `LessonUpdateBody` matching §2 schema.

**P1-7 — Zod schemas**

- `src/schemas/lesson.schema.ts` — LessonCreateSchema, LessonUpdateSchema with all invariants from §2.
- `src/schemas/auth.schema.ts` — `{ password: z.string().min(1).max(128) }`.
- Unit test: `tests/unit/lesson-schema.test.ts`.

**P1-8 — Shared utilities**

- `src/utils/request-id.ts` — `crypto.randomUUID()`.
- `src/utils/response.ts` — `buildSuccess(data, meta?)` and `buildError(code, message, details?, status?)`.
- Unit test: `tests/unit/response.test.ts`.

**P1-9 — Logger**

- `src/lib/logger.ts` — pino instance. Required fields: requestId, route, method, statusCode, latencyMs, timestamp.
- PII rules: never log ADMIN_PASSWORD, SESSION_SECRET, GITHUB_TOKEN, IA_ACCESS_KEY, IA_SECRET_KEY, REVALIDATION_SECRET, cookie values.

**P1-10 — Tailwind design tokens**

- Extend `tailwind.config.ts` with all color tokens from Frontend Freeze v1.2 §5.
- Font family tokens: _(CR-001 — system fonts only, no Google Fonts)_
  - `fontFamily.sans` (UI / English): `['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']`
  - `fontFamily.arabic` (lesson content): `['Noto Naskh Arabic', 'Traditional Arabic', 'Arabic Typesetting', 'Geeza Pro', 'serif']`
- No Google Fonts import anywhere in this task or any other.
- Type scale: extend with display (2.25rem/700), heading (1.5rem/700), subheading (1.125rem/600).

**P1-11 — next.config.js**

- Implement **split CSP** — production nonce-based, development relaxed. _(CR-001: Frontend Freeze v1.2 §8)_
- Production CSP (NODE_ENV === 'production'):
  - `default-src 'self'` _(Frontend Freeze v1.2 §8 — absent from Backend Freeze TASK 15; Frontend Freeze governs next.config.js)_
  - `script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'`
  - `style-src 'self' 'nonce-{NONCE}'`
  - `font-src 'self'` (no fonts.gstatic.com)
  - `img-src 'self' data:` _(Frontend Freeze v1.2 §8 — required for inline SVG data: URIs)_
  - `media-src https://archive.org`
  - `connect-src 'self'`
  - `frame-ancestors 'none'`
  - No `unsafe-inline`, no `unsafe-eval`, no Google Fonts domains.
- Development CSP (NODE_ENV !== 'production'): allow `unsafe-inline`, `unsafe-eval`, `ws:` for HMR; `img-src 'self' data: blob:`.
- `X-Frame-Options: DENY`.
- Nonce generated per-request via `headers()` function and made available for `<script>`/`<style>` tag propagation.
- No ISR config here — ISR `revalidate` is set per-route in page files.

**P1-12 — lessons.json seed**

- Commit `data/lessons.json` to repo with correct root schema: `{ "version": 1, "last_updated": "...", "lessons": [] }`.
- Schema validated against Backend Freeze v1.2 §2.

**P1-13 — layout.tsx**

- Set `<html lang="en">`. _(CR-001: Frontend Freeze v1.2 §2)_
- Apply system font class via Tailwind.
- **No `<link>` to Google Fonts or any external font CDN.** _(CR-001)_
- No preconnect hints to fonts.googleapis.com or fonts.gstatic.com.
- Wire QueryProvider (TanStack Query).
- Wire Vercel Speed Insights if NEXT_PUBLIC_VERCEL_ANALYTICS_ID is set.

### Checkpoint P1

- [ ] `tsc --noEmit` passes.
- [ ] `eslint src/` passes (no-explicit-any: error, no-unused-vars: error, no-empty: error).
- [ ] react@19, react-dom@19 confirmed in package.json.
- [ ] ALLOWED_ORIGINS absent from env.ts and .env.example.
- [ ] No Google Fonts anywhere in codebase.
- [ ] CSP split verified: production has no unsafe-inline/eval; development has both.
- [ ] `<html lang="en">` in layout.tsx.
- [ ] .env.example has exactly one copy of each variable.

---

## Phase 2 — Backend: Public Read API

**Ref:** Backend Freeze v1.2 §3 (GET /api/v1/lessons, GET /api/v1/lessons/[id]) · OpenAPI v1.0.1 operationIds: `listLessons`, `getLessonById`
**Estimated time:** 1 day
**Blocker:** Phase 1 complete.

**P2-1 — GitHub client (`src/lib/github.ts`)**

- Implement `getLessons()` and `getLessonById(id)` using GitHub Contents API.
- **ALL fetch calls must use `next: { tags: ['lessons'] }` option.** _(CR-001: Backend Freeze v1.2 §3)_
  - Correct: `fetch(url, { headers, next: { tags: ['lessons'] } })`
  - This is the tag that `revalidateTag('lessons')` will invalidate.
- `getLessons()` applies filter/search/pagination in-memory after fetching lessons.json.
- Apply 1-retry-after-1000ms on GitHub 5xx. No retry on 409.
- Return typed `{ lessons: Lesson[], total: number }`.

**P2-2 — GET /api/v1/lessons route**

- File: `src/app/api/v1/lessons/route.ts`
- Parse and validate query params (volume, kitab, bab, **fasl**, search, limit, offset) with Zod. _(fasl added by CR-001: Backend Freeze v1.2 §3 TASK 14)_
- Call `getLessons()`.
- **Response must include `meta.total`** — the total count of matching lessons (before pagination slice). _(CR-001: Backend Freeze v1.2 §3 Pagination Standard)_
- Apply rate limit: 120 req/min/IP via `checkPublicRateLimit`.
- Cache headers: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`. _(300 not 30 — matches Backend Freeze v1.2 §3 and OpenAPI v1.0.1)_
- Integration test: `tests/integration/lessons.test.ts` — filters work (volume, kitab, bab, **fasl**, search), meta.total is present and correct.

**P2-3 — GET /api/v1/lessons/[id] route**

- File: `src/app/api/v1/lessons/[id]/route.ts`
- Validate `id` is positive integer.
- Call `getLessonById(id)`. Return 404 if not found.
- Apply rate limit.
- Integration test: 200 on valid id, 404 on missing, 400 on non-integer id.

### Checkpoint P2

- [ ] `GET /api/v1/lessons` returns 200 with `meta.total` field populated.
- [ ] Filters (volume, kitab, **fasl**, search) work correctly. _(fasl: Backend Freeze v1.2 §3 TASK 14)_
- [ ] `GET /api/v1/lessons/1` returns 200 with full lesson object.
- [ ] `GET /api/v1/lessons/99999` returns 404.
- [ ] github.ts fetch calls all use `next: { tags: ['lessons'] }`.
- [ ] Rate limiting returns 429 on excess requests.

---

## Phase 3 — Backend: Auth + Proxy

**Ref:** Backend Freeze v1.2 §3 (POST /api/v1/admin/auth) · §4 Auth flows · §8 proxy.ts · OpenAPI operationId: `adminAuth`
**Estimated time:** 0.5 day
**Blocker:** Phase 1 complete.

**P3-1 — POST /api/v1/admin/auth route**

- File: `src/app/api/v1/admin/auth/route.ts`
- Parse body with Zod auth schema.
- Check auth rate limit: 5 req/15min/IP via `checkAuthRateLimit`.
- Compare with `crypto.timingSafeEqual`. Return 401 on mismatch.
- Create iron-session with `{ authenticated: true, createdAt: Date.now() }`. Set cookie.
- Return 200 `{ authenticated: true }`.
- Integration test: correct password → 200 + Set-Cookie; wrong → 401; 6th attempt/15min → 429.

**P3-2 — Rate limit helpers (`src/lib/rate-limit.ts`)**

- `checkAuthRateLimit(headers)` — 5/15min/IP.
- `checkPublicRateLimit(headers)` — 120/min/IP.
- `checkAdminRateLimit(headers)` — 60/min/IP.
- `checkPresignRateLimit(headers)` — 10/hour/IP. _(Vercel Upload Fix: Backend Freeze v1.2 TASK 9 — was checkUploadRateLimit)_
- All return `{ success: boolean, retryAfter?: number }`.
- **Call these functions directly in route handlers** — do not wrap in `typeof` guards. _(CR-001: audit finding)_
- Unit test: `tests/unit/rate-limit.test.ts`.

**P3-3 — proxy.ts (Admin session + route guard)**

- File: `src/proxy.ts`
- **Both API routes and page routes must use full iron-session validation.** _(CR-001: Backend Freeze v1.2 §4 Auth flow, §9 Security)_
- For `/api/v1/admin/*` (except POST auth): deserialize iron-session; check `session.authenticated === true` AND `Date.now() - session.createdAt ≤ SESSION_MAX_AGE_SECONDS * 1000`. Return 401 if either fails.
- For `/admin/*` pages (except `/admin/login`): same iron-session deserialization and expiry check. Redirect to `/admin/login` if invalid.
- **Cookie name presence alone is NOT sufficient for either path.** _(CR-001)_
- Integration test: `tests/integration/admin-auth.test.ts` — fabricated cookie value rejected; expired session rejected; valid session passes; page route redirect on missing session.

**P3-4 — POST /api/revalidate route**

- File: `src/app/api/revalidate/route.ts`
- **Method: POST only.** Return 405 on GET or any other method. _(CR-001: Backend Freeze v1.2 §3)_
- **Auth: read `Authorization` header, expect `Bearer {REVALIDATION_SECRET}`.** Return 401 if missing or wrong. _(CR-001)_
- **Nonce/replay protection:** read `X-Revalidate-Nonce` header (expected value: timestamp in ms as string). Reject if absent or if `Date.now() - parseInt(nonce) > 60000`. _(CR-001)_
- On valid request: call `revalidateTag('lessons')` — single argument only.
- Return 200 `{ revalidated: true }`.
- Integration test: GET → 405; missing header → 401; stale nonce → 401; valid POST → 200 + revalidateTag called.

### Checkpoint P3

- [ ] POST /api/v1/admin/auth: correct → 200 + cookie; wrong → 401; 6th attempt → 429.
- [ ] proxy.ts: fabricated cookie → 401 on API; page redirect to /admin/login.
- [ ] proxy.ts: expired session (createdAt too old) → 401 on API; redirect on page.
- [ ] POST /api/revalidate: GET → 405; no auth header → 401; valid POST → 200.
- [ ] revalidateTag('lessons') called with single argument (no second arg).

---

## Phase 4 — Backend: Admin Lesson CRUD

**Ref:** Backend Freeze v1.2 §3 (POST/PUT/DELETE /api/v1/admin/lessons) · §4 Create Lesson flow · OpenAPI operationIds: `createLesson`, `updateLesson`, `deleteLesson`
**Estimated time:** 1 day
**Blocker:** Phase 3 complete.

**P4-1 — POST /api/v1/admin/lessons**

- File: `src/app/api/v1/admin/lessons/route.ts`
- Validate body with LessonCreateSchema.
- Check admin rate limit.
- Execute Create Lesson flow from §4:
  1. Fetch lessons.json + SHA via github.ts (uses `next: { tags: ['lessons'] }` — already set in P2-1).
  2. Check uniqueness (volume + lesson_number).
  3. Assign id = max(ids) + 1.
  4. Append, sort, update last_updated.
  5. PUT to GitHub with current SHA.
  6. **Fire-and-forget revalidation: `POST /api/revalidate` with Authorization: Bearer {REVALIDATION_SECRET} and X-Revalidate-Nonce: Date.now().toString() header.** _(CR-001)_
- Return 201 with new lesson.
- Integration test: create → 201 → lesson in GitHub; duplicate lesson_number → 409.

**P4-2 — PUT /api/v1/admin/lessons/[id]**

- File: `src/app/api/v1/admin/lessons/[id]/route.ts`
- Validate body with LessonUpdateSchema.
- Fetch, find lesson (404 if missing), merge changed fields only, sort, PUT.
- **Fire-and-forget revalidation via POST /api/revalidate** (same as P4-1). _(CR-001)_
- Return 200 with updated lesson.
- Integration test: partial update; 404 on missing; 409 on SHA conflict.

**P4-3 — DELETE /api/v1/admin/lessons/[id]**

- File: `src/app/api/v1/admin/lessons/[id]/route.ts` (same file as PUT)
- Fetch, filter out lesson (404 if missing), PUT.
- **Fire-and-forget revalidation via POST /api/revalidate.** _(CR-001)_
- Return 204.
- Integration test: delete → 204 → lesson gone; 404 on missing; 409 on SHA conflict.

**P4-4 — Revalidation helper**

- Create `src/utils/revalidate.ts` — `triggerRevalidation()`:
  ```
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.REVALIDATION_SECRET}`,
      'X-Revalidate-Nonce': Date.now().toString(),
    },
  })
  ```
  Fire-and-forget (do not `await`, do not block the mutation response).
- Import and call from P4-1, P4-2, P4-3 after successful GitHub PUT.

### Checkpoint P4

- [ ] POST /api/v1/admin/lessons → 201; duplicate → 409; no auth → 401.
- [ ] PUT /api/v1/admin/lessons/[id] → 200 with only changed fields updated.
- [ ] DELETE /api/v1/admin/lessons/[id] → 204; lesson absent from lessons.json.
- [ ] All three mutation routes fire POST /api/revalidate (Authorization: Bearer header, not query string).
- [ ] Without session cookie → 401 on all three routes.

---

## Phase 5 — Backend: IA Upload (Presign)

**Ref:** Backend Freeze v1.2 §3 (POST /api/v1/admin/upload/presign) · §4 Generate Presigned Upload URL flow · §5 IA integration · OpenAPI v1.0.1 operationId: `presignUpload`
**Estimated time:** 0.5 day
**Blocker:** Phase 3 complete.

**P5-1 — Internet Archive presign client (`src/lib/internet-archive.ts`)**

- **DELETE** `uploadToIA()` function and all associated streaming/buffering code. _(Vercel Upload Fix: Backend Freeze v1.2 TASK 8)_
- **DELETE** any `Buffer.concat` or chunk accumulation. _(Backend Freeze v1.2 §11 Forbidden)_
- ADD `generatePresignedUrl(volume: number, lessonNumber: number, contentType: string, expiresIn: number)`:
  - Create `S3Client` with endpoint `env.IA_S3_ENDPOINT`, credentials `env.IA_ACCESS_KEY` / `env.IA_SECRET_KEY`, region `"us-east-1"`.
  - `filename = lesson-v{volume}-${String(lessonNumber).padStart(3,'0')}.mp3`
  - Call `getSignedUrl(s3Client, new PutObjectCommand({ Bucket: env.IA_COLLECTION_IDENTIFIER, Key: filename, ContentType: contentType, Metadata: { volume: String(volume), lesson_number: String(lessonNumber) } }), { expiresIn })`.
  - Returns `{ presigned_url, archive_url, filename, expires_in, method: 'PUT', required_headers: { 'Content-Type': contentType } }`.
  - **NEVER** logs `presigned_url` (contains SigV4 signature). _(Backend Freeze v1.2 §6)_
  - Presign timeout: 5,000ms. On S3 error: throw (caller returns 502).
- Unit test: mocked `S3Client` — correct shape returned; `presigned_url` not logged; no real IA call.

**P5-2 — POST /api/v1/admin/upload/presign route**

- **CREATE** `src/app/api/v1/admin/upload/presign/route.ts` _(new file)_
- **DELETE** `src/app/api/v1/admin/upload/route.ts` _(old multipart file — Backend Freeze v1.2 TASK 10)_
- POST handler only. No GET.
- Parse body (Zod): `{ volume ∈ {1,2,3,4}, lesson_number > 0, content_type?: string }`.
- Check presign rate limit via `checkPresignRateLimit(request.headers)` — 10/hr/IP → 429 if exceeded. _(Backend Freeze v1.2 TASK 9)_
- Resolve `contentType = body.content_type ?? 'audio/mpeg'`. Validate ∈ `['audio/mpeg','audio/mp4','audio/ogg','audio/wav']` → 422 if invalid.
- Call `generatePresignedUrl(volume, lesson_number, contentType, env.UPLOAD_PRESIGN_EXPIRY_SECONDS)`.
- Log `{ action: 'upload.presign', volume, lesson_number, filename }` — **NOT `presigned_url`**.
- Return 200 with presign data.
- **The server never receives or buffers file bytes.** _(Vercel Upload Fix — Backend Freeze v1.2 §11)_
- Integration test: 200 with correct shape; 401 without session; 429 after 10 calls/hr; 422 on invalid content_type.

### Backend Acceptance Checkpoint (end of Phase 5)

All must pass before frontend Phases 10–12 connect to real API:

- [ ] GET /api/v1/lessons returns 200 with `meta.total`.
- [ ] POST /api/v1/admin/auth works with correct/wrong/rate-limited credentials.
- [ ] POST /api/v1/admin/lessons creates lesson in GitHub lessons.json.
- [ ] PUT and DELETE work and trigger revalidation via POST /api/revalidate.
- [ ] **POST /api/v1/admin/upload/presign returns 200 with `presigned_url`, `archive_url`, `filename`.** _(Vercel Upload Fix — replaces old streaming upload check)_
- [ ] **Presigned URL verified functional: `curl -X PUT {presigned_url} -H "Content-Type: audio/mpeg" --data-binary @test.mp3` → IA file present.** _(Vercel Upload Fix)_
- [ ] **`src/app/api/v1/admin/upload/route.ts` does NOT exist** (old file deleted). _(Vercel Upload Fix)_
- [ ] **`formidable` absent from package.json and node_modules.** _(Backend Freeze v1.2 §11)_
- [ ] **Server never buffers file bytes** (no `Buffer.concat`, no streaming upload through Vercel). _(Vercel Upload Fix)_
- [ ] POST /api/revalidate: GET → 405; no auth → 401; valid POST → 200.
- [ ] All admin routes: fabricated or missing cookie → 401. Admin pages: redirect to /admin/login.
- [ ] Rate limits: auth (5/15min), presign (10/hr) enforced. _(checkPresignRateLimit — not checkUploadRateLimit)_
- [ ] No `as any` casts in any of the above. ESLint no-explicit-any passes.

---

## Phase 6 — Frontend: Design System + Foundation

**Ref:** Frontend Freeze v1.2 §5, §6, §8, §11
**Estimated time:** 1 day
**Blocker:** Phase 1 complete. (Can run in parallel with Phase 2 using Prism mock.)

**P6-1 — Prism mock server setup**

- `npm install --save-dev @stoplight/prism-cli`.
- Add script to package.json: `"mock": "prism mock docs/openapi.yaml --port 4010"`. _(path: docs/openapi.yaml — matches actual repo layout)_
- Verify Prism starts and serves mock responses for all 7 endpoints.

**P6-2 — openapi-typescript type generation**

- `npm install --save-dev openapi-typescript`.
- Add script: `"generate-types": "openapi-typescript docs/openapi.yaml -o src/types/api.ts"`. _(path: docs/openapi.yaml)_
- Run and commit generated `src/types/api.ts`.
- Verify `Lesson`, `Chapter`, `LessonCreateBody` etc. are present.

**P6-3 — API client (`src/api/client.ts`)**

- Create `openapi-fetch` client instance pointing to `NEXT_PUBLIC_API_BASE_URL`.
- No raw `fetch()` calls in components — all API calls go through this client or typed functions in `src/api/endpoints.ts`.

**P6-4 — UI components**

Build all components from Frontend Freeze v1.2 §5 component inventory. Each must:

- Have no `any` types.
- Have `aria-*` attributes per §6.
- Use Tailwind color tokens only (no hardcoded hex values).

Components (in dependency order):

1. `Spinner` — CSS-only, centered.
2. `Button` — primary, secondary, danger, ghost variants. `disabled` state with opacity.
3. `Input` — text, password, number, date, file. Forwards ref. `aria-describedby` for errors.
4. `Select` — controlled. `aria-label` or paired `<label>`.
5. `Textarea` — controlled. RTL-aware.
6. `Label` + `FieldError` — form field wrapper. Error renders `role="alert"`.
7. `Toast` — success, error, warning. Top-right. Auto-dismiss 5s. Keyboard-dismissible.
8. `Modal` — focus trap on open. Escape closes. `role="dialog"`, `aria-modal`, `aria-labelledby`.
9. `ProgressBar` — `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
10. `Badge` — completed status (success color).
11. `Pagination` — Previous/Next + page numbers. `aria-label`, `aria-current="page"`. **Accepts `totalPages` as prop — no internal page computation.** _(CR-001)_
12. `AudioPlayer` — thin wrapper on native `<audio preload="metadata">`. Tracks isPlaying, currentTime, playbackRate. Keyboard: Space = play/pause, arrows seek ±5s.
13. `ChapterNav` — volume tabs → kitab → bab → fasl selects. All Arabic labels use `dir="rtl" lang="ar"`.

**P6-5 — `useProgress` hook**

- `src/hooks/useProgress.ts` — read/write `localStorage['tuhfa_progress']`.
- Typed `ProgressStore = Record<number, { completed: boolean; positionSeconds: number; lastPlayedAt: string }>`.
- Unit test: `tests/unit/useProgress.test.ts`.

**P6-6 — Lesson utilities**

- `src/lib/lessons.ts` — `mergeAndDeduplicateLessons(responses)`, `buildChapterHierarchy(lessons)`.
- `src/lib/format.ts` — `formatDuration(seconds)`, `formatDate(dateStr)`.
- Unit tests: `tests/unit/lessons.test.ts`, `tests/unit/format.test.ts`.

### Checkpoint P6

- [ ] Prism mock server starts and returns valid shapes for all endpoints.
- [ ] All 13 UI components render without errors.
- [ ] `Pagination` component accepts and uses `totalPages` prop.
- [ ] No `any` type in any component.
- [ ] axe-core passes on all component renders.
- [ ] System fonts applied correctly (no Google Fonts request in network tab).

---

## Phase 7 — Frontend: Lesson Browser (`/`)

**Ref:** Frontend Freeze v1.2 §2 (Lesson Browser screen) · §3 (GET /api/v1/lessons) · OpenAPI operationId: `listLessons`
**Estimated time:** 1 day
**Blocker:** Phase 6 complete. (Can use Prism mock until Phase 2 backend complete.)

**P7-1 — `useLessons` hook**

- `src/hooks/useLessons.ts`.
- `useAllLessons()`: fires 4 parallel TanStack Query calls (offsets 0, 200, 400, 600), merges results via `mergeAndDeduplicateLessons`. Cache key: `['lessons','all']`.
- `useFilteredLessons(filters, page)`: single call with query params. Cache key: `['lessons','filtered', filters, page]`.
- **`totalPages` computed from `meta.total` returned in response:** `Math.ceil(meta.total / limit)`. _(CR-001: Frontend Freeze v1.2 §2 Lesson Browser)_
- **No hardcoded offset array cap.** _(CR-001)_
- No `as any` casts.

**P7-2 — LessonCard component**

- `src/features/lessons/LessonCard.tsx`.
- Displays: title_ar (`dir="rtl" lang="ar"`), chapter info, duration, upload date, completed badge.
- All Arabic strings: `dir="rtl" lang="ar"`. All UI labels (Duration, Volume, etc.): English.

**P7-3 — LessonBrowser component**

- `src/features/lessons/LessonBrowser.tsx`.
- `useReducer` for `{ activeVolume, activeKitab, activeBab, activeFasl, searchQuery, currentPage }`.
- Chapter nav hidden until full dataset loaded.
- Search blocked client-side if < 2 chars.
- Empty state: "No matching lessons" (English) with Arabic sub-label `dir="rtl" lang="ar"`.
- **No Malayalam strings anywhere.** _(CR-001)_
- Error state: inline with retry button. English messages.

**P7-4 — `/` page**

- `src/app/page.tsx`.
- `export const revalidate = 60`.
- Renders `<LessonBrowser />`.

**P7-5 — Component test + E2E**

- `tests/component/LessonBrowser.test.tsx` — chapter nav filters; search < 2 chars blocked; totalPages correct from meta.total.
- `tests/e2e/lesson-browser.spec.ts` — browse, filter by volume, search.

### Checkpoint P7

- [ ] `/` loads and displays lesson list against Prism mock.
- [ ] Chapter nav filters lesson list correctly.
- [ ] Search < 2 chars is blocked client-side.
- [ ] `totalPages` computed from `meta.total` (not from currentPage).
- [ ] Previous/Next pagination works.
- [ ] No Malayalam strings in rendered output.
- [ ] No Google Fonts network request.
- [ ] `<html lang="en">` confirmed.

---

## Phase 8 — Frontend: Lesson Detail + Audio Player (`/lessons/[id]`)

**Ref:** Frontend Freeze v1.2 §2 (Lesson Detail screen) · §3 (GET /api/v1/lessons/{id}) · OpenAPI v1.0.1 operationId: `getLessonById` _(was `getLesson` — does not exist in OpenAPI v1.0.1)_
**Estimated time:** 1 day
**Blocker:** Phase 6 complete.

**P8-1 — LessonDetail component**

- `src/features/lessons/LessonDetail.tsx`.
- Fetches lesson via `['lesson', id]` TanStack Query key.
- Renders: title_ar (`dir="rtl" lang="ar"`), chapter metadata (Arabic, `dir="rtl" lang="ar"`), duration/date (English formatted).
- `<audio preload="metadata" src={archive_url} aria-label={title_ar}>`.
- Audio error event → English message: "Audio could not be loaded — Internet Archive may be temporarily unavailable."
- Wires `useProgress` for position restore and mark-complete.

**P8-2 — `/lessons/[id]` page**

- `src/app/lessons/[id]/page.tsx`.
- `export const revalidate = 60`.
- 404 state: "Lesson not found" (English) with back link.

**P8-3 — Tests**

- `tests/component/AudioPlayer.test.tsx` — play/pause, seek, progress save.
- `tests/e2e/lesson-player.spec.ts` — play, mark complete, progress restored on re-visit.

### Checkpoint P8

- [ ] `/lessons/1` loads lesson metadata and audio element.
- [ ] Playback position written to localStorage on timeupdate.
- [ ] Position restored on re-visit.
- [ ] Mark complete updates badge.
- [ ] `/lessons/99999` shows "Lesson not found" (English).
- [ ] IA audio failure shows English error message.

---

## Phase 9 — Frontend: Admin Login (`/admin/login`)

**Ref:** Frontend Freeze v1.2 §2 (Admin Login screen) · OpenAPI: `adminAuth`
**Estimated time:** 0.5 day
**Blocker:** Phase 6 complete, Phase 3 complete.

**P9-1 — `useAdminAuth` hook**

- `src/hooks/useAdminAuth.ts` — TanStack Query mutation wrapping POST /api/v1/admin/auth.
- On 200: `router.replace('/admin')`.
- On 401: return field error "Incorrect password".
- On 429: return inline error "Rate limit exceeded — try again in 15 minutes".

**P9-2 — `/admin/login` page**

- `src/app/admin/login/page.tsx`.
- react-hook-form: single `password` field, type="password", minLength 1, maxLength 128.
- Submit button disabled and shows spinner during request.
- Focus on password input on mount.
- If session cookie already valid (from proxy): redirect to `/admin`.

**P9-3 — Tests**

- `tests/e2e/admin-auth.spec.ts` — correct → redirect to /admin; wrong → inline English error; 429 → rate-limit message.

### Checkpoint P9

- [ ] Correct password → session cookie set → redirect to `/admin`.
- [ ] Wrong password → inline "Incorrect password".
- [ ] 429 → "Rate limit exceeded — try again in 15 minutes".
- [ ] Focus on password input on page load.

---

## Phase 10 — Frontend: Admin Lesson List + Delete (`/admin`)

**Ref:** Frontend Freeze v1.2 §2 (Admin Lesson List screen) · OpenAPI: `listLessons`, `deleteLesson`
**Estimated time:** 1 day
**Blocker:** Phase 9 complete, Phase 4 complete (or Prism mock for read; real API needed for delete).

**P10-1 — AdminLessonTable component**

- `src/components/admin/AdminLessonTable.tsx`.
- 648-row table (no virtualization). Sorted volume ASC, lesson_number ASC.
- Per-row: `aria-label="Edit lesson {id}"`, `aria-label="Delete lesson {id}"`.
- `<caption>` on table. `<th scope="col">` on all headers.
- Empty state: "No lessons yet" with link to `/admin/lessons/new`.

**P10-2 — DeleteModal component**

- `src/components/admin/DeleteModal.tsx`.
- `role="dialog"`, `aria-modal="true"`, focus trap, Escape closes.
- Confirm triggers DELETE /api/v1/admin/lessons/{id}.
- On 204: invalidate `['lessons','all']`, `['admin','lessons','all']`. Toast "Lesson deleted."
- On 404: Toast "Lesson no longer exists."
- On 409: Toast "Concurrent edit conflict — please retry."
- All toast messages: English. _(CR-001)_

**P10-3 — `/admin` page**

- `src/app/admin/page.tsx`. CSR only (no `revalidate`).
- Uses `['admin','lessons','all']` query key.
- Error state: inline "Failed to load lessons" with retry button (English).

**P10-4 — Tests**

- `tests/component/AdminLessonTable.test.tsx`.
- `tests/e2e/admin-edit-delete.spec.ts` — delete flow: modal → confirm → list refreshes; cancel → modal closes.

---

## Phase 11 — Frontend: Add Lesson Wizard (`/admin/lessons/new`)

**Ref:** Frontend Freeze v1.2 §2 (Add Lesson Wizard screen) · OpenAPI v1.0.1 operationIds: `presignUpload`, `createLesson` _(Vercel Upload Fix: was `uploadAudio` — operationId does not exist in OpenAPI v1.0.1)_
**Estimated time:** 1 day
**Blocker:** Phase 9, Phase 4, Phase 5 complete.

**P11-1 — AddLessonWizard component**

- `src/components/admin/AddLessonWizard.tsx`.
- Wizard state machine (useReducer): `{ step: 'upload' | 'form' | 'submitting' | 'done', uploadProgress: number, archiveUrl: string | null, presignData: PresignUploadResponse['data'] | null }`.
- **Step 1 — Presign & Upload:** _(Vercel Upload Fix — Backend Freeze v1.2 §4 · Frontend Freeze v1.2 §2)_
  1. Client-side guard: reject file > 500MB before any API call (413 is client-only — server never receives file).
  2. Call `POST /api/v1/admin/upload/presign` (`presignUpload`) with `{ volume, lesson_number, content_type }` → receive `{ presigned_url, archive_url, required_headers, expires_in }`.
  3. XHR `PUT {presigned_url}` directly to Internet Archive. Set `Content-Type` from `required_headers['Content-Type']`. **Do NOT send presigned_url to server or log it.**
  4. Track `xhr.upload.onprogress` → update `uploadProgress` → `ProgressBar` component.
  5. On XHR status 200: store `archiveUrl`, advance to Step 2.
  6. On XHR status 0 (CORS block): show curl fallback UI — pre-filled command, "Copy command" button, and "I uploaded successfully →" button (advances to Step 2 with `archive_url` from presign response, no backend callback needed).
  7. On XHR status 403: presign URL expired — show "Request new upload link" button (re-calls presign).
  8. On presign 429: show "Rate limit — try again in X minutes" (parse `Retry-After` header).
  9. On presign 422: show field-level error from response.
  10. On presign 502: show "Upload service unavailable — retry" prompt.
- Step counter: "Step 1 of 2" / "Step 2 of 2" (`aria-current="step"`).
- Step 2: react-hook-form, all fields from §2. Arabic inputs: `dir="rtl" lang="ar"`.
- `archive_url`: pre-filled read-only input. English label: "Audio URL".
- Back on Step 2: disabled (orphan accepted per §2).
- All error messages: English. Field labels: English.
- On 201: invalidate both query keys. Toast "Lesson created." Redirect to `/admin`.

**P11-2 — Tests**

- `tests/component/AddLessonWizard.test.tsx`:
  - Step 1: file > 500MB → client-side error shown before presign call is made.
  - Step 1: `presignUpload` 200 → XHR PUT to presigned_url → progress bar renders → Step 2 shown with archive_url pre-filled.
  - Step 1: XHR status 0 (CORS) → curl fallback UI shown with copy button.
  - Step 1: presign 429 → rate-limit message shown.
  - Step 2: react-hook-form pre-populated with archive_url; 422 → field-level errors rendered; 502 → retry prompt shown.
  - **No test for server-side 413** — 413 cannot be returned by presign endpoint; size guard is client-only. _(Vercel Upload Fix)_
- `tests/e2e/admin-add-lesson.spec.ts`.

---

## Phase 12 — Frontend: Edit Lesson (`/admin/lessons/[id]/edit`)

**Ref:** Frontend Freeze v1.2 §2 (Edit Lesson screen) · OpenAPI v1.0.1 operationIds: `getLessonById`, `updateLesson` _(was `getLesson` — operationId does not exist in OpenAPI v1.0.1)_
**Estimated time:** 0.5 day
**Blocker:** Phase 9, Phase 4 complete.

**P12-1 — EditLessonForm component**

- `src/components/admin/EditLessonForm.tsx`.
- On mount: GET /api/v1/lessons/{id} to pre-populate.
- react-hook-form: `defaultValues` from GET response.
- Immutable fields (id, volume, lesson_number): read-only text display. NOT in form. NOT sent in PUT body.
- On submit: send only changed fields (react-hook-form `dirtyFields`).
- On 200: toast "Saved". Redirect to `/admin`. Invalidate 3 query keys.
- On 409: toast "Concurrent edit conflict — please retry." (English)
- Arabic inputs: `dir="rtl" lang="ar"`.

**P12-2 — `/admin/lessons/[id]/edit` page**

- `src/app/admin/lessons/[id]/edit/page.tsx`. CSR only.

**P12-3 — Tests**

- `tests/e2e/admin-edit-delete.spec.ts` — edit flow: form pre-populated; partial update; 409 → English conflict toast.

---

## Phase 13 — CI + Quality Gates

**Ref:** Backend Freeze v1.2 §7 Phase 3 · Frontend Freeze v1.2 §10
**Estimated time:** 0.5 day
**Blocker:** Phases 2–12 complete.

**P13-1 — GitHub Actions CI workflow**

- Create `.github/workflows/ci.yml`. Triggers: push and pull_request on all branches.
- Jobs (in order):

```yaml
1. type-check:       npx tsc --noEmit
2. lint:             eslint src/   (NOT next lint — removed in Next.js 16)
3. unit-tests:       vitest run tests/unit/
4. component-tests:  vitest run tests/component/
5. integration-tests: vitest run tests/integration/
6. contract-tests:
   - start: prism mock docs/openapi.yaml --port 4010 & _(path: docs/openapi.yaml)_
   - wait:  sleep 3
   - run:   vitest run tests/contract/
7. build:            next build   (Turbopack, default in Next.js 16)
8. lighthouse-ci:    @lhci/cli autorun (against Vercel preview deployment)
9. bundle-check:     @next/bundle-analyzer
```

- CI fails on: TypeScript error, lint error (including no-explicit-any violations), any test failure, Lighthouse budget exceeded, bundle budget exceeded.

**P13-2 — ESLint config (`eslint.config.mjs`)**

Re-enable rules per CR-001: _(CR-001: Backend Freeze v1.2 §9)_

```js
'@typescript-eslint/no-explicit-any': 'error',    // was 'off'
'@typescript-eslint/no-unused-vars': 'error',     // was 'off'
'no-empty': 'error',                              // was 'off'
```

Confirm zero violations across all source files. Fix any remaining `as any` casts before CI gates pass.

**P13-3 — lighthouserc.js**

- LCP < 2500ms, CLS < 0.1, INP < 200ms, a11y ≥ 90.
- Target URLs: Vercel preview deployment.

**P13-4 — Contract test**

- `tests/contract/openapi-compliance.test.ts` — all 7 endpoint responses conform to OpenAPI schemas.

**P13-5 — Coverage thresholds**

- `src/lib/` ≥ 80%, `src/schemas/` 100%.
- `vitest run --coverage` added to CI.

**P13-6 — README sync**

- README documents: project setup, env vars required, `npm run mock` for Prism, how to add lessons.
- **No reference to `/api/docs` endpoint** (does not exist). _(CR-001)_
- Smoke test checklist updated (7 items — no `/api/docs` item).

### Checkpoint P13

- [ ] CI workflow passes on `main` with zero failures.
- [ ] `tsc --noEmit` passes.
- [ ] `eslint src/` passes — no-explicit-any: 0 violations.
- [ ] All test suites pass.
- [ ] Lighthouse LCP/CLS/INP/a11y budgets green.
- [ ] Bundle budgets: `/` < 80KB, `/lessons/[id]` < 80KB, `/admin/*` < 120KB.
- [ ] No Google Fonts requests detected by Lighthouse.
- [ ] README has no `/api/docs` reference.

---

## Phase 14 — Deployment + Data Population

**Ref:** Backend Freeze v1.2 §10 · Frontend Freeze v1.2 §12
**Estimated time:** 0.5 day setup + ~22 hours data entry
**Blocker:** Phase 13 CI all green.

**P14-1 — Vercel environment variables**

Set all env vars from `.env.example` in Vercel dashboard (production + preview):

```
ADMIN_PASSWORD               (≥16 chars)
SESSION_SECRET               (≥32 chars)
SESSION_MAX_AGE_SECONDS=86400
GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME, GITHUB_FILE_PATH, GITHUB_BRANCH
IA_ACCESS_KEY, IA_SECRET_KEY, IA_COLLECTION_IDENTIFIER, IA_S3_ENDPOINT
UPLOAD_PRESIGN_EXPIRY_SECONDS=900
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
REVALIDATION_SECRET          (≥32 chars)
NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_BASE_URL
NEXT_PUBLIC_VERCEL_ANALYTICS_ID  (optional)
NODE_ENV=production
```

**ALLOWED_ORIGINS: do NOT set** (removed from env schema in v1.2). _(CR-001)_

**P14-2 — Production deployment**

- Push `main` → Vercel auto-deploys. Confirm in Vercel dashboard.

**P14-3 — Smoke test (production)**

Run all items against production URL:

- [ ] `GET /api/v1/lessons` → 200, `meta.total` present, `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` header present.
- [ ] `GET /api/v1/lessons/1` → 200 or 404 (if not yet populated).
- [ ] `POST /api/v1/admin/auth` with wrong password → 401.
- [ ] `POST /api/v1/admin/auth` with correct password → 200, Set-Cookie present.
- [ ] `GET /api/v1/admin/lessons` with no cookie → 401.
- [ ] Visit `/admin` without session → redirect to `/admin/login`.
- [ ] Visit `/admin/login` with valid session → redirect to `/admin`.
- [ ] `POST /api/v1/admin/upload/presign` with valid session + body → 200 with `presigned_url`, `archive_url`, `filename`. _(Vercel Upload Fix)_
- [ ] `POST /api/v1/admin/upload/presign` with no session → 401. _(Vercel Upload Fix)_
- [ ] `GET /api/v1/admin/upload` or `POST /api/v1/admin/upload` (old endpoint) → 404. _(Vercel Upload Fix — old route deleted)_
- [ ] `GET /api/revalidate` → 405 (method not allowed). _(CR-001)_
- [ ] `POST /api/revalidate` with no auth header → 401. _(CR-001)_
- [ ] Network tab on `/`: no requests to fonts.googleapis.com or fonts.gstatic.com. _(CR-001)_

**P14-4 — First lesson upload (end-to-end verification)**

- Log into admin panel in production.
- Upload one audio file (smallest available, Volume 1).
- Complete Step 2 form.
- Verify lesson appears on site within 90 seconds (ISR revalidation).

**P14-5 — Bulk data entry**

- 648 lessons via admin panel. Estimated ~22 hours (batch by volume: V1 213, V2 178, V3 146, V4 111).
- Permission from Sheikh Dr. Abdul Hakim Al-Sa'di confirmed before this step.

**P14-6 — Vercel Speed Insights**

- Confirm `@vercel/speed-insights/next` active in layout.tsx.
- Verify Core Web Vitals appear in Vercel dashboard after first real user visit.

### Final Acceptance Checkpoint

- [ ] All smoke test items pass against production URL.
- [ ] Admin can add, edit, delete a lesson end-to-end in production.
- [ ] Lesson appears on site within 90 seconds of creation.
- [ ] Vercel Analytics shows p95 latency < 200ms on GET /api/v1/lessons.
- [ ] Auth lockout after 5 failed attempts (verified ).
- [ ] No Google Fonts requests in production network tab.
- [ ] No `as any` in production build (ESLint CI gate confirmed it).
- [ ] Permission from Sheikh confirmed (pre-launch gate).
- [ ] All 648 lessons entered and browsable (launch gate).

---

## Task Summary Table

| Phase | What                            | Deps           | Est. Time        |
| ----- | ------------------------------- | -------------- | ---------------- |
| P0    | External accounts               | None           | 1–2h             |
| P1    | Scaffold + foundation           | P0             | 1 day            |
| P2    | Backend: public read API        | P1             | 1 day            |
| P3    | Backend: auth + proxy           | P1             | 0.5 day          |
| P4    | Backend: admin CRUD             | P3             | 1 day            |
| P5    | Backend: IA upload              | P3             | 0.5 day          |
| P6    | Frontend: design system         | P1             | 1 day            |
| P7    | Frontend: lesson browser        | P6             | 1 day            |
| P8    | Frontend: lesson detail + audio | P6             | 1 day            |
| P9    | Frontend: admin login           | P6, P3         | 0.5 day          |
| P10   | Frontend: admin list + delete   | P6, P9, P4     | 1 day            |
| P11   | Frontend: add lesson wizard     | P6, P9, P4, P5 | 1 day            |
| P12   | Frontend: edit lesson           | P6, P9, P4     | 0.5 day          |
| P13   | CI + quality gates              | P2–P12         | 0.5 day          |
| P14   | Deploy + data entry             | P13            | 0.5d + ~22h data |

**Total code work: ~11 days**
**Data entry: ~22 hours**
**Total calendar time: 2–3 weeks**

---

## Blockers Register

| ID  | Blocker                                | Blocks                 | Resolution                                           |
| --- | -------------------------------------- | ---------------------- | ---------------------------------------------------- |
| B1  | IA collection not created              | P5 upload (production) | Create collection before P14                         |
| B2  | Sheikh permission not confirmed        | P14-5 data entry       | Confirm before bulk upload                           |
| B3  | GitHub PAT expired or wrong scope      | P2, P4                 | Rotate PAT with `repo` scope                         |
| B4  | Upstash free tier exhausted            | Rate limiting          | Upgrade tier or reduce load                          |
| B5  | Vercel bandwidth exceeded              | Public site            | Monitor dashboard; unlikely at <500 DAU              |
| B6  | Backend acceptance checkpoint failures | Phases 10–12           | Do not connect frontend until all backend tests pass |
| B7  | React 19 breaking change in dependency | P1                     | Fix typing regression before proceeding              |

---

## Change Control Gate

Any deviation implying a change to:

- the API contract (endpoint, field, status code)
- the data schema (`lessons.json` shape)
- the authentication model
- the scope (add or remove features)
- the stack (swap libraries)

**must be raised as a Change Request against Backend Freeze v1.2 and/or Frontend Freeze v1.2 before implementation begins.**

Do not implement then ask for approval. Stop → document the CR → get approval → bump freeze version → proceed.

---

## Version History

- v1.2 (2026-05-10): Vercel Upload Fix applied. Phase 5 fully rewritten — `uploadToIA()` streaming deleted; `generatePresignedUrl()` presign-only architecture implemented; `POST /api/v1/admin/upload/route.ts` deleted; `POST /api/v1/admin/upload/presign/route.ts` created. P3-2 rate-limiter renamed `checkUploadRateLimit` → `checkPresignRateLimit` (matches Backend Freeze v1.2 TASK 9). Backend Acceptance Checkpoint updated: old streaming test replaced by presign functional test. Phase 11 (P11-1) Step 1 rewritten to presign → XHR PUT flow with CORS fallback and presign 429/422/502 handling. Phase 11 (P11-2) tests updated: 413 server response test removed (client-side guard only); presign and CORS fallback tests added. Phase 12 operationId corrected: `getLesson` → `getLessonById`. P14-1 Vercel env var list: `UPLOAD_PRESIGN_EXPIRY_SECONDS=900` added. P14-3 smoke tests: presign endpoint tests added; old multipart upload test removed. P1-11 CSP: `default-src 'self'` and `img-src 'self' data:'` added to production policy; `img-src 'self' data: blob:` added to development policy (aligns with Frontend Freeze v1.2 §8). P6-1 and P6-2: openapi.yaml path corrected `./openapi.yaml` → `docs/openapi.yaml`. P13-1 CI: same path correction. Phase 2 operationId corrected: `getLesson` → `getLessonById`. `stale-while-revalidate` corrected: 30 → 300. `fasl` filter added to Phase 2 task body and checkpoint.
- v1.1 (2026-05-09): Updated to govern Backend Freeze v1.2 and Frontend Freeze v1.2 (CR-001). Key task changes: P1-1 React 19 upgrade; P1-2 tsconfig no allowJs/ignoreDeprecations; P1-3 ALLOWED_ORIGINS removed from env; P1-10 system fonts (no Google Fonts); P1-11 split CSP (nonce-based prod, relaxed dev); P1-13 layout.tsx lang="en" no Google Fonts link; P2-1 github.ts fetch with next tags; P2-2 meta.total in response; P3-3 proxy.ts full iron-session for page routes; P3-4 /api/revalidate POST+Authorization+nonce; P4-1/2/3 revalidation fire-and-forget via POST; P5-1 no Buffer.concat streaming; P5-2 req.formData() not formidable; P6-4 Pagination totalPages from meta.total; P7-1 totalPages from meta.total; P13-2 ESLint no-explicit-any re-enabled; P13-6 README no /api/docs; P14-1 ALLOWED_ORIGINS removed; P14-3 smoke tests updated.
- v1.0 (2026-04-30): Initial build plan. Backend Freeze v1.1 · Frontend Freeze v1.1 · OpenAPI v1.0.0.
