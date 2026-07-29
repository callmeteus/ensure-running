import { describe, expect, it, vi } from "vitest";

import { sleep } from "../../../src/services/docker/utils/Sleep";

describe("Sleep", () => {
    it("resolves after the given delay", async () => {
        vi.useFakeTimers();

        const promise = sleep(1000);
        vi.advanceTimersByTime(1000);
        await expect(promise).resolves.toBeUndefined();

        vi.useRealTimers();
    });
});
