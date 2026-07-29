import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
    normalizeArgv,
    parseInvocation,
    runInvocation,
    type EnsureService,
    type ServiceRegistry
} from "../core";

import { createServiceRegistry } from "../services/CreateServiceRegistry";

/**
 * Global CLI modes.
 */
export enum CliMode {
    HELP = "HELP",
    VERSION = "VERSION",
    RUN = "RUN"
}

export { createServiceRegistry };

/**
 * Reads the package version from package.json.
 */
export function readPackageVersion(): string {
    const packageJsonPath = fileURLToPath(new URL("../../package.json", import.meta.url));
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version: string };

    return packageJson.version;
}

/**
 * Prints top-level CLI usage.
 */
export function printCliHelp(registry: ServiceRegistry): void {
    const serviceLines = registry
        .list()
        .map((service) => `  ${service.id.padEnd(10)} ${getServiceSummary(service)}`)
        .join("\n");

    console.log(`Usage: ensure-running | er [service [flags...]]... [--] [command...]

Ensure local services are ready, then optionally run a command.

Services:
${serviceLines}

Custom services:
  Place files in .er/services/ with export default defineEnsureService({ ... })

Examples:
  er docker
  er docker --check
  er docker postgres -- vite dev
  er docker --timeout 60000 -- npm test

Use "--" to separate services from the command you want to run.

Global options:
  -h, --help       Show this help message
  -v, --version    Print CLI version
  service --help   Show service-specific help`);
}

/**
 * Runs the ensure-running CLI.
 */
export async function runCli(argv: string[], registry?: ServiceRegistry): Promise<number> {
    const resolvedRegistry = registry ?? await createServiceRegistry();
    const normalized = normalizeArgv(argv);

    if (normalized.length === 0 || normalized[0] === "-h" || normalized[0] === "--help") {
        printCliHelp(resolvedRegistry);

        return 0;
    }

    if (normalized[0] === "-v" || normalized[0] === "--version") {
        console.log(readPackageVersion());

        return 0;
    }

    if (normalized.length >= 2 && (normalized[1] === "--help" || normalized[1] === "-h")) {
        const service = resolvedRegistry.resolve(normalized[0] ?? "");

        if (service?.printHelp !== undefined) {
            service.printHelp();

            return 0;
        }
    }

    try {
        const invocation = parseInvocation(normalized, resolvedRegistry);

        if (invocation.services.length === 0 && invocation.command === undefined) {
            printCliHelp(resolvedRegistry);

            return 1;
        }

        return await runInvocation(invocation);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        console.error(message);
        printCliHelp(resolvedRegistry);

        return 1;
    }
}

function getServiceSummary(service: EnsureService): string {
    if (service.id === "docker") {
        return "Ensure Docker CLI is installed and the daemon is ready";
    }

    return "Ensure service is ready";
}
