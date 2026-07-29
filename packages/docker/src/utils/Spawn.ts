import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from "node:child_process";

/**
 * Options for spawning a detached background process.
 */
export interface SpawnDetachedOptions {
    detached?: boolean;
    stdio?: SpawnOptions["stdio"];
    windowsHide?: boolean;
}

/**
 * Spawns a child process.
 *
 * @param command Executable.
 * @param args Arguments.
 * @param options Spawn options.
 * @returns Child process handle.
 */
export function spawn(
    command: string,
    args: string[] = [],
    options: SpawnDetachedOptions = {}
): ChildProcess {
    return nodeSpawn(command, args, {
        detached: options.detached ?? false,
        stdio: options.stdio ?? "ignore",
        windowsHide: options.windowsHide ?? true
    });
}

/**
 * Spawns a detached background process and unrefs it from the event loop.
 *
 * @param command Executable.
 * @param args Arguments.
 * @returns Child process handle.
 */
export function spawnDetached(command: string, args: string[] = []): ChildProcess {
    const child = spawn(command, args, {
        detached: true,
        stdio: "ignore"
    });

    child.unref();

    return child;
}
