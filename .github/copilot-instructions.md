# Project operating rules

## Source of truth hierarchy

- `docs/backend-freeze.md` and `docs/frontend-freeze.md` = scope truth
- `docs/openapi.yaml` = contract truth
- `docs/build-plan.md` = execution truth for the current task

**Never modify these four files during implementation. Changes require an approved Change Request first.**

## Before coding

- Read `docs/build-plan.md` and identify the current approved task ID.
- State the task ID before proposing or writing any code.
- If the requested work is not covered by the approved task, stop and require a Change Request.

## Contract rules

- Never invent endpoints, fields, status codes, routes, or schema not present in the freeze docs or OpenAPI.
- If a requested change conflicts with freeze docs, stop and propose a Change Request instead of silently changing code.

## Execution rules

- Always work in small, reviewable increments. Prefer one feature slice at a time.
- Summarize current state and propose a short plan. Wait for approval before structural changes.
- Do not modify unrelated files.
- After code changes, always run: lint, typecheck, tests, and build.
- Prefer boring, maintainable solutions over clever ones.
- Keep security, error handling, and observability consistent with the freeze docs.
- When updating behavior, update docs only if the task explicitly requires it.
