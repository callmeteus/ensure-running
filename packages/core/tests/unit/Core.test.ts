import { describe, expect, it } from "vitest";

import { normalizeArgv } from "../../src/argv";
import { ProviderRegistry } from "../../src/registry";
import { parseInvocation, runCommand } from "../../src/runner";
import type { EnsureProvider } from "../../src/provider";

function createStubProvider(id: string, aliases: string[] = []): EnsureProvider<{ value: string }> {
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
            const registry = new ProviderRegistry();
            const alpha = createStubProvider("alpha");
            const beta = createStubProvider("beta");

            registry.register(alpha);
            registry.register(beta);

            const parsed = parseInvocation(["alpha", "beta", "vite", "dev"], registry);

            expect(parsed.providers.map((entry) => entry.provider.id)).toEqual(["alpha", "beta"]);
            expect(parsed.command).toEqual(["vite", "dev"]);
        });

        it("parses provider flags before the command", () => {
            const registry = new ProviderRegistry();
            const alpha = createStubProvider("alpha");

            registry.register(alpha);

            const parsed = parseInvocation(["alpha", "--flag", "ok", "npm", "test"], registry);

            expect(parsed.providers[0]?.options).toEqual({ value: "ok" });
            expect(parsed.command).toEqual(["npm", "test"]);
        });

        it("supports explicit command separator", () => {
            const registry = new ProviderRegistry();
            const alpha = createStubProvider("alpha");

            registry.register(alpha);

            const parsed = parseInvocation(["alpha", "--", "node", "app.js"], registry);

            expect(parsed.command).toEqual(["node", "app.js"]);
        });
    });

    describe("runCommand", () => {
        it("returns non-zero when command is missing", async () => {
            await expect(runCommand([])).resolves.toBe(1);
        });
    });
});
