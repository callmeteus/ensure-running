import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            "ensure-running": path.resolve(rootDir, "src/index.ts")
        }
    },
    test: {
        globals: false,
        environment: "node",
        include: ["tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: [
                "src/**/index.ts",
                "src/bin/**",
                "src/core/service/Service.ts"
            ],
            thresholds: {
                lines: 90,
                functions: 94,
                branches: 84,
                statements: 90
            }
        }
    }
});
