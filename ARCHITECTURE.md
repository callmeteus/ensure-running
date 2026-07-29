# Architecture

## Problem and goal

Node.js CLIs and tools that depend on Docker must handle installation checks, daemon availability, auto-start, and readiness polling differently on Linux, Windows, and macOS. This package centralizes that behavior behind a single call: `await ensureDockerRunning()`.

## Why CLI instead of dockerode

- **Zero runtime dependencies** - only Node.js built-ins.
- **Works with any Docker CLI backend** - Docker Engine, Docker Desktop, Colima, Rancher Desktop, as long as `docker info` succeeds when configured.
- **Same surface users already use** - no separate socket configuration in library code.
- **Testable without Docker** - `child_process` is fully mockable in unit tests.

dockerode would add weight, socket path assumptions, and a second API surface without improving install or auto-start behavior.

## Layered modules

Each layer is a folder with an `index.ts` barrel. Cross-module imports use barrels only.

```text
src/index.ts          public API barrel (only file at src/ root)
ensure/               high-level orchestration
detect/               installation + daemon detection
wait/                 poll until daemon is ready
commands/             docker CLI wrappers
platforms/            OS-specific auto-start
process/              detached spawn helpers
logger/               optional injected logging
cli/                  CLI argument parsing and exit codes
errors/               typed error hierarchy
types/                shared interfaces and defaults
utils/                exec, spawn, poll, which, sleep, retry, timeout
```

Import graph:

```text
src/index.ts
  └── ensure/ ──► detect/, wait/, platforms/, logger/, errors/, types/
  └── detect/ ──► commands/, utils/
  └── wait/   ──► commands/, utils/
  └── platforms/ ──► process/, commands/, utils/
  └── commands/ ──► utils/
  └── process/ ──► utils/
```

## Barrel-only `src/` root

The root of `src/` contains only `index.ts`. Implementation files live in subfolders. Imports across modules use `../<module>` (barrel resolved automatically), never deep paths into another module's implementation files.

## Installation detection

| Platform | Locate binary | Validate |
|----------|---------------|----------|
| Windows | `where.exe docker` | `docker --version` exit 0 |
| Linux/macOS | `which docker`, fallback `command -v docker` | `docker --version` exit 0 |

The first path returned is stored as `executable` in `DockerDetectionResult`.

## Daemon detection

Priority order:

1. `docker info` - exit 0 means daemon is reachable (primary).
2. `docker version` - Server section present (secondary).

Never depend exclusively on Docker Desktop process names or GUI state.

## Auto-start by platform

| OS | Attempt order |
|----|---------------|
| Linux | `systemctl start docker` (if `systemctl` exists) -> `service docker start` (if `service` exists) -> detached `dockerd` |
| Windows | `docker desktop start` -> search `Docker Desktop.exe` under Program Files, Program Files (x86), `%LOCALAPPDATA%`, `%ProgramData%`, PATH |
| macOS | `docker desktop start` -> `open -a Docker` |

Each step checks command/binary existence before running. All failures aggregate into `DockerStartError` with `cause`. Linux `dockerd` uses detached spawn + `unref()` so the Node event loop is not blocked.

## Waiting for readiness

After a start attempt, `wait/` polls `docker info` every `interval` ms until success or `timeout`. On timeout, `DockerTimeoutError` is thrown with elapsed seconds in the message.

Defaults: `timeout` 120_000 ms, `interval` 1_000 ms, `autoStart` true.

## Typed errors

```text
DockerError (base, DockerErrorCode enum)
├── DockerNotInstalledError
├── DockerNotRunningError
├── DockerStartError (optional cause)
└── DockerTimeoutError
```

Consumers can branch with `instanceof`. Error messages are user-friendly English strings suitable for CLI output.

## Logging

When `options.logger` is provided:

- `info` - major steps (checking install, found, not running, starting, ready).
- `warn` - recoverable issues (start attempt failed, retrying).
- `debug` - branch decisions, commands attempted, poll ticks.

No logger means silent operation except thrown errors.

## Testability

- All `child_process` usage goes through `utils/Exec` and `utils/Spawn`.
- Tests mock those modules with Vitest `vi.mock`.
- `process.platform` and `fs.access` are mocked per platform suite.
- No test requires Docker installed on the host.

## Known limitations

- **WSL2** without Desktop integration may need the daemon running inside WSL.
- **Linux permissions** - does not add the user to the `docker` group.
- **Does not install Docker** - only detects and optionally starts an existing install.
- **Colima/rootless** - works when `docker info` already succeeds in the Node process environment.

## Public API

Exported from `src/index.ts`:

- `ensureDockerRunning(options?)`
- `isDockerRunning()` - never throws
- `detectDocker()`
- `EnsureDockerOptions`, `DockerDetectionResult`, `DockerLogger`
- `DockerError`, `DockerErrorCode`, and all error subclasses
- `DefaultEnsureDockerOptions`
