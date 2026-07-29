import type { DockerLogger } from "../types";

const noop = (): void => undefined;

/**
 * Resolved logger with no-op fallbacks for missing hooks.
 */
export interface ResolvedLogger {
    info: (message: string) => void;
    warn: (message: string) => void;
    debug: (message: string) => void;
}

/**
 * Builds a logger that safely no-ops when hooks are omitted.
 *
 * @param logger Optional user-provided logger.
 * @returns Logger with info, warn, and debug methods.
 */
export function resolveLogger(logger?: DockerLogger): ResolvedLogger {
    return {
        info: logger?.info ?? noop,
        warn: logger?.warn ?? noop,
        debug: logger?.debug ?? noop
    };
}
