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
 * Default wait time for Docker Desktop to finish booting on Windows.
 */
export const WindowsDockerReadyTimeoutMs = 300_000;

/**
 * Default wait time for Docker daemon readiness on other platforms.
 */
export const DefaultDockerReadyTimeoutMs = 120_000;

/**
 * Resolves the default daemon readiness timeout for the current platform.
 */
export function resolveDefaultDockerTimeout(): number {
    return process.platform === "win32"
        ? WindowsDockerReadyTimeoutMs
        : DefaultDockerReadyTimeoutMs;
}

/**
 * Default options merged into {@link ensureDockerRunning} calls.
 */
export const DefaultEnsureDockerOptions: Required<Pick<EnsureDockerOptions, "timeout" | "interval" | "autoStart">> = {
    get timeout() {
        return resolveDefaultDockerTimeout();
    },

    interval: 1_000,
    autoStart: true
};

/**
 * Default poll options for internal readiness checks.
 */
export const DefaultPollOptions = {
    get timeout() {
        return resolveDefaultDockerTimeout();
    },

    interval: 1_000
} as const;
