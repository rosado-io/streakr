# Security Policy

## Supported versions

Only the latest published version of `@rosado-io/streakr` receives security fixes.

## Reporting a vulnerability

Please do **not** open a public issue for security vulnerabilities. Instead, report them privately through [GitHub Security Advisories](https://github.com/rosado-io/streakr/security/advisories/new).

You can expect an initial response within a few days. Once a fix is available it will be released promptly and credited to you unless you prefer otherwise.

## Dependency maintenance

Run `pnpm audit:security` after dependency updates. CI audits the full lockfile,
including development tools; a separate weekly workflow checks for newly
published advisories even when no code changes. Dependabot proposes weekly
updates for npm packages and GitHub Actions.

The security overrides in `pnpm-workspace.yaml` pin vulnerable transitive
ranges to corrected versions. Review and remove an override when its upstream
dependents adopt a safe range. The minimatch 11 override crosses a major
version to address GHSA-g3hv-75wg-m249; changes to it must pass lint, tests,
builds, dead-code analysis and package validation. TypeScript major upgrades
remain separate migrations.
