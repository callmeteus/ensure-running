import { beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    execFile: execFileMock,
    spawn: vi.fn()
}));

describe("DockerProvider", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        vi.resetModules();
        Object.defineProperty(process, "platform", { value: "linux" });
    });

    describe("parseDockerProviderArgs", () => {
        it("parses docker flags and leaves trailing command tokens", async () => {
            const { parseDockerProviderArgs } = await import("../../../src/provider");

            expect(parseDockerProviderArgs(["--check", "vite", "dev"])).toEqual({
                options: {
                    mode: "CHECK",
                    timeout: 120_000,
                    interval: 1_000,
                    autoStart: true,
                    quiet: false
                },
                remaining: ["vite", "dev"]
            });
        });

        it("rejects unknown docker flags", async () => {
            const { parseDockerProviderArgs } = await import("../../../src/provider");

            expect(() => parseDockerProviderArgs(["--wat"])).toThrow("Unknown docker option: --wat");
        });
    });

    describe("runDockerProvider", () => {
        it("returns 0 in check mode when docker is running", async () => {
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

            const { DockerProviderMode, runDockerProvider } = await import("../../../src/provider");

            await expect(
                runDockerProvider({
                    mode: DockerProviderMode.CHECK,
                    timeout: 120_000,
                    interval: 1_000,
                    autoStart: true,
                    quiet: true
                })
            ).resolves.toBe(0);
        });
    });
});
