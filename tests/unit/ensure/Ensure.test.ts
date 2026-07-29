import { beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());
const startDockerMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    execFile: execFileMock,
    spawn: vi.fn()
}));

vi.mock("../../../src/platforms", () => ({
    startDocker: startDockerMock
}));

describe("Ensure", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        startDockerMock.mockReset();
        vi.resetModules();
        Object.defineProperty(process, "platform", { value: "linux" });
    });

    it("returns immediately when docker is already running", async () => {
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
                if (args.includes("{{.Client.Version}}")) {
                    callback(null, "27.0.0", "");
                } else
                if (args[0] === "info") {
                    callback(null, "ok", "");
                } else
                if (args.includes("{{.Server.Version}}")) {
                    callback(null, "27.0.0", "");
                }
            }
        );

        const { ensureDockerRunning } = await import( "../../../src/ensure");
        const info = vi.fn();

        await ensureDockerRunning({ logger: { info } });

        expect(info).toHaveBeenCalledWith("Docker daemon is already running.");
    });

    it("throws DockerNotInstalledError when docker is missing", async () => {
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

        const { ensureDockerRunning } = await import( "../../../src/ensure");
        const { DockerNotInstalledError } = await import( "../../../src/errors");

        await expect(ensureDockerRunning()).rejects.toBeInstanceOf(DockerNotInstalledError);
    });

    it("throws DockerNotRunningError when autoStart is false", async () => {
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
                if (args.includes("{{.Client.Version}}")) {
                    callback(null, "27.0.0", "");
                } else
                if (args[0] === "info") {
                    callback(new Error("down"));
                } else
                if (args.includes("{{.Server.Version}}")) {
                    callback(new Error("down"));
                }
            }
        );

        const { ensureDockerRunning } = await import( "../../../src/ensure");
        const { DockerNotRunningError } = await import( "../../../src/errors");

        await expect(ensureDockerRunning({ autoStart: false })).rejects.toBeInstanceOf(
            DockerNotRunningError
        );
    });

    it("starts docker and waits when autoStart is true", async () => {
        startDockerMock.mockResolvedValue(undefined);

        let infoCalls = 0;

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
                if (args.includes("{{.Client.Version}}")) {
                    callback(null, "27.0.0", "");
                } else
                if (args[0] === "info") {
                    infoCalls += 1;

                    if (infoCalls === 1) {
                        callback(new Error("down"));
                    } else {
                        callback(null, "ok", "");
                    }
                } else
                if (args.includes("{{.Server.Version}}")) {
                    callback(new Error("down"));
                }
            }
        );

        const { ensureDockerRunning } = await import( "../../../src/ensure");

        await ensureDockerRunning({ interval: 10, timeout: 1000 });

        expect(startDockerMock).toHaveBeenCalled();
    });

    it("isDockerRunning returns true when daemon is reachable", async () => {
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
                if (args.includes("{{.Client.Version}}")) {
                    callback(null, "27.0.0", "");
                } else
                if (args[0] === "info") {
                    callback(null, "ok", "");
                } else
                if (args.includes("{{.Server.Version}}")) {
                    callback(null, "27.0.0", "");
                }
            }
        );

        const { isDockerRunning } = await import( "../../../src/ensure");

        await expect(isDockerRunning()).resolves.toBe(true);
    });

    it("isDockerRunning returns false and never throws", async () => {
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

        const { isDockerRunning } = await import( "../../../src/ensure");

        await expect(isDockerRunning()).resolves.toBe(false);
    });

    it("throws DockerStartError when startDocker fails", async () => {
        startDockerMock.mockRejectedValue(new Error("start failed"));

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
                if (args.includes("{{.Client.Version}}")) {
                    callback(null, "27.0.0", "");
                } else
                if (args[0] === "info") {
                    callback(new Error("down"));
                } else
                if (args.includes("{{.Server.Version}}")) {
                    callback(new Error("down"));
                }
            }
        );

        const { ensureDockerRunning } = await import( "../../../src/ensure");
        const { DockerStartError } = await import( "../../../src/errors");

        await expect(ensureDockerRunning()).rejects.toBeInstanceOf(DockerStartError);
    });

    it("wraps non-Error start failures in DockerStartError", async () => {
        startDockerMock.mockRejectedValue("start failed");

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
                if (args.includes("{{.Client.Version}}")) {
                    callback(null, "27.0.0", "");
                } else
                if (args[0] === "info") {
                    callback(new Error("down"));
                } else
                if (args.includes("{{.Server.Version}}")) {
                    callback(new Error("down"));
                }
            }
        );

        const { ensureDockerRunning } = await import( "../../../src/ensure");
        const { DockerStartError } = await import( "../../../src/errors");

        await expect(ensureDockerRunning()).rejects.toBeInstanceOf(DockerStartError);
    });

    it("isDockerRunning returns false when detect throws", async () => {
        const detectModule = await import( "../../../src/detect");
        vi.spyOn(detectModule, "detectDocker").mockRejectedValue(new Error("boom"));

        const { isDockerRunning } = await import( "../../../src/ensure");

        await expect(isDockerRunning()).resolves.toBe(false);

        vi.restoreAllMocks();
    });
});
