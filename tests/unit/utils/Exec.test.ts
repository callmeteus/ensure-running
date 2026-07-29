import { beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());
const spawnMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    execFile: execFileMock,
    spawn: spawnMock
}));

describe("Exec", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        spawnMock.mockReset();
        vi.resetModules();
    });

    it("resolves with stdout and stderr on success", async () => {
        execFileMock.mockImplementation(
            (
                _cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                callback(null, "hello", "warn");
            }
        );

        const { exec } = await import( "../../../src/services/docker/utils/Exec");
        const result = await exec("docker", ["info"]);

        expect(result).toEqual({ stdout: "hello", stderr: "warn" });
    });

    it("rejects when execFile fails", async () => {
        execFileMock.mockImplementation(
            (
                _cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: Error) => void
            ) => {
                callback(new Error("failed"));
            }
        );

        const { exec } = await import( "../../../src/services/docker/utils/Exec");

        await expect(exec("docker", ["info"])).rejects.toThrow("failed");
    });

    it("runs shell commands via execShell", async () => {
        execFileMock.mockImplementation(
            (
                cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                expect(cmd).toBe("/bin/sh");
                expect(args[0]).toBe("-c");
                callback(null, "/usr/bin/docker", "");
            }
        );

        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "linux" });

        const { execShell } = await import( "../../../src/services/docker/utils/Exec");
        const result = await execShell("command -v docker");

        expect(result.stdout).toBe("/usr/bin/docker");

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("runs shell commands via execShell on Windows", async () => {
        execFileMock.mockImplementation(
            (
                cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                expect(cmd).toBe("cmd.exe");
                expect(args[0]).toBe("/c");
                callback(null, "C:\\Docker\\docker.exe", "");
            }
        );

        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "win32" });

        const { execShell } = await import( "../../../src/services/docker/utils/Exec");
        const result = await execShell("where docker");

        expect(result.stdout).toBe("C:\\Docker\\docker.exe");

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });
});

describe("Spawn", () => {
    beforeEach(() => {
        spawnMock.mockReset();
        vi.resetModules();
    });

    it("spawns a process with options", async () => {
        const mockChild = { unref: vi.fn() };
        spawnMock.mockReturnValue(mockChild);

        const { spawnDetached } = await import( "../../../src/services/docker/utils/Spawn");
        const child = spawnDetached("dockerd", []);

        expect(spawnMock).toHaveBeenCalledWith("dockerd", [], {
            detached: true,
            stdio: "ignore",
            windowsHide: true
        });
        expect(mockChild.unref).toHaveBeenCalled();
        expect(child).toBe(mockChild);
    });

    it("spawns a foreground process with custom options", async () => {
        const mockChild = { unref: vi.fn() };
        spawnMock.mockReturnValue(mockChild);

        const { spawn } = await import( "../../../src/services/docker/utils/Spawn");
        const child = spawn("docker", ["info"], { detached: false, stdio: "pipe" });

        expect(spawnMock).toHaveBeenCalledWith("docker", ["info"], {
            detached: false,
            stdio: "pipe",
            windowsHide: true
        });
        expect(child).toBe(mockChild);
    });

    it("uses default spawn options when omitted", async () => {
        const mockChild = { unref: vi.fn() };
        spawnMock.mockReturnValue(mockChild);

        const { spawn } = await import( "../../../src/services/docker/utils/Spawn");
        spawn("docker", ["ps"]);

        expect(spawnMock).toHaveBeenCalledWith("docker", ["ps"], {
            detached: false,
            stdio: "ignore",
            windowsHide: true
        });
    });
});
