import type { EnsureService } from "./Service";

/**
 * Defines an ensure service with compile-time shape checking.
 *
 * Use in `.er/services` files:
 *
 * ```ts
 * export default defineEnsureService({
 *     id: "postgres",
 *     parseArgs(argv) { return { options: {}, remaining: argv }; },
 *     async run() { return 0; }
 * });
 * ```
 */
export function defineEnsureService<TOptions = unknown>(
    service: EnsureService<TOptions>
): EnsureService<TOptions> {
    return service;
}
