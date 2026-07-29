import { ServiceRegistry } from "../core/registry";

import { dockerService } from "./docker/service";
import { loadCustomServices } from "./LoadCustomServices";

/**
 * Creates a registry with built-in services and project-local `.er/services`.
 */
export async function createServiceRegistry(cwd = process.cwd()): Promise<ServiceRegistry> {
    const registry = createBuiltInServiceRegistry();

    await loadCustomServices(registry, cwd);

    return registry;
}

/**
 * Built-in services only (sync, for tests and programmatic use without custom loading).
 */
export function createBuiltInServiceRegistry(): ServiceRegistry {
    const registry = new ServiceRegistry();

    registry.register(dockerService);

    return registry;
}
