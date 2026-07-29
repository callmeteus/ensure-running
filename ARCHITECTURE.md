# Architecture

## Goal

`ensure-running` is a chainable CLI and provider monorepo. Each provider package owns one local dependency (Docker today, Postgres/Redis later). The CLI parses provider names, runs them in order, then optionally spawns a trailing command.

## Monorepo layout

```text
packages/
  core/     @ensure-running/core   registry, argv parsing, chaining runner
  docker/   @ensure-running/docker Docker detection, auto-start, polling, library API
  cli/      ensure-running         bins: er, ensure-running
```

Import graph:

```text
packages/cli
  -> @ensure-running/core
  -> @ensure-running/docker

packages/docker
  -> @ensure-running/core (provider types only)

packages/core
  (no workspace runtime deps)
```

## Provider contract

Each provider implements `EnsureProvider` from `@ensure-running/core`:

| Method | Responsibility |
|--------|----------------|
| `id` | CLI token (`docker`) |
| `aliases?` | Short names (`d`) |
| `parseArgs(argv)` | Consume provider flags; return `{ options, remaining }` |
| `run(options)` | Ensure/check flow; return process exit code |
| `printHelp?()` | Provider-specific help |

The CLI uses `parseInvocation()` to:

1. Read consecutive provider tokens from argv.
2. Let each provider consume its own flags.
3. Treat the rest as an optional command (`vite dev`, `npm test`, etc.).
4. Honor an explicit `--` separator before the command.

## Chaining examples

```text
er docker
er docker --check
er docker -- vite dev
er docker vite dev
er docker postgres -- npm test   # postgres = future provider
```

`parseInvocation` only treats a token as a provider when it matches a registry entry. Anything else becomes the start of the trailing command.

## Docker package

Barrel-only `src/` root (`index.ts` only at package root). Internal modules:

```text
ensure/     orchestration (ensureDockerRunning, isDockerRunning)
detect/     installation + daemon detection
wait/       poll until docker info succeeds
commands/   docker CLI wrappers
platforms/  OS-specific auto-start
process/    detached spawn helpers
provider/   dockerProvider for ensure-running CLI
errors/     typed error hierarchy
types/      shared interfaces and defaults
utils/      exec, spawn, poll, which, sleep, retry, timeout
```

### Installation detection

| Platform | Locate binary | Validate |
|----------|---------------|----------|
| Windows | `where.exe docker` | `docker --version` exit 0 |
| Linux/macOS | `which docker`, fallback `command -v docker` | `docker --version` exit 0 |

`docker --version` is used instead of `docker version --format` because the latter can exit non-zero on Windows when the daemon is stopped even though the CLI is installed.

### Daemon detection

1. `docker info` exit 0 means reachable.
2. Optional `docker version` server format as secondary signal inside `runDockerVersion`.

### Auto-start by platform

| OS | Attempt order |
|----|---------------|
| Linux | `systemctl start docker` -> `service docker start` -> detached `dockerd` |
| Windows | `docker desktop start` -> launch Docker Desktop executable |
| macOS | `docker desktop start` -> `open -a Docker` |

## Build outputs

| Package | Formats | Entry |
|---------|---------|-------|
| `@ensure-running/core` | ESM + CJS + types | `dist/index.js` |
| `@ensure-running/docker` | ESM + CJS + types | `dist/index.js` |
| `ensure-running` | ESM bin only | `dist/bin/ensure-running.js` |

The CLI bundle inlines workspace packages via `tsup` `noExternal`.

## Adding a new provider

1. Create `packages/<name>/` with `EnsureProvider` implementation.
2. Register it in `packages/cli/src/cli/Cli.ts` (`createDefaultRegistry`).
3. Add the workspace dependency to `packages/cli/package.json`.
4. Document provider flags in the root README.

## Testing strategy

- Unit tests live under `packages/*/tests/`.
- Docker tests mock `child_process` - no real Docker in CI.
- Core tests cover registry parsing, chaining, and argv normalization.
- Root `vitest.config.ts` aliases workspace packages to `src/` during tests.

## Why CLI instead of dockerode

- Zero runtime dependencies.
- Works with any Docker CLI backend (Engine, Desktop, Colima, Rancher Desktop).
- Same surface users already use (`docker info`).
- Install and auto-start concerns stay in one place.
