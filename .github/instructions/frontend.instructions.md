---
applyTo: "src/app/**/*.tsx,src/components/**,src/features/**,src/hooks/**,src/styles/**,src/api/**,src/lib/lessons.ts,src/lib/format.ts,src/types/progress.ts,src/utils/cn.ts,tailwind.config.ts,postcss.config.js,lighthouserc.js"
---

# Frontend rules

## Path setup

- Monorepo: `apps/web/**`
- Split src: `src/client/**,src/ui/**`
- Frontend-only repo: `src/**`
  Keep this scoped narrowly to frontend code only.
  Do NOT use broad globs like `**/*.ts` or `**/*.tsx` that would cover backend TypeScript.

## Source of truth

- `docs/frontend-freeze.md` defines allowed scope
- `docs/openapi.yaml` defines the exact API contract
- `docs/build-plan.md` defines the current approved execution task

## Before coding

- Read `docs/build-plan.md` and identify the approved task ID.
- If the requested change is outside the approved task, stop and require a Change Request.

## Contract rules

- Never invent API fields, endpoints, error states, or status codes not in `docs/openapi.yaml`.
- Error shape must match OpenAPI exactly.
- If backend contract is missing something the UI needs, stop and propose a backend Change Request.

## Code rules

- Match loading, empty, error, and permission states to the frontend freeze.
- Keep route structure, auth gating, and form rules aligned with the freeze.
- Prefer small components and predictable state flow.
- Reuse existing UI primitives before creating new ones.
- Keep accessibility intact: semantic HTML, keyboard support, visible focus, labeled controls.
- Respect performance budgets: avoid unnecessary client state, large bundles, and duplicated fetching.
- Handle API failures explicitly for 401, 403, 409, 422, 429, and 500 when relevant.

## Test rules

- Include or update tests for critical interactions and failure states for every UI change.

## Change control

If the request contradicts the freeze, OpenAPI, or build-plan, stop and propose a Change Request.
Do NOT silently patch scope.
