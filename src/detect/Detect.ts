import type { DockerDetectionResult } from "../types";
import {
    isDockerDaemonReachable,
    resolveDockerExecutable,
    runDockerVersion,
    validateDockerInstallation
} from "../commands";

/**
 * Detects Docker installation and daemon status.
 */
export async function detectDocker(): Promise<DockerDetectionResult> {
    const executable = await resolveDockerExecutable();

    if (executable === undefined) {
        return {
            installed: false,
            running: false
        };
    }

    const installed = await validateDockerInstallation(executable);

    if (!installed) {
        return {
            installed: false,
            running: false,
            executable
        };
    }

    const running = await isDockerDaemonReachable(executable);
    let version: string | undefined;

    if (installed) {
        const versionInfo = await runDockerVersion(executable);
        version = versionInfo.clientVersion;
    }

    return {
        installed: true,
        running,
        version,
        executable
    };
}
