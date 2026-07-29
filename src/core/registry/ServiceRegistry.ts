import type { EnsureService } from "../service";

/**
 * Registry of ensure services addressable from the CLI.
 */
export class ServiceRegistry {
    private readonly services = new Map<string, EnsureService>();

    /**
     * Registers a service by id and optional aliases.
     */
    register(service: EnsureService): void {
        this.services.set(service.id, service);

        for (const alias of service.aliases ?? []) {
            this.services.set(alias, service);
        }
    }

    /**
     * Resolves a service by id or alias.
     */
    resolve(name: string): EnsureService | undefined {
        return this.services.get(name);
    }

    /**
     * Returns registered services without alias duplicates.
     */
    list(): EnsureService[] {
        const seen = new Set<EnsureService>();

        for (const service of this.services.values()) {
            seen.add(service);
        }

        return [...seen];
    }
}
