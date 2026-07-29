<div align="center">

# ensure-running

> Chainable CLI to ensure local services are ready before running commands

**`er docker postgres -- vite dev` - ensure services, then run your script.**

[![npm version](https://img.shields.io/npm/v/ensure-running.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933.svg)](#)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](#)
[![Runtime Dependencies](https://img.shields.io/badge/Runtime%20Deps-jiti-brightgreen.svg)](#)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-green.svg)](#)

[Get Started](#get-started) • [Features](#features) • [CLI](#cli) • [Services](#services) • [Development](#development)

</div>

---

## What Is ensure-running?

`ensure-running` is a CLI and library for **chaining readiness checks** before a command runs. Instead of one-off shell scripts per dependency, you compose services on the command line or in `package.json` scripts.

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
 (built-in) (.er/services)
    |         |
    +----+----+
         v
    vite dev (spawned with inherited stdio)
```

The first built-in service is **Docker**. More built-ins (Postgres, Redis, etc.) can be added under `src/services/`. Projects can also define custom services in `.er/services/`.

---

## Features

- **Chainable CLI:** `er docker`, `er docker -- vite dev`, `er docker postgres -- npm test`.
- **Docker service:** install detection via `docker --version`, daemon checks via `docker info`, cross-platform auto-start.
- **Custom services:** drop files in `.er/services/` with `export default defineEnsureService({ ... })`.
- **Library API:** `ensureRunning`, `ensureDocker`, `ensureDockerRunning`, and typed Docker errors from one package.
- **Service registry:** extensible core with parse/run contracts.
- **package.json friendly:** one command prefix instead of nested shell scripts.
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
| `er docker postgres -- npm test` | Chain services, then run command (postgres = custom or future built-in) |

`--` is **required** before the command. Without it, `er docker vite dev` is an error.

### Custom services (`.er/services`)

Create project-local services that the CLI discovers automatically:

```text
.er/
  services/
    postgres.ts
```

```typescript
import { defineEnsureService } from "ensure-running";

export default defineEnsureService({
    id: "postgres",
    parseArgs(argv) {
        return { options: {}, remaining: argv };
    },
    async run() {
        // wait for postgres, return 0 or 1
        return 0;
    },
    printHelp() {
        console.log("postgres - ensure local Postgres is ready");
    }
});
```

Then chain it like a built-in service:

```bash
er docker postgres -- npm run migrate
```

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

Use `--` to separate services from the command. It is required when running a trailing command.

### API

```typescript
import {
    ensureRunning,
    runEnsureRunning,
    ensureDocker,
    ensure
} from "ensure-running";

// Chain services (same model as the CLI)
await ensureRunning(["docker"]);

await ensureRunning({
    services: [
        { service: "docker", options: { timeout: 60_000 } }
    ]
});

// Ensure, then spawn a command (like `er docker -- vite dev`)
const exitCode = await runEnsureRunning({
    services: ["docker"],
    command: ["vite", "dev"]
});

// Docker shorthand with typed errors
await ensureDocker();
await ensure.docker({ check: true });

// Low-level docker helpers (re-exported from ensure-running)
import { ensureDockerRunning, detectDocker } from "ensure-running";
await ensureDockerRunning({ autoStart: true });
```

| API | Description |
|-----|-------------|
| `ensureRunning(services)` | Ensure one or more services; throws `EnsureRunningError` |
| `ensureRunning({ services, command? })` | Same, with optional structured request |
| `runEnsureRunning({ services, command? })` | Ensure services, then spawn `command`; returns exit code |
| `ensureDocker(options?)` | Docker-only helper; throws `DockerError` subclasses |
| `ensure.docker()` / `ensure.running()` | Namespaced aliases |

---

## CLI

### Global options

| Flag | Description |
|------|-------------|
| `-h`, `--help` | Show top-level help |
| `-v`, `--version` | Print CLI version |
| `er docker --help` | Docker service help |

### Docker service flags

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

## Services

Built-in services ship inside `ensure-running`. Custom services live in `.er/services/`.

| Service | Source | Description |
|---------|--------|-------------|
| `docker` | built-in (`src/services/docker`) | Docker detection, auto-start, polling, typed errors |
| `*` | `.er/services/*` | Project-local `export default` services |

### Public exports

| Export | Description |
|--------|-------------|
| `ensureRunning(services)` | Chain services programmatically |
| `runEnsureRunning(request)` | Ensure services, then run a command |
| `ensureDocker(options?)` | Docker shorthand with typed errors |
| `ensure` | `{ docker, running }` namespace |
| `runCli(argv)` | Programmatic CLI entry (returns exit code) |
| `createServiceRegistry()` | Built-in + `.er/services` registry |
| `createBuiltInServiceRegistry()` | Built-in services only |
| `defineEnsureService(service)` | Define a custom or built-in service with type checking |
| `EnsureService` | Service contract type |
| `EnsureRunningError` | Service failure with `serviceId` and `exitCode` |
| `ensureDockerRunning(options?)` | Full Docker install + daemon + readiness flow |
| `isDockerRunning()` | Returns `true` when daemon is reachable; never throws |
| `detectDocker()` | `{ installed, running, version?, executable? }` |
| `dockerService` | CLI service object for custom registries |
| `DockerError` subclasses | Typed errors with stable `code` values |

---

## Architecture

```text
src/
  cli/       -> core (parseInvocation) + services (registry)
  api/       -> core + services/docker
  services/
    docker/  -> ensure / detect / wait / platforms / commands / utils
    LoadCustomServices.ts  -> .er/services/*
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for module graphs, platform start order, and how to add services.

---

## FAQ

**How is this different from `ensure-docker-running`?**

This repo ships Docker as a built-in service. The CLI is `ensure-running` / `er` with service names as the first tokens.

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
npm link
er docker --version
```

| Script | Purpose |
|--------|---------|
| `yarn dev docker ...` | Run CLI via `tsx` without building |
| `npm run build` | Build library + bin |
| `npm test` | Vitest unit tests |
| `npm run ci` | Lint, typecheck, coverage, and build (same gate as release) |
| `yarn deploy` | Local publish (prefer CI tag releases) |

### Publish (GitHub Actions + npm Trusted Publishing)

Releases are published from CI when you push a `v*` tag. No `NPM_TOKEN` secret is required - npm authenticates the workflow via OIDC.

**One-time setup on npmjs.com:**

1. Package settings -> **Trusted publishing** -> GitHub Actions
2. Owner `callmeteus`, repo `ensure-running`, workflow `publish.yml`
3. Allow action `npm publish`

**Release:**

```bash
# bump version in package.json first
git tag v1.0.1
git push origin v1.0.1
```

CI validates lint/tests/build, checks that the tag matches `package.json`, then runs `npm publish` with provenance.

See [docs/PUBLISHING.md](./docs/PUBLISHING.md) for full setup, npm requirements, and troubleshooting.

### Local publish (fallback)

```bash
npm run deploy
```

Requires `npm login` against `registry.npmjs.org`. If you use Yarn globally, this repo pins npm via `.npmrc` and `publishConfig.registry` so `yarn deploy` does not target `registry.yarnpkg.com`. Prefer tag-based CI releases.

Requires Node.js >= 20.

---

## Documentation

| Document | Contents |
|----------|----------|
| [docs/PUBLISHING.md](./docs/PUBLISHING.md) | npm Trusted Publishing, tags, CI release flow |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Package layout, service contract, Docker internals, custom services |
| [LICENSE](./LICENSE) | MIT |

---

## License

MIT
