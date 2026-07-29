import { describe, expect, it, vi } from "vitest";

import { retry } from "../../../src/utils/Retry";

describe("Retry", () => {
    it("returns on first success", async () => {
        const fn = vi.fn().mockResolvedValue("ok");

        const result = await retry(fn, { attempts: 3, delayMs: 1 });

        expect(result).toBe("ok");
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries until success", async () => {
        const fn = vi
            .fn()
            .mockRejectedValueOnce(new Error("fail"))
            .mockResolvedValue("ok");

        const result = await retry(fn, { attempts: 3, delayMs: 1 });

        expect(result).toBe("ok");
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it("throws the last error when all attempts fail", async () => {
        const fn = vi.fn().mockRejectedValue(new Error("always fails"));

        await expect(retry(fn, { attempts: 2, delayMs: 1 })).rejects.toThrow("always fails");
    });
});
