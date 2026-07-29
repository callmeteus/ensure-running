# Architecture

## Goal

`ensure-running` is a single npm package with a chainable CLI. Built-in **services** (Docker today, Postgres/Redis later) live under `src/services/`. Projects can add custom services in `.er/services/`.

## Package layout

```text
src/
  bin/              er / ensure-running entry
  cli/              argv routing, help, runCli
  api/              ensureRunning, ensureDocker, runEnsureRunning
  core/             ServiceRegistry, argv parsing, chaining runner
  services/
    docker/         built-in Docker service + library
    CreateServiceRegistry.ts
    LoadCustomServices.ts
    AssertEnsureService.ts
```

## Service contract

Each service implements `EnsureService`:

| Field / method | Responsibility |
|----------------|----------------|
| `id` | CLI token (`docker`) |
| `aliases?` | Short names (`d`) |
| `parseArgs(argv)` | Consume service flags; stop at `--` or next service token; return `{ options, remaining }` |
| `run(options)` | Ensure/check flow; return process exit code |
| `printHelp?()` | Service-specific help |

Custom services in `.er/services/` should use `export default defineEnsureService({ ... })`.

```typescript
import { defineEnsureService } from "ensure-running";

export default defineEnsureService({
    id: "postgres",
    parseArgs(argv) {
        return { options: {}, remaining: argv };
    },
    async run() {
        return 0;
    }
});
```

The CLI loads `.er/services/*.{js,mjs,cjs,ts}` from the nearest directory walking up from `cwd`. TypeScript files are loaded via `jiti`.

## CLI flow

`parseInvocation()`:

1. Read consecutive service tokens from argv.
2. Let each service consume its own flags (until `--` or a non-flag token).
3. Require `--` before the trailing command (`vite dev`, `npm test`, etc.).
4. Spawn the command after all services succeed.

## Chaining examples

```text
er docker
er docker --check
er docker postgres -- vite dev
```

`--` is required before the command. Without it, trailing tokens throw `CommandSeparatorError`.

## Docker service

```text
src/services/docker/
  ensure/     orchestration (ensureDockerRunning, isDockerRunning)
  detect/     installation + daemon detection
  wait/       poll until docker info succeeds
  commands/   docker CLI wrappers
  platforms/  OS-specific auto-start
  process/    detached spawn helpers
  service/    dockerService for the CLI
  errors/     typed error hierarchy
  types/      shared interfaces and defaults
  utils/      exec, spawn, poll, which, sleep, retry, timeout
```

### Installation detection

| Platform | Locate binary | Validate |
|----------|---------------|----------|
| Windows | `where.exe docker` | `docker --version` exit 0 |
| Unix | `which docker` | `docker --version` exit 0 |

Daemon reachability uses `docker info`, not `docker version --format` (Windows returns exit 0 for client-only when daemon is down).

### Auto-start order

| OS | Strategy |
|----|----------|
| macOS | Open Docker Desktop |
| Windows | Start Docker Desktop via known install paths |
| Linux | `systemctl start docker` or `service docker start`, then detached `dockerd` as fallback |

## Adding a built-in service

1. Create `src/services/<name>/` with domain logic and a `service/<Name>Service.ts` exporting `<name>Service`.
2. Register it in `createBuiltInServiceRegistry()`.
3. Extend `EnsureRunning.ts` if the programmatic API needs typed options for that service.

## Adding a project-local service

1. Create `.er/services/my-service.ts` (or `.js`).
2. `export default defineEnsureService({ id, parseArgs, run, printHelp? })`.
3. Run `er my-service -- your-command`.

Custom service ids override built-ins when registered later (same id replaces the previous entry in the registry map).

## Dependencies

| Package | Why |
|---------|-----|
| `jiti` | Load TypeScript custom services from `.er/services` at runtime |

Everything else uses Node.js built-ins.
