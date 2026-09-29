# Agent Guidelines

## Project
- This is a Nuxt/Vue application for learning Japanese kana.
- Keep changes focused and reviewable.

## TypeScript and Vue
- Prefer TypeScript-safe code and avoid `any` unless justified.
- Keep Vue components small and readable.
- Prefer Composition API conventions already used by the project.

## Dependencies
- Use npm and keep `package-lock.json` in sync with `package.json`.
- Do not force incompatible peer dependencies without documenting the reason.

## Verification
- Run `npm run build` before shipping dependency or framework changes.
- Run `npm audit --audit-level=moderate` after dependency upgrades.
