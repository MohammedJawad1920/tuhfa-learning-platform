# BUILD PLAN: Tuhfat al-Muhtaj Learning Platform

**Version:** 1.0
**Date:** 2026-04-30
**Governed by:** Backend Freeze v1.1 · Frontend Freeze v1.1 · OpenAPI v1.0.0
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
    ↓  (backend acceptance checkpoint — ALL must pass before any real API calls in frontend)
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

- Phase 6 (Frontend Foundation) can start in parallel with Phase 2 using the Prism mock server.
- Phase 7 and 8 can use Prism mock until Phase 2 backend is complete.
- Phase 9 can use Prism mock until Phase 3 is complete.
- Phases 10–12 must wait for Phases 4–5 to be complete and tested.

**Hard blockers (nothing downstream can start until resolved):**

- Phase 0 must be fully complete before Phase 1.
- Backend acceptance checkpoint (end of Phase 5) must pass before Phases 10–12 connect to the real API.
- Phase 13 CI gates must pass before Phase 14.

---

## Phase 0 — Prerequisites

**Ref:** Backend Freeze v1.1 Section 0 Assumptions
**Estimated time:** 1–2 hours
**No code written in this phase.**

### Tasks

**P0-1 — GitHub repository**

- Create a new GitHub repository (public or private).
- Confirm GITHUB_TOKEN (Personal Access Token) with `repo` scope is generated and stored securely.
- Confirm `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_BRANCH=main` values are known.

**P0-2 — Internet Archive account**

- Create account at archive.org.
- Generate S3-compatible access keys (IA_ACCESS_KEY, IA_SECRET_KEY) from https://archive.org/account/s3.php.
- Create the collection item with identifier matching `IA_COLLECTION_IDENTIFIER` value (e.g., `tuhfat-al-muhtaj-abdulhakim-saadi`).
- Confirm the collection is accessible at `https://archive.org/details/{IA_COLLECTION_IDENTIFIER}`.

**P0-3 — Upstash Redis**

- Create a free Upstash account at upstash.com.
- Create a new Redis database (free tier, 10,000 req/day).
- Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

**P0-4 — Vercel account**

- Create Vercel account if not already linked.
- Link Vercel to the GitHub repository created in P0-1.
- Do NOT configure environment variables yet — that is Phase 14.

### Checkpoint P0

- [ ] GitHub PAT generated, `repo` scope confirmed.
- [ ] IA account exists, S3 keys generated, collection identifier created.
- [ ] Upstash Redis instance live, REST URL and token available.
- [ ] Vercel account linked to GitHub repo.

---

## Phase 1 — Project Scaffold + Foundation

**Ref:** Backend Freeze v1.1 Sections 1.5, 1.6, 2, 8 · Frontend Freeze v1.1 Sections 1.5, 1.6, 5, 8, 11
**Estimated time:** 1 day
**Blocker:** Phase 0 complete.

### Tasks

**P1-1 — Repository initialisation**

- Bootstrap with `npx create-next-app@latest` selecting: TypeScript, App Router, Tailwind CSS, `src/` directory, import alias `@/*`.
- Set Node.js version to 22 LTS in `.nvmrc` and `package.json` engines field.
- Commit initial scaffold to `main` branch.

**P1-2 — TypeScript strict config**

- Set `strict: true`, `noEmit: true` (for CI), `paths: { "@/*": ["./src/*"] }` in `tsconfig.json`.
- Confirm `tsc --noEmit` passes on clean scaffold.

**P1-3 — Environment configuration**

- Create `.env.example` with all vars from Backend Freeze v1.1 Section 1.5 and Frontend Freeze v1.1 Section 1.5.
- Create `.env.local` (gitignored) with local dev values.
- Add `.env.local` to `.gitignore`.

**P1-4 — Zod env validation**

- Create `src/config/env.ts`.
- Validate all required env vars at module import time using Zod.
- Rules: `ADMIN_PASSWORD` >= 16 chars, `SESSION_SECRET` >= 32 chars, `UPSTASH_REDIS_REST_URL` valid HTTPS URL.
- App must refuse to start (throw at import time) if any required var is missing or invalid.
- Unit test: `tests/unit/env.test.ts` — missing var throws, short password throws, valid config passes.

**P1-5 — iron-session config**

- Create `src/config/session.ts` with iron-session options: `cookieName: 'tuhfa_session'`, `password: SESSION_SECRET`, `cookieOptions: { httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'strict', maxAge: SESSION_MAX_AGE_SECONDS }`.

**P1-6 — Shared types**

- Create `src/types/api.ts` — `ApiResponse<T>`, `ApiError` types matching the global error shape from Backend Freeze Section 3.
- Create `src/types/lesson.ts` — `Lesson`, `Chapter`, `LessonCreateBody`, `LessonUpdateBody` types matching the data schema from Backend Freeze Section 2.

**P1-7 — Zod schemas**

- Create `src/schemas/lesson.schema.ts` — Zod schemas for LessonCreateSchema, LessonUpdateSchema enforcing all invariants from Backend Freeze Section 2 (archive_url pattern, volume enum, title_ar non-empty, etc.).
- Create `src/schemas/auth.schema.ts` — Zod schema for `{ password: z.string().min(1).max(128) }`.
- Unit test: `tests/unit/lesson-schema.test.ts` — valid passes, invalid archive_url fails, volume=5 fails, empty title_ar fails, unknown fields stripped.

**P1-8 — Shared utilities**

- Create `src/utils/request-id.ts` — UUID v4 generator (use Node.js `crypto.randomUUID()`).
- Create `src/utils/response.ts` — `buildSuccess(data, meta?)` and `buildError(code, message, details?, status?)` helpers that always include `requestId` and `timestamp`.
- Unit test: `tests/unit/response.test.ts` — buildError always includes requestId (UUID v4 format) and timestamp (ISO 8601).

**P1-9 — Logger**

- Create `src/lib/logger.ts` — pino instance with required fields: `requestId`, `route`, `method`, `statusCode`, `latencyMs`, `timestamp`.
- PII rules: never log ADMIN_PASSWORD, SESSION_SECRET, GITHUB_TOKEN, IA_ACCESS_KEY, IA_SECRET_KEY, REVALIDATION_SECRET, cookie values.

**P1-10 — Tailwind design tokens**

- Extend `tailwind.config.ts` with all color tokens from Frontend Freeze Section 5: `primary`, `primary-hover`, `surface`, `surface-card`, `border`, `text-primary`, `text-secondary`, `text-arabic`, `error`, `success`, `warning`.
- Add font families: `noto-naskh-arabic`, `noto-sans-malayalam`, `inter`.
- Type scale: extend with `display`, `heading`, `subheading` sizes from freeze.

**P1-11 — next.config.ts**

- Add CSP headers from Frontend Freeze Section 8 (locked policy).
- Add `X-Frame-Options: DENY`.
- No ISR config here — ISR `revalidate` is set per route in page files.

**P1-12 — lessons.json seed**

- Create `data/lessons.json` with initial structure:
  ```json
  { "version": 1, "last_updated": "2026-04-30T00:00:00.000Z", "lessons": [] }
  ```
- Commit to `main` branch.

**P1-13 — OpenAPI type generation**

- Add `openapi-typescript` to devDependencies.
- Add `package.json` script: `"gen:types": "openapi-typescript openapi.yaml -o src/types/api.ts"`.
- Run script, commit generated `src/types/api.ts`.
- This file is the single source of typed API surface — do not hand-edit.

**P1-14 — Prism mock server**

- Add `@stoplight/prism-cli` to devDependencies.
- Add script: `"mock": "prism mock ./openapi.yaml --port 4010"`.
- Verify mock server starts and responds to `GET http://localhost:4010/api/v1/lessons`.
- This unblocks frontend development before backend API routes are implemented.

**P1-15 — openapi-fetch client**

- Create `src/api/client.ts` — openapi-fetch client pointing to `NEXT_PUBLIC_API_BASE_URL`.
- Create `src/api/endpoints.ts` — typed query/mutation functions. No raw `fetch` calls in components — all API calls go through this file.

### Checkpoint P1

- [ ] `npx tsc --noEmit` passes with zero errors.
- [ ] `next dev` starts without errors on `.env.local`.
- [ ] Zod env validation throws if `ADMIN_PASSWORD` is missing from env.
- [ ] `data/lessons.json` exists with correct schema structure.
- [ ] `npm run mock` starts Prism at port 4010. `GET http://localhost:4010/api/v1/lessons` returns 200 matching OpenAPI schema.
- [ ] All unit tests in Phase 1 pass: `vitest run tests/unit/`.

---

## Phase 2 — Backend: Public Read API

**Ref:** Backend Freeze v1.1 Sections 3, 4, 5, 6 · OpenAPI `GET /api/v1/lessons`, `GET /api/v1/lessons/{id}`
**Estimated time:** 1 day
**Blocker:** Phase 1 complete.

### Tasks

**P2-1 — GitHub client**

- Create `src/lib/github.ts`.
- Implement `fetchLessons()`: GET `/repos/{owner}/{repo}/contents/{path}` → base64 decode → parse JSON → return `{ data: LessonsFile, sha: string }`. Timeout: 10,000ms. 1 retry after 1,000ms on 5xx. Throws `UpstreamError` on failure.
- Implement `updateLessons(lessons, sha, commitMessage)`: base64 encode → PUT to GitHub Contents API using SHA. Throws `ConflictError` on 409, `UpstreamError` on other failures.
- Unit test: `tests/unit/github.test.ts` — fetchLessons returns parsed JSON; updateLessons calls PUT with correct SHA; GitHub 409 throws ConflictError; network error throws UpstreamError. Use MSW to mock GitHub API.

**P2-2 — Rate limit helpers**

- Create `src/lib/rate-limit.ts`.
- Implement `publicRateLimit` (120/min/IP) and `authRateLimit` (5/15min/IP) and `adminWriteRateLimit` (60/min/IP) and `uploadRateLimit` (10/hour/IP) using `@upstash/ratelimit` + `@upstash/redis`.
- IP extraction: use Vercel's trusted `x-forwarded-for` header — do not trust user-supplied IP headers.
- Unit test: `tests/unit/rate-limit.test.ts` — public limit allows 120 and blocks 121st; auth limit blocks 6th attempt within 15min.

**P2-3 — GET /api/v1/lessons**

- Create `src/app/api/v1/lessons/route.ts`.
- Apply `publicRateLimit`. Return 429 with `Retry-After` header on limit exceeded.
- Parse and validate query params with Zod: `volume` (enum 1–4), `kitab`, `bab`, `search` (min 2, max 100), `limit` (1–200, default 50), `offset` (≥0, default 0). Return 400 on invalid param type, 422 on Zod validation failure with field details.
- Fetch `lessons.json` via `fetchLessons()`. Return 502 if GitHub unreachable.
- Apply filters in-memory: volume exact match, kitab exact match, bab exact match, search substring match on `title_ar`.
- Apply pagination: slice array by offset and limit.
- Return 200 with `{ data: { lessons }, meta: { total, limit, offset, requestId, timestamp } }`.
- Set `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` header.
- Integration test: `tests/integration/lessons.test.ts` — 200 all lessons; volume filter; search filter; limit+offset pagination; invalid volume → 400; search < 2 chars → 422; rate limit → 429; GitHub down → 502.

**P2-4 — GET /api/v1/lessons/[id]**

- Create `src/app/api/v1/lessons/[id]/route.ts`.
- Apply `publicRateLimit`.
- Parse `id` — must be a positive integer. Return 400 if not.
- Fetch `lessons.json`, find lesson by id. Return 404 if not found.
- Return 200 with `{ data: { lesson }, meta: { requestId, timestamp } }`.
- Integration test: `tests/integration/lessons.test.ts` — known ID → 200 correct lesson; unknown ID → 404; string ID → 400; GitHub down → 502.

### Checkpoint P2

- [ ] GET /api/v1/lessons: filters work, pagination works, Cache-Control header present.
- [ ] GET /api/v1/lessons/[id]: correct lesson returned or 404.
- [ ] Both routes: rate limit returns 429 with Retry-After header.
- [ ] Both routes: GitHub down → 502.
- [ ] All integration tests pass: `vitest run tests/integration/lessons.test.ts`.
- [ ] Contract test passes against Prism: `vitest run tests/contract/`.

---

## Phase 3 — Backend: Auth + Proxy

**Ref:** Backend Freeze v1.1 Sections 3, 4, 6 · OpenAPI `POST /api/v1/admin/auth`
**Estimated time:** 0.5 days
**Blocker:** Phase 1 complete.

### Tasks

**P3-1 — POST /api/v1/admin/auth**

- Create `src/app/api/v1/admin/auth/route.ts`.
- Apply `authRateLimit` (5/15min/IP). Return 429 before any password processing if limit exceeded.
- Parse body with `AuthSchema`. Return 422 on validation failure.
- Compare password using `crypto.timingSafeEqual(Buffer.from(input), Buffer.from(ADMIN_PASSWORD))`. Both buffers must be padded to the same length to avoid length-based timing leak.
- On failure: log attempt at WARN level (no password in log), return 401 `INVALID_CREDENTIALS`.
- On success: create iron-session `{ authenticated: true, createdAt: Date.now() }`, save session, return 200 `{ data: { authenticated: true }, meta: { requestId, timestamp } }`. Cookie must be HttpOnly, Secure (production), SameSite=Strict, Max-Age=86400.
- Integration test: `tests/integration/admin-auth.test.ts` — correct password → 200 + Set-Cookie; wrong password → 401; missing password → 422; 6th attempt within 15min → 429; cookie flags verified (HttpOnly, SameSite=Strict).

**P3-2 — proxy.ts (Next.js 16)**

- Create `src/proxy.ts` (Next.js 16 — NOT middleware.ts).
- Export function named `proxy` (Next.js 16 requirement).
- Matcher config: `/admin/:path*` and `/api/v1/admin/:path*`.
- For `/admin/*` routes (frontend UI): if `tuhfa_session` cookie absent → redirect to `/admin/login`. Exception: `/admin/login` itself — allow through.
- For `/api/v1/admin/*` routes (except POST /api/v1/admin/auth): read iron-session cookie. If absent or invalid signature or session.authenticated !== true or session expired → return 401 JSON error using `buildError()`.
- Session expiry check: `Date.now() - session.createdAt > SESSION_MAX_AGE_SECONDS * 1000`.

### Checkpoint P3

- [ ] POST /api/v1/admin/auth: correct password → 200 + cookie with correct flags.
- [ ] POST /api/v1/admin/auth: wrong password → 401 generic message (no hint of what was wrong).
- [ ] POST /api/v1/admin/auth: 6th attempt in 15min → 429.
- [ ] proxy.ts: unauthenticated GET /api/v1/admin/lessons → 401 JSON.
- [ ] proxy.ts: unauthenticated /admin route → redirect to /admin/login.
- [ ] All integration tests pass: `vitest run tests/integration/admin-auth.test.ts`.

---

## Phase 4 — Backend: Admin Lesson CRUD

**Ref:** Backend Freeze v1.1 Sections 2, 2.1, 3, 4, 6 · OpenAPI `POST/PUT/DELETE /api/v1/admin/lessons/{id}`
**Estimated time:** 1 day
**Blocker:** Phase 3 complete.

### Tasks

**P4-1 — POST /api/v1/admin/lessons**

- Create `src/app/api/v1/admin/lessons/route.ts`.
- Apply `adminWriteRateLimit` (60/min/IP). proxy.ts already verified session before this runs.
- Validate request body with `LessonCreateSchema`. Return 422 on failure with field-level details.
- Implement Create Lesson flow exactly as specified in Backend Freeze Section 4:
  1. Fetch lessons.json + SHA from GitHub.
  2. Check uniqueness: `volume` + `lesson_number`. Return 409 `DUPLICATE_LESSON_NUMBER` if duplicate found.
  3. Assign `id = max(existing ids) + 1` (or 1 if empty). `id` is NEVER accepted from client body — strip if present.
  4. Append lesson, sort array (volume ASC, lesson_number ASC), update `last_updated`.
  5. PUT to GitHub using SHA. Return 409 `CONCURRENT_EDIT_CONFLICT` on GitHub 409. Return 502 on GitHub unreachable.
  6. Fire-and-forget revalidation: `fetch('/api/revalidate?secret=...&path=/')` and `fetch('/api/revalidate?secret=...&path=/lessons/{id}')`.
  7. Return 201 with new lesson object.
- Audit log at INFO level: `action: 'lesson.create'`, `lessonId`, `volume`, `lesson_number`, `requestId`.
- Integration test: `tests/integration/admin-lessons.test.ts` — valid body → 201 with auto-assigned id; duplicate lesson_number → 409 DUPLICATE; GitHub 409 → 409 CONCURRENT_EDIT_CONFLICT; GitHub down → 502; no cookie → 401; lessons sorted after creation.

**P4-2 — PUT /api/v1/admin/lessons/[id]**

- Add PUT handler to `src/app/api/v1/admin/lessons/[id]/route.ts`.
- Apply `adminWriteRateLimit`.
- Validate `id` param (positive integer). Return 400 if not.
- Validate body with `LessonUpdateSchema` (all fields optional, minProperties: 1). Return 422 on failure.
- Reject any attempt to update `id`, `volume`, `lesson_number` — these fields are immutable. Strip silently if present in body.
- Fetch lessons.json + SHA. Return 404 if lesson not found.
- Merge only provided fields onto existing lesson object.
- PUT to GitHub using SHA. Return 409 on conflict. Return 502 on unreachable.
- Fire-and-forget revalidation.
- Return 200 with updated lesson object.
- Audit log: `action: 'lesson.update'`.
- Integration test: partial update returns 200 with merged lesson; unknown id → 404; GitHub conflict → 409; immutable fields ignored.

**P4-3 — DELETE /api/v1/admin/lessons/[id]**

- Add DELETE handler to `src/app/api/v1/admin/lessons/[id]/route.ts`.
- Apply `adminWriteRateLimit`.
- Validate `id` param. Return 400 if not integer.
- Fetch lessons.json + SHA. Return 404 if lesson not found.
- Filter lesson out of array. PUT to GitHub using SHA. Return 409 on conflict. Return 502 on unreachable.
- Fire-and-forget revalidation.
- Return 204 No Content.
- Audit log: `action: 'lesson.delete'`.
- Integration test: existing id → 204; subsequent GET /lessons/{id} → 404; unknown id → 404; SHA conflict → 409.

**P4-4 — ISR revalidation webhook**

- Create `src/app/api/revalidate/route.ts`.
- GET handler: validate `secret` query param against `REVALIDATION_SECRET` using `crypto.timingSafeEqual`. Return 401 on mismatch.
- Call `revalidateTag('lessons', 'minutes')` (Next.js 16 — two-argument form required).
- Return 200 `{ revalidated: true }`.

### Checkpoint P4

- [ ] POST /api/v1/admin/lessons: creates lesson with auto-assigned id, commits to GitHub.
- [ ] POST /api/v1/admin/lessons: duplicate lesson_number in same volume → 409.
- [ ] PUT /api/v1/admin/lessons/[id]: partial update correct; unknown id → 404.
- [ ] DELETE /api/v1/admin/lessons/[id]: 204 on success; unknown id → 404.
- [ ] All routes: 401 if session cookie absent or invalid.
- [ ] All routes: GitHub SHA conflict → 409 CONCURRENT_EDIT_CONFLICT.
- [ ] Revalidation webhook: correct secret → 200; wrong secret → 401.
- [ ] All integration tests pass: `vitest run tests/integration/admin-lessons.test.ts`.

---

## Phase 5 — Backend: Internet Archive Upload

**Ref:** Backend Freeze v1.1 Sections 3, 4, 5 · OpenAPI `POST /api/v1/admin/upload`
**Estimated time:** 0.5 days
**Blocker:** Phase 3 complete.

### Tasks

**P5-1 — Internet Archive client**

- Create `src/lib/internet-archive.ts`.
- Initialize `S3Client` with `endpoint: IA_S3_ENDPOINT`, `credentials: { accessKeyId: IA_ACCESS_KEY, secretAccessKey: IA_SECRET_KEY }`, `region: 'us-east-1'` (required by SDK, ignored by IA).
- Implement `uploadToIA(fileStream, filename, contentType, metadata)`: `PutObjectCommand` with `Bucket: IA_COLLECTION_IDENTIFIER`. Upload timeout: 300,000ms. Throws `UploadError` on failure.
- Filename generation: `lesson-v{volume}-{String(lesson_number).padStart(3, '0')}.mp3`.
- Unit test: `tests/unit/internet-archive.test.ts` — uploadToIA calls PutObject with correct Bucket/Key; timeout error throws UploadError; generates correct filename (lesson-v1-214.mp3 for volume=1, lesson_number=214). Use MSW or jest.spyOn to mock S3Client.

**P5-2 — POST /api/v1/admin/upload**

- Create `src/app/api/v1/admin/upload/route.ts`.
- Apply `uploadRateLimit` (10/hour/IP).
- Parse multipart body with `formidable`. Max file size: 500MB. Return 413 `FILE_TOO_LARGE` if exceeded.
- Validate form fields: `file` present, `volume` ∈ {"1","2","3","4"}, `lesson_number` matches pattern `^[1-9][0-9]*$`. Return 400 `MISSING_FILE` if file absent, 422 on field validation failure.
- Generate filename using naming convention.
- Call `uploadToIA()`. Return 502 `UPLOAD_FAILED` on failure.
- Delete temp file from `/tmp` after upload (formidable temp storage).
- Construct `archive_url`: `https://archive.org/download/{IA_COLLECTION_IDENTIFIER}/{filename}`.
- Return 200 `{ data: { archive_url, filename, size_bytes }, meta: { requestId, timestamp } }`.
- Audit log: `action: 'audio.upload'`.
- Integration test: `tests/integration/admin-upload.test.ts` — valid upload → 200 with archive_url; missing file → 400; file > 500MB → 413; IA unreachable → 502; no session → 401; filename correct format.

### Backend Acceptance Checkpoint (end of Phase 5)

**All items below must pass before frontend phases 10–12 connect to the real API.**

- [ ] GET /api/v1/lessons: all filters work, pagination works, Cache-Control present.
- [ ] GET /api/v1/lessons/[id]: correct lesson or 404.
- [ ] POST /api/v1/admin/auth: correct → 200 + cookie; wrong → 401; brute-force → 429.
- [ ] POST /api/v1/admin/lessons: create with auto-id; duplicate → 409; GitHub conflict → 409.
- [ ] PUT /api/v1/admin/lessons/[id]: partial update; unknown → 404.
- [ ] DELETE /api/v1/admin/lessons/[id]: 204; unknown → 404.
- [ ] POST /api/v1/admin/upload: 200 with archive_url; 413; 502 on IA down.
- [ ] All admin routes: 401 if session missing or invalid.
- [ ] ADMIN_PASSWORD compared via `crypto.timingSafeEqual` (not `===`).
- [ ] Session cookie: HttpOnly, Secure (production), SameSite=Strict.
- [ ] No secrets, stack traces, or internal paths in any error response body.
- [ ] Error shape on ALL responses matches the global error format from Backend Freeze Section 3.
- [ ] Rate limiting enforced on all routes (public: 120/min, auth: 5/15min, admin: 60/min, upload: 10/hr).
- [ ] Contract tests pass against all 7 OpenAPI endpoints: `vitest run tests/contract/`.
- [ ] All unit + integration tests pass: `vitest run tests/unit/ tests/integration/`.

---

## Phase 6 — Frontend: Design System + Foundation

**Ref:** Frontend Freeze v1.1 Sections 1.6, 3, 4, 5, 6, 8, 11
**Estimated time:** 1 day
**Blocker:** Phase 1 complete. Can run in parallel with Phases 2–5 using Prism mock.

### Tasks

**P6-1 — Root layout**

- Create `src/app/layout.tsx`.
- Add Google Fonts `<link>` preconnect and stylesheet for Noto Naskh Arabic (weights 400, 700), Noto Sans Malayalam (weights 400, 600), Inter (weights 400, 500, 600). Use `font-display: swap`.
- Wrap children in TanStack Query `QueryClientProvider`.
- Set `<html lang="ar">` as default (visitor pages are Arabic-primary).
- Add CSP and X-Frame-Options via `next.config.ts` headers (already done in P1-11 — verify here).

**P6-2 — Utility: cn()**

- Create `src/utils/cn.ts` — `clsx` + `twMerge` utility for conditional classnames.

**P6-3 — Utility: format helpers**

- Create `src/lib/format.ts`.
- `formatDuration(seconds: number): string` — converts duration_seconds to `HH:MM:SS` or `MM:SS`.
- `formatDate(dateStr: string): string` — formats YYYY-MM-DD to locale-appropriate display.
- Unit test: `tests/unit/format.test.ts`.

**P6-4 — Progress types**

- Create `src/types/progress.ts` — `LessonProgress`, `ProgressStore` types matching localStorage schema from Frontend Freeze Section 4.
  ```ts
  type LessonProgress = {
    completed: boolean;
    positionSeconds: number;
    lastPlayedAt: string;
  };
  type ProgressStore = Record<number, LessonProgress>;
  ```

**P6-5 — UI components**
Build all components from Frontend Freeze Section 5 component inventory. Each must:

- Use design tokens from `tailwind.config.ts` only (no hardcoded hex values).
- Have `focus-visible:ring-2` for keyboard focus.
- Pass axe-core in development.
- Have a component test in `tests/component/`.

Components (build in this order — simpler first):

1. `Spinner` — CSS-only, no JS.
2. `Badge` — completed status display.
3. `Button` — primary, secondary, danger, ghost variants. `disabled` state. Loading state (shows Spinner, disables click).
4. `Input` — text, password, number, date, file variants.
5. `Select`
6. `Textarea`
7. `Label + FieldError` — form field wrapper, `role="alert"` on FieldError.
8. `Pagination` — Previous/Next + page numbers. `aria-current="page"` on active. `aria-label` on buttons.
9. `Toast` — success, error, warning variants. Top-right position. Auto-dismiss 5s. `role="status"` (success) or `role="alert"` (error).
10. `Modal` — focus trap on open. `role="dialog"`, `aria-modal="true"`, `aria-labelledby`. Escape key closes. Focus returns to trigger on close.
11. `ProgressBar` — for XHR upload. `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.

### Checkpoint P6

- [ ] `tsc --noEmit` passes.
- [ ] All 11 UI components render without errors.
- [ ] `axe-core` finds zero violations on each component.
- [ ] All component tests pass: `vitest run tests/component/`.
- [ ] Design tokens used consistently — no hardcoded hex values in component files.

---

## Phase 7 — Frontend: Lesson Browser (`/`)

**Ref:** Frontend Freeze v1.1 Section 2 (Lesson Browser screen) · OpenAPI `GET /api/v1/lessons`
**Estimated time:** 1 day
**Blocker:** Phase 6 complete. Uses Prism mock until Phase 2 backend is verified.

### Tasks

**P7-1 — Lesson data utilities**

- Create `src/lib/lessons.ts`.
- `mergeLessonPages(pages: Lesson[][]): Lesson[]` — merge 4-call results, deduplicate by id, sort volume ASC, lesson_number ASC.
- `buildChapterHierarchy(lessons: Lesson[]): ChapterHierarchy` — extract unique kitab, bab, fasl values for ChapterNav.
- Unit test: `tests/unit/lessons.test.ts` — merge deduplicates correctly; sort order correct; chapter hierarchy built from lesson array.

**P7-2 — useLessons hook**

- Create `src/hooks/useLessons.ts`.
- `useAllLessons()`: fires 4 parallel GET requests (`limit=200, offset=0/200/400/600`) via `Promise.all`. TanStack Query key: `['lessons','all']`. Stale time: 60,000ms. All 4 must succeed — partial failure is not acceptable (returns error state). On success: merge via `mergeLessonPages`.
- `useFilteredLessons(filters, page)`: single GET with filter params. TanStack Query key: `['lessons','filtered', filters, page]`. Stale time: 60,000ms.
- Unit test: `tests/unit/useLessons.test.ts` — 4 parallel calls fired; merge called on success; error state if any call fails.

**P7-3 — ChapterNav component**

- Create `src/features/lessons/ChapterNav.tsx`.
- Props: `lessons: Lesson[]`, `onFilterChange: (filters) => void`.
- Volume selector (tabs or select), kitab select, bab select, fasl select — cascaded (bab options depend on selected kitab, etc.).
- `<nav aria-label="...">` landmark. All selects have `<label>`.
- `dir="rtl"` on Arabic labels. `lang="ar"` on Arabic text.
- Component test: `tests/component/ChapterNav.test.tsx` — selecting volume filters kitab options; bab options cascade from kitab.

**P7-4 — LessonCard component**

- Create `src/features/lessons/LessonCard.tsx`.
- Displays: `lesson_number`, `title_ar` (RTL, `lang="ar"`), `chapter.kitab`, `duration_seconds` (formatted), completed badge.
- Links to `/lessons/{id}`.
- `<li>` element (used inside `<ul>` in LessonBrowser).

**P7-5 — Lesson Browser page**

- Create `src/features/lessons/LessonBrowser.tsx` — client component.
  - `useReducer` for `{ activeVolume, activeKitab, activeBab, activeFasl, searchQuery, currentPage }`.
  - Search input: validates min 2 chars before firing API call. No submission if < 2 chars.
  - Chapter nav filtering: uses `useAllLessons()` full dataset for nav hierarchy; `useFilteredLessons()` for paginated filtered results.
  - Loading state: centered Spinner. Chapter nav hidden until full dataset loaded.
  - Empty state: Arabic + Malayalam empty messages per freeze spec.
  - Error states: 400/422 → inline error + reset filters; 429 → Toast with retryAfterSeconds; 500/502 → inline error + retry button.
  - Lesson list: `<ul>` with `<li>` per lesson (LessonCard). Max 50 per page.
  - Pagination: Previous/Next + page numbers. Focus moves to first lesson on page change.
- Create `src/app/page.tsx` — ISR page. `export const revalidate = 60`. Renders LessonBrowser.

### Checkpoint P7

- [ ] Lesson Browser loads with Prism mock data.
- [ ] Chapter nav filters lesson list correctly.
- [ ] Search with ≥ 2 chars fires API call; < 2 chars blocked client-side.
- [ ] Pagination Previous/Next works.
- [ ] All error states render correctly (use Prism `Prefer: code=X` header in tests).
- [ ] `axe-core` passes on `/` route.
- [ ] All unit + component tests pass for Phase 7.

---

## Phase 8 — Frontend: Lesson Detail + Audio Player (`/lessons/[id]`)

**Ref:** Frontend Freeze v1.1 Section 2 (Lesson Detail screen) · OpenAPI `GET /api/v1/lessons/{id}`
**Estimated time:** 1 day
**Blocker:** Phase 6 complete. Uses Prism mock until Phase 2 backend verified.

### Tasks

**P8-1 — useProgress hook**

- Create `src/hooks/useProgress.ts`.
- Reads/writes `localStorage['tuhfa_progress']` as `ProgressStore`.
- `getProgress(id): LessonProgress | null`
- `savePosition(id, positionSeconds)`: writes `{ positionSeconds, lastPlayedAt: new Date().toISOString() }`. Throttled to 5s intervals.
- `markComplete(id)`: sets `completed: true`.
- Does NOT throw if localStorage unavailable (SSR) — returns null gracefully.
- Unit test: `tests/unit/useProgress.test.ts` — savePosition writes correct shape; markComplete sets flag; getProgress returns null for unknown id; throttle enforced (5s).

**P8-2 — AudioPlayer component**

- Create `src/components/audio/AudioPlayer.tsx`.
- Thin wrapper on native `<audio>`. No custom audio library.
- Props: `src: string` (archive_url), `lessonId: number`, `title: string`.
- `preload="metadata"` — not `auto`.
- `aria-label={title}`.
- Playback rate `<select>`: options [0.75, 1, 1.25, 1.5, 2]. Has `<label>`.
- Keyboard: Space = play/pause (when player focused), arrow left/right = seek ±5s.
- On `timeupdate`: call `savePosition(lessonId, currentTime)` (throttled 5s via useProgress).
- On mount: if `getProgress(lessonId).positionSeconds > 0`, set `audio.currentTime` before play.
- On audio error (IA unreachable): show inline message: "تعذّر تحميل الصوت — قد يكون أرشيف الإنترنت غير متاح مؤقتاً".
- Component test: `tests/component/AudioPlayer.test.tsx` — play/pause toggles; timeupdate writes progress; position restored on mount; audio error shows message.

**P8-3 — Progress components**

- Create `src/features/progress/ProgressBadge.tsx` — shows completed/in-progress status using `useProgress`.
- Create `src/features/progress/MarkCompleteButton.tsx` — calls `markComplete(id)` on click. `aria-pressed` state.

**P8-4 — Lesson Detail page**

- Create `src/features/lessons/LessonDetail.tsx` — client component.
  - Fetches `GET /api/v1/lessons/{id}` on mount via TanStack Query key `['lesson', id]`. Stale time: 60,000ms.
  - Renders: `title_ar` (RTL, `lang="ar"`), chapter breadcrumb, `upload_date` (formatted), `duration_seconds` (formatted), AudioPlayer, MarkCompleteButton, ProgressBadge.
  - Loading: Spinner in content area. Metadata hidden until loaded.
  - 404: "الدرس غير موجود" / "ക്ലാസ്സ് കണ്ടെത്തിയില്ല" + back link to `/`.
  - 429: Toast with Retry-After countdown.
  - 500/502: inline error + retry button.
- Create `src/app/lessons/[id]/page.tsx` — ISR page. `export const revalidate = 60`. Renders LessonDetail.

### Checkpoint P8

- [ ] Lesson Detail loads with Prism mock data.
- [ ] AudioPlayer plays/pauses, speed control works, keyboard controls work.
- [ ] Progress saved to localStorage on timeupdate (5s throttle).
- [ ] Position restored on re-visit to same lesson.
- [ ] Mark Complete sets badge.
- [ ] 404 lesson shows correct error + back link.
- [ ] `axe-core` passes on `/lessons/[id]` route.
- [ ] All unit + component tests pass for Phase 8.

---

## Phase 9 — Frontend: Admin Login (`/admin/login`)

**Ref:** Frontend Freeze v1.1 Section 2 (Admin Login screen) · OpenAPI `POST /api/v1/admin/auth`
**Estimated time:** 0.5 days
**Blocker:** Phase 6 complete, Phase 3 complete (or use Prism mock for Phase 3).

### Tasks

**P9-1 — useAdminAuth hook**

- Create `src/hooks/useAdminAuth.ts`.
- TanStack Query mutation: POST /api/v1/admin/auth.
- On 200: `router.replace('/admin')`.
- On 401: return field error "كلمة المرور غير صحيحة".
- On 422: return field errors from `error.details`.
- On 429: return inline rate-limit message "تم تجاوز الحد — حاول بعد 15 دقيقة".
- On 500: Toast error.
- No automatic retry (rate-limited endpoint).

**P9-2 — Admin Login page**

- Create `src/app/admin/login/page.tsx` — CSR (`'use client'`).
- Single react-hook-form field: `password` (required, minLength 1, maxLength 128).
- `type="password"` input with `<label>`. Focus placed on input on mount.
- `aria-describedby` pointing to error message element when error is present.
- Submit button: shows Spinner and is disabled during request.
- If `tuhfa_session` cookie present (server-side proxy.ts already handles redirect — verify proxy.ts redirects to /admin on authenticated visit).
- E2E test: `tests/e2e/admin-auth.spec.ts` — correct password → /admin; wrong → inline error; 429 → rate-limit message.

### Checkpoint P9

- [ ] Login with correct password → redirect to /admin.
- [ ] Wrong password → inline error (no page reload).
- [ ] 429 → rate-limit message displayed (no redirect).
- [ ] proxy.ts redirects unauthenticated visits to /admin/\* → /admin/login.
- [ ] proxy.ts redirects authenticated visit to /admin/login → /admin.
- [ ] Focus on password input on mount.
- [ ] `axe-core` passes on `/admin/login`.

---

## Phase 10 — Frontend: Admin Lesson List + Delete (`/admin`)

**Ref:** Frontend Freeze v1.1 Section 2 (Admin Lesson List screen) · OpenAPI `GET /api/v1/lessons`, `DELETE /api/v1/admin/lessons/{id}`
**Estimated time:** 1 day
**Blocker:** Phases 6, 9 complete. Phase 4 backend (DELETE endpoint) must be complete.

### Tasks

**P10-1 — AdminLessonTable component**

- Create `src/components/admin/AdminLessonTable.tsx`.
- Props: `lessons: Lesson[]`, `onEdit: (id) => void`, `onDelete: (id) => void`.
- `<table>` with `<caption>`. `<th scope="col">` on headers.
- Columns: volume, lesson_number, title_ar (RTL), chapter.kitab, duration (formatted), upload_date, Edit button, Delete button.
- Edit button: `aria-label="تعديل الدرس {id}"`. Delete button: `aria-label="حذف الدرس {id}"` (danger variant).
- Sorted volume ASC, lesson_number ASC (matches backend sort — no client-side resort needed).

**P10-2 — DeleteModal component**

- Create `src/components/admin/DeleteModal.tsx`.
- Props: `lessonId: number | null`, `isOpen: boolean`, `onConfirm: () => void`, `onCancel: () => void`.
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to modal title. Focus trap. Escape key closes. Focus returns to Delete button on close.
- Confirm button: danger variant, shows Spinner when deleting.
- Cancel button: secondary variant.

**P10-3 — Admin Lesson List page**

- Create `src/app/admin/page.tsx` — CSR (`'use client'`).
- Fetches `GET /api/v1/lessons?limit=200&offset=0` × 4 parallel — same 4-call merge as visitor browser. TanStack Query key: `['admin','lessons','all']`.
- `useState: { deleteTargetId, isDeleteModalOpen }`.
- Delete mutation: DELETE /api/v1/admin/lessons/{id}. On 204: invalidate `['lessons','all']`, `['admin','lessons','all']`, `['lesson', id]`. Toast "تم الحذف بنجاح". On 404: Toast "الدرس غير موجود بالفعل" + refetch. On 409: Toast "تعارض تزامن — أعد المحاولة". On 429/500/502: Toast with appropriate message.
- 401 on any call → `router.replace('/admin/login')`.
- Loading state: Spinner in table area.
- Empty state: "لا توجد دروس بعد" with link to /admin/lessons/new.
- "New Lesson" button linking to /admin/lessons/new.
- E2E test: `tests/e2e/admin-edit-delete.spec.ts` (delete scenarios) — confirm delete → 204 → list refreshes; cancel → modal closes; 401 → redirect.

### Checkpoint P10

- [ ] Admin list loads all lessons (648 when data populated).
- [ ] Delete modal opens on Delete button click; Escape closes; cancel closes.
- [ ] Confirm delete → lesson removed from table.
- [ ] 401 on load or delete → redirect to /admin/login.
- [ ] `axe-core` passes on `/admin`.

---

## Phase 11 — Frontend: Add Lesson Wizard (`/admin/lessons/new`)

**Ref:** Frontend Freeze v1.1 Section 2 (Add Lesson Wizard screen) · OpenAPI `POST /api/v1/admin/upload`, `POST /api/v1/admin/lessons`
**Estimated time:** 1 day
**Blocker:** Phases 6, 9 complete. Phases 4 and 5 backend must be complete.

### Tasks

**P11-1 — AddLessonWizard component**

- Create `src/components/admin/AddLessonWizard.tsx`.
- `useReducer` state machine: `{ step: 'upload' | 'form' | 'submitting' | 'done', uploadProgress: number, archiveUrl: string | null }`.

**Step 1 — Upload:**

- File input with accepted MIME types (audio/mpeg, audio/mp4, audio/ogg, audio/wav). Client-side size check < 500MB before XHR.
- `volume` and `lesson_number` fields (required for filename generation).
- XHR upload (NOT fetch) to POST /api/v1/admin/upload for `upload.onprogress` events.
- ProgressBar: `role="progressbar"`, `aria-valuenow={uploadProgress}`.
- Wizard step indicator: "الخطوة 1 من 2" with `aria-current="step"`.
- On success: store `archive_url`, transition to `step: 'form'`.
- Error states: 400 → inline; 401 → redirect /admin/login; 413 → inline "File exceeds 500MB"; 422 → inline; 429 → inline rate-limit; 500/502 → inline "Internet Archive unreachable — retry".

**Step 2 — Form:**

- react-hook-form with all fields from Frontend Freeze Section 2 (Add Lesson Wizard validation rules).
- `archive_url` field: pre-filled from Step 1, read-only input, pattern validation `^https://archive\.org/download/`.
- Submit: POST /api/v1/admin/lessons (JSON). On 201: toast success, invalidate `['lessons','all']` and `['admin','lessons','all']`, redirect /admin. On 401: redirect /admin/login. On 409 DUPLICATE_LESSON_NUMBER: inline `lesson_number` field error. On 409 CONCURRENT_EDIT_CONFLICT: inline toast "تعارض — أعد المحاولة". On 422: field errors from `error.details`. On 500/502: inline + retry (Step 2 only — do NOT re-upload).
- Back button on Step 2: disabled (file already uploaded, re-upload would create orphan — per freeze spec).
- Component test: `tests/component/AddLessonWizard.test.tsx` — progress bar renders during upload; Step 2 form pre-populated; submit button disabled after click; 422 shows field errors.

**P11-2 — Add Lesson Wizard page**

- Create `src/app/admin/lessons/new/page.tsx` — CSR. Renders AddLessonWizard.
- E2E test: `tests/e2e/admin-add-lesson.spec.ts` — upload progress shown; Step 2 pre-populated; 201 → /admin redirect.

### Checkpoint P11

- [ ] Step 1 XHR upload shows real progress bar (0–100%).
- [ ] Step 2 form pre-populated with archive_url (read-only).
- [ ] Successful create → redirect to /admin.
- [ ] Duplicate lesson_number → inline field error on lesson_number input.
- [ ] Back button on Step 2 is disabled.
- [ ] 401 on either step → redirect to /admin/login.
- [ ] `axe-core` passes on `/admin/lessons/new`.

---

## Phase 12 — Frontend: Edit Lesson (`/admin/lessons/[id]/edit`)

**Ref:** Frontend Freeze v1.1 Section 2 (Edit Lesson screen) · OpenAPI `GET /api/v1/lessons/{id}`, `PUT /api/v1/admin/lessons/{id}`
**Estimated time:** 0.5 days
**Blocker:** Phases 6, 9 complete. Phase 4 backend (PUT endpoint) must be complete.

### Tasks

**P12-1 — EditLessonForm component**

- Create `src/components/admin/EditLessonForm.tsx`.
- Props: `lesson: Lesson`.
- react-hook-form, all mutable fields editable. `id`, `volume`, `lesson_number` displayed as read-only text — NOT inputs — and NOT sent in PUT body.
- `archive_url` is editable (unlike Step 2 of Add Wizard where it is read-only).
- `aria-readonly="true"` on immutable display fields.
- On submit: send only fields that differ from initial values (dirty fields only via react-hook-form `dirtyFields`).
- PUT /api/v1/admin/lessons/{id}. On 200: toast "تم الحفظ", invalidate `['lesson', id]`, `['lessons','all']`, `['admin','lessons','all']`, `['lessons','filtered']` (all), redirect /admin. On 401: redirect. On 404: inline error "الدرس لم يعد موجوداً". On 409 CONCURRENT_EDIT_CONFLICT: inline toast "تعارض — أعد المحاولة". On 422: field errors. On 500/502: inline + retry.

**P12-2 — Edit Lesson page**

- Create `src/app/admin/lessons/[id]/edit/page.tsx` — CSR.
- Fetch GET /api/v1/lessons/{id} on mount to pre-populate. TanStack Query key `['lesson', id]`.
- Loading: Spinner shown, form hidden until GET resolves.
- 404: inline error + back link.
- 401: redirect /admin/login.
- Renders EditLessonForm once loaded.
- E2E test: `tests/e2e/admin-edit-delete.spec.ts` (edit scenarios) — form pre-populated; partial update sends only changed fields; 409 conflict → toast.

### Checkpoint P12

- [ ] Edit form pre-populated from GET /lessons/{id}.
- [ ] Immutable fields (id, volume, lesson_number) displayed as text, not inputs.
- [ ] Only dirty fields sent in PUT body.
- [ ] 409 conflict → toast (not redirect).
- [ ] 401 → redirect to /admin/login.
- [ ] `axe-core` passes on `/admin/lessons/[id]/edit`.

---

## Phase 13 — CI + Quality Gates

**Ref:** Backend Freeze v1.1 Section 7 Phase 4 · Frontend Freeze v1.1 Sections 7, 10, 12
**Estimated time:** 0.5 days
**Blocker:** All phases 2–12 complete.

### Tasks

**P13-1 — GitHub Actions workflow**

- Create `.github/workflows/ci.yml`.
- Triggers: `push` and `pull_request` on all branches.
- Jobs (in order):

```yaml
1. type-check:    npx tsc --noEmit
2. lint:          eslint src/   (NOT next lint — removed in Next.js 16)
3. unit-tests:    vitest run tests/unit/
4. component-tests: vitest run tests/component/
5. integration-tests: vitest run tests/integration/
6. contract-tests:
   - start: prism mock ./openapi.yaml --port 4010 &
   - wait:  sleep 3
   - run:   vitest run tests/contract/
7. build:         next build    (Turbopack, default in Next.js 16)
8. lighthouse-ci: @lhci/cli autorun (against Vercel preview deployment)
9. bundle-check:  @next/bundle-analyzer (fails if route budget exceeded)
```

- CI fails on: TypeScript error, lint error, any test failure, Lighthouse budget exceeded, bundle budget exceeded.

**P13-2 — lighthouserc.js**

- Configure Lighthouse CI budgets from Frontend Freeze Section 7:
  - LCP < 2500ms
  - CLS < 0.1
  - INP < 200ms
  - Accessibility score ≥ 90
- Target URLs: production or Vercel preview deployment.

**P13-3 — Smoke test documentation**

- Create `README.md` with the smoke test checklist (7 checks from Backend Freeze Section 7 Phase 4 and Frontend Freeze Section 10 MVP test checklist).
- Document: project setup steps, env vars required, `npm run mock` for local API mocking, how to add new lessons via admin panel.

**P13-4 — Coverage thresholds**

- Configure Vitest coverage: `/src/lib/` ≥ 80%, `/src/schemas/` 100%.
- Add `vitest run --coverage` to CI.

### Checkpoint P13

- [ ] CI workflow passes on `main` branch with zero failures.
- [ ] `tsc --noEmit` passes.
- [ ] `eslint src/` passes (no `next lint`).
- [ ] All test suites pass.
- [ ] Lighthouse LCP/CLS/INP/a11y budgets green.
- [ ] Bundle budgets: `/` < 80KB, `/lessons/[id]` < 80KB, `/admin/*` < 120KB.

---

## Phase 14 — Deployment + Data Population

**Ref:** Backend Freeze v1.1 Section 10 · Frontend Freeze v1.1 Section 12
**Estimated time:** 0.5 days setup + ongoing data entry
**Blocker:** Phase 13 CI all green.

### Tasks

**P14-1 — Vercel environment variables**

- Set all env vars from `.env.example` in Vercel dashboard for `production` environment:
  - `ADMIN_PASSWORD` (≥16 chars)
  - `SESSION_SECRET` (≥32 chars)
  - `SESSION_MAX_AGE_SECONDS=86400`
  - `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_FILE_PATH`, `GITHUB_BRANCH`
  - `IA_ACCESS_KEY`, `IA_SECRET_KEY`, `IA_COLLECTION_IDENTIFIER`, `IA_S3_ENDPOINT`
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - `REVALIDATION_SECRET` (≥32 chars)
  - `ALLOWED_ORIGINS` (production URL)
  - `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_BASE_URL`
- Set same vars for `preview` environment (can use same values except `ALLOWED_ORIGINS`).

**P14-2 — Production deployment**

- Push `main` branch — Vercel auto-deploys.
- Confirm deployment succeeds in Vercel dashboard.
- Note production URL (e.g., `tuhfa.vercel.app`).

**P14-3 — Smoke test (production)**
Run all 7 smoke test items from README.md against production URL:

- [ ] `GET /api/v1/lessons` → 200, Cache-Control header present.
- [ ] `GET /api/v1/lessons/1` → 200 or 404 (if not yet populated).
- [ ] `GET /api/docs` → OpenAPI UI loads, all 7 endpoints visible.
- [ ] `POST /api/v1/admin/auth` with wrong password → 401 INVALID_CREDENTIALS.
- [ ] `POST /api/v1/admin/auth` with correct password → 200, Set-Cookie header present.
- [ ] `GET /api/v1/admin/lessons` with no cookie → 401 UNAUTHORIZED.
- [ ] Visit `/admin` without session → redirect to `/admin/login`.

**P14-4 — First lesson upload (end-to-end verification)**

- Log into admin panel in production.
- Upload one lesson audio file (smallest available, from Volume 1).
- Complete Step 2 form with metadata.
- Verify lesson appears on site within 90 seconds (ISR revalidation).
- This confirms the full admin workflow works in production against real IA and GitHub APIs.

**P14-5 — Bulk data entry (operational task)**

- 648 lessons must be entered via the admin panel before launch.
- Estimated time: ~2 min/lesson × 648 = ~22 hours of admin panel work.
- Recommended approach: batch by volume (V1: 213 lessons, V2: 178, V3: 146, V4: 111).
- Permission from Sheikh Dr. Abdul Hakim Al-Sa'di must be confirmed before this step.
- Track progress externally (spreadsheet or GitHub issue).

**P14-6 — Vercel Speed Insights**

- Enable `@vercel/speed-insights/next` in `src/app/layout.tsx` (already in frontend freeze scope).
- Verify Core Web Vitals appear in Vercel dashboard after first real user visit.

### Final Acceptance Checkpoint

- [ ] All 7 smoke test items pass against production URL.
- [ ] Admin can add, edit, and delete a lesson end-to-end in production.
- [ ] Lesson appears on site within 90 seconds of creation.
- [ ] Vercel Analytics shows p95 latency < 200ms on GET /api/v1/lessons.
- [ ] Auth lockout triggers after 5 failed attempts (verified manually).
- [ ] Permission from Sheikh confirmed (pre-launch gate).
- [ ] All 648 lessons entered and browsable (launch gate).

---

## Task Summary Table

| Phase | What                            | Owned by  | Deps           | Est. Time        |
| ----- | ------------------------------- | --------- | -------------- | ---------------- |
| P0    | External accounts               | Developer | None           | 1–2h             |
| P1    | Scaffold + foundation           | Developer | P0             | 1 day            |
| P2    | Backend: public read API        | Developer | P1             | 1 day            |
| P3    | Backend: auth + proxy           | Developer | P1             | 0.5 day          |
| P4    | Backend: admin CRUD             | Developer | P3             | 1 day            |
| P5    | Backend: IA upload              | Developer | P3             | 0.5 day          |
| P6    | Frontend: design system         | Developer | P1             | 1 day            |
| P7    | Frontend: lesson browser        | Developer | P6             | 1 day            |
| P8    | Frontend: lesson detail + audio | Developer | P6             | 1 day            |
| P9    | Frontend: admin login           | Developer | P6, P3         | 0.5 day          |
| P10   | Frontend: admin list + delete   | Developer | P6, P9, P4     | 1 day            |
| P11   | Frontend: add lesson wizard     | Developer | P6, P9, P4, P5 | 1 day            |
| P12   | Frontend: edit lesson           | Developer | P6, P9, P4     | 0.5 day          |
| P13   | CI + quality gates              | Developer | P2–P12         | 0.5 day          |
| P14   | Deploy + data entry             | Developer | P13            | 0.5d + ~22h data |

**Total code work: ~11 days**
**Data entry: ~22 hours (parallel with other tasks if a helper assists)**
**Total calendar time: 2–3 weeks (matches freeze estimate)**

---

## Blockers Register

| ID  | Blocker                                   | Blocks                      | Resolution                                                       |
| --- | ----------------------------------------- | --------------------------- | ---------------------------------------------------------------- |
| B1  | IA collection not created                 | P5-2 upload (production)    | Create collection in IA account before P14                       |
| B2  | Sheikh permission not confirmed           | P14-5 data entry            | Confirm permission before bulk upload                            |
| B3  | GitHub PAT expired or wrong scope         | P2, P4                      | Rotate PAT with `repo` scope                                     |
| B4  | Upstash free tier exhausted (10K req/day) | Rate limiting in production | Upgrade Upstash tier or reduce load                              |
| B5  | Vercel free tier bandwidth exceeded       | Public site                 | Unlikely at <500 DAU; monitor Vercel dashboard                   |
| B6  | Backend acceptance checkpoint failures    | Phases 10–12                | Do not connect frontend to real API until all backend tests pass |

---

## Change Control Gate

Any deviation from this build plan that implies a change to:

- the API contract (any endpoint, field, status code)
- the data schema (`lessons.json` shape)
- the authentication model
- the scope (add or remove features)
- the stack (swap libraries)

**must be raised as a Change Request against Backend Freeze v1.1 and/or Frontend Freeze v1.1 before implementation begins.**

Do not implement then ask for approval. Stop, document the change request, get approval, bump freeze version, then proceed.
