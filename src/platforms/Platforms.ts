import { access } from "node:fs/promises";
import path from "node:path";

import { runDockerDesktopStart } from "../commands";
import { launchWindowsExecutable, openMacApplication, startDockerdDetached } from "../process";
import { commandExists, exec } from "../utils";
import type { ResolvedLogger } from "../logger";

/**
 * Starts Docker on Linux using available service managers or dockerd.
 *
 * @param logger Resolved logger.
 * @param dockerExecutable Docker CLI path.
 */
export async function startDockerLinux(
    logger: ResolvedLogger,
    _dockerExecutable = "docker"
): Promise<void> {
    const errors: Error[] = [];

    if (await commandExists("systemctl")) {
        try {
            logger.debug("Attempting: systemctl start docker");
            await exec("systemctl", ["start", "docker"]);
            logger.info("Started Docker via systemctl.");

            return;
        } catch (err) {
            errors.push(err instanceof Error ? err : new Error(String(err)));
            logger.warn("systemctl start docker failed.");
        }
    }

    if (await commandExists("service")) {
        try {
            logger.debug("Attempting: service docker start");
            await exec("service", ["docker", "start"]);
            logger.info("Started Docker via service.");

            return;
        } catch (err) {
            errors.push(err instanceof Error ? err : new Error(String(err)));
            logger.warn("service docker start failed.");
        }
    }

    if (await commandExists("dockerd")) {
        try {
            logger.debug("Attempting: dockerd (detached)");
            startDockerdDetached();
            logger.info("Started dockerd in the background.");

            return;
        } catch (err) {
            errors.push(err instanceof Error ? err : new Error(String(err)));
            logger.warn("dockerd detached start failed.");
        }
    }

    const aggregate = new Error(
        "No supported Docker start method found on Linux (systemctl, service, or dockerd)."
    );

    if (errors.length > 0) {
        aggregate.cause = errors[errors.length - 1];
    }

    throw aggregate;
}

/**
 * Candidate paths for Docker Desktop on Windows.
 */
export function getWindowsDockerDesktopCandidates(): string[] {
    const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
    const localAppData = process.env.LOCALAPPDATA ?? "";
    const programData = process.env.ProgramData ?? "";

    const candidates = [
        path.join(programFiles, "Docker", "Docker", "Docker Desktop.exe"),
        path.join(programFilesX86, "Docker", "Docker", "Docker Desktop.exe"),
        localAppData
            ? path.join(localAppData, "Docker", "Docker Desktop.exe")
            : undefined,
        programData ? path.join(programData, "Docker", "Docker Desktop.exe") : undefined
    ];

    return candidates.filter((candidate): candidate is string => candidate !== undefined);
}

/**
 * Finds an existing Docker Desktop executable on Windows.
 */
export async function findWindowsDockerDesktop(): Promise<string | undefined> {
    for (const candidate of getWindowsDockerDesktopCandidates()) {
        try {
            await access(candidate);
            return candidate;
        } catch {
            continue;
        }
    }

    const pathHit = await import( "../utils").then((utils) => utils.which("Docker Desktop.exe"));

    return pathHit;
}

/**
 * Starts Docker on Windows.
 *
 * @param logger Resolved logger.
 * @param dockerExecutable Docker CLI path.
 */
export async function startDockerWindows(
    logger: ResolvedLogger,
    dockerExecutable = "docker"
): Promise<void> {
    try {
        logger.debug("Attempting: docker desktop start");
        await runDockerDesktopStart(dockerExecutable);
        logger.info("Started Docker Desktop via CLI.");

        return;
    } catch (err) {
        logger.warn("docker desktop start failed, searching for Docker Desktop.exe.");
        const desktopPath = await findWindowsDockerDesktop();

        if (desktopPath === undefined) {
            throw err instanceof Error ? err : new Error(String(err));
        }

        logger.debug(`Launching: ${desktopPath}`);
        launchWindowsExecutable(desktopPath);
        logger.info("Launched Docker Desktop executable.");
    }
}

/**
 * Starts Docker on macOS.
 *
 * @param logger Resolved logger.
 * @param dockerExecutable Docker CLI path.
 */
export async function startDockerMacOS(
    logger: ResolvedLogger,
    dockerExecutable = "docker"
): Promise<void> {
    try {
        logger.debug("Attempting: docker desktop start");
        await runDockerDesktopStart(dockerExecutable);
        logger.info("Started Docker Desktop via CLI.");

        return;
    } catch {
        logger.warn("docker desktop start failed, trying open -a Docker.");
        await openMacApplication("Docker");
        logger.info("Opened Docker.app.");
    }
}

/**
 * Dispatches platform-specific Docker start logic.
 *
 * @param logger Resolved logger.
 * @param dockerExecutable Docker CLI path.
 */
export async function startDocker(
    logger: ResolvedLogger,
    dockerExecutable = "docker"
): Promise<void> {
    if (process.platform === "win32") {
        await startDockerWindows(logger, dockerExecutable);

        return;
    }

    if (process.platform === "darwin") {
        await startDockerMacOS(logger, dockerExecutable);

        return;
    }

    await startDockerLinux(logger, dockerExecutable);
}
