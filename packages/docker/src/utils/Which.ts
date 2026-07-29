import { exec, execShell } from "./Exec";

/**
 * Locates an executable on PATH for the current platform.
 *
 * @param command Command name to find.
 * @returns Absolute path if found, otherwise undefined.
 */
export async function which(command: string): Promise<string | undefined> {
    try {
        if (process.platform === "win32") {
            const result = await exec("where.exe", [command]);
            const firstLine = result.stdout.split(/\r?\n/).find((line) => line.trim().length > 0);

            return firstLine?.trim();
        }

        try {
            const result = await exec("which", [command]);
            const path = result.stdout.trim();

            return path.length > 0 ? path : undefined;
        } catch {
            const result = await execShell(`command -v ${command}`);
            const path = result.stdout.trim();

            return path.length > 0 ? path : undefined;
        }
    } catch {
        return undefined;
    }
}

/**
 * Returns whether a command exists on PATH.
 *
 * @param command Command name.
 */
export async function commandExists(command: string): Promise<boolean> {
    const path = await which(command);

    return path !== undefined;
}
