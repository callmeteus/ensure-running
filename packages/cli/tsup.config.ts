import { defineConfig } from "tsup";

export default defineConfig({
    entry: {
        "bin/ensure-running": "src/bin/ensure-running.ts"
    },
    format: ["esm"],
    sourcemap: true,
    clean: true,
    target: "node20",
    splitting: false,
    noExternal: ["@ensure-running/core", "@ensure-running/docker"]
});
