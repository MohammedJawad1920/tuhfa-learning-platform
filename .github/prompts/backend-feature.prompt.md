Read:

- #file:../../docs/backend-freeze.md
- #file:../../docs/openapi.yaml
- #file:../../docs/build-plan.md

Step 1: State the approved task ID from build-plan.md you are working on.
If the requested work is outside that task, STOP and ask for an explicit task approval or Change Request.

Step 2: Summarize the current backend state relevant to this task.

Step 3: Propose a small implementation plan.
List affected files, API/schema impact, and validation steps.

--- STOP HERE. Wait for explicit human approval before writing any code. ---

Step 4 (after approval): Implement only the approved scope.

Step 5: Run or list required validation steps (lint, typecheck, tests, contract check).

Step 6: Report changed files, contract risks, and follow-up items.

Constraints:

- No invented API behavior.
- No breaking changes without Change Request.
- Keep edits minimal and reviewable.
- Do not modify unrelated files.
