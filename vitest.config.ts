import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            "@ensure-running/core": path.resolve(rootDir, "packages/core/src/index.ts"),
            "@ensure-running/docker": path.resolve(rootDir, "packages/docker/src/index.ts")
        }
    },
    test: {
        globals: false,
        environment: "node",
        include: ["packages/*/tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            include: ["packages/*/src/**/*.ts"],
            exclude: ["packages/*/src/**/index.ts"],
            thresholds: {
                lines: 95,
                functions: 95,
                branches: 88,
                statements: 95
            }
        }
    }
});
