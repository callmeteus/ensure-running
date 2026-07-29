# ensure-docker-running

Cross-platform helper that ensures the Docker CLI is installed, the daemon is running, and Docker is ready for use.

## Overview

This package wraps installation checks, optional auto-start, and readiness polling behind a single call: `await ensureDockerRunning()`.

**It does:**

- Detect whether Docker is installed and on PATH
- Check daemon availability via `docker info`
- Optionally start Docker (Linux service managers, Docker Desktop CLI, or OS-specific fallbacks)
- Poll until the daemon responds or a timeout is reached
- Expose typed errors for CLIs and libraries

**It does not:**

- Install Docker for you
- Fix Linux permission issues (`docker` group membership)
- Configure Docker contexts, Colima, or Rancher Desktop
- Replace container orchestration or image management APIs

## Get Started

```bash
npm install ensure-docker-running
```

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

## Error handling

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

## Architecture

```text
ensureDockerRunning
  -> detectDocker (which + docker version + docker info)
  -> if not running and autoStart: platforms.startDocker
  -> waitForDocker (poll docker info until timeout)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions, platform start order, and test strategy.

## CLI integration

Pre-action hook with Commander:

```typescript
import { Command } from "commander";
import { ensureDockerRunning } from "ensure-docker-running";

const program = new Command();

program.hook("preAction", async () => {
    await ensureDockerRunning({
        logger: {
            info: (message) => program.error(message, { exitCode: 0 })
        }
    });
});

program.command("build").action(async () => {
    // docker-dependent work
});

program.parse();
```

## FAQ

**Does this work in CI without Docker?**

Your CI job still needs Docker if your scripts use it. This library only helps local CLIs and dev scripts ensure Docker is up before running commands.

**WSL2**

If Docker Desktop integration is disabled, start the daemon inside your WSL distro. This package does not bridge Windows and WSL automatically.

**Colima / Rancher Desktop**

Works when `docker info` already succeeds in the same environment as your Node process.

**Linux permissions**

If `docker info` fails with permission denied, add your user to the `docker` group or use `sudo`. This package does not change system permissions.

## Development

```bash
npm ci
npm test
npm run lint
npm run typecheck
npm run build
npm run test:coverage
```

Requires Node.js >= 20.

## License

MIT
