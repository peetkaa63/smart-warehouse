# AGENTS.md — Guidelines for AI coding agents

## Project context
This repository documents an inventory/warehouse management system with frontend,
backend, database and robot-emulator components. Consult README.md, TESTING.md,
README-TESTS.md and the actual source code before changing behavior.

## Editing workflow
- For nontrivial changes, explain the plan and impacted services first.
- Keep features small and compatible with existing API and database contracts.
- Use a feature branch and pull request. Do not deploy automatically.
- Inspect actual build/test scripts instead of guessing commands.
- Add relevant tests and report what was actually executed.
- Treat claims in documentation as unverified until tested against code.

## Special precautions
- Treat stock quantities, inventory operations and robot actions as potentially sensitive business state.
- Check validation, role-based access and authorization for stock-changing or admin operations.
- Never commit secrets, environment files, database dumps or real user/client data.
- Never perform destructive schema migrations, real robot actions or production deployment without explicit permission.
- Check Docker Compose service paths before attempting Docker image builds.

## Delivery report
Summarize the code changes, test results, remaining risks, required configuration
and rollback steps in Russian. Keep identifiers and source code in their original language.
