import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommandSeparator } from "../../../src/core/runner";
import { DockerServiceMode, parseDockerServiceArgs, runDockerService } from "../../../src/services/docker/service";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    execFile: execFileMock,
    spawn: vi.fn()
}));

describe("DockerService", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        vi.resetModules();
        Object.defineProperty(process, "platform", { value: "linux" });
    });

    describe("parseDockerServiceArgs", () => {
        it("parses docker flags and leaves trailing command tokens", () => {
            expect(parseDockerServiceArgs(["--check", "vite", "dev"])).toEqual({
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

        it("stops at the command separator", () => {
            expect(parseDockerServiceArgs([CommandSeparator, "vite", "dev"]).remaining).toEqual([
                CommandSeparator,
                "vite",
                "dev"
            ]);
        });

        it("rejects unknown docker flags", () => {
            expect(() => parseDockerServiceArgs(["--wat"])).toThrow("Unknown docker option: --wat");
        });
    });

    describe("runDockerService", () => {
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

            await expect(
                runDockerService({
                    mode: DockerServiceMode.CHECK,
                    timeout: 120_000,
                    interval: 1_000,
                    autoStart: true,
                    quiet: true
                })
            ).resolves.toBe(0);
        });

        it("returns 1 in check mode when docker is down", async () => {
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
                    } else {
                        callback(new Error("daemon down"), "", "");
                    }
                }
            );

            await expect(
                runDockerService({
                    mode: DockerServiceMode.CHECK,
                    timeout: 120_000,
                    interval: 1_000,
                    autoStart: true,
                    quiet: true
                })
            ).resolves.toBe(1);
        });

        it("returns 0 in ensure mode when docker is already running", async () => {
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

            await expect(
                runDockerService({
                    mode: DockerServiceMode.ENSURE,
                    timeout: 120_000,
                    interval: 1_000,
                    autoStart: true,
                    quiet: true
                })
            ).resolves.toBe(0);
        });

        it("returns 1 in ensure mode when docker cannot be started", async () => {
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
                    } else {
                        callback(new Error("daemon down"), "", "");
                    }
                }
            );

            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

            await expect(
                runDockerService({
                    mode: DockerServiceMode.ENSURE,
                    timeout: 120_000,
                    interval: 1_000,
                    autoStart: false,
                    quiet: false
                })
            ).resolves.toBe(1);

            errorSpy.mockRestore();
        });
    });
});
