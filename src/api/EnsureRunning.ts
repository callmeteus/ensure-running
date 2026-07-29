import { runCommand, type ServiceRegistry } from "../core";
import {
    DefaultEnsureDockerOptions,
    DockerNotRunningError,
    DockerServiceMode,
    ensureDockerRunning,
    isDockerRunning,
    type EnsureDockerOptions
} from "../services/docker";
import { createServiceRegistry } from "../services/CreateServiceRegistry";

/**
 * Thrown when one or more services fail during {@link ensureRunning}.
 */
export class EnsureRunningError extends Error {
    readonly serviceId: string;
    readonly exitCode: number;

    constructor(serviceId: string, exitCode: number, message = `Service "${serviceId}" failed with exit code ${exitCode}.`) {
        super(message);
        this.name = "EnsureRunningError";
        this.serviceId = serviceId;
        this.exitCode = exitCode;
    }
}

/**
 * Supported service ids for the default registry.
 */
export enum EnsureServiceId {
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

    /** Suppress service progress output. */
    quiet?: boolean;

    /** Optional logger hooks (ignored when `quiet` is true). */
    logger?: EnsureDockerOptions["logger"];
}

/**
 * One service entry for {@link ensureRunning}.
 */
export type EnsureServiceInput =
    | EnsureServiceId
    | "docker"
    | "d"
    | {
        service: EnsureServiceId.DOCKER | "docker";
        options?: EnsureDockerApiOptions;
    };

/**
 * Programmatic ensure-running request.
 */
export interface EnsureRunningRequest {
    /** Services to run in order. */
    services: EnsureServiceInput[];

    /** Optional command to spawn after all services succeed. */
    command?: string[];

    /** Custom service registry (defaults to built-in + `.er/services`). */
    registry?: ServiceRegistry;

    /** Working directory used to discover `.er/services` when registry is omitted. */
    cwd?: string;
}

/**
 * Ensures one or more services are ready. Throws {@link EnsureRunningError} on failure.
 */
export async function ensureRunning(services: EnsureServiceInput[]): Promise<void>;
export async function ensureRunning(request: EnsureRunningRequest): Promise<void>;
export async function ensureRunning(
    input: EnsureServiceInput[] | EnsureRunningRequest
): Promise<void> {
    const request = normalizeRequest(input);
    const registry = request.registry ?? await createServiceRegistry(request.cwd);

    for (const serviceInput of request.services) {
        const entry = resolveServiceInput(serviceInput, registry);
        const exitCode = await entry.service.run(entry.options);

        if (exitCode !== 0) {
            throw new EnsureRunningError(entry.service.id, exitCode);
        }
    }
}

/**
 * Ensures services, then optionally runs a command. Returns a process exit code.
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

function normalizeRequest(input: EnsureServiceInput[] | EnsureRunningRequest): EnsureRunningRequest {
    if (Array.isArray(input)) {
        return {
            services: input
        };
    }

    return input;
}

function resolveServiceInput(
    input: EnsureServiceInput,
    registry: ServiceRegistry
): { service: NonNullable<ReturnType<ServiceRegistry["resolve"]>>; options: unknown } {
    if (typeof input === "string") {
        const service = registry.resolve(input);

        if (service === undefined) {
            throw new EnsureRunningError(input, 1, `Unknown service: ${input}`);
        }

        return {
            service,
            options: defaultServiceOptions(service.id)
        };
    }

    const service = registry.resolve(input.service);

    if (service === undefined) {
        throw new EnsureRunningError(String(input.service), 1, `Unknown service: ${input.service}`);
    }

    return {
        service,
        options: toServiceOptions(service.id, input.options)
    };
}

function defaultServiceOptions(serviceId: string): unknown {
    if (serviceId === EnsureServiceId.DOCKER) {
        return toDockerServiceOptions();
    }

    return {};
}

function toServiceOptions(serviceId: string, options?: EnsureDockerApiOptions): unknown {
    if (serviceId === EnsureServiceId.DOCKER) {
        return toDockerServiceOptions(options);
    }

    return options ?? {};
}

function toDockerServiceOptions(options?: EnsureDockerApiOptions): {
    mode: DockerServiceMode;
    timeout: number;
    interval: number;
    autoStart: boolean;
    quiet: boolean;
} {
    return {
        mode: options?.check === true ? DockerServiceMode.CHECK : DockerServiceMode.ENSURE,
        timeout: options?.timeout ?? DefaultEnsureDockerOptions.timeout,
        interval: options?.interval ?? DefaultEnsureDockerOptions.interval,
        autoStart: options?.autoStart ?? DefaultEnsureDockerOptions.autoStart,
        quiet: options?.quiet ?? false
    };
}
