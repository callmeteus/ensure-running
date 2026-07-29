import { describe, expect, it, vi } from "vitest";

import { resolveLogger } from "../../../src/services/docker/logger";

describe("Logger", () => {
    it("no-ops when logger hooks are omitted", () => {
        const logger = resolveLogger();

        expect(() => {
            logger.info("a");
            logger.warn("b");
            logger.debug("c");
        }).not.toThrow();
    });

    it("forwards to provided hooks", () => {
        const info = vi.fn();
        const warn = vi.fn();
        const debug = vi.fn();

        const logger = resolveLogger({ info, warn, debug });

        logger.info("hello");
        logger.warn("careful");
        logger.debug("detail");

        expect(info).toHaveBeenCalledWith("hello");
        expect(warn).toHaveBeenCalledWith("careful");
        expect(debug).toHaveBeenCalledWith("detail");
    });
});
