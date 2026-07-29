import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ServiceRegistry } from "../../src/core/registry";
import type { EnsureService } from "../../src/core/service";
import { assertEnsureService } from "../../src/services/AssertEnsureService";
import { findCustomServicesDir, loadCustomServices } from "../../src/services/LoadCustomServices";

const tempDirs: string[] = [];

afterEach(async () => {
    while (tempDirs.length > 0) {
        const dir = tempDirs.pop();

        if (dir !== undefined) {
            await import("node:fs/promises").then(({ rm }) => rm(dir, { recursive: true, force: true }));
        }
    }
});

describe("Custom services", () => {
    it("finds .er/services walking up from a nested directory", async () => {
        const root = await mkdtemp(path.join(os.tmpdir(), "er-services-"));

        tempDirs.push(root);
        await mkdir(path.join(root, ".er", "services"), { recursive: true });
        await mkdir(path.join(root, "apps", "web"), { recursive: true });

        expect(findCustomServicesDir(path.join(root, "apps", "web"))).toBe(path.join(root, ".er", "services"));
    });

    it("loads export default services from .er/services", async () => {
        const root = await mkdtemp(path.join(os.tmpdir(), "er-services-"));

        tempDirs.push(root);
        const servicesDir = path.join(root, ".er", "services");

        await mkdir(servicesDir, { recursive: true });
        await writeFile(
            path.join(servicesDir, "postgres.js"),
            `export default {
                id: "postgres",
                parseArgs(argv) {
                    return { options: {}, remaining: argv };
                },
                async run() {
                    return 0;
                }
            };`,
            "utf8"
        );

        const registry = new ServiceRegistry();

        await loadCustomServices(registry, root);

        expect(registry.resolve("postgres")?.id).toBe("postgres");
    });

    it("loads TypeScript services via jiti", async () => {
        const jitiMock = vi.hoisted(() =>
            vi.fn((): EnsureService => ({
                id: "postgres",
                parseArgs(argv: string[]): { options: Record<string, never>; remaining: string[] } {
                    return { options: {}, remaining: argv };
                },
                async run(): Promise<number> {
                    return 0;
                }
            }))
        );

        vi.doMock("jiti", () => ({
            createJiti: (): typeof jitiMock => jitiMock
        }));

        const root = await mkdtemp(path.join(os.tmpdir(), "er-services-"));

        tempDirs.push(root);
        const servicesDir = path.join(root, ".er", "services");

        await mkdir(servicesDir, { recursive: true });
        await writeFile(path.join(servicesDir, "postgres.ts"), "export default {}", "utf8");

        const registry = new ServiceRegistry();

        await loadCustomServices(registry, root);

        expect(registry.resolve("postgres")?.id).toBe("postgres");
        expect(jitiMock).toHaveBeenCalled();
    });

    it("returns the same service object", async () => {
        const { defineEnsureService } = await import("../../src/core/service");

        const service = defineEnsureService({
            id: "demo",
            parseArgs(argv: string[]) {
                return { options: { ok: true }, remaining: argv };
            },
            async run() {
                return 0;
            }
        });

        expect(service.id).toBe("demo");
    });

    it("validates export default shape", () => {
        expect(() => assertEnsureService(null, "broken.ts")).toThrow('export default must be an object');
        expect(() => assertEnsureService({ id: "" }, "broken.ts")).toThrow('non-empty string "id"');
        expect(() => assertEnsureService({ id: "x" }, "broken.ts")).toThrow('"parseArgs(argv)"');
        expect(() => assertEnsureService({ id: "x", parseArgs: () => ({ options: {}, remaining: [] }) }, "broken.ts")).toThrow(
            '"run(options)"'
        );
        expect(() =>
            assertEnsureService(
                {
                    id: "x",
                    parseArgs: () => ({ options: {}, remaining: [] }),
                    run: async () => 0,
                    printHelp: "nope"
                },
                "broken.ts"
            )
        ).toThrow('"printHelp" must be a function');
    });
});
