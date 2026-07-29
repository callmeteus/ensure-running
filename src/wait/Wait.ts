import { isDockerDaemonReachable } from "../commands";
import { DockerTimeoutError } from "../errors";
import type { ResolvedLogger } from "../logger";
import { poll } from "../utils";

/**
 * Options for waiting until Docker is ready.
 */
export interface WaitForDockerOptions {
    timeout: number;
    interval: number;
    executable?: string;
    logger?: ResolvedLogger;
}

/**
 * Polls until `docker info` succeeds or timeout is reached.
 *
 * @param options Wait configuration.
 * @throws {DockerTimeoutError} When the daemon does not become ready in time.
 */
export async function waitForDocker(options: WaitForDockerOptions): Promise<void> {
    const executable = options.executable ?? "docker";
    const logger = options.logger;

    logger?.debug("Waiting for Docker daemon...");

    const ready = await poll(async () => isDockerDaemonReachable(executable), {
        timeout: options.timeout,
        interval: options.interval
    });

    if (!ready) {
        throw new DockerTimeoutError(options.timeout);
    }

    logger?.info("Docker is ready.");
}
