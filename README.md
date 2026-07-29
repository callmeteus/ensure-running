<div align="center">

# ensure-running

> Chainable CLI to ensure local services are ready before running commands

**`er docker postgres -- vite dev` - ensure providers, then run your script.**

[![npm version](https://img.shields.io/npm/v/ensure-running.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933.svg)](#)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](#)
[![Zero Runtime Dependencies](https://img.shields.io/badge/Runtime%20Deps-0-brightgreen.svg)](#)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-green.svg)](#)

[Get Started](#get-started) • [Features](#features) • [CLI](#cli) • [Packages](#packages) • [Development](#development)

</div>

---

## What Is ensure-running?

`ensure-running` is a small monorepo and CLI for **chaining readiness checks** before a command runs. Instead of one-off shell scripts per service, you compose providers on the command line or in `package.json` scripts.

```text
  package.json script
         |
         v
   er docker postgres -- vite dev
         |
    +----+----+
    |         |
    v         v
 docker     postgres
 provider   provider (future)
    |         |
    +----+----+
         v
    vite dev (spawned with inherited stdio)
```

The first provider is **Docker** (`@ensure-running/docker`). More providers (Postgres, Redis, etc.) can be added as separate workspace packages.

---

## Features

- **Chainable CLI:** `er docker`, `er docker -- vite dev`, `er docker postgres -- npm test` (future providers).
- **Docker provider:** install detection via `docker --version`, daemon checks via `docker info`, cross-platform auto-start.
- **Library API:** import `@ensure-running/docker` directly for programmatic use.
- **Provider registry:** extensible core (`@ensure-running/core`) with parse/run contracts.
- **package.json friendly:** one command prefix instead of nested shell scripts.
- **Zero runtime dependencies:** Node.js built-ins only in published packages.
- **Fully tested:** mocked `child_process` in unit tests - no real Docker required in CI.

---

## Get Started

### Install

```bash
npm install ensure-running
```

### CLI

```bash
er docker
er docker --check
er docker -- vite dev
ensure-running docker --timeout 60000 -- npm test
```

| Invocation | Behavior |
|------------|----------|
| `er docker` | Ensure Docker is installed, started, and ready |
| `er docker --check` | Exit 0 only when the daemon responds; never auto-start |
| `er docker -- vite dev` | Ensure Docker, then run `vite dev` |
| `er docker postgres -- npm test` | Chain providers, then run command (postgres = future) |

`--` is **required** before the command. Without it, `er docker vite dev` is an error.

### package.json

```json
{
    "scripts": {
        "dev": "er docker -- vite dev",
        "test:integration": "er docker -- vitest run --config vitest.integration.ts",
        "db:up": "er docker postgres -- npm run migrate"
    }
}
```

Use `--` to separate providers from the command. It is required when running a trailing command.

### API

```typescript
import {
    ensureRunning,
    runEnsureRunning,
    ensureDocker,
    ensure
} from "ensure-running";

// Chain providers (same model as the CLI)
await ensureRunning(["docker"]);

await ensureRunning({
    providers: [
        { provider: "docker", options: { timeout: 60_000 } }
    ]
});

// Ensure, then spawn a command (like `er docker -- vite dev`)
const exitCode = await runEnsureRunning({
    providers: ["docker"],
    command: ["vite", "dev"]
});

// Docker shorthand with typed errors
await ensureDocker();
await ensure.docker({ check: true });

// Low-level docker package (also re-exported from ensure-running)
import { ensureDockerRunning, detectDocker } from "ensure-running";
await ensureDockerRunning({ autoStart: true });
```

| API | Description |
|-----|-------------|
| `ensureRunning(providers)` | Ensure one or more providers; throws `EnsureRunningError` |
| `ensureRunning({ providers, command? })` | Same, with optional structured request |
| `runEnsureRunning({ providers, command? })` | Ensure providers, then spawn `command`; returns exit code |
| `ensureDocker(options?)` | Docker-only helper; throws `DockerError` subclasses |
| `ensure.docker()` / `ensure.running()` | Namespaced aliases |

---

## CLI

### Global options

| Flag | Description |
|------|-------------|
| `-h`, `--help` | Show top-level help |
| `-v`, `--version` | Print CLI version |
| `er docker --help` | Docker provider help |

### Docker provider flags

| Flag | Description |
|------|-------------|
| `--check` | Exit 0 when daemon is reachable; never auto-start |
| `--timeout <ms>` | Max wait for readiness (default: `120000`) |
| `--interval <ms>` | Poll interval (default: `1000`) |
| `--no-auto-start` | Fail when daemon is down |
| `-q`, `--quiet` | Suppress progress output |

### Bin names

| Command | Package |
|---------|---------|
| `er` | `ensure-running` |
| `ensure-running` | `ensure-running` |

---

## Packages

| Package | npm name | Description |
|---------|----------|-------------|
| `packages/cli` | `ensure-running` | CLI (`er`) + programmatic API |
| `packages/docker` | `@ensure-running/docker` | Docker detection, auto-start, polling, typed errors |
| `packages/core` | `@ensure-running/core` | Provider registry, argv parsing, chaining runner |

### ensure-running exports

| Export | Description |
|--------|-------------|
| `ensureRunning(providers)` | Chain providers programmatically |
| `runEnsureRunning(request)` | Ensure providers, then run a command |
| `ensureDocker(options?)` | Docker shorthand with typed errors |
| `ensure` | `{ docker, running }` namespace |
| `runCli(argv)` | Programmatic CLI entry (returns exit code) |
| `createDefaultRegistry()` | Built-in provider registry |
| `EnsureRunningError` | Provider failure with `providerId` and `exitCode` |

### Docker library exports

| Export | Description |
|--------|-------------|
| `ensureDockerRunning(options?)` | Full install + daemon + readiness flow |
| `isDockerRunning()` | Returns `true` when daemon is reachable; never throws |
| `detectDocker()` | `{ installed, running, version?, executable? }` |
| `dockerProvider` | CLI provider object for custom registries |
| `DockerError` subclasses | Typed errors with stable `code` values |

---

## Architecture

```text
packages/cli
  -> @ensure-running/core (parseInvocation, runInvocation)
  -> @ensure-running/docker (dockerProvider)

packages/docker
  -> ensure / detect / wait / platforms / commands / utils
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for module graphs, platform start order, and how to add a new provider package.

---

## FAQ

**How is this different from `ensure-docker-running`?**

This repo is the multi-provider evolution. Docker logic lives in `@ensure-running/docker`. The CLI is `ensure-running` / `er` with subcommands per provider.

**Does `er docker -- vite` run vite on PATH?**

Yes. Tokens after `--` are spawned as a command with inherited stdio (`shell: true` on Windows).

**WSL2 / Colima / Rancher Desktop**

Works when `docker info` succeeds in the same environment as the Node process. WSL bridging is not automatic.

**Linux permissions**

If `docker info` fails with permission denied, add your user to the `docker` group. This tool does not change system permissions.

---

## Development

From `Pacotes/ensure-running/`:

```bash
npm ci
npm test
npm run lint
npm run typecheck
npm run build
npm run test:coverage
```

Run the CLI from source:

```bash
yarn dev docker
yarn dev docker --check
yarn dev docker -- vite --version
```

Link the published bins:

```bash
npm run build
npm link -w ensure-running
er docker --version
```

| Script | Purpose |
|--------|---------|
| `yarn dev docker ...` | Run CLI via `tsx` without building |
| `npm run build` | Build core, docker, and cli packages |
| `npm test` | Vitest across all workspace packages |

Requires Node.js >= 20.

---

## Documentation

| Document | Contents |
|----------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Monorepo layout, provider contract, Docker internals |
| [LICENSE](./LICENSE) | MIT |

---

## License

MIT
