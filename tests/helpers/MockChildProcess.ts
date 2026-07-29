import type { ChildProcess } from "node:child_process";

/**
 * Minimal mock child process for spawn tests.
 */
export function createMockChildProcess(): ChildProcess {
    return {
        unref: () => undefined
    } as unknown as ChildProcess;
}
