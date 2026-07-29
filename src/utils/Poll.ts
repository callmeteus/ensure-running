import { sleep } from "./Sleep";

/**
 * Options for polling until a condition is met.
 */
export interface PollOptions {
    timeout: number;
    interval: number;
}

/**
 * Polls until `predicate` returns true or timeout is reached.
 *
 * @param predicate Async condition to evaluate each tick.
 * @param options Timeout and interval in ms.
 * @returns True if predicate succeeded before timeout.
 */
export async function poll(
    predicate: () => Promise<boolean>,
    options: PollOptions
): Promise<boolean> {
    const deadline = Date.now() + options.timeout;

    while (Date.now() < deadline) {
        if (await predicate()) {
            return true;
        }

        const remaining = deadline - Date.now();

        if (remaining <= 0) {
            break;
        }

        await sleep(Math.min(options.interval, remaining));
    }

    return false;
}
