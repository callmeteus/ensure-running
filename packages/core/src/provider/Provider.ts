/**
 * Result of parsing provider-specific CLI flags.
 */
export interface ProviderParseResult<TOptions = unknown> {
    options: TOptions;
    remaining: string[];
}

/**
 * Contract for a service that can be ensured before running a command.
 */
export interface EnsureProvider<TOptions = unknown> {
    /** Stable provider id used on the CLI (e.g. `docker`). */
    readonly id: string;

    /** Optional short aliases (e.g. `d`). */
    readonly aliases?: readonly string[];

    /**
     * Consumes provider flags from the start of {@link argv}.
     * Stops at the first token that is not a provider flag.
     */
    parseArgs(argv: string[]): ProviderParseResult<TOptions>;

    /** Runs the ensure/check flow and returns a process exit code. */
    run(options: TOptions): Promise<number>;

    /** Prints provider-specific help to stdout. */
    printHelp?(): void;
}
