import { describe, expect, it, vi } from "vitest";

import { withTimeout } from "../../../src/utils/Timeout";

describe("Timeout", () => {
    it("resolves when the promise completes in time", async () => {
        await expect(withTimeout(Promise.resolve("ok"), 1000)).resolves.toBe("ok");
    });

    it("rejects when the promise exceeds the timeout", async () => {
        vi.useFakeTimers();

        const never = new Promise<string>(() => undefined);
        const promise = withTimeout(never, 50, "timed out");

        vi.advanceTimersByTime(50);

        await expect(promise).rejects.toThrow("timed out");

        vi.useRealTimers();
    });
});
