import type { EnsureService } from "../core/service";

/**
 * Validates a custom service loaded from `.er/services`.
 */
export function assertEnsureService(value: unknown, source: string): EnsureService {
    if (value === null || typeof value !== "object") {
        throw new Error(`${source}: export default must be an object`);
    }

    const candidate = value as Record<string, unknown>;

    if (typeof candidate.id !== "string" || candidate.id.length === 0) {
        throw new Error(`${source}: export default must define a non-empty string "id"`);
    }

    if (typeof candidate.parseArgs !== "function") {
        throw new Error(`${source}: export default must define "parseArgs(argv)"`);
    }

    if (typeof candidate.run !== "function") {
        throw new Error(`${source}: export default must define "run(options)"`);
    }

    if (candidate.printHelp !== undefined && typeof candidate.printHelp !== "function") {
        throw new Error(`${source}: "printHelp" must be a function when provided`);
    }

    return value as EnsureService;
}
