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
            const lines = result.stdout
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line.length > 0);
            const preferred = lines.find((line) => /docker\.exe$/i.test(line))
                ?? lines.find((line) => !/\.cmd$/i.test(line))
                ?? lines[0];

            return preferred;
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
