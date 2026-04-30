# FRONTEND PROJECT FREEZE: Tuhfat al-Muhtaj Learning Platform

**Version:** 1.1 (IMMUTABLE)
**Date:** 2026-04-30
**Status:** APPROVED FOR EXECUTION
**Backend Freeze Reference:** v1.1 (2026-04-30)
**OpenAPI Reference:** openapi.yaml v1.0.0

> **CRITICAL INSTRUCTION FOR EXECUTION (HUMAN OR AI):**
> This document is the Absolute Source of Truth. You have NO authority to modify routes,
> UI scope, API assumptions, or non-functional constraints defined below.
> If any request contradicts this document, you must REFUSE and open a Change Request instead.

---

## 0. Commercials (Accept-and-price)

**Engagement Type:** Fixed-scope (self-built, no commercial engagement)
**Chosen Package:** Standard
**Price & Payment Schedule:**

- Total price: $0 (volunteer/personal project)
- Milestone payments: N/A

**Timeline Range (weeks):** 2–3 weeks

**Assumptions (must be true):**

- Backend Freeze v1.1 is the governing contract. No API changes without a Backend Freeze version bump.
- `openapi.yaml` v1.0.0 is locked. No field or endpoint additions without a new OpenAPI version.
- Google Fonts (fonts.googleapis.com) is reachable from target users' browsers.
- Vercel account linked to GitHub repo before frontend deployment begins.
- Admin is a single operator (project owner) on a modern desktop browser.

**Support Window (post-delivery):**

- Bugfix support: indefinite (self-maintained)
- Enhancements: billed as Change Requests (scope additions only)

---

## 1. The "Iron Scope" (Frontend only)

**Core Value Proposition (One Sentence):**

> A bilingual Arabic/Malayalam web frontend that lets any visitor browse, search, and listen to 648+ Tuhfat al-Muhtaj audio lessons with chapter navigation and browser-persisted study progress, and lets a single admin manage lesson content without touching code.

**The 10 Frontend User Stories (COMPLETE SCOPE):**

1. As a **visitor**, I can browse all lessons organized by volume and chapter (kitab → bab → fasl) with paginated Previous/Next navigation, so I can navigate the text systematically.
2. As a **visitor**, I can search lessons by Arabic title keyword with paginated results, so I can find specific passages quickly.
3. As a **visitor**, I can play a lesson's audio with standard controls (play/pause, seek bar, volume, playback rate), so I can study it in the browser.
4. As a **visitor**, I can see my per-lesson study progress (completed flag, last playback position) persisted in my browser, so I can resume where I left off without an account.
5. As a **visitor**, I can mark a lesson as complete, so I can track my progress through the curriculum.
6. As an **admin**, I can log in with my password and be issued a session, so I can access content management.
7. As an **admin**, I can upload an audio file with a real-time progress indicator and receive the `archive_url` upon success, so I can prepare a lesson for creation.
8. As an **admin**, I can complete the lesson metadata form (pre-populated with the upload result) on the same wizard page and submit to create the lesson record, so I can add content in a single flow.
9. As an **admin**, I can edit any mutable lesson metadata field from the lesson list, so I can correct errors.
10. As an **admin**, I can delete a lesson via a confirmation dialog, so I can permanently remove incorrect records.

**The "NO" List (Explicitly Out of Scope):**

- No visitor accounts, registration, or login
- No cross-device progress sync (localStorage only, per backend freeze)
- No comments, ratings, or social features
- No PDF viewer or text rendering of Tuhfat al-Muhtaj
- No video player
- No i18n framework or language switching beyond Arabic + Malayalam bilingual UI
- No offline mode or PWA service workers
- No dark mode
- No skeleton loaders (CSS spinners are sufficient)
- No animation library (Tailwind transition utilities only)
- No lesson thumbnail images (no such field in data model)
- No SSR for admin pages (CSR only)
- No SSG (ISR for public pages, revalidate: 60)
- No deep-link search URLs (search state not persisted in URL)
- No print stylesheets
- No analytics dashboard or telemetry beyond Vercel Speed Insights passthrough
- No admin multi-user support

**User Roles (UI behavior truth):**

- **Visitor (unauthenticated):** Access to `/` and `/lessons/[id]` only. No admin routes. No login required. No session cookie. localStorage read/write for progress only.
- **Admin (password-authenticated):** Access to all `/admin/*` routes after successful POST /api/v1/admin/auth. Protected by Next.js proxy (`proxy.ts`) redirect on 401. Session cookie `tuhfa_session` managed entirely by browser — no client-side token storage. Single admin only.

**Success Definition (measurable):**

- All 648 lessons browsable and streamable at launch via chapter nav and search.
- LCP < 2,500ms on `/` and `/lessons/[id]` (Lighthouse CI gate).
- Audio playback starts within 3 seconds of pressing play on a 10Mbps connection (IA direct stream).
- Admin can add a new lesson (upload → create) end-to-end in under 6 minutes (5 min IA upload + <60s form submit + ISR revalidation).
- Zero admin actions lost due to missing 409/402/502 error handling.

---

## 1.2 Assumptions & External Dependencies

**Primary Backend/API:** Next.js 16 App Router API routes, base URL from env, environments: development / preview / production.
**OpenAPI source:** `openapi.yaml` v1.0.0. UI conforms to this spec — never the reverse.
**Design Source:** None. Design language defined in Section 5 of this document.
**External Dependencies (2):**

- Dependency 1: **Google Fonts**, purpose: load Noto Naskh Arabic + Noto Sans Malayalam + Inter via `<link>` in `<head>`, failure UX: browser falls back to system Arabic/sans-serif fonts. Layout is not broken. No JS dependency.
- Dependency 2: **Internet Archive (archive.org)**, purpose: audio streaming via native `<audio src="{archive_url}">`. Failure UX: browser shows native audio error state. Lesson metadata page remains fully functional. No custom error handling needed beyond the backend's 502 definition.

---

## 1.5 Frontend Configuration (The Environment)

```bash
# .env.example (frontend — Next.js 16 App Router)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api/v1"
NODE_ENV="development"

# ISR revalidation (must match backend REVALIDATION_SECRET)
REVALIDATION_SECRET="min_32_chars_revalidation_token"

# Vercel Speed Insights (optional — leave empty to disable)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=""
```

**Configuration Rules:**

- `NEXT_PUBLIC_API_BASE_URL` must be set per environment. Development: `http://localhost:3000/api/v1`. Production: `https://tuhfa.vercel.app/api/v1`.
- No secrets in `NEXT_PUBLIC_*` env vars (they are build-time public).
- `REVALIDATION_SECRET` is server-side only (no `NEXT_PUBLIC_` prefix) — used only in `/api/revalidate` route handler, already defined in backend freeze.
- Admin session cookie (`tuhfa_session`) is HttpOnly, SameSite=Strict — never readable by JavaScript. No client-side auth token storage of any kind.

---

## 1.6 Tech Stack & Key Libraries (Frontend toolbelt)

**Core Stack (LOCKED):**

- **Framework:** Next.js 16 (App Router)
- **Build tool:** Next.js built-in (Turbopack for both dev and production build — default in Next.js 16. Use `--webpack` flag only if a dependency explicitly requires it.)
- **Language:** TypeScript 5.x (strict mode, `noEmit` in CI)
- **Routing:** Next.js App Router
- **Data fetching/caching:** TanStack Query v5 (`@tanstack/react-query`)
- **Forms/validation:** react-hook-form + zod (schemas derived from OpenAPI types)
- **Styling:** Tailwind CSS v3
- **Type generation:** `openapi-typescript` (types generated from `openapi.yaml` at build time)
- **API client:** `openapi-fetch` (typed against generated types)

**Explicitly Banned Libraries/Patterns:**

- No Redux, Zustand, Jotai, or any global state store
- No MUI, Chakra UI, shadcn/ui, or any third-party component library
- No `dangerouslySetInnerHTML` (no use case; XSS risk)
- No `any` TypeScript type
- No `console.log` in production (use structured logging or remove)
- No jQuery
- No uncontrolled form inputs (all inputs must be registered with react-hook-form)
- No client-side token storage (no localStorage/sessionStorage for auth tokens)
- No `middleware.ts` (renamed to `proxy.ts` in Next.js 16 — see project structure)
- No `next lint` command (removed in Next.js 16 — use `eslint` CLI directly: `eslint src/`)

---

## 2. Routes, Screens, and Navigation (UI truth)

**Routing mode:** Hybrid — ISR for public pages, CSR for admin pages.
**Auth gating model:** Next.js proxy (`proxy.ts`) — reads `tuhfa_session` cookie presence. If absent on any `/admin/*` route (except `/admin/login`), redirects to `/admin/login`. No client-side role checking.

### Route Map (ALL routes)

- `/` → Lesson Browser, auth: public, roles: Visitor, render: ISR revalidate:60
- `/lessons/[id]` → Lesson Detail + Player, auth: public, roles: Visitor, render: ISR revalidate:60
- `/admin/login` → Admin Login, auth: public (redirect to `/admin` if already authenticated), render: CSR
- `/admin` → Admin Lesson List, auth: protected, roles: Admin, render: CSR
- `/admin/lessons/new` → Add Lesson Wizard, auth: protected, roles: Admin, render: CSR
- `/admin/lessons/[id]/edit` → Edit Lesson, auth: protected, roles: Admin, render: CSR

Delete lesson: modal on `/admin`. No separate route.

---

### Screen Specifications

---

**Screen: Lesson Browser (`/`)**

- Goal: Allow visitors to browse all 648+ lessons by volume and chapter hierarchy, or by keyword search, with paginated results.
- Entry points: Direct URL, any internal nav link.
- Required API calls (on mount and on filter/page change):
  1. `GET /api/v1/lessons?limit=200&offset=0` — parallel
  2. `GET /api/v1/lessons?limit=200&offset=200` — parallel
  3. `GET /api/v1/lessons?limit=200&offset=400` — parallel
  4. `GET /api/v1/lessons?limit=200&offset=600` — parallel
  - All 4 fire in parallel via `Promise.all`. On success: merge arrays, deduplicate chapter values for nav UI, store in TanStack Query cache under key `['lessons', 'all']`. On any call failure: show inline error with retry button. Partial failures (some calls succeed): not acceptable — all 4 must succeed before rendering lesson list.
  - For filtered/search requests: `GET /api/v1/lessons?volume={v}&kitab={k}&bab={b}&fasl={f}&search={q}&limit=50&offset={(page-1)*50}` — single call, fired on filter change or page change.
- Local state: `{ activeVolume, activeKitab, activeBab, activeFasl, searchQuery, currentPage }` — `useReducer` in the page component.
- Server state: TanStack Query. Full dataset for chapter nav (key: `['lessons','all']`). Filtered page results (key: `['lessons','filtered', filters, page]`).
- Loading state: Centered CSS spinner. Chapter nav hidden until full dataset loaded. Lesson list area shows spinner.
- Empty state: "لا توجد دروس مطابقة" (Arabic) / "പൊരുത്തമുള്ള ക്ലാസ്സുകൾ ഇല്ല" (Malayalam) — inline below filters.
- Error states:
  - API 400/422: "فلتر غير صحيح" inline, reset filters button.
  - API 429: Toast: "طلبات كثيرة — حاول بعد {retryAfterSeconds} ثانية".
  - API 500/502/network: Inline error block with retry button. Does not replace entire page.
- Form validation rules: Search input — min 2 chars, max 100 chars (enforced client-side before API call, matching backend contract). No submission if < 2 chars.
- Permissions: All content visible to all visitors. No hidden/disabled elements.
- Accessibility requirements: Chapter nav is a `<nav>` landmark with `aria-label`. Filter controls are `<select>` elements with `<label>`. Search input has `aria-label`. Lesson list is `<ul>` with `<li>` per lesson. Pagination: `<nav aria-label="pagination">` with `aria-current="page"` on active page button. Focus moves to first lesson item on page change.
- Performance notes: Full 648-lesson merge is client-side in memory — no virtualization needed at this scale. Chapter nav values derived once from merged array, memoized. Lesson list renders max 50 items per page.

---

**Screen: Lesson Detail + Player (`/lessons/[id]`)**

- Goal: Display full lesson metadata and stream the audio. Track and persist playback progress.
- Entry points: Lesson list item click, direct URL.
- Required API calls:
  1. `GET /api/v1/lessons/{id}` — on mount. On success: render lesson metadata and `<audio>` element with `src={archive_url}`. On 404: render "Lesson not found" inline with back link. On 400: same. On 429/500/502: inline error with retry.
- Local state: `{ isPlaying, currentPositionSeconds, playbackRate }` — `useState` in player component.
- Server state: TanStack Query, key: `['lesson', id]`, stale time: 60s (matches ISR).
- Loading state: Spinner centered in content area. Metadata fields hidden until loaded.
- Empty state: N/A (single resource — shows 404 state if not found).
- Error states:
  - 404: "الدرس غير موجود" / "ക്ലാസ്സ് കണ്ടെത്തിയില്ല" + back link to `/`.
  - 429: Toast with retry countdown.
  - 500/502: Inline error + retry button.
  - Audio load failure (IA unreachable): Native `<audio>` error event → inline message: "تعذّر تحميل الصوت — قد يكون أرشيف الإنترنت غير متاح مؤقتاً".
- Form validation rules: N/A.
- Permissions: All content visible to all visitors.
- Accessibility requirements: `<audio>` element has `aria-label="{title_ar}"`. Playback rate selector is a `<select>` with `<label>`. "Mark complete" button has `aria-pressed` state. Keyboard: Space = play/pause (when player focused), arrow keys seek ±5s.
- Performance notes: `<audio>` uses `preload="metadata"` (not `auto`) to avoid unnecessary bandwidth. No custom audio UI library — native `<audio>` controls plus a thin React wrapper for progress tracking.
- Progress behavior: On `timeupdate` event (throttled to 5s intervals): write `{ positionSeconds, lastPlayedAt }` to `localStorage['tuhfa_progress'][id]`. On load: if `positionSeconds > 0` in localStorage, set `audio.currentTime = positionSeconds` before play. "Mark complete" button: sets `completed: true` in localStorage and updates button state.

---

**Screen: Admin Login (`/admin/login`)**

- Goal: Authenticate the admin and establish the `tuhfa_session` cookie.
- Entry points: Direct URL, redirect from any protected `/admin/*` route.
- Required API calls:
  1. `POST /api/v1/admin/auth` body: `{ password }`. On 200: redirect to `/admin`. On 401: inline field error "كلمة المرور غير صحيحة". On 422: inline field error from `error.details`. On 429: inline error "تم تجاوز الحد — حاول بعد 15 دقيقة". On 500: toast error.
- Local state: `{ isSubmitting }` — react-hook-form handles field state.
- Server state: None (mutation only, no query).
- Loading state: Submit button shows spinner, disabled during request.
- Empty state: N/A.
- Error states: All inline (no page-level error).
- Form validation rules:
  - `password`: required, minLength: 1, maxLength: 128 (matching backend Zod schema).
- Permissions: If `tuhfa_session` cookie is present (detected via server-side proxy), redirect to `/admin` immediately.
- Accessibility requirements: Single form field with `<label>`. `aria-describedby` points to error message element when error is present. Submit button is the only interactive element besides the input. Focus is placed on password input on mount.
- Performance notes: N/A.

---

**Screen: Admin Lesson List (`/admin`)**

- Goal: Display all lessons in a sortable table with edit and delete actions.
- Entry points: Post-login redirect, direct URL (authenticated).
- Required API calls:
  1. `GET /api/v1/lessons?limit=200&offset=0` × 4 parallel — same merge strategy as Lesson Browser, under TanStack Query key `['admin','lessons','all']`. On success: render table. On failure: inline error + retry.
- Local state: `{ deleteTargetId, isDeleteModalOpen, editSuccessId }` — `useState`.
- Server state: TanStack Query key `['admin','lessons','all']`. Invalidated on successful create, update, or delete mutation.
- Loading state: Table area shows spinner.
- Empty state: "لا توجد دروس بعد" with link to `/admin/lessons/new`.
- Error states:
  - Load failure: Inline error + retry button.
  - Delete 404: Toast "الدرس غير موجود بالفعل" — refresh list.
  - Delete 409: Toast "تعارض تزامن — أعد المحاولة".
  - Delete 429/500/502: Toast with appropriate message.
- Form validation rules: N/A (delete is a button action).
- Permissions: All actions available to admin only (route is proxy-protected).
- Accessibility requirements: Table has `<caption>`. Column headers use `<th scope="col">`. Action buttons per row have `aria-label="حذف الدرس {id}"` and `aria-label="تعديل الدرس {id}"`. Delete confirmation modal: focus trap, `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to modal title. Escape key closes modal.
- Performance notes: 648-row table rendered directly (no virtualization needed at this scale). Sorted by volume ASC, lesson_number ASC (matches backend sort).

---

**Screen: Add Lesson Wizard (`/admin/lessons/new`)**

- Goal: Upload audio to Internet Archive, then create the lesson metadata record — two steps on one page, state-machine driven.
- Entry points: `/admin` "New Lesson" button.
- Required API calls (in strict order):
  1. Step 1 — `POST /api/v1/admin/upload` (multipart/form-data via XHR for progress events). On success: store `archive_url`, advance wizard to Step 2 (form pre-populated). On 400: inline field errors. On 401: redirect to `/admin/login`. On 413: inline "File exceeds 500MB". On 422: inline field errors. On 429: inline rate-limit message. On 500/502: inline "Internet Archive unreachable — retry".
  2. Step 2 — `POST /api/v1/admin/lessons` (JSON). On 201: show success toast, redirect to `/admin`. On 401: redirect to `/admin/login`. On 409 (DUPLICATE_LESSON_NUMBER): inline `lesson_number` field error. On 409 (CONCURRENT_EDIT_CONFLICT): inline toast "تعارض — أعد المحاولة". On 422: field-level errors from `error.details`. On 500/502: inline error + retry (Step 2 only — file already uploaded, do not re-upload).
- Local state: Wizard state machine `{ step: 'upload' | 'form' | 'submitting' | 'done', uploadProgress: number, archiveUrl: string | null }` — `useReducer`.
- Server state: Mutation only. On 201: invalidate `['admin','lessons','all']` and `['lessons','all']`.
- Loading state: Step 1: XHR progress bar (0–100%). Step 2: Submit button spinner, form disabled.
- Empty state: N/A.
- Error states: All inline per step (see API calls above). Back button on Step 2 is disabled (file is already uploaded; going back would create an orphan — consistent with backend freeze accepted behavior).
- Form validation rules (Step 2 — all match backend Zod/OpenAPI):
  - `volume`: required, enum [1,2,3,4]
  - `lesson_number`: required, integer ≥ 1
  - `title_ar`: required, minLength: 1, maxLength: 500
  - `chapter.kitab`: required, minLength: 1, maxLength: 200
  - `chapter.bab`: nullable string, maxLength: 200
  - `chapter.fasl`: nullable string, maxLength: 200
  - `duration_seconds`: required, integer ≥ 1
  - `upload_date`: required, format YYYY-MM-DD
  - `archive_url`: required, pre-filled from Step 1 result, pattern `^https://archive\.org/download/`, read-only input
  - `telegram_post_id`: required, integer ≥ 1
  - Upload Step 1 fields:
    - `file`: required, accepted MIME: audio/mpeg, audio/mp4, audio/ogg, audio/wav, max 500MB (client-side pre-check before XHR)
    - `volume`: required, string enum ["1","2","3","4"] (form sends as string per OpenAPI)
    - `lesson_number`: required, string matching pattern `^[1-9][0-9]*$`
- Permissions: Admin only (proxy-protected).
- Accessibility requirements: Wizard steps indicated by visible step counter ("الخطوة 1 من 2") with `aria-current="step"`. File input has `aria-describedby` pointing to accepted formats hint. Upload progress bar: `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`. All form inputs have `<label>`. Arabic text inputs have `dir="rtl"`. Error messages use `role="alert"`.
- Performance notes: XHR upload (not `fetch`) required for `upload.onprogress` events. Do not use `fetch` for the upload step.

---

**Screen: Edit Lesson (`/admin/lessons/[id]/edit`)**

- Goal: Edit mutable fields of an existing lesson.
- Entry points: Admin Lesson List "Edit" button.
- Required API calls:
  1. `GET /api/v1/lessons/{id}` — on mount to pre-populate form. On 404: inline error, back link. On 401: redirect to `/admin/login`.
  2. `PUT /api/v1/admin/lessons/{id}` — on submit (sends only changed fields). On 200: toast "تم الحفظ", redirect to `/admin`, invalidate queries. On 401: redirect. On 404: inline error "الدرس لم يعد موجوداً". On 409 (CONCURRENT_EDIT_CONFLICT): inline toast "تعارض — أعد المحاولة". On 422: field-level errors. On 500/502: inline error + retry.
- Local state: react-hook-form internal state. `{ isSubmitting }`.
- Server state: TanStack Query key `['lesson', id]` (pre-populate). Mutation invalidates `['lesson', id]`, `['admin','lessons','all']`, `['lessons','all']`.
- Loading state: Form fields hidden, spinner shown until GET resolves.
- Empty state: N/A.
- Error states: See API calls above.
- Form validation rules: Same as Add Lesson Wizard Step 2, except `archive_url` is editable (not read-only). Immutable fields (`id`, `volume`, `lesson_number`) are displayed as read-only text, not inputs — they are NOT sent in the PUT body.
- Permissions: Admin only (proxy-protected).
- Accessibility requirements: Same as Add Lesson Wizard form. `aria-readonly="true"` on immutable display fields. Error `role="alert"` on inline errors.
- Performance notes: N/A.

---

## 3. API Assumptions (Frontend contract expectations)

**Base URL:** `NEXT_PUBLIC_API_BASE_URL` from env
**Auth:** HttpOnly cookie `tuhfa_session` (set by POST /api/v1/admin/auth). Cookie is browser-managed. No Authorization header. No client-side token handling.
**Global error shape expected (locked — matches OpenAPI `ApiError` schema):**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message in English",
    "details": {}
  },
  "requestId": "uuid-v4",
  "timestamp": "ISO8601"
}
```

**Typed API surface (MVP only — all endpoints the UI calls):**

```ts
// Generated from openapi.yaml via openapi-typescript. Do not hand-edit.
// Import: import type { paths, components } from '@/types/api';

type Lesson = components["schemas"]["Lesson"];
type Chapter = components["schemas"]["Chapter"];
type LessonCreateBody = components["schemas"]["LessonCreateBody"];
type LessonUpdateBody = components["schemas"]["LessonUpdateBody"];
type ApiError = components["schemas"]["ApiError"];
type ResponseMeta = components["schemas"]["ResponseMeta"];

// GET /api/v1/lessons
type GetLessonsQuery = {
  volume?: 1 | 2 | 3 | 4;
  kitab?: string;
  bab?: string;
  fasl?: string;
  search?: string;
  limit?: number;
  offset?: number;
};
type GetLessonsResponse = {
  data: { lessons: Lesson[] };
  meta: ResponseMeta & { total: number; limit: number; offset: number };
};

// GET /api/v1/lessons/{id}
type GetLessonResponse = {
  data: { lesson: Lesson };
  meta: ResponseMeta;
};

// POST /api/v1/admin/auth
type AdminAuthRequest = { password: string };
type AdminAuthResponse = {
  data: { authenticated: true };
  meta: ResponseMeta;
};

// POST /api/v1/admin/lessons
type CreateLessonRequest = LessonCreateBody;
type CreateLessonResponse = {
  data: { lesson: Lesson };
  meta: ResponseMeta;
};

// PUT /api/v1/admin/lessons/{id}
type UpdateLessonRequest = LessonUpdateBody;
type UpdateLessonResponse = {
  data: { lesson: Lesson };
  meta: ResponseMeta;
};

// DELETE /api/v1/admin/lessons/{id}
// Response: 204 No Content

// POST /api/v1/admin/upload (multipart/form-data — handled via XHR, not openapi-fetch)
type UploadAudioResponse = {
  data: { archive_url: string; filename: string; size_bytes: number };
  meta: ResponseMeta;
};
```

**Caching & invalidation rules (LOCKED):**

- Query keys:
  - Full lesson dataset (visitor + admin): `['lessons', 'all']`
  - Filtered visitor results: `['lessons', 'filtered', { volume, kitab, bab, fasl, search, page }]`
  - Single lesson: `['lesson', id]`
  - Admin full list: `['admin', 'lessons', 'all']`
- Stale time: 60,000ms (60s — matches ISR `revalidate: 60` and CDN `s-maxage=60`)
- Refetch triggers: Window focus (enabled), network reconnect (enabled), manual invalidation only.
- Mutation invalidations:
  - POST /admin/lessons (201): invalidate `['lessons','all']`, `['admin','lessons','all']`
  - PUT /admin/lessons/{id} (200): invalidate `['lesson', id]`, `['lessons','all']`, `['admin','lessons','all']`, `['lessons','filtered']` (all)
  - DELETE /admin/lessons/{id} (204): invalidate `['lessons','all']`, `['admin','lessons','all']`, `['lesson', id]`
- Optimistic updates: No. All mutations wait for server confirmation before updating UI. Rationale: GitHub SHA conflicts make optimistic updates unsafe.

**Retry rules (LOCKED):**

- GET requests: retry up to 2 times on 5xx and network errors, exponential backoff (1s, 2s). No retry on 4xx.
- POST /admin/lessons and PUT /admin/lessons/{id}: no automatic retry (non-idempotent). User must retry manually.
- DELETE /admin/lessons/{id}: no automatic retry.
- POST /admin/upload: no automatic retry (file upload, IA is S3-idempotent by key but UI must not auto-retry without user confirmation).
- POST /admin/auth: no automatic retry (rate-limited endpoint, 5/15min/IP).

---

## 4. State Management & Data Flow (LOCKED)

**State boundaries:**

- Server state: TanStack Query v5. All remote data. Keys defined in Section 3.
- UI state: `useState` / `useReducer` per component. No global context for UI state.
- Persistent state: `localStorage`, key: `tuhfa_progress`, schema: `Record<number, { completed: boolean; positionSeconds: number; lastPlayedAt: string }>`. Managed exclusively via `useProgress` custom hook. Written on `timeupdate` (5s throttle) and on "mark complete" action. Read on `/lessons/[id]` mount.

**localStorage keys (complete list):**
| Key | Type | Retention | Owner |
|---|---|---|---|
| `tuhfa_progress` | `ProgressStore` JSON string | Indefinite (no TTL) | `useProgress` hook |

**Cross-tab/session behavior:**

- Token/session expiry UX: Admin routes detect 401 on any API call → `router.replace('/admin/login')`. No proactive expiry countdown.
- Logout behavior: No logout button in scope. Session expires naturally after 24h (backend: `SESSION_MAX_AGE_SECONDS=86400`). Next admin API call returns 401 → redirect to login.
- Multi-tab sync: Not implemented. Two admin tabs writing simultaneously may trigger GitHub 409 → handled by existing 409 UX.

---

## 5. Design System & UI Constraints

**Design tokens source:** Defined in this document. Implemented as Tailwind CSS config extensions.

**Typography (LOCKED):**
| Font | Purpose | Load |
|---|---|---|
| Noto Naskh Arabic | Arabic text (`title_ar`, `kitab`, `bab`, `fasl`, Arabic UI labels) | Google Fonts |
| Noto Sans Malayalam | Malayalam UI labels, navigation, buttons | Google Fonts |
| Inter | Numbers, Latin fallback, admin form fields | Google Fonts |

```css
/* Google Fonts import (in layout.tsx <head>) */
/* Noto Naskh Arabic: weights 400, 700 */
/* Noto Sans Malayalam: weights 400, 600 */
/* Inter: weights 400, 500, 600 */
```

**Type scale (LOCKED — Tailwind defaults, extended):**

- Display: 2.25rem / 700 (page titles)
- Heading: 1.5rem / 700
- Subheading: 1.125rem / 600
- Body: 1rem / 400
- Small: 0.875rem / 400
- Label: 0.75rem / 600 uppercase

**Spacing scale:** Tailwind default (4px base unit). No custom spacing.

**Color system (LOCKED):**
| Token | Hex | Usage |
|---|---|---|
| `primary` | `#1B4332` | Primary actions, active states, progress indicators |
| `primary-hover` | `#145027` | Button hover |
| `surface` | `#F8F5F0` | Page background (warm off-white, legible for long Arabic reading) |
| `surface-card` | `#FFFFFF` | Card/panel backgrounds |
| `border` | `#D1C9BD` | All borders, dividers |
| `text-primary` | `#1A1A1A` | Body text |
| `text-secondary` | `#6B6560` | Secondary labels, metadata |
| `text-arabic` | `#1A1A1A` | Arabic lesson titles (same as primary, explicit token) |
| `error` | `#B91C1C` | Error states, field errors |
| `success` | `#166534` | Success toasts, completed badge |
| `warning` | `#92400E` | Warning states (conflict messages) |

**Color contrast rules:** All text/background pairs meet WCAG 2.1 AA minimum 4.5:1 (normal text) and 3:1 (large text). Verified via Tailwind's built-in contrast checker at build time via `eslint-plugin-tailwindcss`.

**Component inventory (MVP — all custom, no library):**

- Button (primary, secondary, danger, ghost variants)
- Input (text, password, number, date, file)
- Select
- Textarea
- Label + FieldError (form field wrapper)
- Spinner (CSS-only)
- Toast (success, error, warning — top-right, auto-dismiss 5s)
- Modal (dialog with focus trap)
- ProgressBar (XHR upload)
- AudioPlayer (thin wrapper on native `<audio>`)
- Pagination (Previous/Next + page numbers)
- Badge (completed status)
- ChapterNav (volume tabs → kitab → bab → fasl selects)

**Responsiveness:**

- Breakpoints: Tailwind defaults — sm: 640px, md: 768px, lg: 1024px, xl: 1280px.
- Mobile-first: Yes. All layouts designed for 375px base, enhanced at breakpoints.
- Admin panel: minimum supported width 768px (admin is single desktop operator — documented assumption).

**RTL handling:**

- All Arabic text rendered with `dir="rtl"` on the containing element.
- CSS logical properties used for margins/padding/borders (`ms-`, `me-`, `ps-`, `pe-` Tailwind utilities).
- Mixed Arabic/Malayalam layouts (same line) are avoided — Arabic is always in its own block.
- `lang="ar"` attribute on Arabic text blocks for correct font selection by browser.
- `lang="ml"` attribute on Malayalam text blocks.

---

## 6. Accessibility (A11y) Baseline (LOCKED)

**Target:** WCAG 2.1 AA

**Mandatory behaviors:**

- Keyboard navigation works for all flows. No mouse-only interactions.
- Visible focus indicator on all interactive elements (Tailwind `focus-visible:ring-2`).
- Form errors announced via `role="alert"` or `aria-live="polite"`.
- Modal/Dialog: focus trap on open, focus returns to trigger on close, Escape closes.
- Audio player: Space = play/pause (when focused), arrow keys seek ±5s, all controls keyboard-accessible.
- Chapter navigation: all filter selects keyboard-accessible, visible labels.
- Pagination: Previous/Next buttons have `aria-label`. Active page has `aria-current="page"`.
- Color contrast: all pairs ≥ 4.5:1 (normal text), ≥ 3:1 (large text/UI components).
- No color-only information (error states also use icon + text, not color alone).
- Arabic text: `lang="ar"` + `dir="rtl"` on all Arabic content blocks.
- Images: none in scope (no lesson thumbnails in data model).
- Testing: `axe-core` via `@axe-core/react` in development. Lighthouse CI a11y score ≥ 90 gate.

---

## 7. Performance Budgets (LOCKED)

**Targets:**

- LCP: < 2,500ms
- INP: < 200ms
- CLS: < 0.1
- Bundle budget (initial JS, gzipped): < 150KB
- Route `/`: < 80KB JS gzipped
- Route `/lessons/[id]`: < 80KB JS gzipped
- Route `/admin/*`: < 120KB JS gzipped

**Enforcement:**

- CI: Lighthouse CI (`@lhci/cli`) on every PR against preview deployment. Fails on LCP > 2500, CLS > 0.1, INP > 200.
- Bundle: `@next/bundle-analyzer` in CI. Fails if any route bundle exceeds budget.
- Runtime: Vercel Speed Insights enabled in production.

**Techniques (LOCKED):**

- Code splitting: Yes — Next.js App Router per-route splitting (automatic).
- Image optimization: N/A (no images in scope).
- Virtualized lists: No (648 rows is within DOM budget, no virtualization needed).
- Font loading: `font-display: swap` on all Google Fonts. Preconnect to `fonts.googleapis.com` and `fonts.gstatic.com` in `<head>`.
- Audio: `preload="metadata"` only (not `auto`). No preloading of audio files.
- 4-parallel lesson calls: fired in parallel (`Promise.all`), not serial. ISR cache means these hit CDN edge on public pages.

---

## 8. Security & Privacy (Frontend)

**Threat model assumptions:**

- Visitors are unauthenticated members of the public. No visitor PII is collected or stored.
- Admin is the single project owner accessing from a trusted device.
- Primary frontend risks: XSS, admin session hijacking, content injection via lesson titles.

**XSS defense baseline:**

- All user-supplied content (lesson titles, chapter names) rendered via React's default JSX escaping. No `dangerouslySetInnerHTML` anywhere.
- No `eval()`, no `new Function()`, no dynamic script injection.
- `archive_url` values are rendered as `<audio src>` attributes only — never as `href` for arbitrary navigation.
- No user-generated content rendered as HTML.

**Content Security Policy (LOCKED):**

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  media-src https://archive.org;
  connect-src 'self';
  frame-ancestors 'none';
```

Implemented as `next.config.ts` `headers()` rule. No `unsafe-inline`, no `unsafe-eval`.
Note: Next.js App Router uses inline scripts for hydration — nonce-based CSP will be added if Next.js requires it; otherwise use `strict-dynamic` for the script-src only.

**CSRF stance:**

- Session cookie is `SameSite=Strict` (enforced by backend). No CSRF token needed for same-origin requests.
- No cross-origin form submissions in scope.

**Token storage rules:**

- Admin session: HttpOnly cookie only. Never read by JavaScript. Never stored in localStorage or sessionStorage.
- No JWT on the frontend. No bearer tokens.
- Forbidden: storing any auth credential in localStorage, sessionStorage, or any JS-accessible storage.

**Third-party script governance:**

- Google Fonts: loaded via `<link>` only (CSS + font files). No JS from Google Fonts.
- Vercel Speed Insights: one script from Vercel's domain. Explicitly allowed in CSP `script-src` if added.
- No other third-party scripts.

**PII handling rules:**

- No visitor PII collected. No analytics that identify individuals.
- `tuhfa_progress` localStorage contains only lesson IDs and playback timestamps — no personal identifiers.
- Admin password never touched client-side beyond the login form POST body (HTTPS only).

**Rate-limit UX:**

- 429 responses: parse `Retry-After` header and `error.details.retryAfterSeconds`. Display countdown to user. Do not auto-retry.

**Sensitive data rendering rules:**

- Admin password: `type="password"` input, never logged, never stored.
- Session cookie: never accessed via JavaScript.
- `error.details` from API errors: rendered only for 422 field-level validation (safe — contains field names, not secrets). 500 error details never rendered (always empty `{}`).

**Clickjacking protection:**

- `frame-ancestors 'none'` in CSP (above). Also set `X-Frame-Options: DENY` in `next.config.ts` headers.

---

## 9. Observability (Frontend)

**Logging/telemetry:**

- Vercel Speed Insights: Core Web Vitals (LCP, INP, CLS) per route. Enabled in production via `@vercel/speed-insights/next`.
- No custom event tracking.
- No user behavior analytics.
- No error reporting service (Sentry is out of scope — single admin, self-maintained project).
- Console errors in production: not suppressed, but no intentional `console.log` calls in production code.

**What is explicitly NOT tracked:**

- Visitor identity (no cookies tracking visitors, no fingerprinting).
- Lesson play counts or completion rates (no analytics pipeline in scope per backend freeze).
- Search queries.
- Admin actions (backend pino logs handle this).

---

## 10. Testing Strategy (Frontend)

**Test layers (LOCKED):**

- Unit: Custom hooks (`useProgress`, `useAdminAuth`), utility functions (lesson merge/deduplicate, chapter hierarchy builder, format helpers). Tool: vitest.
- Component: All custom components listed in Section 5 — render, interaction, error states. Tool: vitest + @testing-library/react.
- Integration (mock-based): All screen-level flows against Prism mock server (`http://localhost:4010`). Tool: vitest + MSW for component-level, Playwright for E2E.
- E2E: Critical paths only. Tool: Playwright.
- Accessibility: `axe-core` via `@axe-core/react` in development. Lighthouse CI a11y score ≥ 90 in CI.
- Performance: Lighthouse CI on PR preview deployments. Budgets enforced (Section 7).
- Contract conformance: Frontend API calls validated against OpenAPI types via TypeScript strict compilation (`tsc --noEmit`). No runtime contract tests beyond type safety.
- Visual regression: No (out of scope — no design file baseline).

**MVP test checklist:**

- [ ] Admin login: correct password → redirect to `/admin`; wrong password → inline error; 429 → rate-limit message.
- [ ] Add lesson wizard: Step 1 upload progress renders; Step 2 form pre-populated with `archive_url`; 201 success → redirect to `/admin`; 422 → field errors.
- [ ] Edit lesson: pre-populated form; partial update sends only changed fields; 409 → conflict toast.
- [ ] Delete lesson: confirmation modal opens; confirm → 204 → list refreshes; cancel → modal closes.
- [ ] Lesson browser: chapter nav filters list correctly; search with ≥ 2 chars filters; search with < 2 chars blocked client-side; pagination Previous/Next works.
- [ ] Audio player: play/pause toggles; progress saved to localStorage on timeupdate; position restored on re-visit; mark complete updates badge.
- [ ] 401 on any admin route → redirect to `/admin/login`.
- [ ] 429 on any route → Retry-After countdown shown.
- [ ] 502 on any admin write → inline retry prompt.
- [ ] A11y: axe-core passes on all 6 routes.
- [ ] Performance: Lighthouse CI passes LCP/CLS/INP/bundle budgets on `/` and `/lessons/[id]`.

---

## 11. Project Structure (Frontend skeleton)

```text
/
├── .env.example
├── .env.local                        ← gitignored
├── .gitignore
├── package.json
├── tsconfig.json                     ← strict mode enabled
├── next.config.ts                    ← headers (CSP, X-Frame-Options), ISR config
├── tailwind.config.ts                ← design tokens (colors, fonts)
├── postcss.config.js
├── lighthouserc.js                   ← Lighthouse CI budgets
├── README.md
├── openapi.yaml                      ← locked contract source of truth
├── /src
│   ├── proxy.ts                      ← Admin session check → redirect /admin/login (Next.js 16 proxy — replaces middleware.ts)
│   ├── /app
│   │   ├── layout.tsx                ← Root layout: fonts, CSP meta, QueryProvider
│   │   ├── page.tsx                  ← / Lesson Browser (ISR)
│   │   ├── /lessons
│   │   │   └── /[id]
│   │   │       └── page.tsx          ← /lessons/[id] Lesson Detail (ISR)
│   │   └── /admin
│   │       ├── /login
│   │       │   └── page.tsx          ← /admin/login (CSR)
│   │       ├── page.tsx              ← /admin Lesson List (CSR)
│   │       └── /lessons
│   │           ├── /new
│   │           │   └── page.tsx      ← /admin/lessons/new Wizard (CSR)
│   │           └── /[id]
│   │               └── /edit
│   │                   └── page.tsx  ← /admin/lessons/[id]/edit (CSR)
│   ├── /api
│   │   ├── client.ts                 ← openapi-fetch client instance
│   │   └── endpoints.ts              ← typed query/mutation functions (no raw fetch calls in components)
│   ├── /components
│   │   ├── /ui                       ← Button, Input, Select, Modal, Toast, Spinner, ProgressBar, Badge, Pagination
│   │   ├── /audio                    ← AudioPlayer component
│   │   └── /admin                    ← AdminLessonTable, AddLessonWizard, EditLessonForm, DeleteModal
│   ├── /features
│   │   ├── /lessons                  ← LessonBrowser, ChapterNav, LessonCard, LessonDetail
│   │   └── /progress                 ← ProgressBadge, MarkCompleteButton
│   ├── /hooks
│   │   ├── useProgress.ts            ← localStorage progress read/write
│   │   ├── useLessons.ts             ← TanStack Query hooks for lesson data
│   │   └── useAdminAuth.ts           ← Admin auth mutation + redirect
│   ├── /lib
│   │   ├── lessons.ts                ← Merge 4-call results, build chapter hierarchy
│   │   └── format.ts                 ← Duration formatting, date formatting
│   ├── /styles
│   │   └── globals.css               ← Tailwind directives, font-face imports
│   ├── /types
│   │   ├── api.ts                    ← Generated from openapi.yaml via openapi-typescript
│   │   └── progress.ts               ← ProgressStore, LessonProgress types
│   └── /utils
│       └── cn.ts                     ← clsx + twMerge utility
└── /tests
    ├── /unit
    │   ├── useProgress.test.ts
    │   ├── lessons.test.ts           ← merge logic, chapter hierarchy builder
    │   └── format.test.ts
    ├── /component
    │   ├── AudioPlayer.test.tsx
    │   ├── ChapterNav.test.tsx
    │   ├── Pagination.test.tsx
    │   └── AddLessonWizard.test.tsx
    └── /e2e
        ├── lesson-browser.spec.ts
        ├── lesson-player.spec.ts
        ├── admin-auth.spec.ts
        ├── admin-add-lesson.spec.ts
        └── admin-edit-delete.spec.ts
```

**Naming convention:** camelCase for variables/functions, PascalCase for components/types, kebab-case for filenames.
**Import alias:** `@/` maps to `/src/`

---

## 12. Deployment, Rollback, Environments

**Hosting:** Vercel (free tier — same project as backend, same deployment)
**Build command:** `next build` (locked)
**Type check in CI:** `tsc --noEmit` — blocks merge on type errors
**Env mapping:**

- `development`: `next dev` with `.env.local`
- `preview`: Vercel preview deployment (auto-created per PR/branch) with Vercel preview env vars
- `production`: Vercel production deployment from `main` branch

**ISR revalidation:**

- Public pages use `export const revalidate = 60` (Next.js App Router ISR).
- On lesson create/update/delete: backend fires `GET /api/revalidate?secret={REVALIDATION_SECRET}&path=/` and `&path=/lessons/{id}` (fire-and-forget, defined in backend freeze).
- CDN edge serves stale content for up to 60s during revalidation — acceptable per product requirements.

**Rollback strategy:**

- Code rollback: Vercel dashboard → Deployments → previous deployment → "Promote to Production". Instant, no downtime. Same as backend freeze rollback process.
- No frontend-specific data to roll back (no frontend database).
- If ISR cache is stale post-rollback: force revalidation via backend revalidation endpoint or wait 60s for natural expiry.

**Cache/CDN invalidation on rollback:**

- Vercel automatically serves the promoted deployment's ISR cache.
- If needed: purge via Vercel dashboard (manual) or trigger revalidation webhook.

---

## 13. Forbidden Changes (Scope Lock)

**BANNED without a new Freeze version + scope/time review:**

- Add routes or screens not listed in Section 2
- Change routing mode (ISR ↔ SSR or CSR ↔ SSR for any existing route)
- Change state management library (TanStack Query is locked)
- Change auth model (cookie-only is locked — no JWT, no bearer tokens)
- Add i18n framework or language switching
- Add offline/PWA support
- Add any third-party component library
- Change the localStorage schema for `tuhfa_progress`
- Add cross-device progress sync (requires backend change, is explicitly out of scope)
- Add any new external API dependency
- Add visitor authentication of any kind
- Change pagination model (offset + Previous/Next is locked)
- Add real-time features (WebSockets, SSE, polling)
- Add dark mode
- Change font stack

If requested:
→ Create Change Request → review scope/cost/time impact → approve/reject → bump Freeze version.

---

## 14. Change Control (Accept-and-price rules)

**Change Request Format:**

- Requested change:
- Reason:
- Scope impact (frontend):
- Backend Freeze impact (Y/N — if Y, Backend Freeze must also be bumped):
- OpenAPI impact (Y/N — if Y, new openapi.yaml version required):
- Timeline impact:
- Cost impact:
- Risk impact:
- Decision: Approved / Rejected
- New Frontend Freeze version: v1.1 / v2.0
- New Backend Freeze version (if required): v1.1 / v2.0

**Billing rule:** N/A (personal project — time cost only)
**Response SLA for change requests:** Self-imposed: review within 7 days

---

## 15. Version History

- v1.1 (2026-04-30): Stack version corrections before implementation start. Next.js 14 → 16. Turbopack now default for both dev and production build. `middleware.ts` → `proxy.ts` throughout (all screen permission descriptions, auth gating model, project structure). Banned `next lint` and `middleware.ts`. Backend Freeze reference updated to v1.1. No scope, route, component, or API contract changes.
- v1.0 (2026-04-25): Initial frontend freeze approved for execution. 10 user stories, 6 routes, bilingual Arabic/Malayalam UI, ISR public pages, CSR admin, TanStack Query, Tailwind CSS, WCAG 2.1 AA. Aligned to Backend Freeze v1.0 and OpenAPI v1.0.0.
