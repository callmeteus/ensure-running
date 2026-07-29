import { describe, expect, it, vi } from "vitest";

import { poll } from "../../../src/services/docker/utils/Poll";

describe("Poll", () => {
    it("returns true when predicate succeeds before timeout", async () => {
        let calls = 0;

        const result = await poll(async () => {
            calls += 1;

            return calls >= 2;
        }, { timeout: 500, interval: 10 });

        expect(result).toBe(true);
        expect(calls).toBeGreaterThanOrEqual(2);
    });

    it("returns false when predicate never succeeds", async () => {
        vi.useFakeTimers();

        const promise = poll(async () => false, { timeout: 100, interval: 50 });

        await vi.advanceTimersByTimeAsync(150);

        await expect(promise).resolves.toBe(false);

        vi.useRealTimers();
    });

    it("stops when the deadline passes between predicate checks", async () => {
        const nowSpy = vi.spyOn(Date, "now");
        let tick = 0;

        nowSpy.mockImplementation(() => {
            tick += 1;

            if (tick <= 2) {
                return 0;
            }

            return 200;
        });

        const result = await poll(async () => false, { timeout: 100, interval: 50 });

        expect(result).toBe(false);

        nowSpy.mockRestore();
    });
});
