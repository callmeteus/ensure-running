/**
 * Result of parsing service-specific CLI flags.
 */
export interface ServiceParseResult<TOptions = unknown> {
    options: TOptions;
    remaining: string[];
}

/**
 * Contract for a service that can be ensured before running a command.
 *
 * Custom services in `.er/services` should use {@link defineEnsureService} and `export default`.
 */
export interface EnsureService<TOptions = unknown> {
    /** Stable service id used on the CLI (e.g. `docker`). */
    readonly id: string;

    /** Optional short aliases (e.g. `d`). */
    readonly aliases?: readonly string[];

    /**
     * Consumes service flags from the start of {@link argv}.
     * Stops at the first token that is not a service flag.
     */
    parseArgs(argv: string[]): ServiceParseResult<TOptions>;

    /** Runs the ensure/check flow and returns a process exit code. */
    run(options: TOptions): Promise<number>;

    /** Prints service-specific help to stdout. */
    printHelp?(): void;
}
