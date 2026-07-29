import { beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());
const spawnMock = vi.hoisted(() => vi.fn());
const accessMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    execFile: execFileMock,
    spawn: spawnMock
}));

vi.mock("node:fs/promises", () => ({
    access: accessMock
}));

describe("Platforms Linux", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        spawnMock.mockReset();
        vi.resetModules();
        Object.defineProperty(process, "platform", { value: "linux" });
    });

    it("starts docker via systemctl when available", async () => {
        execFileMock.mockImplementation(
            (
                cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (cmd === "which" && args[0] === "systemctl") {
                    callback(null, "/usr/bin/systemctl\n", "");
                } else
                if (cmd === "systemctl") {
                    callback(null, "", "");
                } else {
                    callback(new Error("missing"));
                }
            }
        );

        const { startDockerLinux } = await import( "../../../src/platforms");
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

        await startDockerLinux(logger);

        expect(logger.info).toHaveBeenCalledWith("Started Docker via systemctl.");
    });

    it("falls back to dockerd when service managers are missing", async () => {
        execFileMock.mockImplementation(
            (
                cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (cmd === "which" && (args[0] === "systemctl" || args[0] === "service")) {
                    callback(new Error("missing"));
                } else
                if (cmd === "which" && args[0] === "dockerd") {
                    callback(null, "/usr/bin/dockerd\n", "");
                } else {
                    callback(new Error("missing"));
                }
            }
        );

        spawnMock.mockReturnValue({ unref: vi.fn() });

        const { startDockerLinux } = await import( "../../../src/platforms");
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

        await startDockerLinux(logger);

        expect(spawnMock).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith("Started dockerd in the background.");
    });
});

describe("Platforms Windows", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        spawnMock.mockReset();
        accessMock.mockReset();
        vi.resetModules();
        Object.defineProperty(process, "platform", { value: "win32" });
    });

    it("uses docker desktop start when available", async () => {
        execFileMock.mockImplementation(
            (
                _cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                expect(args).toEqual(["desktop", "start"]);
                callback(null, "", "");
            }
        );

        const { startDockerWindows } = await import( "../../../src/platforms");
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

        await startDockerWindows(logger);

        expect(logger.info).toHaveBeenCalledWith("Started Docker Desktop via CLI.");
    });

    it("launches Docker Desktop.exe when CLI start fails", async () => {
        execFileMock.mockImplementation(
            (
                cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (cmd === "docker" && args[0] === "desktop") {
                    callback(new Error("cli missing"));
                } else
                if (cmd === "where.exe") {
                    callback(new Error("not found"));
                } else {
                    callback(new Error("unexpected"));
                }
            }
        );

        accessMock.mockImplementation(async (target: string) => {
            if (target.includes("Docker Desktop.exe")) {
                return undefined;
            }

            throw new Error("missing");
        });

        spawnMock.mockReturnValue({ unref: vi.fn() });

        const { startDockerWindows } = await import( "../../../src/platforms");
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

        await startDockerWindows(logger, "docker");

        expect(spawnMock).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith("Launched Docker Desktop executable.");
    });
});

describe("Platforms macOS", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        vi.resetModules();
        Object.defineProperty(process, "platform", { value: "darwin" });
    });

    it("uses docker desktop start when available", async () => {
        execFileMock.mockImplementation(
            (
                _cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                expect(args).toEqual(["desktop", "start"]);
                callback(null, "", "");
            }
        );

        const { startDockerMacOS } = await import( "../../../src/platforms");
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

        await startDockerMacOS(logger);

        expect(logger.info).toHaveBeenCalledWith("Started Docker Desktop via CLI.");
    });

    it("opens Docker.app when docker desktop start fails", async () => {
        execFileMock.mockImplementation(
            (
                cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (cmd === "docker" && args[0] === "desktop") {
                    callback(new Error("cli missing"));
                } else
                if (cmd === "open") {
                    expect(args).toEqual(["-a", "Docker"]);
                    callback(null, "", "");
                }
            }
        );

        const { startDockerMacOS } = await import( "../../../src/platforms");
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

        await startDockerMacOS(logger);

        expect(logger.info).toHaveBeenCalledWith("Opened Docker.app.");
    });
});

describe("Platforms dispatch", () => {
    beforeEach(() => {
        execFileMock.mockReset();
        spawnMock.mockReset();
        accessMock.mockReset();
        vi.resetModules();
    });

    it("startDocker dispatches to Linux on linux platform", async () => {
        Object.defineProperty(process, "platform", { value: "linux" });

        execFileMock.mockImplementation(
            (
                cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (cmd === "which" && args[0] === "systemctl") {
                    callback(null, "/usr/bin/systemctl\n", "");
                } else
                if (cmd === "systemctl") {
                    callback(null, "", "");
                } else {
                    callback(new Error("missing"));
                }
            }
        );

        const { startDocker } = await import( "../../../src/platforms");
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

        await startDocker(logger);

        expect(logger.info).toHaveBeenCalledWith("Started Docker via systemctl.");
    });

    it("startDockerLinux throws when no start method is available", async () => {
        Object.defineProperty(process, "platform", { value: "linux" });

        execFileMock.mockImplementation(
            (
                cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: Error) => void
            ) => {
                if (cmd === "which") {
                    callback(new Error("missing"));
                } else {
                    callback(new Error("missing"));
                }
            }
        );

        const { startDockerLinux } = await import( "../../../src/platforms");
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

        await expect(startDockerLinux(logger)).rejects.toThrow(
            "No supported Docker start method found on Linux"
        );
    });

    it("startDockerLinux uses service when systemctl fails", async () => {
        Object.defineProperty(process, "platform", { value: "linux" });

        execFileMock.mockImplementation(
            (
                cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (cmd === "which" && args[0] === "systemctl") {
                    callback(null, "/usr/bin/systemctl\n", "");
                } else
                if (cmd === "systemctl") {
                    callback(new Error("failed"));
                } else
                if (cmd === "which" && args[0] === "service") {
                    callback(null, "/usr/sbin/service\n", "");
                } else
                if (cmd === "service") {
                    callback(null, "", "");
                } else {
                    callback(new Error("missing"));
                }
            }
        );

        const { startDockerLinux } = await import( "../../../src/platforms");
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

        await startDockerLinux(logger);

        expect(logger.warn).toHaveBeenCalledWith("systemctl start docker failed.");
        expect(logger.info).toHaveBeenCalledWith("Started Docker via service.");
    });

    it("getWindowsDockerDesktopCandidates returns expected paths", async () => {
        const { getWindowsDockerDesktopCandidates } = await import( "../../../src/platforms");
        const candidates = getWindowsDockerDesktopCandidates();

        expect(candidates.some((path) => path.includes("Docker Desktop.exe"))).toBe(true);
    });

    it("getWindowsDockerDesktopCandidates omits LOCALAPPDATA when unset", async () => {
        const original = process.env.LOCALAPPDATA;
        delete process.env.LOCALAPPDATA;

        const { getWindowsDockerDesktopCandidates } = await import( "../../../src/platforms");
        const candidates = getWindowsDockerDesktopCandidates();

        expect(candidates.every((candidate) => !candidate.includes("AppData\\Local"))).toBe(true);

        process.env.LOCALAPPDATA = original;
    });

    it("findWindowsDockerDesktop uses PATH when file access fails", async () => {
        Object.defineProperty(process, "platform", { value: "win32" });

        accessMock.mockRejectedValue(new Error("missing"));

        execFileMock.mockImplementation(
            (
                cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (cmd === "where.exe") {
                    callback(null, "C:\\Apps\\Docker Desktop.exe\r\n", "");
                } else {
                    callback(new Error("unexpected"));
                }
            }
        );

        const { findWindowsDockerDesktop } = await import( "../../../src/platforms");
        const result = await findWindowsDockerDesktop();

        expect(result).toBe("C:\\Apps\\Docker Desktop.exe");
    });

    it("startDocker dispatches to Windows on win32 platform", async () => {
        Object.defineProperty(process, "platform", { value: "win32" });

        execFileMock.mockImplementation(
            (
                _cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                expect(args).toEqual(["desktop", "start"]);
                callback(null, "", "");
            }
        );

        const { startDocker } = await import( "../../../src/platforms");
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

        await startDocker(logger);

        expect(logger.info).toHaveBeenCalledWith("Started Docker Desktop via CLI.");
    });

    it("startDocker dispatches to macOS on darwin platform", async () => {
        Object.defineProperty(process, "platform", { value: "darwin" });

        execFileMock.mockImplementation(
            (
                _cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: null, stdout: string, stderr: string) => void
            ) => {
                expect(args).toEqual(["desktop", "start"]);
                callback(null, "", "");
            }
        );

        const { startDocker } = await import( "../../../src/platforms");
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

        await startDocker(logger);

        expect(logger.info).toHaveBeenCalledWith("Started Docker Desktop via CLI.");
    });

    it("startDockerWindows throws when CLI and executable search both fail", async () => {
        Object.defineProperty(process, "platform", { value: "win32" });

        execFileMock.mockImplementation(
            (
                _cmd: string,
                _args: string[],
                _opts: unknown,
                callback: (err: Error) => void
            ) => {
                callback(new Error("cli missing"));
            }
        );

        accessMock.mockRejectedValue(new Error("missing"));

        const { startDockerWindows } = await import( "../../../src/platforms");
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

        await expect(startDockerWindows(logger, "docker")).rejects.toThrow("cli missing");
    });

    it("startDockerLinux records dockerd spawn failures", async () => {
        Object.defineProperty(process, "platform", { value: "linux" });

        execFileMock.mockImplementation(
            (
                cmd: string,
                args: string[],
                _opts: unknown,
                callback: (err: Error | null, stdout?: string, stderr?: string) => void
            ) => {
                if (cmd === "which" && (args[0] === "systemctl" || args[0] === "service")) {
                    callback(new Error("missing"));
                } else
                if (cmd === "which" && args[0] === "dockerd") {
                    callback(null, "/usr/bin/dockerd\n", "");
                } else {
                    callback(new Error("missing"));
                }
            }
        );

        spawnMock.mockImplementation(() => {
            throw new Error("spawn failed");
        });

        const { startDockerLinux } = await import( "../../../src/platforms");
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

        await expect(startDockerLinux(logger)).rejects.toThrow(
            "No supported Docker start method found on Linux"
        );

        expect(logger.warn).toHaveBeenCalledWith("dockerd detached start failed.");
    });
});
