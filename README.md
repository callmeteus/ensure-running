<div align="center">

# ensure-docker-running

> Cross-platform Docker readiness for Node.js CLIs and dev scripts

**One call to detect the Docker CLI, auto-start the daemon when needed, and poll until `docker info` succeeds.**

[![npm version](https://img.shields.io/npm/v/ensure-docker-running.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933.svg)](#)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](#)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen.svg)](#)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-green.svg)](#)

[Get Started](#get-started) • [Features](#features) • [CLI](#cli) • [API](#api) • [Architecture](#architecture) • [FAQ](#faq) • [Development](#development)

</div>

---

## What Is ensure-docker-running?

Node.js tools that depend on Docker must handle installation checks, daemon availability, auto-start, and readiness polling differently on Linux, Windows, and macOS. This package centralizes that behavior behind `await ensureDockerRunning()` and a matching CLI (`ensure-docker-running` / `edr`).

It uses the Docker CLI only - no dockerode, no socket assumptions, zero runtime dependencies.

```text
  [ your CLI / script / test runner ]
                  |
                  v
        ensureDockerRunning()
                  |
     +------------+------------+
     |            |            |
     v            v            v
 detect       platforms      wait
 (PATH +      (auto-start    (poll
  docker       per OS)        docker info)
  --version)
```

**Out of scope:** installing Docker, fixing Linux `docker` group permissions, configuring Colima/Rancher contexts, or replacing container APIs.

---

## Features

- **Installation detection:** locates `docker` on PATH (`where.exe` / `which`) and validates with `docker --version` (daemon not required).
- **Daemon checks:** primary signal is `docker info` exit 0.
- **Auto-start:** Linux (`systemctl`, `service`, `dockerd`), Windows and macOS (Docker Desktop CLI and OS fallbacks).
- **Readiness polling:** configurable timeout and interval until the daemon responds.
- **Typed errors:** `NOT_INSTALLED`, `NOT_RUNNING`, `START_FAILED`, `TIMEOUT` for CLIs and libraries.
- **CLI + library:** ESM and CJS builds, `ensure-docker-running` and `edr` bin aliases.
- **Fully mockable:** unit tests mock `child_process` - no real Docker required in CI.

---

## Get Started

### Install

```bash
npm install ensure-docker-running
```

### Library

```typescript
import { ensureDockerRunning } from "ensure-docker-running";

await ensureDockerRunning();
// Docker is ready
```

With logging and custom timeouts:

```typescript
await ensureDockerRunning({
    timeout: 120_000,
    interval: 1_000,
    autoStart: true,
    logger: {
        info: (message) => console.log(message),
        warn: (message) => console.warn(message),
        debug: (message) => console.debug(message)
    }
});
```

Non-throwing probe:

```typescript
import { isDockerRunning } from "ensure-docker-running";

if (await isDockerRunning()) {
    // daemon is reachable
}
```

---

## CLI

After install, `ensure-docker-running` and the `edr` alias are linked on PATH (npm/yarn on Windows, Linux, and macOS):

```bash
ensure-docker-running
edr --check
ensure-docker-running --timeout 60000 --no-auto-start
edr --help
```

| Flag | Description |
|------|-------------|
| `--check` | Exit 0 when the daemon is reachable; never auto-start |
| `--timeout <ms>` | Max wait for readiness (default: `120000`) |
| `--interval <ms>` | Poll interval (default: `1000`) |
| `--no-auto-start` | Fail when the daemon is down |
| `-q`, `--quiet` | Suppress progress output |
| `-h`, `--help` | Show usage |
| `-v`, `--version` | Print package version |

Exit codes: `0` on success, `1` on failure (check mode returns `1` when the daemon is down).

---

## API

### Exports

| Export | Description |
|--------|-------------|
| `ensureDockerRunning(options?)` | Full install + daemon + readiness flow |
| `isDockerRunning()` | Returns `true` when daemon is reachable; never throws |
| `detectDocker()` | Returns `{ installed, running, version?, executable? }` |
| `DefaultEnsureDockerOptions` | Default `timeout`, `interval`, `autoStart` values |
| `DockerError` and subclasses | Typed errors with `code` and stable `name` |

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `timeout` | `120_000` | Max wait in ms for daemon readiness after start |
| `interval` | `1_000` | Poll interval in ms between `docker info` checks |
| `autoStart` | `true` | Attempt to start Docker when daemon is down |
| `logger` | none | Optional `{ info, warn, debug }` hooks |

### Error handling

| Error | When | `code` |
|-------|------|--------|
| `DockerNotInstalledError` | Docker CLI not found or invalid | `NOT_INSTALLED` |
| `DockerNotRunningError` | Daemon down and `autoStart: false` | `NOT_RUNNING` |
| `DockerStartError` | Auto-start attempted but all strategies failed | `START_FAILED` |
| `DockerTimeoutError` | Daemon not ready within `timeout` | `TIMEOUT` |

```typescript
import {
    ensureDockerRunning,
    DockerNotInstalledError,
    DockerNotRunningError,
    DockerStartError,
    DockerTimeoutError
} from "ensure-docker-running";

try {
    await ensureDockerRunning({ autoStart: false });
} catch (err) {
    if (err instanceof DockerNotInstalledError) {
        console.error("Install Docker first.");
    } else
    if (err instanceof DockerNotRunningError) {
        console.error("Start Docker Desktop or the docker service.");
    } else
    if (err instanceof DockerStartError) {
        console.error("Auto-start failed:", err.cause);
    } else
    if (err instanceof DockerTimeoutError) {
        console.error(err.message);
    } else {
        throw err;
    }
}
```

---

## Architecture

| Module | Responsibility |
|--------|----------------|
| `ensure/` | High-level orchestration (`ensureDockerRunning`, `isDockerRunning`) |
| `detect/` | Installation + daemon detection |
| `wait/` | Poll until daemon is ready |
| `commands/` | `docker` CLI wrappers |
| `platforms/` | OS-specific auto-start strategies |
| `process/` | Detached spawn helpers |
| `errors/` | Typed error hierarchy |
| `cli/` | CLI argument parsing and exit codes |

```text
ensureDockerRunning
  -> detectDocker (which/where + docker --version + docker info)
  -> if not running and autoStart: platforms.startDocker
  -> waitForDocker (poll docker info until timeout)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions, platform start order, and test strategy.

### Commander hook

```typescript
import { Command } from "commander";
import { ensureDockerRunning } from "ensure-docker-running";

const program = new Command();

program.hook("preAction", async () => {
    await ensureDockerRunning({
        logger: {
            info: (message) => console.log(message)
        }
    });
});

program.command("build").action(async () => {
    // docker-dependent work
});

program.parse();
```

---

## FAQ

**Does this work in CI without Docker?**

Your CI job still needs Docker if your scripts use it. This library only helps local CLIs and dev scripts ensure Docker is up before running commands.

**WSL2**

If Docker Desktop integration is disabled, start the daemon inside your WSL distro. This package does not bridge Windows and WSL automatically.

**Colima / Rancher Desktop**

Works when `docker info` already succeeds in the same environment as your Node process.

**Linux permissions**

If `docker info` fails with permission denied, add your user to the `docker` group or use `sudo`. This package does not change system permissions.

**Why `docker --version` for install checks?**

On Windows, `docker version --format` can exit non-zero when the daemon is stopped even though the CLI is installed. `docker --version` validates the binary without requiring a running daemon.

---

## Development

From `Pacotes/ensure-docker-running/`:

```bash
npm ci
npm test
npm run lint
npm run typecheck
npm run build
npm run test:coverage
```

Run the CLI from TypeScript source (no build required):

```bash
yarn dev
yarn dev --check
yarn dev --help
```

Test the published bin names after build:

```bash
npm run build
npm link
edr --version
ensure-docker-running --check
```

| Script | Purpose |
|--------|---------|
| `yarn dev` | Run CLI from source via `tsx` |
| `npm start` | Run built CLI from `dist/` |
| `npm run build` | Dual ESM/CJS library + ESM bin |
| `npm run test:coverage` | Vitest with coverage thresholds |

Requires Node.js >= 20.

---

## Documentation

| Document | Contents |
|----------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Module graph, detection rules, platform start order, testing strategy |
| [LICENSE](./LICENSE) | MIT |

---

## License

MIT
