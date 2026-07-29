import { execFile as nodeExecFile } from "node:child_process";

/**
 * Result of a successful command execution.
 */
export interface ExecResult {
    stdout: string;
    stderr: string;
}

/**
 * Runs a command and returns stdout/stderr on success.
 *
 * @param command Executable name or path.
 * @param args Command arguments.
 * @returns Captured stdout and stderr.
 */
export async function exec(command: string, args: string[] = []): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
        nodeExecFile(
            command,
            args,
            {
                encoding: "utf8",
                windowsHide: true
            },
            (err, stdout, stderr) => {
                if (err) {
                    reject(err);

                    return;
                }

                resolve({
                    stdout: String(stdout ?? ""),
                    stderr: String(stderr ?? "")
                });
            }
        );
    });
}

/**
 * Runs a command via shell (for builtins like `command -v`).
 *
 * @param shellCommand Full shell command string.
 * @returns Captured stdout and stderr.
 */
export async function execShell(shellCommand: string): Promise<ExecResult> {
    const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
    const shellFlag = process.platform === "win32" ? "/c" : "-c";

    return exec(shell, [shellFlag, shellCommand]);
}
