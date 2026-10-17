# Copilot Instructions (Repo)
This is a personal vocabulary app. Only the mobile app (Expo, `frontend/apps/mobile`) is in use; the FastAPI server was deleted from the repository on 2026-10-17 (task #407). See `readme.md`.

## Language Rules (Important)
- All responses in chat must be written in Japanese.
- All code comments (inline comments and docstrings) must be written in English.

## Always follow Project Skills
Follow skill documents under:
- .agents/skills/**/SKILL.md

If instructions conflict:
1) .github/copilot-instructions.md wins
2) then the most relevant skill wins
3) else follow existing repository patterns

## Global conventions
- TypeScript (React Native / Expo for mobile; React for the retired web app)
- Prefer correctness, readability, testability
- Domain logic stays framework-agnostic
- Never log secrets (tokens/passwords)

## Quality Gate (Required)
- Do not run builds or tests locally. Open a pull request and let the forge CI
  (`.forgejo/workflows/frontend-visual.yml`) run the frontend tests, type checks and build.
- Resolve all CI failures before considering the change complete.

## UI Language (Important)
- All user-facing UI strings must be in English.
  - This includes labels, buttons, headings, placeholders, validation messages shown in the UI, and toast/modal messages.
  
