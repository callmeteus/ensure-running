import { beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    execFile: execFileMock,
    spawn: vi.fn()
}));

describe("Which", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        vi.resetModules();
    });

    it("uses where.exe on Windows", async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "win32" });

        execFileMock.mockImplementation(
            (
                cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                expect(cmd).toBe("where.exe");
                callback(null, "C:\\Docker\\docker.exe\r\n", "");
            }
        );

        const { which } = await import( "../../../src/services/docker/utils/Which");
        const result = await which("docker");

        expect(result).toBe("C:\\Docker\\docker.exe");

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("uses which on Unix", async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "linux" });

        execFileMock.mockImplementation(
            (
                cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                expect(cmd).toBe("which");
                callback(null, "/usr/bin/docker\n", "");
            }
        );

        const { which } = await import( "../../../src/services/docker/utils/Which");
        const result = await which("docker");

        expect(result).toBe("/usr/bin/docker");

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("returns undefined when command is missing", async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "linux" });

        execFileMock.mockImplementation(
            (
                _cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: Error) => void
            ) => {
                callback(new Error("not found"));
            }
        );

        const { which } = await import( "../../../src/services/docker/utils/Which");
        const result = await which("missing");

        expect(result).toBeUndefined();

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("falls back to command -v when which fails on Unix", async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "linux" });

        execFileMock.mockImplementation(
            (
                cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (cmd === "which") {
                    callback(new Error("not found"));
                } else
                if (cmd === "/bin/sh" && args[1] === "command -v docker") {
                    callback(null, "/usr/local/bin/docker\n", "");
                } else {
                    callback(new Error("unexpected"));
                }
            }
        );

        const { which } = await import( "../../../src/services/docker/utils/Which");
        const result = await which("docker");

        expect(result).toBe("/usr/local/bin/docker");

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("returns undefined for blank which output on Unix", async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "linux" });

        execFileMock.mockImplementation(
            (
                cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                if (cmd === "which") {
                    callback(null, "   \n", "");
                }
            }
        );

        const { which } = await import( "../../../src/services/docker/utils/Which");
        const result = await which("docker");

        expect(result).toBeUndefined();

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });
});
