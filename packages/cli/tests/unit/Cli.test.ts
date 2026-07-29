import { describe, expect, it, vi } from "vitest";

import type { EnsureProvider } from "@ensure-running/core";

vi.mock("@ensure-running/docker", () => ({
    dockerProvider: {
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
    } satisfies EnsureProvider<{ mode: string }>
}));

describe("Cli", () => {
    it("prints global help", async () => {
        const { createDefaultRegistry, runCli } = await import("../../src/cli");
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

        await expect(runCli(["--help"], createDefaultRegistry())).resolves.toBe(0);

        logSpy.mockRestore();
    });

    it("chains docker ensure before command parsing", async () => {
        const core = await import("@ensure-running/core");
        const runInvocationSpy = vi.spyOn(core, "runInvocation").mockResolvedValue(0);
        const { createDefaultRegistry, runCli } = await import("../../src/cli");

        await expect(runCli(["docker", "--", "vite", "dev"], createDefaultRegistry())).resolves.toBe(0);
        expect(runInvocationSpy).toHaveBeenCalled();

        runInvocationSpy.mockRestore();
    });
});
