Review the current changes against:

- #file:../../docs/backend-freeze.md
- #file:../../docs/frontend-freeze.md
- #file:../../docs/openapi.yaml
- #file:../../docs/build-plan.md

Check for:

- build-plan scope violation (changes outside the approved task)
- missing approved task ID reference
- contract drift (invented fields, endpoints, status codes, or error shapes)
- changes that should have gone through Change Request flow
- missing tests
- missing error handling
- security issues
- accessibility issues
- documentation drift
- unrelated file changes

Output:

- blockers
- warnings
- nice-to-have fixes
