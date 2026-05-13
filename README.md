# Tuhfat al-Muhtaj Learning Platform

## Setup

1. Install Node.js 22 LTS locally and set the Vercel project Node.js version to 22.x so it matches `.nvmrc` and `package.json`.
2. Run `npm ci`.
3. Copy the required environment variables into `.env.local`.
4. Start the local mock API with `npm run mock`.
5. Start the app with `npm run dev`.

## Required environment variables

- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `SESSION_MAX_AGE_SECONDS`
- `GITHUB_TOKEN`
- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- `GITHUB_FILE_PATH`
- `GITHUB_BRANCH`
- `IA_ACCESS_KEY`
- `IA_SECRET_KEY`
- `IA_COLLECTION_IDENTIFIER`
- `IA_S3_ENDPOINT`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `REVALIDATION_SECRET`
- `ALLOWED_ORIGINS`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_BASE_URL`

## Local API mocking

Use `npm run mock` to start the Prism mock server on port 4010.

## Admin lesson workflow

1. Visit `/admin/login` and sign in.
2. Open `/admin/lessons/new`.
3. Upload the audio file in step 1.
4. Fill out the lesson metadata in step 2.
5. Save the lesson and confirm it appears in `/admin`.

## Smoke test checklist

Run these checks against the deployment (production or preview) before launch:

1. `GET /api/v1/lessons` returns `200` and includes `Cache-Control` header.
2. `GET /api/v1/lessons/1` returns `200` (if populated) or `404` (if not yet populated).
3. `GET /api/docs` loads the OpenAPI UI and shows all 7 endpoints.
4. `POST /api/v1/admin/auth` with wrong password returns `401 INVALID_CREDENTIALS`.
5. `POST /api/v1/admin/auth` with correct password returns `200` and includes `Set-Cookie` header.
6. `GET /api/v1/admin/lessons` without session cookie returns `401 UNAUTHORIZED`.
7. Visit `/admin` without session → redirects to `/admin/login`.

## Notes

- The production admin flow is: log in, upload audio, create the lesson, then confirm the lesson appears on the public site after revalidation.
