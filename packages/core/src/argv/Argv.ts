/**
 * Strips node, runner, and script path tokens from raw {@link process.argv}.
 */
export function normalizeArgv(argv: string[]): string[] {
    const prefix = argv.slice(0, Math.min(argv.length, 4));
    let scriptIndex = -1;

    for (let index = 0; index < prefix.length; index++) {
        const arg = prefix[index] ?? "";

        if (arg.endsWith(".ts")) {
            scriptIndex = index;
        }
    }

    if (scriptIndex === -1) {
        for (let index = 0; index < prefix.length; index++) {
            const arg = prefix[index] ?? "";

            if (
                (arg.endsWith(".mjs") || arg.endsWith(".cjs") || arg.endsWith(".js"))
                && (arg.includes("/") || arg.includes("\\"))
            ) {
                scriptIndex = index;
            }
        }
    }

    if (scriptIndex >= 0) {
        return argv.slice(scriptIndex + 1);
    }

    if (
        argv.length >= 2
        && (argv[0].includes("node") || argv[0].endsWith("node.exe"))
    ) {
        return argv.slice(2);
    }

    return [...argv];
}
