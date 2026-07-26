# Contributing to streakr

Thanks for your interest in contributing!

## Development setup

Requires Node.js >= 20.19.0 and [pnpm](https://pnpm.io) (the repo pins
`packageManager` to pnpm 10.12.2).

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
```

## Commit convention

We use [Conventional Commits](https://www.conventionalcommits.org/), **written in English**:

```
feat(component): add year selector keyboard navigation
fix(agents): handle repositories without remotes
docs: clarify provider aggregation
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build`, `perf`. Scopes commonly used: `component`, `agents`, `providers`, `core`, `demo`, `deps`. Releases are automated with semantic-release, so commit types drive version bumps — a `BREAKING CHANGE:` footer triggers a major release.

## Pull requests

1. Branch off `main`.
2. Keep the PR focused; include tests for behavior changes.
3. CI must be green: lint, format, typecheck, tests with coverage (SonarCloud requires >= 80% coverage on new code), and build.
4. PRs are squash-merged; the squash title becomes the release commit, so make it a valid Conventional Commit in English.
