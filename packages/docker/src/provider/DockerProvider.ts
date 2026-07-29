import type { EnsureProvider, ProviderParseResult } from "@ensure-running/core";

import { ensureDockerRunning, isDockerRunning } from "../ensure";
import { DefaultEnsureDockerOptions, type EnsureDockerOptions } from "../types";

/**
 * Docker provider CLI modes.
 */
export enum DockerProviderMode {
    ENSURE = "ENSURE",
    CHECK = "CHECK"
}

/**
 * Parsed docker provider CLI options.
 */
export interface DockerProviderOptions {
    mode: DockerProviderMode;
    timeout: number;
    interval: number;
    autoStart: boolean;
    quiet: boolean;
}

/**
 * Parses docker-specific flags from argv without consuming the trailing command.
 */
export function parseDockerProviderArgs(argv: string[]): ProviderParseResult<DockerProviderOptions> {
    const remaining = [...argv];
    let mode = DockerProviderMode.ENSURE;
    let timeout = DefaultEnsureDockerOptions.timeout;
    let interval = DefaultEnsureDockerOptions.interval;
    let autoStart = DefaultEnsureDockerOptions.autoStart;
    let quiet = false;

    while (remaining.length > 0) {
        const arg = remaining[0];

        if (arg === "--check") {
            mode = DockerProviderMode.CHECK;
            remaining.shift();

            continue;
        }

        if (arg === "-q" || arg === "--quiet") {
            quiet = true;
            remaining.shift();

            continue;
        }

        if (arg === "--no-auto-start" || arg === "--no-start") {
            autoStart = false;
            remaining.shift();

            continue;
        }

        if (arg === "--timeout") {
            remaining.shift();
            timeout = parsePositiveInteger(remaining.shift(), "--timeout");

            continue;
        }

        if (arg === "--interval") {
            remaining.shift();
            interval = parsePositiveInteger(remaining.shift(), "--interval");

            continue;
        }

        if (arg.startsWith("-")) {
            throw new Error(`Unknown docker option: ${arg}`);
        }

        break;
    }

    return {
        options: {
            mode,
            timeout,
            interval,
            autoStart,
            quiet
        },
        remaining
    };
}

/**
 * Runs the docker provider and returns a process exit code.
 */
export async function runDockerProvider(options: DockerProviderOptions): Promise<number> {
    const logger = options.quiet ? undefined : createConsoleLogger();

    try {
        if (options.mode === DockerProviderMode.CHECK) {
            const running = await isDockerRunning();

            if (!running && !options.quiet) {
                console.error("Docker is not running.");
            }

            return running ? 0 : 1;
        }

        await ensureDockerRunning({
            timeout: options.timeout,
            interval: options.interval,
            autoStart: options.autoStart,
            logger
        });

        return 0;
    } catch (err) {
        if (!options.quiet) {
            const message = err instanceof Error ? err.message : String(err);

            console.error(message);
        }

        return 1;
    }
}

/**
 * Prints docker provider help.
 */
export function printDockerProviderHelp(): void {
    console.log(`docker [options]

Ensure Docker is installed, started, and ready.

Options:
  --check              Exit 0 when the daemon is reachable; do not auto-start
  --timeout <ms>       Max wait for daemon readiness (default: ${DefaultEnsureDockerOptions.timeout})
  --interval <ms>      Poll interval between checks (default: ${DefaultEnsureDockerOptions.interval})
  --no-auto-start      Fail when the daemon is down instead of starting Docker
  -q, --quiet          Suppress progress output`);
}

/**
 * Docker ensure provider for ensure-running.
 */
export const dockerProvider: EnsureProvider<DockerProviderOptions> = {
    id: "docker",
    aliases: ["d"],
    parseArgs: parseDockerProviderArgs,
    run: runDockerProvider,
    printHelp: printDockerProviderHelp
};

function parsePositiveInteger(value: string | undefined, flag: string): number {
    if (value === undefined) {
        throw new Error(`Missing value for ${flag}`);
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${flag} expects a positive integer, received: ${value}`);
    }

    return parsed;
}

function createConsoleLogger(): EnsureDockerOptions["logger"] {
    return {
        info: (message: string): void => {
            console.log(message);
        },

        warn: (message: string): void => {
            console.warn(message);
        },

        debug: (message: string): void => {
            console.debug(message);
        }
    };
}
