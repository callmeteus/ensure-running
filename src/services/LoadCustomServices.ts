import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { ServiceRegistry } from "../core/registry";

import { assertEnsureService } from "./AssertEnsureService";

const SERVICE_FILE_PATTERN = /\.(?:[cm]?js|mjs|ts)$/i;

/**
 * Finds the nearest `.er/services` directory walking up from startDir.
 */
export function findCustomServicesDir(startDir: string): string | undefined {
    let current = path.resolve(startDir);

    while (true) {
        const candidate = path.join(current, ".er", "services");

        if (existsSync(candidate)) {
            return candidate;
        }

        const parent = path.dirname(current);

        if (parent === current) {
            return undefined;
        }

        current = parent;
    }
}

/**
 * Loads custom services from `.er/services` and registers them.
 */
export async function loadCustomServices(registry: ServiceRegistry, cwd = process.cwd()): Promise<void> {
    const dir = findCustomServicesDir(cwd);

    if (dir === undefined) {
        return;
    }

    const entries = await readdir(dir, { withFileTypes: true });
    const files = entries
        .filter((entry) => entry.isFile() && SERVICE_FILE_PATTERN.test(entry.name))
        .map((entry) => path.join(dir, entry.name))
        .sort();

    for (const filePath of files) {
        const service = await importCustomService(filePath);

        registry.register(service);
    }
}

async function importCustomService(filePath: string): Promise<ReturnType<typeof assertEnsureService>> {
    const ext = path.extname(filePath).toLowerCase();
    let loaded: unknown;

    if (ext === ".ts" || ext === ".mts" || ext === ".cts") {
        const { createJiti } = await import("jiti");
        const jiti = createJiti(import.meta.url, { interopDefault: true });

        loaded = jiti(filePath);
    } else {
        const module = await import(pathToFileURL(filePath).href);

        loaded = module.default ?? module;
    }

    return assertEnsureService(loaded, filePath);
}
