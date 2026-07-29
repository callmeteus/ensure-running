import type { EnsureProvider } from "../provider";

/**
 * Registry of ensure providers addressable from the CLI.
 */
export class ProviderRegistry {
    private readonly providers = new Map<string, EnsureProvider>();

    /**
     * Registers a provider by id and optional aliases.
     */
    register(provider: EnsureProvider): void {
        this.providers.set(provider.id, provider);

        for (const alias of provider.aliases ?? []) {
            this.providers.set(alias, provider);
        }
    }

    /**
     * Resolves a provider by id or alias.
     */
    resolve(name: string): EnsureProvider | undefined {
        return this.providers.get(name);
    }

    /**
     * Returns registered providers without alias duplicates.
     */
    list(): EnsureProvider[] {
        const seen = new Set<EnsureProvider>();

        for (const provider of this.providers.values()) {
            seen.add(provider);
        }

        return [...seen];
    }
}
