<div align="center">

# ensure-running

> Chainable CLI to ensure local services are ready before running commands

**`er docker vite dev` - detect Docker, auto-start if needed, poll until ready, then run your script.**

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
| `er docker vite dev` | Same as above (`vite` is not a provider, so it becomes the command) |

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

Use `--` when you want an explicit separator. Without it, the first non-provider token starts the trailing command.

### Programmatic (Docker)

```typescript
import { ensureDockerRunning } from "@ensure-running/docker";

await ensureDockerRunning();
```

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
| `packages/cli` | `ensure-running` | CLI binaries `er` and `ensure-running` |
| `packages/docker` | `@ensure-running/docker` | Docker detection, auto-start, polling, typed errors |
| `packages/core` | `@ensure-running/core` | Provider registry, argv parsing, chaining runner |

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

**Does `er docker vite` run vite on PATH?**

Yes. After providers finish, the trailing tokens are spawned with inherited stdio (`shell: true` on Windows).

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
