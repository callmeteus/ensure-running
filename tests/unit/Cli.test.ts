import { describe, expect, it, vi } from "vitest";

import type { EnsureService } from "../../src/core";

const dockerServiceMock = {
    id: "docker",
    aliases: ["d"],
    parseArgs(argv: string[]): { options: { mode: string }; remaining: string[] } {
        return {
            options: { mode: argv[0] === "--check" ? "CHECK" : "ENSURE" },
            remaining: argv.filter((arg) => arg !== "--check")
        };
    },
    async run(options: { mode: string }): Promise<number> {
        return options.mode === "CHECK" ? 1 : 0;
    },
    printHelp(): void {
        console.log("docker help");
    }
} satisfies EnsureService<{ mode: string }>;

vi.mock("../../src/services/docker/service", () => ({
    dockerService: dockerServiceMock
}));

describe("Cli", () => {
    it("prints global help", async () => {
        const { createBuiltInServiceRegistry } = await import("../../src/services/CreateServiceRegistry");
        const { runCli } = await import("../../src/cli");
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

        await expect(runCli(["--help"], createBuiltInServiceRegistry())).resolves.toBe(0);

        logSpy.mockRestore();
    });

    it("chains docker ensure before command parsing", async () => {
        const core = await import("../../src/core");
        const runInvocationSpy = vi.spyOn(core, "runInvocation").mockResolvedValue(0);
        const { createBuiltInServiceRegistry } = await import("../../src/services/CreateServiceRegistry");
        const { runCli } = await import("../../src/cli");

        await expect(runCli(["docker", "--", "vite", "dev"], createBuiltInServiceRegistry())).resolves.toBe(0);
        expect(runInvocationSpy).toHaveBeenCalled();

        runInvocationSpy.mockRestore();
    });

    it("prints version", async () => {
        const { createBuiltInServiceRegistry } = await import("../../src/services/CreateServiceRegistry");
        const { runCli } = await import("../../src/cli");
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

        await expect(runCli(["--version"], createBuiltInServiceRegistry())).resolves.toBe(0);

        logSpy.mockRestore();
    });

    it("prints docker service help", async () => {
        const { createBuiltInServiceRegistry } = await import("../../src/services/CreateServiceRegistry");
        const { runCli } = await import("../../src/cli");
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

        await expect(runCli(["docker", "--help"], createBuiltInServiceRegistry())).resolves.toBe(0);

        logSpy.mockRestore();
    });

    it("returns help when command separator is missing", async () => {
        const { createBuiltInServiceRegistry } = await import("../../src/services/CreateServiceRegistry");
        const { runCli } = await import("../../src/cli");
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

        await expect(runCli(["docker", "vite", "dev"], createBuiltInServiceRegistry())).resolves.toBe(1);

        errorSpy.mockRestore();
        logSpy.mockRestore();
    });
});
