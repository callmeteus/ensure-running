import { spawn } from "node:child_process";

import { normalizeArgv } from "../argv";
import type { EnsureService } from "../service";
import type { ServiceRegistry } from "../registry";

/** Separator between service chain and trailing command. */
export const CommandSeparator = "--";

/**
 * Thrown when argv tokens appear after services without {@link CommandSeparator}.
 */
export class CommandSeparatorError extends Error {
    constructor(token: string) {
        super(
            `Unexpected argument "${token}". Use "${CommandSeparator}" before the command (e.g. er docker postgres ${CommandSeparator} vite dev).`
        );
        this.name = "CommandSeparatorError";
    }
}

/**
 * Thrown when {@link CommandSeparator} is present without a trailing command.
 */
export class MissingCommandError extends Error {
    constructor() {
        super(`Command separator "${CommandSeparator}" must be followed by a command.`);
        this.name = "MissingCommandError";
    }
}

/**
 * One service invocation parsed from argv.
 */
export interface ServiceInvocation {
    service: EnsureService;
    options: unknown;
}

/**
 * Parsed ensure-running CLI invocation.
 */
export interface ParsedInvocation {
    services: ServiceInvocation[];
    command?: string[];
}

/**
 * Parses argv into chained service invocations and an optional trailing command.
 * A trailing command requires an explicit {@link CommandSeparator} after services.
 */
export function parseInvocation(argv: string[], registry: ServiceRegistry): ParsedInvocation {
    let remaining = normalizeArgv(argv);
    const services: ServiceInvocation[] = [];

    while (remaining.length > 0) {
        const service = registry.resolve(remaining[0] ?? "");

        if (service === undefined) {
            break;
        }

        remaining = remaining.slice(1);
        const parsed = service.parseArgs(remaining);

        services.push({
            service,
            options: parsed.options
        });
        remaining = parsed.remaining;
    }

    let command: string[] | undefined;

    if (remaining.length === 0) {
        command = undefined;
    } else
    if (remaining[0] === CommandSeparator) {
        command = remaining.slice(1);

        if (command.length === 0) {
            throw new MissingCommandError();
        }
    } else {
        throw new CommandSeparatorError(remaining[0] ?? "");
    }

    return {
        services,
        command
    };
}

/**
 * Ensures all services in order, then optionally runs a command.
 */
export async function runInvocation(invocation: ParsedInvocation): Promise<number> {
    for (const entry of invocation.services) {
        const exitCode = await entry.service.run(entry.options);

        if (exitCode !== 0) {
            return exitCode;
        }
    }

    if (invocation.command === undefined) {
        return 0;
    }

    return runCommand(invocation.command);
}

/**
 * Spawns a command with inherited stdio.
 */
export function runCommand(command: string[]): Promise<number> {
    const [executable, ...args] = command;

    if (executable === undefined) {
        return Promise.resolve(1);
    }

    return new Promise((resolve) => {
        const child = spawn(executable, args, {
            stdio: "inherit",
            shell: process.platform === "win32"
        });

        child.on("error", () => {
            resolve(1);
        });

        child.on("close", (code) => {
            resolve(code ?? 1);
        });
    });
}
