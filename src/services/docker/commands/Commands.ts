import { exec, which, withTimeout } from "../utils";

const DockerCliVersionPattern = /Docker version\s+([^\s,]+)/i;
const DockerProbeTimeoutMs = 15_000;
const DockerDesktopCommandTimeoutMs = 30_000;

const WindowsDockerHosts = [
    undefined,
    "npipe:////./pipe/dockerDesktopLinuxEngine",
    "npipe:////./pipe/docker_engine"
] as const;

/**
 * Parses `docker --version` stdout into a semver-like client version string.
 *
 * @param stdout Raw stdout from `docker --version`.
 */
export function parseDockerCliVersion(stdout: string): string | undefined {
    const match = stdout.match(DockerCliVersionPattern);

    return match?.[1];
}

/**
 * Resolves the docker executable path, falling back to `docker` on PATH.
 */
export async function resolveDockerExecutable(): Promise<string | undefined> {
    return which("docker");
}

/**
 * Formats a probe failure for logging.
 *
 * @param err Error thrown by the docker CLI probe.
 */
function formatDockerProbeError(err: unknown): string {
    if (err instanceof Error) {
        const message = err.message.trim();

        if (message.length > 0) {
            return message;
        }
    }

    return String(err);
}

/**
 * Builds the Docker host candidates to probe on the current platform.
 */
function getDockerHostCandidates(): Array<string | undefined> {
    const configuredHost = process.env.DOCKER_HOST?.trim();

    if (process.platform === "win32") {
        const hosts = new Set<string | undefined>(WindowsDockerHosts);

        if (configuredHost) {
            hosts.add(configuredHost);
        }

        return [...hosts];
    }

    if (configuredHost) {
        return [configuredHost, undefined];
    }

    return [undefined];
}

/**
 * Probes a single Docker endpoint with `docker ps`.
 *
 * @param executable Docker CLI path or name.
 * @param dockerHost Optional DOCKER_HOST override.
 */
async function probeDockerDaemonHost(
    executable: string,
    dockerHost?: string
): Promise<{ reachable: boolean; error?: string }> {
    try {
        await withTimeout(
            exec(executable, ["ps", "-q"], {
                env: dockerHost === undefined
                    ? process.env
                    : {
                        ...process.env,
                        DOCKER_HOST: dockerHost
                    }
            }),
            DockerProbeTimeoutMs,
            "docker ps timed out"
        );

        return { reachable: true };
    } catch (err) {
        return {
            reachable: false,
            error: formatDockerProbeError(err)
        };
    }
}

/**
 * Runs `docker ps` against the configured and fallback endpoints.
 *
 * @param executable Docker CLI path or name.
 */
export async function isDockerDaemonReachable(executable = "docker"): Promise<boolean> {
    const probe = await describeDockerDaemonProbe(executable);

    return probe.reachable;
}

/**
 * Describes the most recent Docker daemon probe result.
 *
 * @param executable Docker CLI path or name.
 */
export async function describeDockerDaemonProbe(executable = "docker"): Promise<{
    reachable: boolean;
    error?: string;
    host?: string;
}> {
    let lastError: string | undefined;
    let lastHost: string | undefined;

    for (const host of getDockerHostCandidates()) {
        const result = await probeDockerDaemonHost(executable, host);

        if (result.reachable) {
            return {
                reachable: true,
                host
            };
        }

        lastError = result.error;
        lastHost = host;
    }

    return {
        reachable: false,
        error: lastError,
        host: lastHost
    };
}

/**
 * Runs `docker info` and returns stdout on success.
 *
 * @param executable Docker CLI path or name.
 */
export async function runDockerInfo(executable = "docker"): Promise<string> {
    const result = await exec(executable, ["info"]);

    return result.stdout;
}

/**
 * Parsed docker version output.
 */
export interface DockerVersionInfo {
    clientVersion?: string;
    serverReachable: boolean;
}

/**
 * Runs `docker version` and parses client/server availability.
 *
 * @param executable Docker CLI path or name.
 */
export async function runDockerVersion(executable = "docker"): Promise<DockerVersionInfo> {
    let clientVersion: string | undefined;

    try {
        const result = await exec(executable, ["--version"]);
        clientVersion = parseDockerCliVersion(result.stdout);
    } catch {
        return { serverReachable: false };
    }

    if (clientVersion === undefined) {
        return { serverReachable: false };
    }

    const serverReachable = await isDockerDaemonReachable(executable);

    return { clientVersion, serverReachable };
}

/**
 * Validates that docker CLI responds to `docker version`.
 *
 * @param executable Docker CLI path or name.
 */
export async function validateDockerInstallation(executable: string): Promise<boolean> {
    try {
        const result = await exec(executable, ["--version"]);

        return parseDockerCliVersion(result.stdout) !== undefined;
    } catch {
        return false;
    }
}

/**
 * Attempts `docker desktop start` when the subcommand exists.
 *
 * @param executable Docker CLI path or name.
 */
export async function runDockerDesktopStart(executable = "docker"): Promise<void> {
    await withTimeout(
        exec(executable, ["desktop", "start"]),
        DockerDesktopCommandTimeoutMs,
        "docker desktop start timed out"
    );
}
