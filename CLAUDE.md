# Shared AI operating context

## Source of truth hierarchy (in order of authority)

1. `docs/backend-freeze.md` — backend scope, constraints, and acceptance criteria
2. `docs/frontend-freeze.md` — frontend scope, routes, UI behavior, and acceptance criteria
3. `docs/openapi.yaml` — exact API contract between backend and frontend
4. `docs/build-plan.md` — approved execution order and current task scope

**These four documents are protected. Do not modify them during implementation tasks.**
Changes to any of these require an approved Change Request and version bump first.

## Reference docs (not execution authority)

- `docs/release-plan.md`
- `docs/decisions.md`

## Working style

- Plan first, then implement.
- Work in vertical slices.
- Never invent contract details.
- Confirm the active task ID from `docs/build-plan.md` before any implementation.
- Ask for clarification when freeze-critical information is missing.
- Prefer minimal scope changes.
- Propose Change Requests for conflicting requirements or out-of-scope requests.

## Output expectations

- State the task ID before implementation
- Small diffs
- Explicit assumptions
- Validation steps
- Risks and follow-up items
- Explicit statement that unrelated areas were not modified
