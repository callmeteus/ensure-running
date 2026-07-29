/**
 * Resolves after the given number of milliseconds.
 *
 * @param ms Delay in milliseconds.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
