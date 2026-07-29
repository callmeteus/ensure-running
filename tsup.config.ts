import { defineConfig } from "tsup";

const sharedOptions = {
    target: "node20" as const,
    sourcemap: true,
    splitting: false,
    outExtension({ format }: { format: string }) {
        return {
            js: format === "cjs" ? ".cjs" : ".js"
        };
    }
};

export default defineConfig([
    {
        ...sharedOptions,
        entry: {
            index: "src/index.ts"
        },
        format: ["esm", "cjs"],
        dts: {
            entry: ["src/index.ts"]
        },
        clean: true
    },
    {
        ...sharedOptions,
        entry: {
            "bin/ensure-docker-running": "src/bin/ensure-docker-running.ts"
        },
        format: ["esm"]
    }
]);
