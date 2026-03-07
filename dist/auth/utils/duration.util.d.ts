/**
 * Parses a duration string (e.g., '15m', '7d', '1h', '30s') or number into seconds.
 *
 * @param duration The duration string or number of seconds.
 * @param defaultSeconds The default value if parsing fails.
 * @returns The duration in seconds.
 */
export declare function parseDuration(duration: string | number | undefined, defaultSeconds: number): number;
