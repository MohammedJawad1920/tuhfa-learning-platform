---
applyTo: "docs/**/*.md,README.md,CLAUDE.md"
---

# Documentation rules

## Protected files (never edit during implementation tasks)

- `docs/backend-freeze.md`
- `docs/frontend-freeze.md`
- `docs/openapi.yaml`
- `docs/build-plan.md`

These files may only be modified during an approved planning or change-request task, not during implementation.

## General rules

- Keep docs concise, factual, and synchronized with the current implementation.
- Do not describe behavior that does not exist in code.
- When architecture, API behavior, or release steps change, update the relevant non-protected docs in the same task.
- Preserve freeze version references and change history.
- Prefer checklists, tables, and short sections over long prose.
