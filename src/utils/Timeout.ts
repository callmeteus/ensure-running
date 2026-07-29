/**
 * Rejects if the promise does not settle before the timeout.
 *
 * @param promise Promise to race.
 * @param timeoutMs Timeout in milliseconds.
 * @param message Optional rejection message.
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    message = "Operation timed out"
): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(message));
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
    }
}
