import { exec, which } from "../utils";

const DockerCliVersionPattern = /Docker version\s+([^\s,]+)/i;

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
 * Runs `docker info` and returns true when the daemon is reachable.
 *
 * @param executable Docker CLI path or name.
 */
export async function isDockerDaemonReachable(executable = "docker"): Promise<boolean> {
    try {
        await exec(executable, ["info"]);

        return true;
    } catch {
        return false;
    }
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

    let serverReachable = false;

    try {
        const serverResult = await exec(executable, [
            "version",
            "--format",
            "{{.Server.Version}}"
        ]);
        serverReachable = serverResult.stdout.trim().length > 0;
    } catch {
        serverReachable = false;
    }

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
    await exec(executable, ["desktop", "start"]);
}
