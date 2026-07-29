import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
    normalizeArgv,
    parseInvocation,
    runInvocation,
    type EnsureProvider
} from "@ensure-running/core";

import { createDefaultRegistry } from "../providers/DefaultRegistry";
import type { ProviderRegistry } from "@ensure-running/core";

/**
 * Global CLI modes.
 */
export enum CliMode {
    HELP = "HELP",
    VERSION = "VERSION",
    RUN = "RUN"
}

export { createDefaultRegistry };

/**
 * Reads the CLI package version from package.json.
 */
export function readPackageVersion(): string {
    const packageJsonPath = fileURLToPath(new URL("../../package.json", import.meta.url));
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version: string };

    return packageJson.version;
}

/**
 * Prints top-level CLI usage.
 */
export function printCliHelp(registry: ProviderRegistry): void {
    const providerLines = registry
        .list()
        .map((provider) => `  ${provider.id.padEnd(10)} ${getProviderSummary(provider)}`)
        .join("\n");

    console.log(`Usage: ensure-running | er [provider [flags...]]... [--] [command...]

Ensure local services are ready, then optionally run a command.

Providers:
${providerLines}

Examples:
  er docker
  er docker --check
  er docker postgres -- vite dev
  er docker --timeout 60000 -- npm test

Use "--" to separate providers from the command you want to run.

Global options:
  -h, --help       Show this help message
  -v, --version    Print CLI version
  provider --help  Show provider-specific help`);
}

/**
 * Runs the ensure-running CLI.
 */
export async function runCli(argv: string[], registry = createDefaultRegistry()): Promise<number> {
    const normalized = normalizeArgv(argv);

    if (normalized.length === 0 || normalized[0] === "-h" || normalized[0] === "--help") {
        printCliHelp(registry);

        return 0;
    }

    if (normalized[0] === "-v" || normalized[0] === "--version") {
        console.log(readPackageVersion());

        return 0;
    }

    if (normalized.length >= 2 && (normalized[1] === "--help" || normalized[1] === "-h")) {
        const provider = registry.resolve(normalized[0] ?? "");

        if (provider?.printHelp !== undefined) {
            provider.printHelp();

            return 0;
        }
    }

    try {
        const invocation = parseInvocation(normalized, registry);

        if (invocation.providers.length === 0 && invocation.command === undefined) {
            printCliHelp(registry);

            return 1;
        }

        return await runInvocation(invocation);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        console.error(message);
        printCliHelp(registry);

        return 1;
    }
}

function getProviderSummary(provider: EnsureProvider): string {
    if (provider.id === "docker") {
        return "Ensure Docker CLI is installed and the daemon is ready";
    }

    return "Ensure service is ready";
}
