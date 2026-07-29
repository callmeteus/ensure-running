import { ProviderRegistry, runCommand } from "@ensure-running/core";
import {
    DefaultEnsureDockerOptions,
    DockerNotRunningError,
    DockerProviderMode,
    ensureDockerRunning,
    isDockerRunning,
    type EnsureDockerOptions
} from "@ensure-running/docker";

import { createDefaultRegistry } from "../providers/DefaultRegistry";

/**
 * Thrown when one or more providers fail during {@link ensureRunning}.
 */
export class EnsureRunningError extends Error {
    readonly providerId: string;
    readonly exitCode: number;

    constructor(providerId: string, exitCode: number, message = `Provider "${providerId}" failed with exit code ${exitCode}.`) {
        super(message);
        this.name = "EnsureRunningError";
        this.providerId = providerId;
        this.exitCode = exitCode;
    }
}

/**
 * Supported provider ids for the default registry.
 */
export enum EnsureProviderId {
    DOCKER = "docker"
}

/**
 * Docker-specific options for the programmatic API.
 */
export interface EnsureDockerApiOptions {
    /** When true, only checks daemon reachability and never auto-starts. */
    check?: boolean;

    /** Max wait in ms for daemon readiness after start. */
    timeout?: number;

    /** Poll interval in ms between readiness checks. */
    interval?: number;

    /** Attempt to start Docker when the daemon is down. */
    autoStart?: boolean;

    /** Suppress provider progress output. */
    quiet?: boolean;

    /** Optional logger hooks (ignored when `quiet` is true). */
    logger?: EnsureDockerOptions["logger"];
}

/**
 * One provider entry for {@link ensureRunning}.
 */
export type EnsureProviderInput =
    | EnsureProviderId
    | "docker"
    | "d"
    | {
        provider: EnsureProviderId.DOCKER | "docker";
        options?: EnsureDockerApiOptions;
    };

/**
 * Programmatic ensure-running request.
 */
export interface EnsureRunningRequest {
    /** Providers to run in order. */
    providers: EnsureProviderInput[];

    /** Optional command to spawn after all providers succeed. */
    command?: string[];

    /** Custom provider registry (defaults to built-in providers). */
    registry?: ProviderRegistry;
}

/**
 * Ensures one or more providers are ready. Throws {@link EnsureRunningError} on failure.
 */
export async function ensureRunning(providers: EnsureProviderInput[]): Promise<void>;
export async function ensureRunning(request: EnsureRunningRequest): Promise<void>;
export async function ensureRunning(
    input: EnsureProviderInput[] | EnsureRunningRequest
): Promise<void> {
    const request = normalizeRequest(input);
    const registry = request.registry ?? createDefaultRegistry();

    for (const providerInput of request.providers) {
        const entry = resolveProviderInput(providerInput, registry);
        const exitCode = await entry.provider.run(entry.options);

        if (exitCode !== 0) {
            throw new EnsureRunningError(entry.provider.id, exitCode);
        }
    }
}

/**
 * Ensures providers, then optionally runs a command. Returns a process exit code.
 */
export async function runEnsureRunning(request: EnsureRunningRequest): Promise<number> {
    await ensureRunning(request);

    if (request.command === undefined || request.command.length === 0) {
        return 0;
    }

    return runCommand(request.command);
}

/**
 * Ensures Docker is installed, started, and ready. Throws typed docker errors.
 */
export async function ensureDocker(options?: EnsureDockerApiOptions): Promise<void> {
    if (options?.check === true) {
        const running = await isDockerRunning();

        if (!running) {
            throw new DockerNotRunningError();
        }

        return;
    }

    await ensureDockerRunning({
        timeout: options?.timeout,
        interval: options?.interval,
        autoStart: options?.autoStart,
        logger: options?.quiet === true ? undefined : options?.logger
    });
}

/**
 * Namespaced helpers for programmatic use.
 */
export const ensure = {
    docker: ensureDocker,
    running: ensureRunning
};

function normalizeRequest(input: EnsureProviderInput[] | EnsureRunningRequest): EnsureRunningRequest {
    if (Array.isArray(input)) {
        return {
            providers: input
        };
    }

    return input;
}

function resolveProviderInput(
    input: EnsureProviderInput,
    registry: ProviderRegistry
): { provider: NonNullable<ReturnType<ProviderRegistry["resolve"]>>; options: unknown } {
    if (typeof input === "string") {
        const provider = registry.resolve(input);

        if (provider === undefined) {
            throw new EnsureRunningError(input, 1, `Unknown provider: ${input}`);
        }

        return {
            provider,
            options: defaultProviderOptions(provider.id)
        };
    }

    const provider = registry.resolve(input.provider);

    if (provider === undefined) {
        throw new EnsureRunningError(String(input.provider), 1, `Unknown provider: ${input.provider}`);
    }

    return {
        provider,
        options: toProviderOptions(provider.id, input.options)
    };
}

function defaultProviderOptions(providerId: string): unknown {
    if (providerId === EnsureProviderId.DOCKER) {
        return toDockerProviderOptions();
    }

    return {};
}

function toProviderOptions(providerId: string, options?: EnsureDockerApiOptions): unknown {
    if (providerId === EnsureProviderId.DOCKER) {
        return toDockerProviderOptions(options);
    }

    return options ?? {};
}

function toDockerProviderOptions(options?: EnsureDockerApiOptions): {
    mode: DockerProviderMode;
    timeout: number;
    interval: number;
    autoStart: boolean;
    quiet: boolean;
} {
    return {
        mode: options?.check === true ? DockerProviderMode.CHECK : DockerProviderMode.ENSURE,
        timeout: options?.timeout ?? DefaultEnsureDockerOptions.timeout,
        interval: options?.interval ?? DefaultEnsureDockerOptions.interval,
        autoStart: options?.autoStart ?? DefaultEnsureDockerOptions.autoStart,
        quiet: options?.quiet ?? false
    };
}
