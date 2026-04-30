---
applyTo: "src/app/api/**,src/app/revalidate/**,src/config/**,src/schemas/**,src/lib/github.ts,src/lib/internet-archive.ts,src/lib/rate-limit.ts,src/lib/logger.ts,src/utils/response.ts,src/utils/request-id.ts,src/types/lesson.ts,proxy.ts,data/lessons.json,openapi.yaml"
---

# Backend rules

## Path setup

- Monorepo: `apps/api/**,packages/shared-types/**`
- Split src: `src/server/**,src/api/**,src/shared/**`
- Backend-only repo: `src/**,db/**`
  Do NOT use broad globs like `**/*.ts` that would cover frontend code.

## Source of truth

- `docs/backend-freeze.md` defines allowed scope
- `docs/openapi.yaml` defines the exact API contract
- `docs/build-plan.md` defines the current approved execution task

## Before coding

- Read `docs/build-plan.md` and identify the approved task ID.
- If the requested change is outside the approved task, stop and require a Change Request.

## Contract rules

- Do not invent request or response shapes.
- Do not invent endpoints, fields, status codes, or error shapes not in `docs/openapi.yaml`.
- If OpenAPI and implementation disagree, treat it as a blocker and report it clearly.
- Do not make breaking API changes without a documented Change Request and version bump.

## Code rules

- Keep database changes migration-first.
- Do not change schema and code separately; keep them aligned in the same task.
- Prefer explicit service, repository, validation, and route boundaries.
- Preserve invariants, authorization rules, idempotency rules, and error codes from the backend freeze.
- Preserve structured logging, metrics hooks, and failure handling defined in the freeze.

## Test rules

Add or update tests for:

- Happy path
- Validation failure
- Auth failure
- Conflict/failure mode

## Change control

If the request contradicts the freeze or OpenAPI, stop and propose a Change Request.
Do NOT silently patch scope.
