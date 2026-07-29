import { spawnDetached } from "../utils";

/**
 * Starts `dockerd` as a detached background process.
 */
export function startDockerdDetached(): void {
    spawnDetached("dockerd", []);
}

/**
 * Opens an application via macOS `open`.
 *
 * @param appName Application name for `open -a`.
 */
export async function openMacApplication(appName: string): Promise<void> {
    const { exec } = await import( "../utils");
    await exec("open", ["-a", appName]);
}

/**
 * Launches a Windows executable detached.
 *
 * @param executablePath Full path to the executable.
 */
export function launchWindowsExecutable(executablePath: string): void {
    spawnDetached(executablePath, []);
}
