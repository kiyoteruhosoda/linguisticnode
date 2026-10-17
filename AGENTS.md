# LinguisticNode Agent Instructions

This is a personal vocabulary learning application.

## Current State (2026-10-17)

- **Only the mobile app (Expo, `frontend/apps/mobile`) is in use.** It keeps
  words and study progress on the device; release builds carry no server URL
  (`EXPO_PUBLIC_API_BASE_URL`), so there is no sync.
- **The web app and the server (FastAPI, `app/`, `frontend/apps/web`) were
  retired on 2026-10-17** (task #404). Their code is still in the repository
  but runs nowhere. The owner has not decided whether to delete it: do not
  delete or fix it until then.
- See `readme.md` ("いまの状態") and `CLAUDE.md` for details.

## Project Skills

All domain-specific knowledge is organized in **Agent Skills** under `.agents/skills/`:

- **architecture** - FastAPI layering and dependency direction
- **backend-integration** - API endpoints, Pydantic schemas, DI patterns
- **testing** - pytest strategy and regression discipline
- **error-logging-observability** - Structured logging, request correlation
- **security** - Input validation, secret handling, safe errors
- **auditing-traceability** - Audit logging for state changes
- **debugging-troubleshooting** - Repeatable debugging workflow
- **mobile-expo** - Expo SDK package version rules, native module checks, mobile lint/type patterns

**Activate skills implicitly** by mentioning relevant keywords, or **explicitly** with `$skill-name`.

## Core Conventions

- **Language**: Chat responses in Japanese; code comments in English; UI text in English
- **Stack**: TypeScript, React Native (Expo) for the mobile app. The retired
  server/web code is Python 3.11+ / FastAPI and React
- **Time**: All persisted timestamps must be UTC
- **Logging**: Structured logs to stdout/stderr with request_id correlation
- **Testing**: Do not run builds or tests locally (`npm run build`,
  `npm run test`, `npx tsc`, `pytest`, ...). Open a pull request and let the
  forge CI (`.forgejo/workflows/frontend-visual.yml`: `npm run test:ci` and
  `npm run test:mobile:regression`) check it. There is no pytest in CI: the
  server is retired

## Conflict Resolution

1. `.github/copilot-instructions.md` (detailed Copilot-specific rules)
2. Relevant skill under `.agents/skills/`
3. Existing repository patterns

Refer to `.github/copilot-instructions.md` for complete GitHub Copilot configuration and quality gates.
