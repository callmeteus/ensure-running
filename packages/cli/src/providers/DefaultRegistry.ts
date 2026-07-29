import { ProviderRegistry } from "@ensure-running/core";
import { dockerProvider } from "@ensure-running/docker";

/**
 * Built-in providers shipped with ensure-running.
 */
export function createDefaultRegistry(): ProviderRegistry {
    const registry = new ProviderRegistry();

    registry.register(dockerProvider);

    return registry;
}
