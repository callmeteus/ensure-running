import { exec, which } from "../utils";

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
    try {
        const result = await exec(executable, ["version", "--format", "{{.Client.Version}}"]);
        const clientVersion = result.stdout.trim() || undefined;
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
    } catch {
        return { serverReachable: false };
    }
}

/**
 * Validates that docker CLI responds to `docker version`.
 *
 * @param executable Docker CLI path or name.
 */
export async function validateDockerInstallation(executable: string): Promise<boolean> {
    try {
        await exec(executable, ["version", "--format", "{{.Client.Version}}"]);

        return true;
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
