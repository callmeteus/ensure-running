import { describeDockerDaemonProbe } from "../commands";
import { DockerTimeoutError } from "../errors";
import type { ResolvedLogger } from "../logger";
import { poll } from "../utils";

const ProgressLogIntervalMs = 15_000;

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
    const startedAt = Date.now();
    let lastProgressLogAt = startedAt;
    let lastProbeError: string | undefined;

    logger?.debug("Waiting for Docker daemon...");

    const ready = await poll(async () => {
        const now = Date.now();
        const probe = await describeDockerDaemonProbe(executable);

        if (!probe.reachable && probe.error !== undefined) {
            lastProbeError = probe.host === undefined
                ? probe.error
                : `${probe.error} (DOCKER_HOST=${probe.host})`;
        }

        if (logger && now - lastProgressLogAt >= ProgressLogIntervalMs) {
            const elapsedSeconds = Math.round((now - startedAt) / 1000);
            const probeHint = lastProbeError ? ` Last probe: ${lastProbeError}` : "";

            logger.info(`Still waiting for Docker daemon... (${elapsedSeconds}s).${probeHint}`);
            lastProgressLogAt = now;
        }

        if (probe.reachable) {
            return true;
        }

        return false;
    }, {
        timeout: options.timeout,
        interval: options.interval
    });

    if (!ready) {
        throw new DockerTimeoutError(options.timeout);
    }

    logger?.info("Docker is ready.");
}
