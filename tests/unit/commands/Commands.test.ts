import { beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    execFile: execFileMock,
    spawn: vi.fn()
}));

describe("Commands", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        vi.resetModules();
        Object.defineProperty(process, "platform", { value: "linux" });
    });

    it("resolveDockerExecutable returns which result", async () => {
        execFileMock.mockImplementation(
            (
                cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                if (cmd === "which") {
                    callback(null, "/usr/bin/docker\n", "");
                }
            }
        );

        const { resolveDockerExecutable } = await import( "../../../src/commands");
        const path = await resolveDockerExecutable();

        expect(path).toBe("/usr/bin/docker");
    });

    it("isDockerDaemonReachable returns true on docker info success", async () => {
        execFileMock.mockImplementation(
            (
                _cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                if (args[0] === "info") {
                    callback(null, "info", "");
                }
            }
        );

        const { isDockerDaemonReachable } = await import( "../../../src/commands");

        await expect(isDockerDaemonReachable("docker")).resolves.toBe(true);
    });

    it("isDockerDaemonReachable returns false on failure", async () => {
        execFileMock.mockImplementation(
            (
                _cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: Error) => void
            ) => {
                callback(new Error("daemon down"));
            }
        );

        const { isDockerDaemonReachable } = await import( "../../../src/commands");

        await expect(isDockerDaemonReachable("docker")).resolves.toBe(false);
    });

    it("runDockerVersion parses client version", async () => {
        execFileMock.mockImplementation(
            (
                _cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                if (args.includes("{{.Client.Version}}")) {
                    callback(null, "27.0.0", "");
                } else
                if (args.includes("{{.Server.Version}}")) {
                    callback(null, "27.0.0", "");
                }
            }
        );

        const { runDockerVersion } = await import( "../../../src/commands");
        const info = await runDockerVersion("docker");

        expect(info.clientVersion).toBe("27.0.0");
        expect(info.serverReachable).toBe(true);
    });

    it("runDockerInfo returns stdout", async () => {
        execFileMock.mockImplementation(
            (
                _cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                if (args[0] === "info") {
                    callback(null, "daemon-info", "");
                }
            }
        );

        const { runDockerInfo } = await import( "../../../src/commands");

        await expect(runDockerInfo("docker")).resolves.toBe("daemon-info");
    });

    it("validateDockerInstallation returns false on failure", async () => {
        execFileMock.mockImplementation(
            (
                _cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: Error) => void
            ) => {
                callback(new Error("invalid"));
            }
        );

        const { validateDockerInstallation } = await import( "../../../src/commands");

        await expect(validateDockerInstallation("docker")).resolves.toBe(false);
    });

    it("runDockerVersion returns empty result when client version fails", async () => {
        execFileMock.mockImplementation(
            (
                _cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: Error) => void
            ) => {
                callback(new Error("missing"));
            }
        );

        const { runDockerVersion } = await import( "../../../src/commands");
        const info = await runDockerVersion("docker");

        expect(info).toEqual({ serverReachable: false });
    });

    it("runDockerVersion reports unreachable server when server query fails", async () => {
        execFileMock.mockImplementation(
            (
                _cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (args.includes("{{.Client.Version}}")) {
                    callback(null, "27.0.0", "");
                } else
                if (args.includes("{{.Server.Version}}")) {
                    callback(new Error("daemon down"));
                }
            }
        );

        const { runDockerVersion } = await import( "../../../src/commands");
        const info = await runDockerVersion("docker");

        expect(info.clientVersion).toBe("27.0.0");
        expect(info.serverReachable).toBe(false);
    });
});
