import { describe, expect, it, vi } from "vitest";

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
    execFile: vi.fn(),
    spawn: spawnMock
}));

describe("Process", () => {
    it("startDockerdDetached spawns dockerd detached", async () => {
        spawnMock.mockReturnValue({ unref: vi.fn() });

        const { startDockerdDetached } = await import( "../../../src/services/docker/process");

        startDockerdDetached();

        expect(spawnMock).toHaveBeenCalledWith("dockerd", [], {
            detached: true,
            stdio: "ignore",
            windowsHide: true
        });
    });
});
