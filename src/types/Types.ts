/**
 * Shared types and default option values.
 */

/**
 * Optional logger hooks for progress output.
 */
export interface DockerLogger {
    info?(message: string): void;
    warn?(message: string): void;
    debug?(message: string): void;
}

/**
 * Options for {@link ensureDockerRunning}.
 */
export interface EnsureDockerOptions {
    /** Maximum wait time in ms for the daemon to become ready. Default: 120_000. */
    timeout?: number;

    /** Poll interval in ms between readiness checks. Default: 1_000. */
    interval?: number;

    /** When true, attempt to start Docker if the daemon is not running. Default: true. */
    autoStart?: boolean;

    /** Optional logger for progress messages. */
    logger?: DockerLogger;
}

/**
 * Result of {@link detectDocker}.
 */
export interface DockerDetectionResult {
    installed: boolean;
    running: boolean;
    version?: string;
    executable?: string;
}

/**
 * Default options merged into {@link ensureDockerRunning} calls.
 */
export const DefaultEnsureDockerOptions: Required<Pick<EnsureDockerOptions, "timeout" | "interval" | "autoStart">> = {
    timeout: 120_000,
    interval: 1_000,
    autoStart: true
};

/**
 * Default poll options for internal readiness checks.
 */
export const DefaultPollOptions = {
    timeout: 120_000,
    interval: 1_000
} as const;
