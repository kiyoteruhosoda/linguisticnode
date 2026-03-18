# LinguisticNode Agent Instructions

This is a personal FastAPI + React vocabulary learning application.

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
- **Stack**: Python 3.11+, FastAPI, React, TypeScript
- **Environment**: Docker-first (development and production)
- **Time**: All persisted timestamps must be UTC
- **Logging**: Structured logs to stdout/stderr with request_id correlation
- **Testing**: Always run backend (pytest) and frontend (vitest) tests before completing work

## Conflict Resolution

1. `.github/copilot-instructions.md` (detailed Copilot-specific rules)
2. Relevant skill under `.agents/skills/`
3. Existing repository patterns

Refer to `.github/copilot-instructions.md` for complete GitHub Copilot configuration and quality gates.
