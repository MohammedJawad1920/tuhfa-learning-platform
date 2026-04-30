Read:

- #file:../../docs/frontend-freeze.md
- #file:../../docs/openapi.yaml
- #file:../../docs/build-plan.md

Step 1: State the approved task ID from build-plan.md you are working on.
If the requested work is outside that task, STOP and ask for an explicit task approval or Change Request.

Step 2: Summarize the current frontend state relevant to this task.

Step 3: Propose a small implementation plan.
List affected screens, components, API calls, state changes, and validation steps.

--- STOP HERE. Wait for explicit human approval before writing any code. ---

Step 4 (after approval): Implement only the approved scope.

Step 5: Run or list required validation steps (lint, typecheck, tests, contract alignment check).

Step 6: Report changed files, UI risks, and test gaps.

Constraints:

- No invented fields or endpoints.
- Respect route, auth, and UI-state rules from the freeze.
- Reuse existing components where possible.
- Do not modify unrelated files.
- If backend contract is missing something needed, stop and propose a backend Change Request.
