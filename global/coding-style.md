# Coding Style and Verification

- Keep functions small and focused.
- Avoid hardcoded credentials and environment-specific secrets.
- Validate inputs at boundaries.
- Handle errors explicitly with useful messages.
- Prefer deterministic scripts with clear exit codes.
- For changes, run at least one relevant verification step: test, lint, typecheck, build, or direct script execution.
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
