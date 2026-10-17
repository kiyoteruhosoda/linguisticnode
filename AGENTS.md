# LinguisticNode Agent Instructions

This is a personal vocabulary learning application.

## Current State (2026-10-17)

- **Only the mobile app (Expo, `frontend/apps/mobile`) is in use.** It keeps
  words and study progress on the device; release builds carry no server URL
  (`EXPO_PUBLIC_API_BASE_URL`), so there is no sync.
- **The web app and the server were retired on 2026-10-17** (task #404).
- **The server (FastAPI: `app/`, `tests/`, `Dockerfile`, `docker-compose*.yml`,
  `requirements*.txt`) was deleted from the repository on 2026-10-17**
  (task #407, the owner's decision). Restore it from git history if needed.
- The web app code (`frontend/apps/web`, `frontend/src`) is still in the
  repository but runs nowhere. The owner has not decided whether to delete it:
  do not delete or fix it until then. Its login and sync talk to the deleted
  server, so they have nothing to connect to; build and tests do not need it.
- See `readme.md` ("いまの状態") and `CLAUDE.md` for details.

## Project Skills

All domain-specific knowledge is organized in **Agent Skills** under `.agents/skills/`:

- **testing** - Test strategy and regression discipline (written for the deleted server; the principles still apply)
- **error-logging-observability** - Structured logging, request correlation
- **security** - Input validation, secret handling, safe errors
- **auditing-traceability** - Audit logging for state changes
- **debugging-troubleshooting** - Repeatable debugging workflow
- **mobile-expo** - Expo SDK package version rules, native module checks, mobile lint/type patterns

**Activate skills implicitly** by mentioning relevant keywords, or **explicitly** with `$skill-name`.

## Core Conventions

- **Language**: Chat responses in Japanese; code comments in English; UI text in English
- **Stack**: TypeScript, React Native (Expo) for the mobile app. The retired
  web code is React
- **Time**: All persisted timestamps must be UTC
- **Logging**: Structured logs to stdout/stderr with request_id correlation
- **Testing**: Do not run builds or tests locally (`npm run build`,
  `npm run test`, `npx tsc`, ...). Open a pull request and let the
  forge CI (`.forgejo/workflows/frontend-visual.yml`: `npm run test:ci` and
  `npm run test:mobile:regression`) check it

## Conflict Resolution

1. `.github/copilot-instructions.md` (detailed Copilot-specific rules)
2. Relevant skill under `.agents/skills/`
3. Existing repository patterns

Refer to `.github/copilot-instructions.md` for complete GitHub Copilot configuration and quality gates.
