# Migrating from 0.x to 1.0.0

## Provider classes are now factory functions

Every provider class became a factory function. Drop the `new`, lowercase the
first letter, and keep the same options object:

| 0.x                                  | 1.0.0                            | Import from                 |
| ------------------------------------ | -------------------------------- | --------------------------- |
| `new GitHubProvider(opts)`           | `githubProvider(opts)`           | `@rosado-io/streakr`        |
| `new GitLabProvider(opts)`           | `gitlabProvider(opts)`           | `@rosado-io/streakr`        |
| `new GitHubCoAuthorProvider(opts)`   | `githubCoAuthorProvider(opts)`   | `@rosado-io/streakr`        |
| `new GitHubCliProvider(opts?)`       | `githubCliProvider(opts?)`       | `@rosado-io/streakr/agents` |
| `new GitHubCliCoAuthorProvider(opts?)` | `githubCliCoAuthorProvider(opts?)` | `@rosado-io/streakr/agents` |
| `new GitLabCliProvider(opts?)`       | `gitlabCliProvider(opts?)`       | `@rosado-io/streakr/agents` |
| `new LocalGitCoAuthorProvider(opts)` | `localGitCoAuthorProvider(opts)` | `@rosado-io/streakr/agents` |

Options interfaces keep their existing names (`GitHubProviderOptions`, etc.) and
fields. Every factory additionally accepts an optional `name?: string` that
overrides the provider's default name (`"github"`, `"gitlab"`,
`"github-agents"`, `"local-git"`) — useful when aggregating two instances of
the same source, e.g. github.com plus a GitHub Enterprise host.

## Other breaking changes

- **Config errors are always plain `Error`.** The co-author providers
  previously threw `TypeError` for invalid options; catch/instanceof checks on
  `TypeError` must be updated.
- **`./agents` is Node-only by export condition.** The subpath is declared
  behind a `node` condition in `package.json`, so bundling it for a browser
  target now fails at resolve time instead of shipping Node built-ins.
- **The deep `./dist/streakr.css` export was removed.** Import
  `@rosado-io/streakr/styles.css` instead.
- **Node >= 20.19.0** is now required (`engines` field).

## Behavioral changes

- **Multi-year GitHub ranges now work.** The HTTP `githubProvider` splits
  ranges longer than one year into per-year GraphQL queries; previously such
  ranges were broken.
- **GitLab pagination.** The GitLab HTTP provider paginates with `page` query
  parameters instead of following `Link` headers. Results are identical.

## New exports

- `toCanonicalDays` and `FetchLike` from the main entry.
- `runLocalCli` from `@rosado-io/streakr/agents`.

## Unchanged

- The snapshot API: `createPublicSnapshot` and `writePublicSnapshot`, still
  from `@rosado-io/streakr/agents`.
