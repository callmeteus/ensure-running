import { beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    execFile: execFileMock,
    spawn: vi.fn()
}));

describe("Wait", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        vi.resetModules();
    });

    it("resolves when docker info eventually succeeds", async () => {
        let calls = 0;

        execFileMock.mockImplementation(
            (
                _cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (args[0] === "info") {
                    calls += 1;

                    if (calls >= 2) {
                        callback(null, "ok", "");

                        return;
                    }

                    callback(new Error("not ready"));

                    return;
                }

                callback(new Error("unexpected"));
            }
        );

        const { waitForDocker } = await import( "../../../src/wait");

        await expect(
            waitForDocker({
                timeout: 1000,
                interval: 10,
                executable: "docker",
                logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn() }
            })
        ).resolves.toBeUndefined();
    });

    it("throws DockerTimeoutError when daemon never becomes ready", async () => {
        execFileMock.mockImplementation(
            (
                _cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: Error) => void
            ) => {
                callback(new Error("not ready"));
            }
        );

        const { waitForDocker } = await import( "../../../src/wait");
        const { DockerTimeoutError } = await import( "../../../src/errors");

        await expect(
            waitForDocker({ timeout: 50, interval: 10, executable: "docker" })
        ).rejects.toBeInstanceOf(DockerTimeoutError);
    });
});
