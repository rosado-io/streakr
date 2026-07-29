# Contributing to streakr

Thanks for your interest in contributing!

## Development setup

Use Node.js 22 and [pnpm](https://pnpm.io). The repository pins pnpm 10.12.2
through the `packageManager` field.

```bash
pnpm install
pnpm dev             # demo playground at http://localhost:5173
pnpm test            # vitest in watch mode
pnpm test:ci         # single run with coverage
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm format:check    # prettier
pnpm audit:dead-code # knip
pnpm build           # library build
pnpm build:demo      # production demo build
pnpm check:package   # npm exports and declaration contract
```

## Commit convention

Use [Conventional Commits](https://www.conventionalcommits.org/) with an
imperative description in Spanish:

```
feat(component): Agrega navegación por teclado al selector
fix(component): Corrige el foco del calendario
docs: Actualiza las recetas de adquisición
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`, and `revert`. Common scopes include `component`, `contract`,
`demo`, `docs`, and `deps`. Releases are automated with semantic-release, so
commit types drive version bumps. Use `!` after the type or a
`BREAKING CHANGE:` footer for a major release.

## Pull requests

1. Branch off `main` using a hyphenated name such as
   `feat-presentation-contract`; do not use `/` as a separator.
2. Keep the PR focused; include tests for behavior changes.
3. CI must be green: lint, format, typecheck, tests with coverage, build, dead
   code audit, package validation, and SonarCloud.
4. PRs are squash-merged. The squash title becomes the release commit, so make
   it a valid Conventional Commit in Spanish.
