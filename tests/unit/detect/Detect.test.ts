import { beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    execFile: execFileMock,
    spawn: vi.fn()
}));

describe("Detect", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        vi.resetModules();
        Object.defineProperty(process, "platform", { value: "linux" });
    });

    it("reports not installed when docker is missing", async () => {
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

        const { detectDocker } = await import( "../../../src/services/docker/detect");
        const result = await detectDocker();

        expect(result).toEqual({ installed: false, running: false });
    });

    it("reports installed and running when docker ps succeeds", async () => {
        execFileMock.mockImplementation(
            (
                cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (cmd === "which") {
                    callback(null, "/usr/bin/docker\n", "");
                } else
                if (args[0] === "--version") {
                    callback(null, "Docker version 27.0.0, build abc", "");
                } else
                if (args[0] === "ps") {
                    callback(null, "abc123\n", "");
                }
            }
        );

        const { detectDocker } = await import( "../../../src/services/docker/detect");
        const result = await detectDocker();

        expect(result.installed).toBe(true);
        expect(result.running).toBe(true);
        expect(result.version).toBe("27.0.0");
        expect(result.executable).toBe("/usr/bin/docker");
    });

    it("reports installed but not running when docker ps fails", async () => {
        execFileMock.mockImplementation(
            (
                cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (cmd === "which") {
                    callback(null, "/usr/bin/docker\n", "");
                } else
                if (args[0] === "--version") {
                    callback(null, "Docker version 27.0.0, build abc", "");
                } else
                if (args[0] === "ps") {
                    callback(new Error("daemon down"));
                }
            }
        );

        const { detectDocker } = await import( "../../../src/services/docker/detect");
        const result = await detectDocker();

        expect(result.installed).toBe(true);
        expect(result.running).toBe(false);
    });

    it("reports not installed when validation fails", async () => {
        execFileMock.mockImplementation(
            (
                cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (cmd === "which") {
                    callback(null, "/usr/bin/docker\n", "");
                } else
                if (args[0] === "--version") {
                    callback(new Error("invalid"));
                }
            }
        );

        const { detectDocker } = await import( "../../../src/services/docker/detect");
        const result = await detectDocker();

        expect(result).toEqual({
            installed: false,
            running: false,
            executable: "/usr/bin/docker"
        });
    });
});
