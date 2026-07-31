/**
 * Stable error codes for Docker-related failures.
 */
export enum DockerErrorCode {
    NOT_INSTALLED = "NOT_INSTALLED",
    NOT_RUNNING = "NOT_RUNNING",
    START_FAILED = "START_FAILED",
    TIMEOUT = "TIMEOUT"
}

/**
 * Base error for all Docker ensure failures.
 */
export class DockerError extends Error {
    readonly code: DockerErrorCode;

    constructor(message: string, code: DockerErrorCode, options?: ErrorOptions) {
        super(message, options);
        this.name = "DockerError";
        this.code = code;
    }
}

/**
 * Thrown when the Docker CLI is not installed or not on PATH.
 */
export class DockerNotInstalledError extends DockerError {
    constructor(message = "Docker is not installed. Install Docker and ensure the CLI is on your PATH.") {
        super(message, DockerErrorCode.NOT_INSTALLED);
        this.name = "DockerNotInstalledError";
    }
}

/**
 * Thrown when Docker is installed but the daemon is not reachable and autoStart is false.
 */
export class DockerNotRunningError extends DockerError {
    constructor(message = "Docker is installed but the daemon is not running. Start Docker or pass autoStart: true.") {
        super(message, DockerErrorCode.NOT_RUNNING);
        this.name = "DockerNotRunningError";
    }
}

/**
 * Thrown when auto-start was attempted but every strategy failed.
 */
export class DockerStartError extends DockerError {
    constructor(
        message = "Failed to start Docker. Start Docker manually and try again.",
        options?: ErrorOptions
    ) {
        super(message, DockerErrorCode.START_FAILED, options);
        this.name = "DockerStartError";
    }
}

/**
 * Thrown when the daemon did not become ready within the configured timeout.
 */
export class DockerTimeoutError extends DockerError {
    constructor(timeoutMs: number) {
        const seconds = Math.round(timeoutMs / 1000);
        const windowsHint = process.platform === "win32"
            ? " If Docker Desktop is open but the engine never becomes ready, quit Docker Desktop completely and run `docker desktop start`, or restart it from the tray menu."
            : "";
        super(
            `Timed out after ${seconds}s waiting for the Docker daemon to become ready.${windowsHint}`,
            DockerErrorCode.TIMEOUT
        );
        this.name = "DockerTimeoutError";
    }
}
