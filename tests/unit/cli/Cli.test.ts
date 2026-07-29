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

describe("Cli", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        startDockerMock.mockReset();
        vi.resetModules();
        Object.defineProperty(process, "platform", { value: "linux" });
    });

    describe("parseCliArgs", () => {
        it("defaults to ensure mode", async () => {
            const { parseCliArgs } = await import("../../../src/cli");

            expect(parseCliArgs([])).toEqual({
                mode: "ENSURE",
                timeout: 120_000,
                interval: 1_000,
                autoStart: true,
                quiet: false
            });
        });

        it("parses check and timing flags", async () => {
            const { parseCliArgs } = await import("../../../src/cli");

            expect(
                parseCliArgs(["--check", "--timeout", "5000", "--interval", "250", "--no-auto-start", "-q"])
            ).toEqual({
                mode: "CHECK",
                timeout: 5000,
                interval: 250,
                autoStart: false,
                quiet: true
            });
        });

        it("parses help and version modes", async () => {
            const { CliMode, parseCliArgs } = await import("../../../src/cli");

            expect(parseCliArgs(["--help"]).mode).toBe(CliMode.HELP);
            expect(parseCliArgs(["-v"]).mode).toBe(CliMode.VERSION);
        });

        it("rejects unknown options", async () => {
            const { parseCliArgs } = await import("../../../src/cli");

            expect(() => parseCliArgs(["--wat"])).toThrow("Unknown option: --wat");
        });

        it("rejects invalid timeout values", async () => {
            const { parseCliArgs } = await import("../../../src/cli");

            expect(() => parseCliArgs(["--timeout", "0"])).toThrow("--timeout expects a positive integer");
            expect(() => parseCliArgs(["--timeout"])).toThrow("Missing value for --timeout");
        });

        it("strips node and tsx runner arguments", async () => {
            const { parseCliArgs } = await import("../../../src/cli");

            expect(
                parseCliArgs([
                    "C:\\nvm4w\\nodejs\\node.exe",
                    "C:\\project\\node_modules\\tsx\\dist\\cli.mjs",
                    "C:\\project\\src\\bin\\ensure-docker-running.ts",
                    "--check"
                ])
            ).toMatchObject({
                mode: "CHECK"
            });
        });
    });

    describe("runCli", () => {
        it("prints help and exits with code 0", async () => {
            const { runCli } = await import("../../../src/cli");
            const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

            await expect(runCli(["--help"])).resolves.toBe(0);
            expect(logSpy).toHaveBeenCalled();

            logSpy.mockRestore();
        });

        it("prints version and exits with code 0", async () => {
            const { readPackageVersion, runCli } = await import("../../../src/cli");
            const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

            await expect(runCli(["--version"])).resolves.toBe(0);
            expect(logSpy).toHaveBeenCalledWith(readPackageVersion());

            logSpy.mockRestore();
        });

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

            const { runCli } = await import("../../../src/cli");

            await expect(runCli(["--check"])).resolves.toBe(0);
        });

        it("returns 1 in check mode when docker is not running", async () => {
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

            const { runCli } = await import("../../../src/cli");
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

            await expect(runCli(["--check"])).resolves.toBe(1);

            errorSpy.mockRestore();
        });

        it("returns 1 for unknown options", async () => {
            const { runCli } = await import("../../../src/cli");
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
            const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

            await expect(runCli(["--nope"])).resolves.toBe(1);

            errorSpy.mockRestore();
            logSpy.mockRestore();
        });

        it("runs ensure flow successfully", async () => {
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

            const { runCli } = await import("../../../src/cli");

            await expect(runCli(["-q"])).resolves.toBe(0);
        });
    });
});
