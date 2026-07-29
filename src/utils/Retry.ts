import { sleep } from "./Sleep";

/**
 * Options for retrying an async operation.
 */
export interface RetryOptions {
    attempts: number;
    delayMs: number;
}

/**
 * Retries an async function until it succeeds or attempts are exhausted.
 *
 * @param fn Function to retry.
 * @param options Attempt count and delay between retries.
 * @returns Result of the successful invocation.
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= options.attempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;

            if (attempt < options.attempts) {
                await sleep(options.delayMs);
            }
        }
    }

    throw lastError;
}
