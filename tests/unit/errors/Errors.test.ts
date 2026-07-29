import { describe, expect, it } from "vitest";

import {
    DockerError,
    DockerErrorCode,
    DockerNotInstalledError,
    DockerNotRunningError,
    DockerStartError,
    DockerTimeoutError
} from "../../../src/services/docker/errors";

describe("Errors", () => {
    it("exposes stable error codes", () => {
        expect(DockerErrorCode.NOT_INSTALLED).toBe("NOT_INSTALLED");
        expect(DockerErrorCode.TIMEOUT).toBe("TIMEOUT");
    });

    it("creates DockerNotInstalledError", () => {
        const err = new DockerNotInstalledError();

        expect(err).toBeInstanceOf(DockerError);
        expect(err.code).toBe(DockerErrorCode.NOT_INSTALLED);
        expect(err.name).toBe("DockerNotInstalledError");
    });

    it("creates DockerNotRunningError", () => {
        const err = new DockerNotRunningError();

        expect(err.code).toBe(DockerErrorCode.NOT_RUNNING);
    });

    it("creates DockerStartError with cause", () => {
        const cause = new Error("spawn failed");
        const err = new DockerStartError(undefined, { cause });

        expect(err.code).toBe(DockerErrorCode.START_FAILED);
        expect(err.cause).toBe(cause);
    });

    it("creates DockerTimeoutError with elapsed seconds", () => {
        const err = new DockerTimeoutError(120_000);

        expect(err.code).toBe(DockerErrorCode.TIMEOUT);
        expect(err.message).toContain("120s");
    });
});
