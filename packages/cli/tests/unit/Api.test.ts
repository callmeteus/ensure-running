import { beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());
const runCommandMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    execFile: execFileMock,
    spawn: vi.fn()
}));

vi.mock("@ensure-running/core", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@ensure-running/core")>();

    return {
        ...actual,
        runCommand: runCommandMock
    };
});

function mockDockerRunning(): void {
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
            if (args[0] === "info") {
                callback(null, "ok", "");
            } else
            if (args.includes("{{.Server.Version}}")) {
                callback(null, "27.0.0", "");
            }
        }
    );
}

function mockDockerDaemonDown(): void {
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
            if (args[0] === "info") {
                callback(new Error("daemon down"), "", "");
            } else
            if (args.includes("{{.Server.Version}}")) {
                callback(new Error("daemon down"), "", "");
            }
        }
    );
}

describe("Api", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        runCommandMock.mockReset();
        vi.resetModules();
        Object.defineProperty(process, "platform", { value: "linux" });
    });

    it("ensureRunning resolves docker provider", async () => {
        mockDockerRunning();

        const { ensureRunning } = await import("../../src/api");

        await expect(ensureRunning(["docker"])).resolves.toBeUndefined();
    });

    it("ensureDocker throws when check mode fails", async () => {
        mockDockerDaemonDown();

        const { ensureDocker } = await import("../../src/api");
        const { DockerNotRunningError } = await import("@ensure-running/docker");

        await expect(ensureDocker({ check: true })).rejects.toBeInstanceOf(DockerNotRunningError);
    });

    it("runEnsureRunning returns command exit code", async () => {
        mockDockerRunning();
        runCommandMock.mockResolvedValue(0);

        const { runEnsureRunning } = await import("../../src/api");

        await expect(
            runEnsureRunning({
                providers: ["docker"],
                command: ["vite", "dev"]
            })
        ).resolves.toBe(0);

        expect(runCommandMock).toHaveBeenCalledWith(["vite", "dev"]);
    });
});
