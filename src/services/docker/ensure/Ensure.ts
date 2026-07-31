import { describeDockerDaemonProbe } from "../commands";
import { detectDocker } from "../detect";
import {
    DockerNotInstalledError,
    DockerNotRunningError,
    DockerStartError
} from "../errors";
import { resolveLogger } from "../logger";
import { startDocker } from "../platforms";
import { DefaultEnsureDockerOptions, type EnsureDockerOptions } from "../types";
import { waitForDocker } from "../wait";

/**
 * Returns true when the Docker daemon is reachable. Never throws.
 */
export async function isDockerRunning(): Promise<boolean> {
    try {
        const result = await detectDocker();

        return result.installed && result.running;
    } catch {
        return false;
    }
}

/**
 * Ensures Docker is installed, started, and ready for use.
 *
 * @param options Timeout, polling, auto-start, and logger options.
 */
export async function ensureDockerRunning(options?: EnsureDockerOptions): Promise<void> {
    const timeout = options?.timeout ?? DefaultEnsureDockerOptions.timeout;
    const interval = options?.interval ?? DefaultEnsureDockerOptions.interval;
    const autoStart = options?.autoStart ?? DefaultEnsureDockerOptions.autoStart;
    const logger = resolveLogger(options?.logger);

    logger.info("Checking Docker installation...");
    const detection = await detectDocker();

    if (!detection.installed) {
        throw new DockerNotInstalledError();
    }

    logger.info("Docker found.");

    if (detection.running) {
        logger.info("Docker daemon is already running.");

        return;
    }

    logger.warn("Docker daemon not running.");

    const executable = detection.executable ?? "docker";
    const probe = await describeDockerDaemonProbe(executable);

    if (probe.error !== undefined) {
        const hostHint = probe.host === undefined
            ? ""
            : ` (DOCKER_HOST=${probe.host})`;

        logger.warn(`Docker probe failed:${hostHint} ${probe.error}`);
    }

    if (!autoStart) {
        throw new DockerNotRunningError();
    }

    logger.info("Attempting to start Docker...");

    try {
        await startDocker(logger, executable);
    } catch (err) {
        throw new DockerStartError(undefined, {
            cause: err instanceof Error ? err : new Error(String(err))
        });
    }

    await waitForDocker({
        timeout,
        interval,
        executable,
        logger
    });
}
