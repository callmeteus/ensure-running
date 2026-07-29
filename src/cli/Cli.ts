import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { ensureDockerRunning, isDockerRunning } from "../ensure";
import { DefaultEnsureDockerOptions, type EnsureDockerOptions } from "../types";

/**
 * Parsed CLI invocation modes.
 */
export enum CliMode {
    ENSURE = "ENSURE",
    CHECK = "CHECK",
    HELP = "HELP",
    VERSION = "VERSION"
}

/**
 * Normalized CLI arguments after parsing {@link process.argv}.
 */
export interface ParsedCliArgs {
    mode: CliMode;
    timeout: number;
    interval: number;
    autoStart: boolean;
    quiet: boolean;
}

/**
 * Reads the package version from package.json next to the published dist folder.
 */
export function readPackageVersion(): string {
    const packageJsonPath = fileURLToPath(new URL("../../package.json", import.meta.url));
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version: string };

    return packageJson.version;
}

/**
 * Prints CLI usage to stdout.
 */
export function printCliHelp(): void {
    console.log(`Usage: ensure-docker-running | edr [options]

Ensure Docker is installed, started, and ready.

Options:
  --check              Exit 0 when the daemon is reachable; do not auto-start
  --timeout <ms>       Max wait for daemon readiness (default: ${DefaultEnsureDockerOptions.timeout})
  --interval <ms>      Poll interval between checks (default: ${DefaultEnsureDockerOptions.interval})
  --no-auto-start      Fail when the daemon is down instead of starting Docker
  -q, --quiet          Suppress progress output
  -h, --help           Show this help message
  -v, --version        Print package version`);
}

/**
 * Parses CLI flags into a normalized structure.
 *
 * @param argv Raw process arguments (including node and script path when present).
 */
export function parseCliArgs(argv: string[]): ParsedCliArgs {
    const args = normalizeArgv(argv);
    let mode = CliMode.ENSURE;
    let timeout = DefaultEnsureDockerOptions.timeout;
    let interval = DefaultEnsureDockerOptions.interval;
    let autoStart = DefaultEnsureDockerOptions.autoStart;
    let quiet = false;

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];

        if (arg === "-h" || arg === "--help") {
            mode = CliMode.HELP;

            continue;
        }

        if (arg === "-v" || arg === "--version") {
            mode = CliMode.VERSION;

            continue;
        }

        if (arg === "--check") {
            mode = CliMode.CHECK;

            continue;
        }

        if (arg === "-q" || arg === "--quiet") {
            quiet = true;

            continue;
        }

        if (arg === "--no-auto-start" || arg === "--no-start") {
            autoStart = false;

            continue;
        }

        if (arg === "--timeout") {
            timeout = parsePositiveInteger(args[++index], "--timeout");

            continue;
        }

        if (arg === "--interval") {
            interval = parsePositiveInteger(args[++index], "--interval");

            continue;
        }

        throw new Error(`Unknown option: ${arg}`);
    }

    return {
        mode,
        timeout,
        interval,
        autoStart,
        quiet
    };
}

/**
 * Runs the CLI and returns a process exit code.
 *
 * @param argv Raw process arguments.
 */
export async function runCli(argv: string[]): Promise<number> {
    let parsed: ParsedCliArgs;

    try {
        parsed = parseCliArgs(argv);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        console.error(message);
        printCliHelp();

        return 1;
    }

    if (parsed.mode === CliMode.HELP) {
        printCliHelp();

        return 0;
    }

    if (parsed.mode === CliMode.VERSION) {
        console.log(readPackageVersion());

        return 0;
    }

    const logger = parsed.quiet ? undefined : createConsoleLogger();

    try {
        if (parsed.mode === CliMode.CHECK) {
            const running = await isDockerRunning();

            if (!running && !parsed.quiet) {
                console.error("Docker is not running.");
            }

            return running ? 0 : 1;
        }

        await ensureDockerRunning(toEnsureOptions(parsed, logger));

        return 0;
    } catch (err) {
        if (!parsed.quiet) {
            const message = err instanceof Error ? err.message : String(err);

            console.error(message);
        }

        return 1;
    }
}

function normalizeArgv(argv: string[]): string[] {
    let start = 0;

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];

        if (arg.startsWith("-")) {
            start = index;

            break;
        }

        if (arg.endsWith(".ts") || arg.endsWith(".js") || arg.endsWith(".cjs") || arg.endsWith(".mjs")) {
            start = index + 1;
        }
    }

    return argv.slice(start);
}

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

function toEnsureOptions(parsed: ParsedCliArgs, logger: EnsureDockerOptions["logger"]): EnsureDockerOptions {
    return {
        timeout: parsed.timeout,
        interval: parsed.interval,
        autoStart: parsed.autoStart,
        logger
    };
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
