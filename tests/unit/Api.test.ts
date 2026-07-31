import { beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());
const runCommandMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    execFile: execFileMock,
    spawn: vi.fn()
}));

vi.mock("../../src/core", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../src/core")>();

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
            if (args[0] === "ps") {
                callback(null, "abc123\n", "");
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
            if (args[0] === "ps") {
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
        const { DockerNotRunningError } = await import("../../src/services/docker");

        await expect(ensureDocker({ check: true })).rejects.toBeInstanceOf(DockerNotRunningError);
    });

    it("runEnsureRunning returns command exit code", async () => {
        mockDockerRunning();
        runCommandMock.mockResolvedValue(0);

        const { runEnsureRunning } = await import("../../src/api");

        await expect(
            runEnsureRunning({
                services: ["docker"],
                command: ["vite", "dev"]
            })
        ).resolves.toBe(0);

        expect(runCommandMock).toHaveBeenCalledWith(["vite", "dev"]);
    });

    it("ensureRunning throws for unknown services", async () => {
        const { ensureRunning, EnsureRunningError } = await import("../../src/api");

        await expect(
            ensureRunning({ services: ["missing"] as never })
        ).rejects.toBeInstanceOf(EnsureRunningError);
    });

    it("ensureRunning accepts service objects with options", async () => {
        mockDockerRunning();

        const { ensureRunning, EnsureServiceId } = await import("../../src/api");

        await expect(
            ensureRunning([
                {
                    service: EnsureServiceId.DOCKER,
                    options: { quiet: true }
                }
            ])
        ).resolves.toBeUndefined();
    });
});
