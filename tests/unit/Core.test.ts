import { describe, expect, it, vi } from "vitest";

import { normalizeArgv } from "../../src/core/argv";
import { ServiceRegistry } from "../../src/core/registry";
import { parseInvocation, runCommand, runInvocation, CommandSeparatorError, MissingCommandError } from "../../src/core/runner";
import type { EnsureService } from "../../src/core/service";

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    spawn: spawnMock
}));

function createStubService(id: string, aliases: string[] = []): EnsureService<{ value: string }> {
    return {
        id,
        aliases,
        parseArgs(argv: string[]): { options: { value: string }; remaining: string[] } {
            if (argv[0] === "--flag") {
                return {
                    options: { value: argv[1] ?? "" },
                    remaining: argv.slice(2)
                };
            }

            return {
                options: { value: id },
                remaining: argv
            };
        },
        async run(): Promise<number> {
            return 0;
        }
    };
}

describe("Core", () => {
    describe("normalizeArgv", () => {
        it("strips node and tsx runner arguments", () => {
            expect(
                normalizeArgv([
                    "C:\\node.exe",
                    "C:\\project\\node_modules\\tsx\\dist\\cli.mjs",
                    "C:\\project\\packages\\cli\\src\\bin\\ensure-running.ts",
                    "docker",
                    "--check"
                ])
            ).toEqual(["docker", "--check"]);
        });
    });

    describe("parseInvocation", () => {
        it("parses chained providers and trailing command", () => {
            const registry = new ServiceRegistry();
            const alpha = createStubService("alpha");
            const beta = createStubService("beta");

            registry.register(alpha);
            registry.register(beta);

            const parsed = parseInvocation(["alpha", "beta", "--", "vite", "dev"], registry);

            expect(parsed.services.map((entry) => entry.service.id)).toEqual(["alpha", "beta"]);
            expect(parsed.command).toEqual(["vite", "dev"]);
        });

        it("parses provider flags before the command separator", () => {
            const registry = new ServiceRegistry();
            const alpha = createStubService("alpha");

            registry.register(alpha);

            const parsed = parseInvocation(["alpha", "--flag", "ok", "--", "npm", "test"], registry);

            expect(parsed.services[0]?.options).toEqual({ value: "ok" });
            expect(parsed.command).toEqual(["npm", "test"]);
        });

        it("requires -- before the trailing command", () => {
            const registry = new ServiceRegistry();
            const alpha = createStubService("alpha");

            registry.register(alpha);

            expect(() => parseInvocation(["alpha", "vite", "dev"], registry)).toThrow(CommandSeparatorError);
        });

        it("requires a command after --", () => {
            const registry = new ServiceRegistry();
            const alpha = createStubService("alpha");

            registry.register(alpha);

            expect(() => parseInvocation(["alpha", "--"], registry)).toThrow(MissingCommandError);
        });

        it("supports explicit command separator", () => {
            const registry = new ServiceRegistry();
            const alpha = createStubService("alpha");

            registry.register(alpha);

            const parsed = parseInvocation(["alpha", "--", "node", "app.js"], registry);

            expect(parsed.command).toEqual(["node", "app.js"]);
        });
    });

    describe("runInvocation", () => {
        it("stops when a service returns non-zero", async () => {
            const failing = createStubService("fail");

            failing.run = async (): Promise<number> => 1;

            const parsed = {
                services: [{ service: failing, options: { value: "fail" } }],
                command: undefined
            };

            await expect(runInvocation(parsed)).resolves.toBe(1);
        });

        it("returns zero when all services succeed without a command", async () => {
            const alpha = createStubService("alpha");

            await expect(
                runInvocation({
                    services: [{ service: alpha, options: { value: "alpha" } }]
                })
            ).resolves.toBe(0);
        });
    });

    describe("runCommand", () => {
        it("returns non-zero when command is missing", async () => {
            await expect(runCommand([])).resolves.toBe(1);
        });

        it("returns the child process exit code", async () => {
            spawnMock.mockImplementation(() => {
                const listeners: Record<string, Array<(code: number) => void>> = {};

                return {
                    on(event: string, listener: (code: number) => void): void {
                        listeners[event] = listeners[event] ?? [];
                        listeners[event].push(listener);

                        if (event === "close") {
                            listener(0);
                        }
                    }
                };
            });

            await expect(runCommand(["node", "-v"])).resolves.toBe(0);
        });
    });
});
